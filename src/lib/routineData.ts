import { type ScheduleType } from "./store";

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

// ── Helpers ────────────────────────────────────────────────────────────────────

export function generateRoutineId(): string {
  return `r-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function loadRoutines(): Routine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ROUTINES_KEY);
    if (!raw) return [];
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
    return parsed as Routine[];
  } catch {
    return [];
  }
}

export function saveRoutines(routines: Routine[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ROUTINES_KEY, JSON.stringify(routines));
}

export function loadRoutineEntries(): Record<string, RoutineEntry> {
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

export function saveRoutineEntries(entries: Record<string, RoutineEntry>): void {
  if (typeof window === "undefined") return;
  const serialized = Object.fromEntries(
    Object.entries(entries).map(([k, v]) => [k, v.completedSubtaskIds])
  );
  localStorage.setItem(ROUTINE_ENTRIES_KEY, JSON.stringify(serialized));
}
