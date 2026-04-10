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

export function loadConditioningRoutines(): ConditioningRoutine[] {
  if (typeof window === "undefined") return DEFAULT_ROUTINES;
  try {
    const raw = localStorage.getItem(ROUTINES_KEY);
    if (raw === null) {
      // First visit — seed defaults
      localStorage.setItem(ROUTINES_KEY, JSON.stringify(DEFAULT_ROUTINES));
      return DEFAULT_ROUTINES;
    }
    return JSON.parse(raw) as ConditioningRoutine[];
  } catch {
    return DEFAULT_ROUTINES;
  }
}

export function saveConditioningRoutines(r: ConditioningRoutine[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ROUTINES_KEY, JSON.stringify(r));
}

export function loadConditioningSessions(): ConditioningSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    return raw ? (JSON.parse(raw) as ConditioningSession[]) : [];
  } catch {
    return [];
  }
}

export function saveConditioningSessions(s: ConditioningSession[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(s));
}
