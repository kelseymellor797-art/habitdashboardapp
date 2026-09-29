import { notifyAppDataUpdated } from "./appEvents";
import { ensureDataRecoveryMigration } from "./dataRecovery";
import { saveRemoteCollectionById, syncCollection } from "./supabaseSync";

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
const TRAINING_PROGRESS_KEY = "danceflow-training-progress";

export type TrainingProgressType =
  | "Strength"
  | "Flexibility"
  | "Pole trick"
  | "Conditioning"
  | "Endurance"
  | "Balance"
  | "Confidence"
  | "Choreo"
  | "Recovery"
  | "Weight"
  | "Wins";

export interface TrainingProgressEntry {
  id: string;
  date: string;
  types: TrainingProgressType[];
  strength?: {
    movement?: string;
    previousLevel?: string;
    currentLevel?: string;
    metric?: string;
    notes?: string;
  };
  flexibility?: {
    area?: string;
    status?: "Tight" | "Improving" | "Close" | "Hit it" | "Regressed" | "";
    measurement?: string;
    notes?: string;
  };
  poleTrick?: {
    skillName?: string;
    skillId?: string;
    attempts?: number;
    status?: "Attempted" | "Improved" | "Landed once" | "Landed consistently" | "Cleaned up" | "Mastered" | "";
    side?: "Right" | "Left" | "Both" | "";
    spottingNeeded?: boolean;
    confidence?: number;
    notes?: string;
    mediaId?: string;
    updateSkillStatus?: boolean;
  };
  conditioning?: {
    routineName?: string;
    routineId?: string;
    completed?: boolean;
    difficulty?: number;
    notes?: string;
  };
  weight?: {
    value?: number;
    unit?: "kg" | "lbs";
    notes?: string;
  };
  win?: {
    biggestWin?: string;
    improved?: string;
    needsWork?: string;
    nextTime?: string;
  };
  createdAt: string;
  updatedAt: string;
  legacyWeightId?: string;
}

type WeightEntryRow = {
  id: string;
  date: string;
  weight_kg: number;
  body_fat_pct: number | null;
  measurements: WeightEntry["measurements"] | null;
  notes: string | null;
  created_at: string | null;
};

type MediaEntryRow = {
  id: string;
  title: string;
  date: string;
  url: string;
  tags: MediaTag[];
  skill_name: string | null;
  confidence_rating: number | null;
  notes: string | null;
  created_at: string | null;
};

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

export function generateTrainingProgressId(): string {
  return `tp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function readWeightCache(): WeightEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(WEIGHT_KEY);
    return raw ? (JSON.parse(raw) as WeightEntry[]) : [];
  } catch {
    return [];
  }
}

function writeWeightCache(entries: WeightEntry[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(WEIGHT_KEY, JSON.stringify(entries));
}

function readMediaCache(): MediaEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(MEDIA_KEY);
    return raw ? (JSON.parse(raw) as MediaEntry[]) : [];
  } catch {
    return [];
  }
}

function writeMediaCache(entries: MediaEntry[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(MEDIA_KEY, JSON.stringify(entries));
}

function weightEntryToTrainingProgress(entry: WeightEntry): TrainingProgressEntry {
  return {
    id: `legacy-${entry.id}`,
    date: entry.date,
    types: ["Weight"],
    weight: {
      value: Math.round(entry.weightKg * 10) / 10,
      unit: "kg",
      notes: entry.notes,
    },
    win: entry.notes ? { biggestWin: "", improved: "", needsWork: "", nextTime: entry.notes } : undefined,
    createdAt: entry.createdAt,
    updatedAt: entry.createdAt,
    legacyWeightId: entry.id,
  };
}

function readTrainingProgressCache(): TrainingProgressEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(TRAINING_PROGRESS_KEY);
    const parsed = raw ? (JSON.parse(raw) as TrainingProgressEntry[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeTrainingProgressCache(entries: TrainingProgressEntry[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TRAINING_PROGRESS_KEY, JSON.stringify(entries));
}

function weightFromRow(row: WeightEntryRow): WeightEntry {
  return {
    id: row.id,
    date: row.date,
    weightKg: row.weight_kg,
    bodyFatPct: row.body_fat_pct ?? undefined,
    measurements: row.measurements ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at ?? new Date().toISOString(),
  };
}

function weightToRow(entry: WeightEntry): WeightEntryRow {
  return {
    id: entry.id,
    date: entry.date,
    weight_kg: entry.weightKg,
    body_fat_pct: entry.bodyFatPct ?? null,
    measurements: entry.measurements ?? null,
    notes: entry.notes ?? null,
    created_at: entry.createdAt,
  };
}

function mediaFromRow(row: MediaEntryRow): MediaEntry {
  return {
    id: row.id,
    title: row.title,
    date: row.date,
    url: row.url,
    tags: row.tags ?? [],
    skillName: row.skill_name ?? undefined,
    confidenceRating: row.confidence_rating ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at ?? new Date().toISOString(),
  };
}

function mediaToRow(entry: MediaEntry): MediaEntryRow {
  return {
    id: entry.id,
    title: entry.title,
    date: entry.date,
    url: entry.url,
    tags: entry.tags,
    skill_name: entry.skillName ?? null,
    confidence_rating: entry.confidenceRating ?? null,
    notes: entry.notes ?? null,
    created_at: entry.createdAt,
  };
}

export function loadWeightEntries(): WeightEntry[] {
  if (typeof window === "undefined") return [];
  ensureDataRecoveryMigration();
  const entries = readWeightCache();
  syncCollection({
    key: WEIGHT_KEY,
    table: "weight_entries",
    localData: entries,
    readCache: readWeightCache,
    writeCache: writeWeightCache,
    fromRow: weightFromRow,
    toRow: weightToRow,
    orderBy: "date",
  });
  return entries;
}

export function saveWeightEntries(entries: WeightEntry[]): void {
  if (typeof window === "undefined") return;
  writeWeightCache(entries);
  saveRemoteCollectionById("weight_entries", "id", entries, (entry) => entry.id, weightToRow);
  notifyAppDataUpdated();
}

export async function saveWeightEntriesAsync(entries: WeightEntry[]): Promise<void> {
  if (typeof window === "undefined") throw new Error("Cannot save weight entries outside the browser.");
  writeWeightCache(entries);
  const persisted = readWeightCache();
  if (persisted.length !== entries.length) {
    throw new Error("Weight save could not be verified.");
  }
  saveRemoteCollectionById("weight_entries", "id", entries, (entry) => entry.id, weightToRow);
  notifyAppDataUpdated();
}

export function loadMediaEntries(): MediaEntry[] {
  if (typeof window === "undefined") return [];
  ensureDataRecoveryMigration();
  const entries = readMediaCache();
  syncCollection({
    key: MEDIA_KEY,
    table: "media_entries",
    localData: entries,
    readCache: readMediaCache,
    writeCache: writeMediaCache,
    fromRow: mediaFromRow,
    toRow: mediaToRow,
    orderBy: "date",
  });
  return entries;
}

export function saveMediaEntries(entries: MediaEntry[]): void {
  if (typeof window === "undefined") return;
  writeMediaCache(entries);
  saveRemoteCollectionById("media_entries", "id", entries, (entry) => entry.id, mediaToRow);
  notifyAppDataUpdated();
}

export function loadTrainingProgressEntries(): TrainingProgressEntry[] {
  if (typeof window === "undefined") return [];
  ensureDataRecoveryMigration();
  const entries = readTrainingProgressCache();
  if (entries.length > 0) return entries;

  const migratedWeights = readWeightCache().map(weightEntryToTrainingProgress);
  if (migratedWeights.length > 0) {
    writeTrainingProgressCache(migratedWeights);
    return migratedWeights;
  }
  return [];
}

export async function saveTrainingProgressEntries(entries: TrainingProgressEntry[]): Promise<void> {
  if (typeof window === "undefined") throw new Error("Cannot save progress entries outside the browser.");
  writeTrainingProgressCache(entries);
  const persisted = readTrainingProgressCache();
  const expectedIds = new Set(entries.map((entry) => entry.id));
  const allSaved = persisted.length === entries.length && persisted.every((entry) => expectedIds.has(entry.id));
  if (!allSaved) {
    throw new Error("Progress entry save could not be verified.");
  }
  notifyAppDataUpdated();
}
