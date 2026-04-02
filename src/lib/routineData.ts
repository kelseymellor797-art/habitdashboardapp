// ── Core types ────────────────────────────────────────────────────────────────

export type Subtask = {
  id: string;
  routineId: string;
  name: string;
  target?: string; // e.g. "10 reps", "5 min"
};

export type Routine = {
  id: string;
  name: string;
  habitId: string;
  subtasks: Subtask[];
};

/**
 * One routine entry per (routineId + day).
 * Tracks which subtasks were completed on that day.
 */
export type RoutineEntry = {
  completedSubtaskIds: string[];
};

// ── Seed data ─────────────────────────────────────────────────────────────────

export const ROUTINES: Routine[] = [
  {
    id: "routine-meditation",
    name: "Morning Meditation",
    habitId: "meditation",
    subtasks: [
      { id: "med-breathe",   routineId: "routine-meditation", name: "Breathing exercises", target: "5 min" },
      { id: "med-sit",       routineId: "routine-meditation", name: "Seated meditation",   target: "10 min" },
      { id: "med-gratitude", routineId: "routine-meditation", name: "Gratitude practice",  target: "3 min" },
    ],
  },
  {
    id: "routine-exercise",
    name: "Exercise Routine",
    habitId: "exercise",
    subtasks: [
      { id: "ex-warmup",   routineId: "routine-exercise", name: "Warm-up",           target: "5 min" },
      { id: "ex-strength", routineId: "routine-exercise", name: "Strength training", target: "20 min" },
      { id: "ex-cardio",   routineId: "routine-exercise", name: "Cardio",            target: "15 min" },
      { id: "ex-stretch",  routineId: "routine-exercise", name: "Cool-down stretch", target: "5 min" },
    ],
  },
];

/** Quick lookup: routineId → Routine */
export const ROUTINE_BY_ID: Record<string, Routine> = Object.fromEntries(
  ROUTINES.map((r) => [r.id, r])
);

/** Quick lookup: habitId → Routine (only for habits that have a routine) */
export const ROUTINE_BY_HABIT_ID: Record<string, Routine> = Object.fromEntries(
  ROUTINES.map((r) => [r.habitId, r])
);

export const ROUTINE_STORAGE_KEY = "habitflow-routine-entries-jan2025";

// ── User-editable routine definitions ─────────────────────────────────────────

/** Storage key for user-created/edited routine definitions */
export const ROUTINE_DEFS_STORAGE_KEY = "habitflow-routine-defs";

export type StoredSubtask = {
  id: string;
  name: string;
  target?: string;
};

export type StoredRoutineDef = {
  name: string;
  subtasks: StoredSubtask[];
};

/**
 * Load user routine defs from localStorage, merged with seeded defaults.
 * Seeded routines are the baseline; stored defs override them.
 */
export function loadRoutineDefs(): Record<string, StoredRoutineDef> {
  // Build seed baseline
  const base: Record<string, StoredRoutineDef> = {};
  for (const r of ROUTINES) {
    base[r.habitId] = {
      name: r.name,
      subtasks: r.subtasks.map((s) => ({ id: s.id, name: s.name, target: s.target })),
    };
  }
  if (typeof window === "undefined") return base;
  try {
    const raw = localStorage.getItem(ROUTINE_DEFS_STORAGE_KEY);
    if (!raw) return base;
    return { ...base, ...(JSON.parse(raw) as Record<string, StoredRoutineDef>) };
  } catch {
    return base;
  }
}

export function saveRoutineDefs(defs: Record<string, StoredRoutineDef>) {
  localStorage.setItem(ROUTINE_DEFS_STORAGE_KEY, JSON.stringify(defs));
}

/** Convert StoredRoutineDefs to Routine[] lookup for use in HabitGrid */
export function defsToRoutineMap(
  defs: Record<string, StoredRoutineDef>
): Record<string, Routine> {
  const result: Record<string, Routine> = {};
  for (const [habitId, def] of Object.entries(defs)) {
    if (!def.name || !def.subtasks.length) continue;
    const routineId = `routine-${habitId}`;
    result[habitId] = {
      id: routineId,
      name: def.name,
      habitId,
      subtasks: def.subtasks.map((s) => ({
        id: s.id,
        routineId,
        name: s.name,
        target: s.target,
      })),
    };
  }
  return result;
}
