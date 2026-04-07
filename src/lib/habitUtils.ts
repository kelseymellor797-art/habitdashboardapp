export const DOW_LABELS = ["M", "T", "W", "T", "F", "S", "S"] as const;

/** Full weekday names aligned to Mon=0…Sun=6 (matches MONTH_CONFIG startDow convention) */
export const DOW_FULL_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

/** 0-indexed day of week (Mon=0 ... Sun=6) for a 1-indexed month day */
export function dayOfWeek(day: number, monthStartDow: number): number {
  return (monthStartDow + day - 1) % 7;
}

export function isWeekBoundary(day: number, monthStartDow: number): boolean {
  return day > 1 && dayOfWeek(day, monthStartDow) === 0;
}

export function calcCompleted(completions: Set<number>, throughDay: number): number {
  let count = 0;
  for (const d of completions) {
    if (d <= throughDay) count++;
  }
  return count;
}

export function calcPct(completed: number, goal: number): number {
  if (goal === 0) return 0;
  return Math.min(100, Math.round((completed / goal) * 100));
}

export function calcRemaining(completed: number, goal: number): number {
  return Math.max(0, goal - completed);
}

// ── Category-driven color resolution ──────────────────────────────────────────

export const DEFAULT_HABIT_COLOR = "#6b7280";

/**
 * Resolves the display color for a habit or routine.
 * If a categoryId is set and the matching category has a color, that color
 * is returned. Otherwise falls back to the item's own color or a neutral grey.
 */
export function resolveHabitColor(
  item: { color?: string; categoryId?: string },
  categories: { id: string; color?: string }[],
): string {
  if (item.categoryId) {
    const cat = categories.find((c) => c.id === item.categoryId);
    if (cat?.color) return cat.color;
  }
  return item.color || DEFAULT_HABIT_COLOR;
}

export function calcStreak(completions: Set<number>, fromDay: number): number {
  let streak = 0;
  for (let d = fromDay; d >= 1; d--) {
    if (completions.has(d)) streak++;
    else break;
  }
  return streak;
}

// ── Schedule helpers ────────────────────────────────────────────────────────

/**
 * Returns true if a scheduled item is due on the given weekday (Mon=0…Sun=6).
 * - "daily" → always due
 * - "weekly" → not shown on daily page (handled by caller)
 * - "custom" → due only if weekday is in customDays
 */
export function isDueOnWeekday(
  scheduleType: string,
  customDays: number[] | undefined,
  weekday: number,
): boolean {
  if (scheduleType === "daily") return true;
  if (scheduleType === "custom") return (customDays ?? []).includes(weekday);
  return false; // "weekly" doesn't appear on the daily page
}

/**
 * Returns true if an item is due today based on MONTH_CONFIG.todayDay and startDow.
 * startDow = Mon=0…Sun=6 (from MONTH_CONFIG).
 */
export function isDueToday(
  scheduleType: string,
  customDays: number[] | undefined,
  todayDay: number,
  startDow: number,
): boolean {
  const weekday = dayOfWeek(todayDay, startDow);
  return isDueOnWeekday(scheduleType, customDays, weekday);
}

/**
 * Returns true if an item is due on a given 1-indexed month day.
 */
export function isDueOnDay(
  scheduleType: string,
  customDays: number[] | undefined,
  day: number,
  startDow: number,
): boolean {
  const weekday = dayOfWeek(day, startDow);
  return isDueOnWeekday(scheduleType, customDays, weekday);
}
