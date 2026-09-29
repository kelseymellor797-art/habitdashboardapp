// Central data store for HabitFlow — all persistence via localStorage
import { notifyAppDataUpdated } from "./appEvents";
import { ensureDataRecoveryMigration } from "./dataRecovery";
import { saveRemoteCollection, saveRemoteCollectionById, syncCollection } from "./supabaseSync";

export type ScheduleType = "daily" | "weekly" | "custom";

export type Habit = {
  id: string;
  name: string;
  /** @deprecated use scheduleType instead; kept for migration */
  frequency?: "daily" | "weekly";
  scheduleType: ScheduleType;
  /** Weekday indices (Mon=0…Sun=6) when scheduleType is "custom" */
  customDays?: number[];
  goal: number;       // monthly target completions
  color: string;      // hex accent color
  createdAt: string;  // ISO string
  active?: boolean;
  categoryId?: string;
};

export type Completion = {
  habitId: string;
  date: string;  // YYYY-MM-DD
  value: number; // 1 = complete
};

export const HABITS_KEY = "habitflow-habits";
export const COMPLETIONS_KEY = "habitflow-completions";

type HabitRow = {
  id: string;
  name: string;
  schedule_type: ScheduleType;
  custom_days: number[] | null;
  goal: number;
  color: string | null;
  active: boolean;
  category_id: string | null;
  created_at: string | null;
};

type CompletionRow = {
  id?: string;
  habit_id: string;
  date: string;
  value: number;
};

function readHabitsCache(): Habit[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HABITS_KEY);
    return raw ? (JSON.parse(raw) as Habit[]) : [];
  } catch {
    return [];
  }
}

function writeHabitsCache(habits: Habit[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(HABITS_KEY, JSON.stringify(habits));
}

function readCompletionsCache(): Completion[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(COMPLETIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { completions?: Record<string, string[]> } | Completion[];
    if (!Array.isArray(parsed) && parsed.completions) {
      const result: Completion[] = [];
      for (const [date, habitIds] of Object.entries(parsed.completions)) {
        for (const habitId of habitIds) {
          result.push({ habitId, date, value: 1 });
        }
      }
      return result;
    }
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCompletionsCache(completions: Completion[]): void {
  if (typeof window === "undefined") return;
  const byDate: Record<string, string[]> = {};
  for (const c of completions) {
    if (c.value !== 1) continue;
    if (!byDate[c.date]) byDate[c.date] = [];
    byDate[c.date].push(c.habitId);
  }
  localStorage.setItem(COMPLETIONS_KEY, JSON.stringify({ completions: byDate }));
}

function habitFromRow(row: HabitRow): Habit {
  return {
    id: row.id,
    name: row.name,
    scheduleType: row.schedule_type,
    customDays: row.custom_days ?? undefined,
    goal: row.goal,
    color: row.color ?? "#8b5cf6",
    active: row.active,
    categoryId: row.category_id ?? undefined,
    createdAt: row.created_at ?? new Date().toISOString(),
  };
}

function habitToRow(habit: Habit): HabitRow {
  return {
    id: habit.id,
    name: habit.name,
    schedule_type: habit.scheduleType,
    custom_days: habit.customDays ?? null,
    goal: habit.goal,
    color: habit.color,
    active: habit.active !== false,
    category_id: habit.categoryId ?? null,
    created_at: habit.createdAt,
  };
}

function completionFromRow(row: CompletionRow): Completion {
  return { habitId: row.habit_id, date: row.date, value: row.value };
}

function completionToRow(completion: Completion): CompletionRow {
  return {
    habit_id: completion.habitId,
    date: completion.date,
    value: completion.value,
  };
}

export function generateId(): string {
  return `h-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Convert a 1-indexed day number to YYYY-MM-DD for the current month */
export function dayToDate(day: number): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-${String(day).padStart(2, "0")}`;
}

export function loadHabits(): Habit[] {
  if (typeof window === "undefined") return [];
  ensureDataRecoveryMigration();
  try {
    const raw = localStorage.getItem(HABITS_KEY);
    if (!raw) {
      syncCollection({
        key: HABITS_KEY,
        table: "habits",
        localData: [],
        readCache: readHabitsCache,
        writeCache: writeHabitsCache,
        fromRow: habitFromRow,
        toRow: habitToRow,
        orderBy: "created_at",
      });
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Migrate old format (has 'hex' instead of 'color')
    if (parsed.length > 0 && (parsed[0] as Record<string, unknown>).hex && !(parsed[0] as Record<string, unknown>).color) {
      const migrated: Habit[] = parsed.map((h: Record<string, unknown>) => ({
        id: h.id as string,
        name: h.name as string,
        scheduleType: ((h.type as string) === "weekly" ? "weekly" : "daily") as ScheduleType,
        frequency: ((h.type as string) === "weekly" ? "weekly" : "daily") as "daily" | "weekly",
        goal: (h.monthlyGoal as number) || 20,
        color: (h.hex as string) || "#8b5cf6",
        createdAt: (h.createdAt as string) || new Date().toISOString(),
      }));
      saveHabits(migrated);
      return migrated;
    }
    // Migrate: add scheduleType from frequency if missing
    const needsMigration = parsed.some(
      (h: Record<string, unknown>) => !h.scheduleType
    );
    if (needsMigration) {
      const migrated: Habit[] = (parsed as Record<string, unknown>[]).map((h) => ({
        ...(h as Habit),
        scheduleType: ((h.frequency as string) === "weekly" ? "weekly" : "daily") as ScheduleType,
      }));
      saveHabits(migrated);
      return migrated;
    }
    const habits = parsed as Habit[];
    syncCollection({
      key: HABITS_KEY,
      table: "habits",
      localData: habits,
      readCache: readHabitsCache,
      writeCache: writeHabitsCache,
      fromRow: habitFromRow,
      toRow: habitToRow,
      orderBy: "created_at",
    });
    return habits;
  } catch {
    return [];
  }
}

export function saveHabits(habits: Habit[]): void {
  if (typeof window === "undefined") return;
  writeHabitsCache(habits);
  saveRemoteCollectionById("habits", "id", habits, (habit) => habit.id, habitToRow);
  notifyAppDataUpdated();
}

export function loadCompletions(): Completion[] {
  if (typeof window === "undefined") return [];
  ensureDataRecoveryMigration();
  try {
    const completions = readCompletionsCache();
    syncCollection({
      key: COMPLETIONS_KEY,
      table: "habit_completions",
      localData: completions,
      readCache: readCompletionsCache,
      writeCache: writeCompletionsCache,
      fromRow: completionFromRow,
      toRow: completionToRow,
      orderBy: "date",
    });
    return completions;
  } catch {
    return [];
  }
}

export function saveCompletions(completions: Completion[]): void {
  if (typeof window === "undefined") return;
  writeCompletionsCache(completions);
  saveRemoteCollection("habit_completions", completions, completionToRow);
  notifyAppDataUpdated();
}

/** Toggle a completion for a habit on a date. Returns new completions array. */
export function toggleCompletion(
  completions: Completion[],
  habitId: string,
  date: string,
): Completion[] {
  const idx = completions.findIndex((c) => c.habitId === habitId && c.date === date);
  if (idx >= 0) return completions.filter((_, i) => i !== idx);
  return [...completions, { habitId, date, value: 1 }];
}

/** Check if a habit is completed on a given date */
export function isCompleted(completions: Completion[], habitId: string, date: string): boolean {
  return completions.some((c) => c.habitId === habitId && c.date === date && c.value === 1);
}

/** Build a Set<number> of completed 1-indexed days in the current month for a habit */
export function getMonthCompletionSet(completions: Completion[], habitId: string): Set<number> {
  const now = new Date();
  const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-`;
  const set = new Set<number>();
  for (const c of completions) {
    if (c.habitId === habitId && c.date.startsWith(prefix) && c.value === 1) {
      const day = parseInt(c.date.slice(8), 10);
      if (!isNaN(day)) set.add(day);
    }
  }
  return set;
}

/** Dispatch event so all listeners re-read from localStorage */
export function notifyUpdate(): void {
  notifyAppDataUpdated();
}
