import type { Habit } from "./habitData";

export const DOW_LABELS = ["M", "T", "W", "T", "F", "S", "S"] as const;

/** 0-indexed day of week (Mon=0 … Sun=6) for a 1-indexed month day */
export function dayOfWeek(day: number, monthStartDow: number): number {
  return (monthStartDow + day - 1) % 7;
}

/** True when a day is a Monday (new ISO week), used to draw visual separators */
export function isWeekBoundary(day: number, monthStartDow: number): boolean {
  return day > 1 && dayOfWeek(day, monthStartDow) === 0;
}

/** Count completions on or before throughDay */
export function calcCompleted(completions: Set<number>, throughDay: number): number {
  let count = 0;
  for (const d of completions) {
    if (d <= throughDay) count++;
  }
  return count;
}

/** Percentage toward goal, capped at 100 */
export function calcPct(completed: number, goal: number): number {
  if (goal === 0) return 0;
  return Math.min(100, Math.round((completed / goal) * 100));
}

/** How many more completions are needed to reach the goal */
export function calcRemaining(completed: number, goal: number): number {
  return Math.max(0, goal - completed);
}

/** Current consecutive-day streak counting backwards from fromDay */
export function calcStreak(completions: Set<number>, fromDay: number): number {
  let streak = 0;
  for (let d = fromDay; d >= 1; d--) {
    if (completions.has(d)) streak++;
    else break;
  }
  return streak;
}

/**
 * Serialise completions map (Set values → arrays) for localStorage.
 * Safe to JSON.stringify.
 */
export function serializeCompletions(
  completions: Record<string, Set<number>>
): Record<string, number[]> {
  return Object.fromEntries(
    Object.entries(completions).map(([id, set]) => [id, [...set]])
  );
}

/**
 * Deserialise from localStorage back to Set-based map.
 * Falls back to initial habit data on any parse failure.
 */
export function deserializeCompletions(
  raw: string,
  habits: Habit[]
): Record<string, Set<number>> {
  try {
    const parsed = JSON.parse(raw) as Record<string, number[]>;
    return Object.fromEntries(
      habits.map((h) => [
        h.id,
        new Set(Array.isArray(parsed[h.id]) ? parsed[h.id] : h.initialCompletions),
      ])
    );
  } catch {
    return Object.fromEntries(
      habits.map((h) => [h.id, new Set(h.initialCompletions)])
    );
  }
}

/** Build the default (mock) completions map from habit data */
export function defaultCompletions(habits: Habit[]): Record<string, Set<number>> {
  return Object.fromEntries(
    habits.map((h) => [h.id, new Set(h.initialCompletions)])
  );
}
