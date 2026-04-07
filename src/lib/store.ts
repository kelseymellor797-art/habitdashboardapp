// Central data store for HabitFlow — all persistence via localStorage

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
  try {
    const raw = localStorage.getItem(HABITS_KEY);
    if (!raw) return [];
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
    return parsed as Habit[];
  } catch {
    return [];
  }
}

export function saveHabits(habits: Habit[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(HABITS_KEY, JSON.stringify(habits));
}

export function loadCompletions(): Completion[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(COMPLETIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { completions?: Record<string, string[]> } | Completion[];
    // New format: { "completions": { "2025-01-01": ["habitId1", ...] } }
    if (!Array.isArray(parsed) && parsed.completions) {
      const result: Completion[] = [];
      for (const [date, habitIds] of Object.entries(parsed.completions)) {
        for (const habitId of habitIds) {
          result.push({ habitId, date, value: 1 });
        }
      }
      return result;
    }
    // Legacy: flat array format — migrate transparently
    if (Array.isArray(parsed)) return parsed as Completion[];
    return [];
  } catch {
    return [];
  }
}

export function saveCompletions(completions: Completion[]): void {
  if (typeof window === "undefined") return;
  const byDate: Record<string, string[]> = {};
  for (const c of completions) {
    if (c.value !== 1) continue;
    if (!byDate[c.date]) byDate[c.date] = [];
    byDate[c.date].push(c.habitId);
  }
  localStorage.setItem(COMPLETIONS_KEY, JSON.stringify({ completions: byDate }));
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
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("habitflow:updated"));
  }
}
