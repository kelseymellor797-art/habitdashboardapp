import { notifyAppDataUpdated } from "./appEvents";

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

export function loadDailyCheckIns(): DailyCheckIn[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(DAILY_CHECKINS_KEY);
    return raw ? (JSON.parse(raw) as DailyCheckIn[]) : [];
  } catch {
    return [];
  }
}

export function saveDailyCheckIns(data: DailyCheckIn[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(DAILY_CHECKINS_KEY, JSON.stringify(data));
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
