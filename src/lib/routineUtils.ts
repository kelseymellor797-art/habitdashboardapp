import type { Routine, RoutineEntry } from "./routineData";

// ── Completion state ──────────────────────────────────────────────────────────

/** Visual/logical state of a single habit-day cell */
export type CellState = "complete" | "partial" | "none" | "future";

/**
 * Percentage of subtasks completed for a routine entry.
 * Returns 0 if no entry or no subtasks.
 */
export function calcRoutinePct(
  entry: RoutineEntry | undefined,
  routine: Routine
): number {
  if (!routine.subtasks.length || !entry?.completedSubtaskIds.length) return 0;
  const valid = entry.completedSubtaskIds.filter((id) =>
    routine.subtasks.some((s) => s.id === id)
  ).length;
  return Math.round((valid / routine.subtasks.length) * 100);
}

/**
 * Determine the visual state of a cell.
 * - Routine habits:  100% → complete | 1-99% → partial | 0% → none
 * - Plain habits:    toggled → complete | not toggled → none
 */
export function getCellState(
  day: number,
  todayDay: number,
  hasRoutine: boolean,
  isToggled: boolean,
  routinePct: number
): CellState {
  if (day > todayDay) return "future";
  if (!hasRoutine) return isToggled ? "complete" : "none";
  if (routinePct === 100) return "complete";
  if (routinePct > 0) return "partial";
  return "none";
}

// ── Storage helpers ───────────────────────────────────────────────────────────

/** Storage key for a (routineId, day) pair: "routine-meditation:5" */
export function routineEntryKey(routineId: string, day: number): string {
  return `${routineId}:${day}`;
}

/** Serialize for JSON.stringify / localStorage */
export function serializeRoutineEntries(
  entries: Record<string, RoutineEntry>
): Record<string, string[]> {
  return Object.fromEntries(
    Object.entries(entries).map(([k, v]) => [k, v.completedSubtaskIds])
  );
}

/** Deserialize from localStorage back to RoutineEntry map */
export function deserializeRoutineEntries(
  raw: string
): Record<string, RoutineEntry> {
  try {
    const parsed = JSON.parse(raw) as Record<string, string[]>;
    return Object.fromEntries(
      Object.entries(parsed).map(([k, ids]) => [
        k,
        { completedSubtaskIds: Array.isArray(ids) ? ids : [] },
      ])
    );
  } catch {
    return {};
  }
}

// ── Derived completions ───────────────────────────────────────────────────────

/**
 * Build a Set<number> of "fully complete" days for a routine-based habit.
 * Only days where pct === 100 are included — used for Done/Streak stats.
 */
export function routineCompletionSet(
  routineId: string,
  todayDay: number,
  entries: Record<string, RoutineEntry>,
  routine: Routine
): Set<number> {
  const set = new Set<number>();
  for (let day = 1; day <= todayDay; day++) {
    const entry = entries[routineEntryKey(routineId, day)];
    if (calcRoutinePct(entry, routine) === 100) set.add(day);
  }
  return set;
}

// ── Analytics helpers ─────────────────────────────────────────────────────────

/**
 * Average routine completion % across all days up to todayDay.
 * Useful for "average completion per habit" analytics.
 */
export function calcAvgRoutineCompletion(
  routine: Routine,
  todayDay: number,
  entries: Record<string, RoutineEntry>
): number {
  if (!todayDay) return 0;
  let total = 0;
  for (let day = 1; day <= todayDay; day++) {
    const entry = entries[routineEntryKey(routine.id, day)];
    total += calcRoutinePct(entry, routine);
  }
  return Math.round(total / todayDay);
}

export type SubtaskSkipStats = {
  subtaskId: string;
  name: string;
  skipCount: number;
  skipPct: number;
};

/**
 * For each subtask, how many days it was skipped on days when the
 * routine was at least partially attempted.
 */
export function calcSubtaskSkipStats(
  routine: Routine,
  todayDay: number,
  entries: Record<string, RoutineEntry>
): SubtaskSkipStats[] {
  return routine.subtasks.map((subtask) => {
    let skipCount = 0;
    let attemptedDays = 0;
    for (let day = 1; day <= todayDay; day++) {
      const entry = entries[routineEntryKey(routine.id, day)];
      if (entry && entry.completedSubtaskIds.length > 0) {
        attemptedDays++;
        if (!entry.completedSubtaskIds.includes(subtask.id)) skipCount++;
      }
    }
    return {
      subtaskId: subtask.id,
      name: subtask.name,
      skipCount,
      skipPct: attemptedDays ? Math.round((skipCount / attemptedDays) * 100) : 0,
    };
  });
}

/**
 * Count complete / partial / skipped days for a routine.
 * Used for analytics summary panels.
 */
export function calcRoutineDaySummary(
  routine: Routine,
  todayDay: number,
  entries: Record<string, RoutineEntry>
): { complete: number; partial: number; skipped: number } {
  let complete = 0;
  let partial = 0;
  let skipped = 0;
  for (let day = 1; day <= todayDay; day++) {
    const entry = entries[routineEntryKey(routine.id, day)];
    const pct = calcRoutinePct(entry, routine);
    if (pct === 100) complete++;
    else if (pct > 0) partial++;
    else skipped++;
  }
  return { complete, partial, skipped };
}
