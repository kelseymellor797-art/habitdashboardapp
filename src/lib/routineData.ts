import { type ScheduleType } from "./store";
import { notifyAppDataUpdated } from "./appEvents";
import { saveRemoteCollection, saveRemoteCollectionById, syncCollection } from "./supabaseSync";

// ── Types ──────────────────────────────────────────────────────────────────────

export type SubtaskDef = {
  id: string;
  name: string;
  target?: string;
};

export type Routine = {
  id: string;
  name: string;
  /** @deprecated use scheduleType instead; kept for migration */
  frequency?: "daily" | "weekly";
  scheduleType: ScheduleType;
  /** Weekday indices (Mon=0…Sun=6) when scheduleType is "custom" */
  customDays?: number[];
  color: string;
  active: boolean;
  subtasks: SubtaskDef[];
  createdAt: string;
  categoryId?: string;
};

export type RoutineEntry = {
  completedSubtaskIds: string[];
};

// ── Storage keys ───────────────────────────────────────────────────────────────

export const ROUTINES_KEY = "habitflow-routines";

// Key is per-month so entries from different months don't mix
const _now = new Date();
export const ROUTINE_ENTRIES_KEY =
  `habitflow-routine-entries-${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, "0")}`;

type RoutineRow = {
  id: string;
  name: string;
  schedule_type: ScheduleType;
  custom_days: number[] | null;
  color: string | null;
  active: boolean;
  subtasks: SubtaskDef[];
  category_id: string | null;
  created_at: string | null;
};

type RoutineEntryRow = {
  routine_id: string;
  date: string;
  completed_subtask_ids: string[];
};

// ── Helpers ────────────────────────────────────────────────────────────────────

export function generateRoutineId(): string {
  return `r-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function dayToCurrentMonthDate(day: number): string {
  const year = _now.getFullYear();
  const month = String(_now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}-${String(day).padStart(2, "0")}`;
}

function dayFromDate(date: string): number {
  return Number.parseInt(date.slice(8, 10), 10);
}

function routineEntryKey(routineId: string, day: number): string {
  return `${routineId}:${day}`;
}

function readRoutinesCache(): Routine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ROUTINES_KEY);
    return raw ? (JSON.parse(raw) as Routine[]) : [];
  } catch {
    return [];
  }
}

function writeRoutinesCache(routines: Routine[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ROUTINES_KEY, JSON.stringify(routines));
}

function readRoutineEntriesCache(): Record<string, RoutineEntry> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(ROUTINE_ENTRIES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string[] | RoutineEntry>;
    return Object.fromEntries(
      Object.entries(parsed).map(([k, v]) => [
        k,
        Array.isArray(v)
          ? { completedSubtaskIds: v }
          : { completedSubtaskIds: (v as RoutineEntry).completedSubtaskIds ?? [] },
      ])
    );
  } catch {
    return {};
  }
}

function writeRoutineEntriesCache(entries: Record<string, RoutineEntry>): void {
  if (typeof window === "undefined") return;
  const serialized = Object.fromEntries(
    Object.entries(entries).map(([k, v]) => [k, v.completedSubtaskIds])
  );
  localStorage.setItem(ROUTINE_ENTRIES_KEY, JSON.stringify(serialized));
}

function routineFromRow(row: RoutineRow): Routine {
  return {
    id: row.id,
    name: row.name,
    scheduleType: row.schedule_type,
    customDays: row.custom_days ?? undefined,
    color: row.color ?? "#10b981",
    active: row.active,
    subtasks: row.subtasks ?? [],
    categoryId: row.category_id ?? undefined,
    createdAt: row.created_at ?? new Date().toISOString(),
  };
}

function routineToRow(routine: Routine): RoutineRow {
  return {
    id: routine.id,
    name: routine.name,
    schedule_type: routine.scheduleType,
    custom_days: routine.customDays ?? null,
    color: routine.color,
    active: routine.active,
    subtasks: routine.subtasks,
    category_id: routine.categoryId ?? null,
    created_at: routine.createdAt,
  };
}

function routineEntryRowsToCache(rows: RoutineEntryRow[]): Record<string, RoutineEntry> {
  return Object.fromEntries(
    rows.map((row) => [
      routineEntryKey(row.routine_id, dayFromDate(row.date)),
      { completedSubtaskIds: row.completed_subtask_ids ?? [] },
    ])
  );
}

function routineEntryCacheToRows(entries: Record<string, RoutineEntry>): RoutineEntryRow[] {
  return Object.entries(entries).map(([key, entry]) => {
    const [routineId, day] = key.split(":");
    return {
      routine_id: routineId,
      date: dayToCurrentMonthDate(Number.parseInt(day, 10)),
      completed_subtask_ids: entry.completedSubtaskIds,
    };
  });
}

export function loadRoutines(): Routine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ROUTINES_KEY);
    if (!raw) {
      syncCollection({
        key: ROUTINES_KEY,
        table: "routines",
        localData: [],
        readCache: readRoutinesCache,
        writeCache: writeRoutinesCache,
        fromRow: routineFromRow,
        toRow: routineToRow,
        orderBy: "created_at",
      });
      return [];
    }
    const parsed = JSON.parse(raw) as Record<string, unknown>[];
    if (!Array.isArray(parsed)) return [];
    // Migrate: add scheduleType from frequency if missing
    const needsMigration = parsed.some((r) => !r.scheduleType);
    if (needsMigration) {
      const migrated: Routine[] = parsed.map((r) => ({
        ...(r as Routine),
        scheduleType: ((r.frequency as string) === "weekly" ? "weekly" : "daily") as ScheduleType,
      }));
      saveRoutines(migrated);
      return migrated;
    }
    const routines = parsed as Routine[];
    syncCollection({
      key: ROUTINES_KEY,
      table: "routines",
      localData: routines,
      readCache: readRoutinesCache,
      writeCache: writeRoutinesCache,
      fromRow: routineFromRow,
      toRow: routineToRow,
      orderBy: "created_at",
    });
    return routines;
  } catch {
    return [];
  }
}

export function saveRoutines(routines: Routine[]): void {
  if (typeof window === "undefined") return;
  writeRoutinesCache(routines);
  saveRemoteCollectionById("routines", "id", routines, (routine) => routine.id, routineToRow);
  notifyAppDataUpdated();
}

export function loadRoutineEntries(): Record<string, RoutineEntry> {
  if (typeof window === "undefined") return {};
  const entries = readRoutineEntriesCache();
  syncCollection<RoutineEntryRow, RoutineEntryRow>({
    key: ROUTINE_ENTRIES_KEY,
    table: "routine_entries",
    localData: routineEntryCacheToRows(entries),
    readCache: () => routineEntryCacheToRows(readRoutineEntriesCache()),
    writeCache: (rows) => writeRoutineEntriesCache(routineEntryRowsToCache(rows)),
    fromRow: (row) => row,
    toRow: (row) => row,
    orderBy: "date",
  });
  return entries;
}

export function saveRoutineEntries(entries: Record<string, RoutineEntry>): void {
  if (typeof window === "undefined") return;
  writeRoutineEntriesCache(entries);
  saveRemoteCollection("routine_entries", routineEntryCacheToRows(entries), (row) => row, "routine_id");
  notifyAppDataUpdated();
}
