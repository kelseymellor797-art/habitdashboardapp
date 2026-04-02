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
