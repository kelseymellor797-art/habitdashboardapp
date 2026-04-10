export interface WaterEntry {
  id: string;
  date: string; // YYYY-MM-DD local time
  amountMl: number;
  timestamp: string; // ISO string for ordering within a day
}

export interface WaterGoal {
  dailyGoalMl: number; // default 2000
}

const ENTRIES_KEY = "wellness-water-entries";
const GOAL_KEY = "wellness-water-goal";

export function todayDateString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

export function generateWaterId(): string {
  return `w-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function loadWaterEntries(): WaterEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ENTRIES_KEY);
    return raw ? (JSON.parse(raw) as WaterEntry[]) : [];
  } catch {
    return [];
  }
}

export function saveWaterEntries(entries: WaterEntry[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));
}

export function loadWaterGoal(): WaterGoal {
  if (typeof window === "undefined") return { dailyGoalMl: 2000 };
  try {
    const raw = localStorage.getItem(GOAL_KEY);
    return raw ? (JSON.parse(raw) as WaterGoal) : { dailyGoalMl: 2000 };
  } catch {
    return { dailyGoalMl: 2000 };
  }
}

export function saveWaterGoal(goal: WaterGoal): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(GOAL_KEY, JSON.stringify(goal));
}

export function getTodayEntries(entries: WaterEntry[]): WaterEntry[] {
  const today = todayDateString();
  return entries.filter((e) => e.date === today);
}

export function getTodayTotal(entries: WaterEntry[]): number {
  return getTodayEntries(entries).reduce((sum, e) => sum + e.amountMl, 0);
}

export function getDateTotal(entries: WaterEntry[], date: string): number {
  return entries.filter((e) => e.date === date).reduce((sum, e) => sum + e.amountMl, 0);
}
