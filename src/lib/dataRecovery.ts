"use client";

import { notifyAppDataUpdated } from "./appEvents";
import { isSupabaseConfigured } from "./supabase";

type JsonValue = unknown;

export type RecoveryCountKey =
  | "habits"
  | "routines"
  | "categories"
  | "checkIns"
  | "skills"
  | "conditioningItems"
  | "media"
  | "quotes"
  | "foodLogs"
  | "waterLogs"
  | "medicationLogs"
  | "weightLogs";

export type RecoverySnapshot = {
  activeStorageSource: string;
  detectedKeys: string[];
  counts: Record<RecoveryCountKey, number>;
  lastBackupKey: string | null;
};

const MIGRATION_MARKER_KEY = "habitflow-recovery-migration-v1";
const BACKUP_PREFIX = "habitflow-recovery-backup-";

export const CURRENT_STORAGE_KEYS = {
  habits: "habitflow-habits",
  completions: "habitflow-completions",
  categories: "habitflow-categories",
  routines: "habitflow-routines",
  routineEntriesPrefix: "habitflow-routine-entries-",
  dailyCheckins: "wellness-daily-checkins",
  danceCheckins: "danceflow-checkins",
  danceDaily: "danceflow-daily",
  danceSkills: "danceflow-skills",
  danceSkillLogs: "danceflow-skill-logs",
  trainingPlan: "danceflow-training-plan",
  trainingProgress: "danceflow-training-progress",
  conditioningRoutines: "wellness-conditioning-routines",
  conditioningSessions: "wellness-conditioning-sessions",
  media: "wellness-media",
  quotes: "wellness-quotes",
  weight: "wellness-weight",
} as const;

export const LEGACY_STORAGE_KEYS = {
  january2025Completions: "habitflow-completions-jan2025",
  january2025RoutineEntries: "habitflow-routine-entries-jan2025",
  nutrition: "wellness-nutrition",
  nutritionGoals: "wellness-nutrition-goals",
  waterEntries: "wellness-water-entries",
  waterGoal: "wellness-water-goal",
  medications: "wellness-medications",
  medicationLogs: "wellness-medication-logs",
} as const;

const APP_KEY_PREFIXES = ["habitflow-", "wellness-", "danceflow-"];

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function safeParse<T = JsonValue>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function isEmptyValue(value: JsonValue): boolean {
  if (value == null) return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.keys(value as Record<string, unknown>).length === 0;
  return false;
}

function readValue(key: string): JsonValue | null {
  if (!isBrowser()) return null;
  return safeParse(localStorage.getItem(key));
}

function writeValue(key: string, value: JsonValue): void {
  if (!isBrowser()) return;
  localStorage.setItem(key, JSON.stringify(value));
}

function getCurrentMonthRoutineEntriesKey(): string {
  const now = new Date();
  return `${CURRENT_STORAGE_KEYS.routineEntriesPrefix}${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getDetectedAppKeys(): string[] {
  if (!isBrowser()) return [];
  return Object.keys(localStorage)
    .filter((key) => APP_KEY_PREFIXES.some((prefix) => key.startsWith(prefix)))
    .sort();
}

function createAutomaticBackup(reason: string): string | null {
  if (!isBrowser()) return null;
  const detectedKeys = getDetectedAppKeys();
  if (detectedKeys.length === 0) return null;
  const backupKey = `${BACKUP_PREFIX}${new Date().toISOString()}`;
  const data = Object.fromEntries(detectedKeys.map((key) => [key, localStorage.getItem(key)]));
  writeValue(backupKey, {
    reason,
    createdAt: new Date().toISOString(),
    detectedKeys,
    data,
  });
  localStorage.setItem("habitflow-recovery-last-backup-key", backupKey);
  return backupKey;
}

function copyIfCurrentMissingOrEmpty(sourceKey: string, targetKey: string): boolean {
  const sourceValue = readValue(sourceKey);
  if (isEmptyValue(sourceValue)) return false;
  const targetValue = readValue(targetKey);
  if (!isEmptyValue(targetValue)) return false;
  writeValue(targetKey, sourceValue);
  return true;
}

function migrateJanuary2025Completions(): boolean {
  const legacy = readValue(LEGACY_STORAGE_KEYS.january2025Completions);
  const current = readValue(CURRENT_STORAGE_KEYS.completions);
  if (isEmptyValue(legacy) || !isEmptyValue(current)) return false;
  if (!legacy || typeof legacy !== "object" || Array.isArray(legacy)) return false;

  const byDate: Record<string, string[]> = {};
  for (const [habitId, days] of Object.entries(legacy as Record<string, unknown>)) {
    if (!Array.isArray(days)) continue;
    for (const day of days) {
      const dayNumber = Number(day);
      if (!Number.isFinite(dayNumber) || dayNumber < 1 || dayNumber > 31) continue;
      const date = `2025-01-${String(dayNumber).padStart(2, "0")}`;
      byDate[date] = [...(byDate[date] ?? []), habitId];
    }
  }

  if (Object.keys(byDate).length === 0) return false;
  writeValue(CURRENT_STORAGE_KEYS.completions, { completions: byDate });
  return true;
}

export function ensureDataRecoveryMigration(): void {
  if (!isBrowser()) return;
  if (localStorage.getItem(MIGRATION_MARKER_KEY)) return;

  const backupKey = createAutomaticBackup("before data recovery migration");
  const migrated = [
    migrateJanuary2025Completions(),
    copyIfCurrentMissingOrEmpty(LEGACY_STORAGE_KEYS.january2025RoutineEntries, getCurrentMonthRoutineEntriesKey()),
  ].some(Boolean);

  localStorage.setItem(
    MIGRATION_MARKER_KEY,
    JSON.stringify({ completedAt: new Date().toISOString(), backupKey, migrated }),
  );

  if (migrated) notifyAppDataUpdated();
}

function countArrayKey(key: string): number {
  const value = readValue(key);
  return Array.isArray(value) ? value.length : 0;
}

function countRoutineEntries(): number {
  const value = readValue(getCurrentMonthRoutineEntriesKey());
  return value && typeof value === "object" && !Array.isArray(value)
    ? Object.keys(value as Record<string, unknown>).length
    : 0;
}

export function getRecoverySnapshot(): RecoverySnapshot {
  if (!isBrowser()) {
    return {
      activeStorageSource: "server render",
      detectedKeys: [],
      counts: {
        habits: 0,
        routines: 0,
        categories: 0,
        checkIns: 0,
        skills: 0,
        conditioningItems: 0,
        media: 0,
        quotes: 0,
        foodLogs: 0,
        waterLogs: 0,
        medicationLogs: 0,
        weightLogs: 0,
      },
      lastBackupKey: null,
    };
  }

  const detectedKeys = getDetectedAppKeys();
  return {
    activeStorageSource: isSupabaseConfigured
      ? "localStorage primary cache with async Supabase sync"
      : "localStorage only",
    detectedKeys,
    counts: {
      habits: countArrayKey(CURRENT_STORAGE_KEYS.habits),
      routines: countArrayKey(CURRENT_STORAGE_KEYS.routines) + countRoutineEntries(),
      categories: countArrayKey(CURRENT_STORAGE_KEYS.categories),
      checkIns: countArrayKey(CURRENT_STORAGE_KEYS.dailyCheckins) + countArrayKey(CURRENT_STORAGE_KEYS.danceCheckins),
      skills: countArrayKey(CURRENT_STORAGE_KEYS.danceSkills) + countArrayKey(CURRENT_STORAGE_KEYS.danceSkillLogs),
      conditioningItems:
        countArrayKey(CURRENT_STORAGE_KEYS.conditioningRoutines) +
        countArrayKey(CURRENT_STORAGE_KEYS.conditioningSessions),
      media: countArrayKey(CURRENT_STORAGE_KEYS.media),
      quotes: countArrayKey(CURRENT_STORAGE_KEYS.quotes),
      foodLogs: countArrayKey(LEGACY_STORAGE_KEYS.nutrition),
      waterLogs: countArrayKey(LEGACY_STORAGE_KEYS.waterEntries),
      medicationLogs:
        countArrayKey(LEGACY_STORAGE_KEYS.medications) + countArrayKey(LEGACY_STORAGE_KEYS.medicationLogs),
      weightLogs: countArrayKey(CURRENT_STORAGE_KEYS.weight),
    },
    lastBackupKey: localStorage.getItem("habitflow-recovery-last-backup-key"),
  };
}

export function exportBackupJson(): string {
  if (!isBrowser()) return "{}";
  const detectedKeys = getDetectedAppKeys();
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      detectedKeys,
      data: Object.fromEntries(detectedKeys.map((key) => [key, localStorage.getItem(key)])),
    },
    null,
    2,
  );
}

export function importBackupJson(raw: string): void {
  if (!isBrowser()) return;
  const parsed = safeParse<{ data?: Record<string, string | null> }>(raw);
  if (!parsed?.data || typeof parsed.data !== "object") {
    throw new Error("Backup JSON does not contain a data object.");
  }

  createAutomaticBackup("before data recovery import");
  for (const [key, value] of Object.entries(parsed.data)) {
    if (!APP_KEY_PREFIXES.some((prefix) => key.startsWith(prefix))) continue;
    if (value === null) continue;
    localStorage.setItem(key, value);
  }
  notifyAppDataUpdated();
}
