// ── Types ──────────────────────────────────────────────────────────────────────

export type ScoreValue = 0 | 1 | 2 | 3;

export type DanceCategoryKey =
  | "strength"
  | "flexibility"
  | "technique"
  | "pole"
  | "performance"
  | "confidence"
  | "consistency"
  | "recovery";

export type DanceChecklistItem = {
  id: string;
  category: DanceCategoryKey;
  subcategory?: string;
  label: string;
};

export type DanceChecklistScore = {
  itemId: string;
  score: ScoreValue;
};

export type DanceReflection = {
  wins: string;
  evidenceOfProgress: string;
  needsPatience: string;
  nextWeekStrengthGoal: string;
  nextWeekFlexibilityGoal: string;
  nextWeekTechniqueGoal: string;
  notes: string;
};

export type DanceDailyStatus = {
  date: string;          // YYYY-MM-DD
  mood: number;          // 1–5
  soreness: number;      // 1–5
  confidence: number;    // 1–5
  trainedToday: boolean;
  notes: string;
};

export type DanceCheckIn = {
  id: string;
  weekOf: string;        // YYYY-MM-DD (Monday of that week)
  scores: DanceChecklistScore[];
  reflection: DanceReflection;
  createdAt: string;
  updatedAt: string;
};

// ── Category config ────────────────────────────────────────────────────────────

export type CategoryConfig = {
  key: DanceCategoryKey;
  label: string;
  icon: string;
  color: string;
};

export const DANCE_CATEGORIES: CategoryConfig[] = [
  { key: "strength",    label: "Strength",                icon: "💪", color: "#8b5cf6" },
  { key: "flexibility", label: "Flexibility",              icon: "🌸", color: "#ec4899" },
  { key: "technique",   label: "Technique",                icon: "✨", color: "#0ea5e9" },
  { key: "pole",        label: "Pole Progress",            icon: "🎯", color: "#f59e0b" },
  { key: "performance", label: "Musicality & Performance", icon: "🎵", color: "#10b981" },
  { key: "confidence",  label: "Confidence",               icon: "🌟", color: "#f43f5e" },
  { key: "consistency", label: "Consistency",              icon: "📅", color: "#6366f1" },
  { key: "recovery",    label: "Recovery",                 icon: "🌿", color: "#14b8a6" },
];

// ── Checklist items ────────────────────────────────────────────────────────────

export const DANCE_ITEMS: DanceChecklistItem[] = [
  // Strength — Upper body
  { id: "str-ub-1", category: "strength", subcategory: "Upper body", label: "I can pull myself with more control than last week" },
  { id: "str-ub-2", category: "strength", subcategory: "Upper body", label: "My grip lasts longer" },
  { id: "str-ub-3", category: "strength", subcategory: "Upper body", label: "I feel less shaky in holds" },
  { id: "str-ub-4", category: "strength", subcategory: "Upper body", label: "I can repeat combos without burning out as fast" },
  // Strength — Core
  { id: "str-c-1", category: "strength", subcategory: "Core", label: "I feel more stable when lifting my legs" },
  { id: "str-c-2", category: "strength", subcategory: "Core", label: "I can engage my core faster on cue" },
  { id: "str-c-3", category: "strength", subcategory: "Core", label: "My transitions feel less floppy" },
  { id: "str-c-4", category: "strength", subcategory: "Core", label: "I recover balance faster after a wobble" },
  // Strength — Lower body
  { id: "str-lb-1", category: "strength", subcategory: "Lower body", label: "My legs feel more active and pointed when needed" },
  { id: "str-lb-2", category: "strength", subcategory: "Lower body", label: "I can hold turnout/extension with more control" },
  { id: "str-lb-3", category: "strength", subcategory: "Lower body", label: "My glutes are engaging better" },
  { id: "str-lb-4", category: "strength", subcategory: "Lower body", label: "My calves/ankles feel stronger and more supportive" },
  // Flexibility
  { id: "flex-1", category: "flexibility", label: "My warm-up feels easier than it used to" },
  { id: "flex-2", category: "flexibility", label: "I reach end range with less resistance" },
  { id: "flex-3", category: "flexibility", label: "My splits look or feel a little cleaner" },
  { id: "flex-4", category: "flexibility", label: "My back/shoulders open more comfortably" },
  { id: "flex-5", category: "flexibility", label: "My flexibility feels more usable in movement, not just static stretching" },
  // Technique
  { id: "tech-1", category: "technique", label: "My lines look cleaner" },
  { id: "tech-2", category: "technique", label: "I point my toes more consistently" },
  { id: "tech-3", category: "technique", label: "I remember to engage the right muscles faster" },
  { id: "tech-4", category: "technique", label: "My transitions are smoother" },
  { id: "tech-5", category: "technique", label: "I need fewer retries to get something right" },
  { id: "tech-6", category: "technique", label: "I can tell the difference between strong and collapsed in my body" },
  // Pole
  { id: "pole-1", category: "pole", label: "My climbs feel easier" },
  { id: "pole-2", category: "pole", label: "I waste less energy getting into position" },
  { id: "pole-3", category: "pole", label: "My spins feel more controlled" },
  { id: "pole-4", category: "pole", label: "I can hold shapes a little longer" },
  { id: "pole-5", category: "pole", label: "My bracket/grip/contact points make more sense now" },
  { id: "pole-6", category: "pole", label: "I feel less scared upside down or in unfamiliar positions" },
  { id: "pole-7", category: "pole", label: "I can repeat combos with better consistency" },
  // Performance
  { id: "perf-1", category: "performance", label: "I feel more connected to the music" },
  { id: "perf-2", category: "performance", label: "I move with more intention, not just doing moves" },
  { id: "perf-3", category: "performance", label: "My freestyles feel less awkward" },
  { id: "perf-4", category: "performance", label: "I'm getting better at pacing and breathing" },
  { id: "perf-5", category: "performance", label: "I can stay present instead of overthinking every second" },
  { id: "perf-6", category: "performance", label: "I feel more expressive, more like myself while dancing" },
  // Confidence
  { id: "conf-1", category: "confidence", label: "I recover faster when I get frustrated" },
  { id: "conf-2", category: "confidence", label: "I don't quit as quickly when something feels hard" },
  { id: "conf-3", category: "confidence", label: "I can keep training even if a session isn't perfect" },
  { id: "conf-4", category: "confidence", label: "I trust my body more than I did before" },
  { id: "conf-5", category: "confidence", label: "I can tell the difference between fatigue and failure" },
  { id: "conf-6", category: "confidence", label: "I speak to myself better during practice" },
  // Consistency
  { id: "cons-1", category: "consistency", label: "I showed up to train" },
  { id: "cons-2", category: "consistency", label: "I completed my warm-up" },
  { id: "cons-3", category: "consistency", label: "I practiced even if I felt off" },
  { id: "cons-4", category: "consistency", label: "I kept my breaks reasonable" },
  { id: "cons-5", category: "consistency", label: "I trained with intention, not just randomly" },
  { id: "cons-6", category: "consistency", label: "I gave at least one area focused attention" },
  // Recovery
  { id: "rec-1", category: "recovery", label: "I slept enough to recover" },
  { id: "rec-2", category: "recovery", label: "I ate enough to support training" },
  { id: "rec-3", category: "recovery", label: "I hydrated" },
  { id: "rec-4", category: "recovery", label: "I rested when my body actually needed it" },
  { id: "rec-5", category: "recovery", label: "I noticed soreness without making it mean something dramatic" },
  { id: "rec-6", category: "recovery", label: "I adjusted intensity instead of forcing perfection" },
];

// ── Storage ────────────────────────────────────────────────────────────────────

export const DANCE_CHECKINS_KEY = "danceflow-checkins";
export const DANCE_DAILY_KEY    = "danceflow-daily";

export function loadCheckIns(): DanceCheckIn[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(DANCE_CHECKINS_KEY);
    return raw ? (JSON.parse(raw) as DanceCheckIn[]) : [];
  } catch { return []; }
}

export function saveCheckIns(checkIns: DanceCheckIn[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(DANCE_CHECKINS_KEY, JSON.stringify(checkIns));
}

export function loadDailyStatuses(): DanceDailyStatus[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(DANCE_DAILY_KEY);
    return raw ? (JSON.parse(raw) as DanceDailyStatus[]) : [];
  } catch { return []; }
}

export function saveDailyStatuses(statuses: DanceDailyStatus[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(DANCE_DAILY_KEY, JSON.stringify(statuses));
}

// ── Date helpers ───────────────────────────────────────────────────────────────

/** Returns YYYY-MM-DD for the Monday of the given date's week */
export function getWeekStart(date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

export function formatWeekRange(weekStart: string): string {
  const start = new Date(weekStart + "T00:00:00");
  const end   = new Date(start);
  end.setDate(start.getDate() + 6);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${start.toLocaleDateString("en-US", opts)} – ${end.toLocaleDateString("en-US", opts)}`;
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function generateDanceId(): string {
  return `dc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// ── Analytics helpers ──────────────────────────────────────────────────────────

export function getCategoryAvg(checkIn: DanceCheckIn, catKey: DanceCategoryKey): number {
  const items = DANCE_ITEMS.filter((i) => i.category === catKey);
  if (!items.length) return 0;
  const total = items.reduce((sum, item) => {
    const s = checkIn.scores.find((sc) => sc.itemId === item.id);
    return sum + (s?.score ?? 0);
  }, 0);
  return Math.round((total / items.length) * 10) / 10;
}

export function getWeekAvg(checkIn: DanceCheckIn): number {
  if (!DANCE_ITEMS.length) return 0;
  const total = DANCE_ITEMS.reduce((sum, item) => {
    const s = checkIn.scores.find((sc) => sc.itemId === item.id);
    return sum + (s?.score ?? 0);
  }, 0);
  return Math.round((total / DANCE_ITEMS.length) * 10) / 10;
}

export function getStrongestCategory(checkIn: DanceCheckIn): DanceCategoryKey {
  return DANCE_CATEGORIES.reduce((best, cat) =>
    getCategoryAvg(checkIn, cat.key) >= getCategoryAvg(checkIn, best.key) ? cat : best
  , DANCE_CATEGORIES[0]).key;
}

export function getWeakestCategory(checkIn: DanceCheckIn): DanceCategoryKey {
  return DANCE_CATEGORIES.reduce((worst, cat) =>
    getCategoryAvg(checkIn, cat.key) <= getCategoryAvg(checkIn, worst.key) ? cat : worst
  , DANCE_CATEGORIES[0]).key;
}

export function getMostImproved(
  current: DanceCheckIn,
  previous: DanceCheckIn | null
): DanceCategoryKey | null {
  if (!previous) return null;
  return DANCE_CATEGORIES.reduce((best, cat) => {
    const catDelta  = getCategoryAvg(current, cat.key)  - getCategoryAvg(previous, cat.key);
    const bestDelta = getCategoryAvg(current, best.key) - getCategoryAvg(previous, best.key);
    return catDelta > bestDelta ? cat : best;
  }, DANCE_CATEGORIES[0]).key;
}

export function getScoreLabel(avg: number): string {
  if (avg < 1)   return "Needs support";
  if (avg < 2)   return "Building";
  if (avg < 2.6) return "Solid";
  return "Strong";
}

export function emptyReflection(): DanceReflection {
  return {
    wins: "", evidenceOfProgress: "", needsPatience: "",
    nextWeekStrengthGoal: "", nextWeekFlexibilityGoal: "",
    nextWeekTechniqueGoal: "", notes: "",
  };
}

export function emptyScores(): DanceChecklistScore[] {
  return DANCE_ITEMS.map((item) => ({ itemId: item.id, score: 0 as ScoreValue }));
}
