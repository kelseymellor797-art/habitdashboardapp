import { notifyAppDataUpdated } from "./appEvents";
import { ensureDataRecoveryMigration } from "./dataRecovery";
import { saveRemoteCollectionById, syncCollection } from "./supabaseSync";

export type MuscleGroup =
  | 'core' | 'upper_body' | 'lower_body' | 'full_body'
  | 'shoulders' | 'back' | 'legs' | 'flexibility' | 'cardio';

export interface Exercise {
  id: string;
  name: string;
  sets?: number;
  reps?: string;
  weight?: string;
  notes?: string;
}

export interface ConditioningRoutine {
  id: string;
  name: string;
  category: MuscleGroup;
  exercises: Exercise[];
  estimatedDuration?: number;
  difficulty: 1 | 2 | 3 | 4 | 5;
  notes?: string;
  active: boolean;
  createdAt: string;
}

export interface ConditioningSession {
  id: string;
  routineId?: string;
  routineName: string;
  date: string; // YYYY-MM-DD local
  duration?: number;
  completedExercises: string[];
  difficulty: 1 | 2 | 3 | 4 | 5;
  notes?: string;
  createdAt: string;
}

const ROUTINES_KEY = "wellness-conditioning-routines";
const SESSIONS_KEY = "wellness-conditioning-sessions";

type ConditioningRoutineRow = {
  id: string;
  name: string;
  category: MuscleGroup;
  exercises: Exercise[];
  estimated_duration: number | null;
  difficulty: 1 | 2 | 3 | 4 | 5;
  notes: string | null;
  active: boolean;
  created_at: string | null;
};

type ConditioningSessionRow = {
  id: string;
  routine_id: string | null;
  routine_name: string;
  date: string;
  duration: number | null;
  completed_exercises: string[];
  difficulty: 1 | 2 | 3 | 4 | 5;
  notes: string | null;
  created_at: string | null;
};

export function todayDateString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

export function generateRoutineId(): string {
  return `cr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function generateSessionId(): string {
  return `cs-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function generateExerciseId(): string {
  return `ex-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

const DEFAULT_ROUTINES: ConditioningRoutine[] = [
  {
    id: "cr-default-1",
    name: "Core & Stability",
    category: "core",
    difficulty: 2,
    estimatedDuration: 25,
    active: true,
    createdAt: new Date().toISOString(),
    notes: "",
    exercises: [
      { id: generateExerciseId(), name: "Dead bug", sets: 3, reps: "10 each side" },
      { id: generateExerciseId(), name: "Plank hold", sets: 3, reps: "30-45 seconds" },
      { id: generateExerciseId(), name: "Side plank", sets: 2, reps: "30 seconds each side" },
      { id: generateExerciseId(), name: "Hollow body hold", sets: 3, reps: "20-30 seconds" },
      { id: generateExerciseId(), name: "Leg raises", sets: 3, reps: "12" },
    ],
  },
  {
    id: "cr-default-2",
    name: "Pole Prep: Upper Body",
    category: "upper_body",
    difficulty: 3,
    estimatedDuration: 30,
    active: true,
    createdAt: new Date().toISOString(),
    notes: "",
    exercises: [
      { id: generateExerciseId(), name: "Scapular pull-ups", sets: 3, reps: "8-10" },
      { id: generateExerciseId(), name: "Band pull-aparts", sets: 3, reps: "15" },
      { id: generateExerciseId(), name: "Push-ups", sets: 3, reps: "10-15" },
      { id: generateExerciseId(), name: "Pike push-ups", sets: 3, reps: "8" },
      { id: generateExerciseId(), name: "Assisted dips", sets: 3, reps: "8-10" },
    ],
  },
  {
    id: "cr-default-3",
    name: "Flexibility: Splits & Backbend",
    category: "flexibility",
    difficulty: 2,
    estimatedDuration: 40,
    active: true,
    createdAt: new Date().toISOString(),
    notes: "",
    exercises: [
      { id: generateExerciseId(), name: "Hip flexor lunge stretch", sets: 1, reps: "60 seconds each side" },
      { id: generateExerciseId(), name: "Hamstring fold-over stretch", sets: 1, reps: "60 seconds each side" },
      { id: generateExerciseId(), name: "Pike stretch", sets: 1, reps: "60 seconds" },
      { id: generateExerciseId(), name: "Bridge hold", sets: 3, reps: "30 seconds" },
      { id: generateExerciseId(), name: "Chest opener", sets: 1, reps: "60 seconds" },
    ],
  },
];

function readRoutinesCache(): ConditioningRoutine[] {
  if (typeof window === "undefined") return DEFAULT_ROUTINES;
  try {
    const raw = localStorage.getItem(ROUTINES_KEY);
    return raw ? (JSON.parse(raw) as ConditioningRoutine[]) : [];
  } catch {
    return DEFAULT_ROUTINES;
  }
}

function writeRoutinesCache(routines: ConditioningRoutine[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ROUTINES_KEY, JSON.stringify(routines));
}

function readSessionsCache(): ConditioningSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    return raw ? (JSON.parse(raw) as ConditioningSession[]) : [];
  } catch {
    return [];
  }
}

function writeSessionsCache(sessions: ConditioningSession[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

function routineFromRow(row: ConditioningRoutineRow): ConditioningRoutine {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    exercises: row.exercises ?? [],
    estimatedDuration: row.estimated_duration ?? undefined,
    difficulty: row.difficulty,
    notes: row.notes ?? undefined,
    active: row.active,
    createdAt: row.created_at ?? new Date().toISOString(),
  };
}

function routineToRow(routine: ConditioningRoutine): ConditioningRoutineRow {
  return {
    id: routine.id,
    name: routine.name,
    category: routine.category,
    exercises: routine.exercises,
    estimated_duration: routine.estimatedDuration ?? null,
    difficulty: routine.difficulty,
    notes: routine.notes ?? null,
    active: routine.active,
    created_at: routine.createdAt,
  };
}

function sessionFromRow(row: ConditioningSessionRow): ConditioningSession {
  return {
    id: row.id,
    routineId: row.routine_id ?? undefined,
    routineName: row.routine_name,
    date: row.date,
    duration: row.duration ?? undefined,
    completedExercises: row.completed_exercises ?? [],
    difficulty: row.difficulty,
    notes: row.notes ?? undefined,
    createdAt: row.created_at ?? new Date().toISOString(),
  };
}

function sessionToRow(session: ConditioningSession): ConditioningSessionRow {
  return {
    id: session.id,
    routine_id: session.routineId ?? null,
    routine_name: session.routineName,
    date: session.date,
    duration: session.duration ?? null,
    completed_exercises: session.completedExercises,
    difficulty: session.difficulty,
    notes: session.notes ?? null,
    created_at: session.createdAt,
  };
}

export function loadConditioningRoutines(): ConditioningRoutine[] {
  if (typeof window === "undefined") return DEFAULT_ROUTINES;
  ensureDataRecoveryMigration();
  try {
    const raw = localStorage.getItem(ROUTINES_KEY);
    if (raw === null) {
      // First visit — seed defaults
      localStorage.setItem(ROUTINES_KEY, JSON.stringify(DEFAULT_ROUTINES));
      syncCollection({
        key: ROUTINES_KEY,
        table: "conditioning_routines",
        localData: DEFAULT_ROUTINES,
        readCache: readRoutinesCache,
        writeCache: writeRoutinesCache,
        fromRow: routineFromRow,
        toRow: routineToRow,
        orderBy: "created_at",
      });
      return DEFAULT_ROUTINES;
    }
    const routines = JSON.parse(raw) as ConditioningRoutine[];
    syncCollection({
      key: ROUTINES_KEY,
      table: "conditioning_routines",
      localData: routines,
      readCache: readRoutinesCache,
      writeCache: writeRoutinesCache,
      fromRow: routineFromRow,
      toRow: routineToRow,
      orderBy: "created_at",
    });
    return routines;
  } catch {
    return DEFAULT_ROUTINES;
  }
}

export function saveConditioningRoutines(r: ConditioningRoutine[]): void {
  if (typeof window === "undefined") return;
  writeRoutinesCache(r);
  saveRemoteCollectionById("conditioning_routines", "id", r, (routine) => routine.id, routineToRow);
  notifyAppDataUpdated();
}

export function loadConditioningSessions(): ConditioningSession[] {
  if (typeof window === "undefined") return [];
  ensureDataRecoveryMigration();
  const sessions = readSessionsCache();
  syncCollection({
    key: SESSIONS_KEY,
    table: "conditioning_sessions",
    localData: sessions,
    readCache: readSessionsCache,
    writeCache: writeSessionsCache,
    fromRow: sessionFromRow,
    toRow: sessionToRow,
    orderBy: "date",
  });
  return sessions;
}

export function saveConditioningSessions(s: ConditioningSession[]): void {
  if (typeof window === "undefined") return;
  writeSessionsCache(s);
  saveRemoteCollectionById("conditioning_sessions", "id", s, (session) => session.id, sessionToRow);
  notifyAppDataUpdated();
}
