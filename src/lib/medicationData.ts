export interface Medication {
  id: string;
  name: string;
  dosage: string;
  scheduledTimes: string[]; // e.g. ["08:00", "20:00"] 24hr
  notes?: string;
  active: boolean;
  color?: string;
  createdAt: string;
}

export interface MedicationLog {
  id: string;
  medicationId: string;
  date: string; // YYYY-MM-DD local
  scheduledTime: string;
  taken: boolean;
  takenAt?: string; // ISO timestamp
  sideEffects?: string;
  notes?: string;
}

const MEDS_KEY = "wellness-medications";
const LOGS_KEY = "wellness-medication-logs";

export function todayDateString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

export function generateMedicationId(): string {
  return `med-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function generateLogId(): string {
  return `mlog-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function loadMedications(): Medication[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(MEDS_KEY);
    return raw ? (JSON.parse(raw) as Medication[]) : [];
  } catch {
    return [];
  }
}

export function saveMedications(meds: Medication[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(MEDS_KEY, JSON.stringify(meds));
}

export function loadMedicationLogs(): MedicationLog[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOGS_KEY);
    return raw ? (JSON.parse(raw) as MedicationLog[]) : [];
  } catch {
    return [];
  }
}

export function saveMedicationLogs(logs: MedicationLog[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
}

export function getTodayLogs(logs: MedicationLog[]): MedicationLog[] {
  const today = todayDateString();
  return logs.filter((l) => l.date === today);
}

export function getLogsForDate(logs: MedicationLog[], date: string): MedicationLog[] {
  return logs.filter((l) => l.date === date);
}
