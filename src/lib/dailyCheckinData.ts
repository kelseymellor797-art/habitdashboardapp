import { notifyAppDataUpdated } from "./appEvents";
import { saveRemoteCollectionById, syncCollection } from "./supabaseSync";

export interface DailyCheckIn {
  id: string;
  date: string; // YYYY-MM-DD

  // How I feel (1-5 scale)
  mood: number;
  energy: number;
  motivation: number;
  confidence: number;

  // Body
  soreness: number;
  flexibilityFeeling: number;
  strengthFeeling: number;

  // Training
  trainedToday: boolean;
  trainingType?: string; // "pole" | "heels" | "conditioning" | "flexibility" | "performance" | "other"
  trainingDuration?: number; // minutes

  // Reflection
  mentalStateNotes?: string;
  wins?: string;
  whatFeltHard?: string;
  goalsForTomorrow?: string;

  createdAt: string;
  updatedAt: string;
}

export const DAILY_CHECKINS_KEY = "wellness-daily-checkins";

type DailyCheckInRow = {
  id: string;
  date: string;
  mood: number;
  energy: number;
  motivation: number;
  confidence: number;
  soreness: number;
  flexibility_feeling: number;
  strength_feeling: number;
  trained_today: boolean;
  training_type: string | null;
  training_duration: number | null;
  mental_state_notes: string | null;
  wins: string | null;
  what_felt_hard: string | null;
  goals_for_tomorrow: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export function todayDateString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function generateCheckInId(): string {
  return `ci-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function readDailyCheckInsCache(): DailyCheckIn[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(DAILY_CHECKINS_KEY);
    return raw ? (JSON.parse(raw) as DailyCheckIn[]) : [];
  } catch {
    return [];
  }
}

function writeDailyCheckInsCache(data: DailyCheckIn[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(DAILY_CHECKINS_KEY, JSON.stringify(data));
}

function checkInFromRow(row: DailyCheckInRow): DailyCheckIn {
  return {
    id: row.id,
    date: row.date,
    mood: row.mood,
    energy: row.energy,
    motivation: row.motivation,
    confidence: row.confidence,
    soreness: row.soreness,
    flexibilityFeeling: row.flexibility_feeling,
    strengthFeeling: row.strength_feeling,
    trainedToday: row.trained_today,
    trainingType: row.training_type ?? undefined,
    trainingDuration: row.training_duration ?? undefined,
    mentalStateNotes: row.mental_state_notes ?? "",
    wins: row.wins ?? "",
    whatFeltHard: row.what_felt_hard ?? "",
    goalsForTomorrow: row.goals_for_tomorrow ?? "",
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? new Date().toISOString(),
  };
}

function checkInToRow(checkIn: DailyCheckIn): DailyCheckInRow {
  return {
    id: checkIn.id,
    date: checkIn.date,
    mood: checkIn.mood,
    energy: checkIn.energy,
    motivation: checkIn.motivation,
    confidence: checkIn.confidence,
    soreness: checkIn.soreness,
    flexibility_feeling: checkIn.flexibilityFeeling,
    strength_feeling: checkIn.strengthFeeling,
    trained_today: checkIn.trainedToday,
    training_type: checkIn.trainingType ?? null,
    training_duration: checkIn.trainingDuration ?? null,
    mental_state_notes: checkIn.mentalStateNotes ?? null,
    wins: checkIn.wins ?? null,
    what_felt_hard: checkIn.whatFeltHard ?? null,
    goals_for_tomorrow: checkIn.goalsForTomorrow ?? null,
    created_at: checkIn.createdAt,
    updated_at: checkIn.updatedAt,
  };
}

export function loadDailyCheckIns(): DailyCheckIn[] {
  if (typeof window === "undefined") return [];
  const checkIns = readDailyCheckInsCache();
  syncCollection({
    key: DAILY_CHECKINS_KEY,
    table: "daily_checkins",
    localData: checkIns,
    readCache: readDailyCheckInsCache,
    writeCache: writeDailyCheckInsCache,
    fromRow: checkInFromRow,
    toRow: checkInToRow,
    orderBy: "date",
  });
  return checkIns;
}

export function saveDailyCheckIns(data: DailyCheckIn[]): void {
  if (typeof window === "undefined") return;
  writeDailyCheckInsCache(data);
  saveRemoteCollectionById("daily_checkins", "id", data, (checkIn) => checkIn.id, checkInToRow, {
    onConflict: "user_id,date",
  });
  notifyAppDataUpdated();
}

export function getTodayCheckIn(checkIns: DailyCheckIn[]): DailyCheckIn | undefined {
  const today = todayDateString();
  return checkIns.find((c) => c.date === today);
}

export function getCheckInForDate(checkIns: DailyCheckIn[], date: string): DailyCheckIn | undefined {
  return checkIns.find((c) => c.date === date);
}

export function emptyCheckIn(): Omit<DailyCheckIn, "id" | "date" | "createdAt" | "updatedAt"> {
  return {
    mood: 3,
    energy: 3,
    motivation: 3,
    confidence: 3,
    soreness: 3,
    flexibilityFeeling: 3,
    strengthFeeling: 3,
    trainedToday: false,
    trainingType: undefined,
    trainingDuration: undefined,
    mentalStateNotes: "",
    wins: "",
    whatFeltHard: "",
    goalsForTomorrow: "",
  };
}
