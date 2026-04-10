export interface WeightEntry {
  id: string;
  date: string; // YYYY-MM-DD local
  weightKg: number;
  bodyFatPct?: number;
  measurements?: {
    waistCm?: number;
    hipsCm?: number;
    chestCm?: number;
    thighCm?: number;
    armCm?: number;
  };
  notes?: string;
  createdAt: string;
}

export type MediaTag =
  | "pole"
  | "heels"
  | "floorwork"
  | "freestyle"
  | "conditioning"
  | "flexibility"
  | "combo"
  | "performance_ready"
  | "needs_work"
  | "milestone";

export interface MediaEntry {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD local
  url: string;
  tags: MediaTag[];
  skillName?: string;
  confidenceRating?: number; // 1-5
  notes?: string;
  createdAt: string;
}

const WEIGHT_KEY = "wellness-weight";
const MEDIA_KEY = "wellness-media";

export function todayDateString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function generateWeightId(): string {
  return `wt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function generateMediaId(): string {
  return `mv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function loadWeightEntries(): WeightEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(WEIGHT_KEY);
    return raw ? (JSON.parse(raw) as WeightEntry[]) : [];
  } catch {
    return [];
  }
}

export function saveWeightEntries(entries: WeightEntry[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(WEIGHT_KEY, JSON.stringify(entries));
}

export function loadMediaEntries(): MediaEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(MEDIA_KEY);
    return raw ? (JSON.parse(raw) as MediaEntry[]) : [];
  } catch {
    return [];
  }
}

export function saveMediaEntries(entries: MediaEntry[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(MEDIA_KEY, JSON.stringify(entries));
}
