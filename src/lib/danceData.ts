import { notifyAppDataUpdated } from "./appEvents";
import { ensureDataRecoveryMigration } from "./dataRecovery";
import { isSupabaseConfigured, supabase } from "./supabase";
import { getUserId, saveRemoteCollectionById, syncCollection } from "./supabaseSync";

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
  trainingStatus?: "yes" | "no" | "light" | "";
  trainingFocus?: string[];
  energy?: number;
  painNotes?: string;
  bodyFelt?: string[];
  trainingQuality?: string;
  smallWin?: string;
  needsWork?: string;
  tomorrowNotes?: string;
  followedPlan?: "yes" | "partly" | "no" | "";
  skillsPracticed?: string[];
  conditioningCompleted?: string[];
  mediaLinked?: string[];
  goalsWorkedOn?: string[];
  goalProgressNotes?: string;
};

export type DanceCheckIn = {
  id: string;
  weekOf: string;        // YYYY-MM-DD (Monday of that week)
  scores: DanceChecklistScore[];
  reflection: DanceReflection;
  createdAt: string;
  updatedAt: string;
};

export type TrainingGoal = {
  id: string;
  title: string;
  category: "Skill" | "Strength" | "Flexibility" | "Conditioning" | "Confidence" | "Performance" | "Recovery";
  status: "Not started" | "Working on it" | "Improving" | "Almost there" | "Mastered" | "Paused";
  targetDate?: string;
  notes?: string;
  progressUpdates: { id: string; date: string; text: string }[];
  createdAt: string;
  updatedAt: string;
};

export type WeeklyTrainingDay = {
  plannedFocus: string;
  plannedSkills: string;
  plannedConditioning: string;
  recoveryNotes: string;
  restDay: boolean;
};

export type TrainingPlan = {
  currentFocus: {
    mainFocus: string;
    secondaryFocus: string;
    prioritySkills: string;
    conditioningPriorities: string;
    flexibilityPriorities: string;
  };
  realityCheck: {
    confident: string;
    stuck: string;
    avoiding: string;
    closeToImproving: string;
    unsafeNeedsSpotting: string;
  };
  bodyStatus: {
    energyBaseline: string;
    flexibilityStatus: string;
    strengthStatus: string;
    balanceStatus: string;
    injuryConcerns: string;
    medicationSorenessFatigue: string;
  };
  goals: TrainingGoal[];
  weeklyMap: Record<string, WeeklyTrainingDay>;
  updatedAt: string;
};

export type DailyTrainingFocusCategory =
  | "Pole tricks"
  | "Spin pole"
  | "Static pole"
  | "Heels"
  | "Floorwork"
  | "Flexibility"
  | "Strength"
  | "Conditioning"
  | "Core"
  | "Choreo"
  | "Freestyle"
  | "Mobility"
  | "Custom";

export type DailyTrainingIntensity = "low" | "medium" | "high";
export type DailyTrainingSectionCategory = "Training Prep" | "Warm Up" | "Break" | "Training Session" | "Training Clean Up";
export type DailyTrainingDifficulty = "Easy" | "Medium" | "Hard" | "Goal";

export type DailyTrainingFocus = {
  id: string;
  label: string;
  type: DailyTrainingFocusCategory;
  notes: string;
  minutes: number;
  itemType: "field" | "focus";
  difficulty: DailyTrainingDifficulty;
  completed: boolean;
  sortOrder: number;
};

export type DailyTrainingSection = {
  id: string;
  category: DailyTrainingSectionCategory;
  title: string;
  minutes: number;
  notes: string;
  countsAsActiveTime: boolean;
  completed: boolean;
  focusAreas: DailyTrainingFocus[];
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type DailyTrainingPlan = {
  id: string;
  date: string;
  title: string;
  sections: DailyTrainingSection[];
  activeTrainingTime: number;
  totalPlanTime: number;
  totalBlockedTime: number;
  breakPrepCleanupTime: number;
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
export const TRAINING_PLAN_KEY  = "danceflow-training-plan";
export const DAILY_TRAINING_PLANS_KEY = "danceflow-daily-training-plans";

type DanceCheckInRow = {
  id: string;
  week_of: string;
  scores: DanceChecklistScore[];
  reflection: DanceReflection;
  created_at: string | null;
  updated_at: string | null;
};

type DanceDailyStatusRow = {
  date: string;
  mood: number;
  soreness: number;
  confidence: number;
  trained_today: boolean;
  notes: string | null;
};

type DailyTrainingPlanRow = {
  id?: string;
  date: string;
  title?: string | null;
  training_prep?: LegacyBasicSection;
  warm_up?: LegacyBasicSection;
  break_1?: LegacyBasicSection;
  training_session_1?: LegacyTrainingSession;
  break_2?: LegacyBasicSection;
  training_session_2?: LegacyTrainingSession;
  break_3?: LegacyBasicSection;
  training_session_3?: LegacyTrainingSession;
  training_clean_up?: LegacyBasicSection;
  active_training_time: number;
  total_plan_time?: number;
  total_blocked_time: number;
  break_prep_cleanup_time: number;
  created_at: string | null;
  updated_at: string | null;
};

type DailyTrainingSectionRow = {
  id: string;
  plan_id: string;
  type?: DailyTrainingSectionCategory | null;
  category: DailyTrainingSectionCategory;
  title: string;
  notes: string | null;
  minutes: number;
  counts_as_active_time: boolean;
  completed: boolean;
  sort_order: number;
  created_at: string | null;
  updated_at: string | null;
};

type DailyTrainingFocusRow = {
  id: string;
  section_id: string;
  label: string;
  type?: DailyTrainingFocusCategory | null;
  notes?: string | null;
  minutes?: number | null;
  item_type?: "field" | "focus" | null;
  difficulty?: DailyTrainingDifficulty | null;
  completed: boolean;
  sort_order: number;
  created_at: string | null;
  updated_at: string | null;
};

type LegacyBasicSection = {
  minutes?: number;
  notes?: string;
};

type LegacyTrainingFocus = {
  id?: string;
  name?: string;
  label?: string;
  category?: DailyTrainingFocusCategory;
  type?: DailyTrainingFocusCategory;
  notes?: string;
  minutes?: number;
  itemType?: "field" | "focus";
  item_type?: "field" | "focus";
  completed?: boolean;
  difficulty?: DailyTrainingDifficulty;
};

type LegacyTrainingSession = LegacyBasicSection & {
  completed?: boolean;
  intensity?: DailyTrainingIntensity;
  focusAreas?: LegacyTrainingFocus[];
};

type LegacyDailyTrainingPlan = {
  trainingPrep?: LegacyBasicSection;
  warmUp?: LegacyBasicSection;
  break1?: LegacyBasicSection;
  trainingSession1?: LegacyTrainingSession;
  break2?: LegacyBasicSection;
  trainingSession2?: LegacyTrainingSession;
  break3?: LegacyBasicSection;
  trainingSession3?: LegacyTrainingSession;
  trainingCleanUp?: LegacyBasicSection;
};

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
export const DAILY_TRAINING_FOCUS_CATEGORIES: DailyTrainingFocusCategory[] = [
  "Pole tricks",
  "Spin pole",
  "Static pole",
  "Heels",
  "Floorwork",
  "Flexibility",
  "Strength",
  "Conditioning",
  "Core",
  "Choreo",
  "Freestyle",
  "Mobility",
  "Custom",
];

export const DAILY_TRAINING_SECTION_CATEGORIES: DailyTrainingSectionCategory[] = [
  "Training Prep",
  "Warm Up",
  "Break",
  "Training Session",
  "Training Clean Up",
];

export const DAILY_TRAINING_DIFFICULTIES: DailyTrainingDifficulty[] = ["Easy", "Medium", "Hard", "Goal"];

function generateTrainingPlanId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `plan-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function generateTrainingSectionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `section-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function generateTrainingFocusId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `focus-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function defaultCountsAsActiveTime(category: DailyTrainingSectionCategory): boolean {
  return category === "Warm Up" || category === "Training Session";
}

function blankFocus(index: number): DailyTrainingFocus {
  return {
    id: generateTrainingFocusId(),
    label: "",
    type: "Pole tricks",
    notes: "",
    minutes: 0,
    itemType: "focus",
    difficulty: "Medium",
    completed: false,
    sortOrder: index,
  };
}

export function blankTrainingSectionItem(index: number, itemType: "field" | "focus" = "field"): DailyTrainingFocus {
  return {
    id: generateTrainingFocusId(),
    label: "",
    type: "Pole tricks",
    notes: "",
    minutes: 0,
    itemType,
    difficulty: "Medium",
    completed: false,
    sortOrder: index,
  };
}

function itemFromLabel(label: string, index: number, itemType: "field" | "focus" = "field", minutes = 0): DailyTrainingFocus {
  return {
    ...blankTrainingSectionItem(index, itemType),
    label,
    minutes,
  };
}

function defaultSectionItems(category: DailyTrainingSectionCategory): DailyTrainingFocus[] {
  switch (category) {
    case "Training Prep":
      return ["Set up pole", "Fill water bottle", "Clear floor"].map((label, index) => itemFromLabel(label, index));
    case "Warm Up":
      return ["Wrists", "Shoulders", "Hips", "Core activation"].map((label, index) => itemFromLabel(label, index));
    case "Break":
      return ["Water", "Grip check"].map((label, index) => itemFromLabel(label, index));
    case "Training Session":
      return [0, 1, 2].map(blankFocus);
    case "Training Clean Up":
      return ["Cool down stretch", "Clean floor", "Log notes"].map((label, index) => itemFromLabel(label, index));
  }
}

export function blankTrainingSection(
  category: DailyTrainingSectionCategory,
  sortOrder: number,
  title?: string,
  minutes = 0,
): DailyTrainingSection {
  const now = new Date().toISOString();
  return {
    id: generateTrainingSectionId(),
    category,
    title: title ?? category,
    minutes,
    notes: "",
    countsAsActiveTime: defaultCountsAsActiveTime(category),
    completed: false,
    focusAreas: defaultSectionItems(category),
    sortOrder,
    createdAt: now,
    updatedAt: now,
  };
}

export function calculateDailyTrainingPlan(plan: DailyTrainingPlan): Pick<DailyTrainingPlan, "activeTrainingTime" | "totalPlanTime" | "totalBlockedTime" | "breakPrepCleanupTime"> {
  const sections = plan.sections ?? [];
  const activeTrainingTime = sections.reduce((sum, section) => sum + (section.countsAsActiveTime ? section.minutes : 0), 0);
  const totalPlanTime = sections.reduce((sum, section) => sum + section.minutes, 0);
  return {
    activeTrainingTime,
    totalPlanTime,
    totalBlockedTime: totalPlanTime,
    breakPrepCleanupTime: totalPlanTime - activeTrainingTime,
  };
}

export function emptyDailyTrainingPlan(date = todayISO()): DailyTrainingPlan {
  const now = new Date().toISOString();
  const plan: DailyTrainingPlan = {
    id: generateTrainingPlanId(),
    date,
    title: "Daily Training Plan",
    sections: [
      blankTrainingSection("Training Prep", 0, "Training Prep", 10),
      blankTrainingSection("Warm Up", 1, "Warm Up", 20),
      blankTrainingSection("Break", 2, "Break", 5),
      blankTrainingSection("Training Session", 3, "Training Session 1", 30),
      blankTrainingSection("Break", 4, "Break", 5),
      blankTrainingSection("Training Session", 5, "Training Session 2", 30),
      blankTrainingSection("Break", 6, "Break", 5),
      blankTrainingSection("Training Session", 7, "Training Session 3", 30),
      blankTrainingSection("Training Clean Up", 8, "Training Clean Up", 10),
    ],
    activeTrainingTime: 0,
    totalPlanTime: 0,
    totalBlockedTime: 0,
    breakPrepCleanupTime: 0,
    createdAt: now,
    updatedAt: now,
  };
  return { ...plan, ...calculateDailyTrainingPlan(plan) };
}

export function emptyTrainingPlan(): TrainingPlan {
  return {
    currentFocus: {
      mainFocus: "",
      secondaryFocus: "",
      prioritySkills: "",
      conditioningPriorities: "",
      flexibilityPriorities: "",
    },
    realityCheck: {
      confident: "",
      stuck: "",
      avoiding: "",
      closeToImproving: "",
      unsafeNeedsSpotting: "",
    },
    bodyStatus: {
      energyBaseline: "",
      flexibilityStatus: "",
      strengthStatus: "",
      balanceStatus: "",
      injuryConcerns: "",
      medicationSorenessFatigue: "",
    },
    goals: [],
    weeklyMap: Object.fromEntries(
      WEEKDAYS.map((day) => [
        day,
        { plannedFocus: "", plannedSkills: "", plannedConditioning: "", recoveryNotes: "", restDay: false },
      ]),
    ),
    updatedAt: new Date().toISOString(),
  };
}

function readCheckInsCache(): DanceCheckIn[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(DANCE_CHECKINS_KEY);
    return raw ? (JSON.parse(raw) as DanceCheckIn[]) : [];
  } catch {
    return [];
  }
}

function writeCheckInsCache(checkIns: DanceCheckIn[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(DANCE_CHECKINS_KEY, JSON.stringify(checkIns));
}

function readDailyStatusesCache(): DanceDailyStatus[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(DANCE_DAILY_KEY);
    const parsed = raw ? (JSON.parse(raw) as DanceDailyStatus[]) : [];
    return Array.isArray(parsed) ? parsed.map(normalizeDailyStatus) : [];
  } catch {
    return [];
  }
}

function writeDailyStatusesCache(statuses: DanceDailyStatus[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(DANCE_DAILY_KEY, JSON.stringify(statuses));
}

function normalizeFocus(focus: Partial<DailyTrainingFocus> & LegacyTrainingFocus, index: number): DailyTrainingFocus {
  return {
    id: focus.id || generateTrainingFocusId(),
    label: focus.label ?? focus.name ?? "",
    type: focus.type ?? focus.category ?? "Pole tricks",
    notes: focus.notes ?? "",
    minutes: Number.isFinite(focus.minutes) ? Math.max(0, Number(focus.minutes)) : 0,
    itemType: focus.itemType ?? focus.item_type ?? "focus",
    difficulty: focus.difficulty ?? "Medium",
    completed: Boolean(focus.completed),
    sortOrder: Number.isFinite(focus.sortOrder) ? Number(focus.sortOrder) : index,
  };
}

function normalizeSection(
  section: Partial<DailyTrainingSection> | undefined,
  fallback: { category: DailyTrainingSectionCategory; title: string; minutes: number; sortOrder: number },
): DailyTrainingSection {
  const category = section?.category ?? fallback.category;
  const fallbackItems = defaultSectionItems(category);
  const rawItems = Array.isArray(section?.focusAreas) ? section.focusAreas : [];
  const focusAreas = rawItems.length > 0
    ? rawItems.map((focus, index) => normalizeFocus({ ...focus, itemType: focus.itemType ?? (category === "Training Session" ? "focus" : "field") }, index))
    : fallbackItems;
  const now = new Date().toISOString();
  return {
    id: section?.id || generateTrainingSectionId(),
    category,
    title: section?.title ?? fallback.title,
    minutes: Number.isFinite(section?.minutes) ? Math.max(0, Number(section?.minutes)) : fallback.minutes,
    notes: section?.notes ?? "",
    countsAsActiveTime: typeof section?.countsAsActiveTime === "boolean" ? section.countsAsActiveTime : defaultCountsAsActiveTime(category),
    completed: Boolean(section?.completed),
    focusAreas: focusAreas.sort((a, b) => a.sortOrder - b.sortOrder),
    sortOrder: Number.isFinite(section?.sortOrder) ? Number(section?.sortOrder) : fallback.sortOrder,
    createdAt: section?.createdAt ?? now,
    updatedAt: section?.updatedAt ?? now,
  };
}

function legacyBasicToSection(
  category: DailyTrainingSectionCategory,
  title: string,
  section: LegacyBasicSection | undefined,
  minutes: number,
  sortOrder: number,
): DailyTrainingSection {
  return normalizeSection(
    {
      category,
      title,
      minutes: section?.minutes,
      notes: section?.notes,
      countsAsActiveTime: defaultCountsAsActiveTime(category),
      completed: false,
      focusAreas: [],
      sortOrder,
    },
    { category, title, minutes, sortOrder },
  );
}

function legacySessionToSection(session: LegacyTrainingSession | undefined, title: string, minutes: number, sortOrder: number): DailyTrainingSection {
  return normalizeSection(
    {
      category: "Training Session",
      title,
      minutes: session?.minutes,
      notes: session?.notes,
      countsAsActiveTime: true,
      completed: Boolean(session?.completed),
      focusAreas: Array.isArray(session?.focusAreas) ? session.focusAreas.map((focus, index) => normalizeFocus(focus, index)) : undefined,
      sortOrder,
    },
    { category: "Training Session", title, minutes, sortOrder },
  );
}

function legacySectionsFromPlan(plan: Partial<DailyTrainingPlan> & Partial<DailyTrainingPlanRow> & LegacyDailyTrainingPlan): DailyTrainingSection[] {
  return [
    legacyBasicToSection("Training Prep", "Training Prep", plan.trainingPrep ?? plan.training_prep, 10, 0),
    legacyBasicToSection("Warm Up", "Warm Up", plan.warmUp ?? plan.warm_up, 20, 1),
    legacyBasicToSection("Break", "Break", plan.break1 ?? plan.break_1, 5, 2),
    legacySessionToSection(plan.trainingSession1 ?? plan.training_session_1, "Training Session 1", 30, 3),
    legacyBasicToSection("Break", "Break", plan.break2 ?? plan.break_2, 5, 4),
    legacySessionToSection(plan.trainingSession2 ?? plan.training_session_2, "Training Session 2", 30, 5),
    legacyBasicToSection("Break", "Break", plan.break3 ?? plan.break_3, 5, 6),
    legacySessionToSection(plan.trainingSession3 ?? plan.training_session_3, "Training Session 3", 30, 7),
    legacyBasicToSection("Training Clean Up", "Training Clean Up", plan.trainingCleanUp ?? plan.training_clean_up, 10, 8),
  ];
}

function normalizeDailyTrainingPlan(plan: Partial<DailyTrainingPlan> & Partial<DailyTrainingPlanRow> & LegacyDailyTrainingPlan & { date: string }): DailyTrainingPlan {
  const empty = emptyDailyTrainingPlan(plan.date);
  const usedSectionIds = new Set<string>();
  const rawSections = Array.isArray(plan.sections) && plan.sections.length > 0
    ? plan.sections.map((section, index) => normalizeSection(section, {
        category: section.category ?? "Training Session",
        title: section.title ?? `Section ${index + 1}`,
        minutes: section.minutes ?? 0,
        sortOrder: index,
      }))
    : legacySectionsFromPlan(plan);
  const sections = empty.sections.map((fallback, index) => {
    const match = rawSections.find((section) => section.sortOrder === index && !usedSectionIds.has(section.id))
      ?? rawSections.find((section) => section.category === fallback.category && section.title === fallback.title && !usedSectionIds.has(section.id))
      ?? rawSections.find((section) => section.category === fallback.category && !usedSectionIds.has(section.id))
      ?? rawSections.find((section) => !usedSectionIds.has(section.id));
    if (match?.id) usedSectionIds.add(match.id);
    return normalizeSection(match, {
      category: fallback.category,
      title: fallback.title,
      minutes: fallback.minutes,
      sortOrder: index,
    });
  });
  const normalized: DailyTrainingPlan = {
    ...empty,
    ...plan,
    id: plan.id ?? empty.id,
    title: plan.title ?? empty.title,
    sections: sections.sort((a, b) => a.sortOrder - b.sortOrder).map((section, index) => ({ ...section, sortOrder: index })),
    createdAt: plan.createdAt ?? empty.createdAt,
    updatedAt: plan.updatedAt ?? empty.updatedAt,
  };
  return { ...normalized, ...calculateDailyTrainingPlan(normalized) };
}

function readDailyTrainingPlansCache(): DailyTrainingPlan[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(DAILY_TRAINING_PLANS_KEY);
    const parsed = raw ? (JSON.parse(raw) as DailyTrainingPlan[]) : [];
    return Array.isArray(parsed)
      ? parsed.filter((plan) => plan?.date).map((plan) => normalizeDailyTrainingPlan(plan))
      : [];
  } catch {
    return [];
  }
}

function writeDailyTrainingPlansCache(plans: DailyTrainingPlan[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(DAILY_TRAINING_PLANS_KEY, JSON.stringify(plans.map(normalizeDailyTrainingPlan)));
}

function checkInFromRow(row: DanceCheckInRow): DanceCheckIn {
  return {
    id: row.id,
    weekOf: row.week_of,
    scores: row.scores ?? [],
    reflection: row.reflection ?? emptyReflection(),
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? new Date().toISOString(),
  };
}

function checkInToRow(checkIn: DanceCheckIn): DanceCheckInRow {
  return {
    id: checkIn.id,
    week_of: checkIn.weekOf,
    scores: checkIn.scores,
    reflection: checkIn.reflection,
    created_at: checkIn.createdAt,
    updated_at: checkIn.updatedAt,
  };
}

function dailyStatusFromRow(row: DanceDailyStatusRow): DanceDailyStatus {
  return normalizeDailyStatus({
    date: row.date,
    mood: row.mood,
    soreness: row.soreness,
    confidence: row.confidence,
    trainedToday: row.trained_today,
    notes: row.notes ?? "",
  });
}

function dailyStatusToRow(status: DanceDailyStatus): DanceDailyStatusRow {
  return {
    date: status.date,
    mood: status.mood,
    soreness: status.soreness,
    confidence: status.confidence,
    trained_today: status.trainedToday,
    notes: status.notes,
  };
}

function dailyTrainingPlanFromRow(row: DailyTrainingPlanRow): DailyTrainingPlan {
  return normalizeDailyTrainingPlan({
    id: row.id,
    date: row.date,
    title: row.title ?? undefined,
    training_prep: row.training_prep,
    warm_up: row.warm_up,
    break_1: row.break_1,
    training_session_1: row.training_session_1,
    break_2: row.break_2,
    training_session_2: row.training_session_2,
    break_3: row.break_3,
    training_session_3: row.training_session_3,
    training_clean_up: row.training_clean_up,
    activeTrainingTime: row.active_training_time,
    totalPlanTime: row.total_plan_time ?? row.total_blocked_time,
    totalBlockedTime: row.total_blocked_time,
    breakPrepCleanupTime: row.break_prep_cleanup_time,
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? new Date().toISOString(),
  });
}

function dailyTrainingPlanToRow(plan: DailyTrainingPlan): DailyTrainingPlanRow {
  const normalized = normalizeDailyTrainingPlan(plan);
  return {
    id: normalized.id,
    date: normalized.date,
    title: normalized.title,
    training_prep: {},
    warm_up: {},
    break_1: {},
    training_session_1: {},
    break_2: {},
    training_session_2: {},
    break_3: {},
    training_session_3: {},
    training_clean_up: {},
    active_training_time: normalized.activeTrainingTime,
    total_plan_time: normalized.totalPlanTime,
    total_blocked_time: normalized.totalPlanTime,
    break_prep_cleanup_time: normalized.breakPrepCleanupTime,
    created_at: normalized.createdAt,
    updated_at: normalized.updatedAt,
  };
}

function sectionFromRow(row: DailyTrainingSectionRow, focusAreas: DailyTrainingFocus[]): DailyTrainingSection {
  return normalizeSection(
    {
      id: row.id,
      category: row.type ?? row.category,
      title: row.title,
      notes: row.notes ?? "",
      minutes: row.minutes,
      countsAsActiveTime: row.counts_as_active_time,
      completed: row.completed,
      focusAreas,
      sortOrder: row.sort_order,
      createdAt: row.created_at ?? new Date().toISOString(),
      updatedAt: row.updated_at ?? new Date().toISOString(),
    },
    { category: row.type ?? row.category, title: row.title, minutes: row.minutes, sortOrder: row.sort_order },
  );
}

function sectionToRow(planId: string, section: DailyTrainingSection): DailyTrainingSectionRow {
  return {
    id: section.id,
    plan_id: planId,
    type: section.category,
    category: section.category,
    title: section.title,
    notes: section.notes,
    minutes: section.minutes,
    counts_as_active_time: section.countsAsActiveTime,
    completed: section.completed,
    sort_order: section.sortOrder,
    created_at: section.createdAt,
    updated_at: section.updatedAt,
  };
}

function focusFromRow(row: DailyTrainingFocusRow): DailyTrainingFocus {
  return normalizeFocus(
    {
      id: row.id,
      label: row.label,
      type: row.type ?? "Pole tricks",
      notes: row.notes ?? "",
      minutes: row.minutes ?? 0,
      item_type: row.item_type ?? "focus",
      difficulty: row.difficulty ?? "Medium",
      completed: row.completed,
      sortOrder: row.sort_order,
    },
    row.sort_order,
  );
}

function focusToRow(sectionId: string, focus: DailyTrainingFocus): DailyTrainingFocusRow {
  const now = new Date().toISOString();
  return {
    id: focus.id,
    section_id: sectionId,
    label: focus.label,
    type: focus.type,
    notes: focus.notes,
    minutes: focus.minutes,
    item_type: focus.itemType,
    difficulty: focus.difficulty,
    completed: focus.completed,
    sort_order: focus.sortOrder,
    created_at: now,
    updated_at: now,
  };
}

function normalizeDailyStatus(status: DanceDailyStatus): DanceDailyStatus {
  return {
    ...status,
    trainingStatus: status.trainingStatus || (status.trainedToday ? "yes" : "no"),
    trainingFocus: status.trainingFocus ?? [],
    bodyFelt: status.bodyFelt ?? [],
    skillsPracticed: status.skillsPracticed ?? [],
    conditioningCompleted: status.conditioningCompleted ?? [],
    mediaLinked: status.mediaLinked ?? [],
    goalsWorkedOn: status.goalsWorkedOn ?? [],
    energy: status.energy ?? status.mood,
  };
}

export function loadCheckIns(): DanceCheckIn[] {
  if (typeof window === "undefined") return [];
  ensureDataRecoveryMigration();
  const checkIns = readCheckInsCache();
  syncCollection({
    key: DANCE_CHECKINS_KEY,
    table: "dance_checkins",
    localData: checkIns,
    readCache: readCheckInsCache,
    writeCache: writeCheckInsCache,
    fromRow: checkInFromRow,
    toRow: checkInToRow,
    orderBy: "week_of",
  });
  return checkIns;
}

export function saveCheckIns(checkIns: DanceCheckIn[]): void {
  if (typeof window === "undefined") return;
  writeCheckInsCache(checkIns);
  saveRemoteCollectionById("dance_checkins", "id", checkIns, (checkIn) => checkIn.id, checkInToRow, {
    onConflict: "user_id,week_of",
  });
  notifyAppDataUpdated();
}

export function loadDailyStatuses(): DanceDailyStatus[] {
  if (typeof window === "undefined") return [];
  ensureDataRecoveryMigration();
  const statuses = readDailyStatusesCache();
  syncCollection({
    key: DANCE_DAILY_KEY,
    table: "dance_daily_statuses",
    localData: statuses,
    readCache: readDailyStatusesCache,
    writeCache: writeDailyStatusesCache,
    fromRow: dailyStatusFromRow,
    toRow: dailyStatusToRow,
    orderBy: "date",
  });
  return statuses;
}

export function saveDailyStatuses(statuses: DanceDailyStatus[]): void {
  if (typeof window === "undefined") return;
  writeDailyStatusesCache(statuses);
  saveRemoteCollectionById("dance_daily_statuses", "date", statuses, (status) => status.date, dailyStatusToRow, {
    onConflict: "user_id,date",
  });
  notifyAppDataUpdated();
}

async function fetchRemoteDailyTrainingPlans(): Promise<DailyTrainingPlan[]> {
  const { data: planRows, error: planError } = await supabase
    .from("dance_training_plans")
    .select("*")
    .order("date");
  if (planError) throw planError;
  const plans = ((planRows ?? []) as DailyTrainingPlanRow[]).map(dailyTrainingPlanFromRow);
  if (plans.length === 0) return [];

  const planIds = plans.map((plan) => plan.id);
  const { data: sectionRows, error: sectionError } = await supabase
    .from("dance_training_plan_sections")
    .select("*")
    .in("plan_id", planIds)
    .order("sort_order");
  if (sectionError) throw sectionError;

  const sections = (sectionRows ?? []) as DailyTrainingSectionRow[];
  if (sections.length === 0) return plans;

  const sectionIds = sections.map((section) => section.id);
  const { data: itemRows, error: itemError } = await supabase
    .from("dance_training_plan_section_items")
    .select("*")
    .in("section_id", sectionIds)
    .order("sort_order");
  if (itemError) throw itemError;

  const { data: legacyFocusRows } = await supabase
    .from("dance_training_plan_focus_items")
    .select("*")
    .in("section_id", sectionIds)
    .order("sort_order");

  const focusBySection = new Map<string, DailyTrainingFocus[]>();
  for (const row of (itemRows ?? []) as DailyTrainingFocusRow[]) {
    const existing = focusBySection.get(row.section_id) ?? [];
    existing.push(focusFromRow(row));
    focusBySection.set(row.section_id, existing);
  }
  for (const row of (legacyFocusRows ?? []) as DailyTrainingFocusRow[]) {
    if (focusBySection.has(row.section_id)) continue;
    const existing = focusBySection.get(row.section_id) ?? [];
    existing.push(focusFromRow({ ...row, item_type: "focus" }));
    focusBySection.set(row.section_id, existing);
  }

  const sectionsByPlan = new Map<string, DailyTrainingSection[]>();
  for (const row of sections) {
    const existing = sectionsByPlan.get(row.plan_id) ?? [];
    existing.push(sectionFromRow(row, focusBySection.get(row.id) ?? []));
    sectionsByPlan.set(row.plan_id, existing);
  }

  return plans.map((plan) => normalizeDailyTrainingPlan({
    ...plan,
    sections: sectionsByPlan.get(plan.id) ?? plan.sections,
  }));
}

function mergeDailyTrainingPlans(remotePlans: DailyTrainingPlan[], localPlans: DailyTrainingPlan[]): DailyTrainingPlan[] {
  const merged = new Map<string, DailyTrainingPlan>();
  for (const plan of remotePlans) merged.set(plan.date, plan);
  for (const plan of localPlans) {
    const remote = merged.get(plan.date);
    if (!remote || plan.updatedAt >= remote.updatedAt) merged.set(plan.date, plan);
  }
  return Array.from(merged.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function syncDailyTrainingPlans(localPlans: DailyTrainingPlan[]): void {
  if (!isSupabaseConfigured) return;
  void (async () => {
    try {
      const userId = await getUserId();
      if (!userId) return;
      const remotePlans = await fetchRemoteDailyTrainingPlans();
      const mergedPlans = mergeDailyTrainingPlans(remotePlans, localPlans);
      if (mergedPlans.length > 0) {
        writeDailyTrainingPlansCache(mergedPlans);
        if (mergedPlans.length > remotePlans.length || localPlans.some((plan) => plan.updatedAt >= (remotePlans.find((remote) => remote.date === plan.date)?.updatedAt ?? ""))) {
          saveRemoteDailyTrainingPlans(mergedPlans);
        }
        notifyAppDataUpdated();
      }
    } catch (error) {
      console.warn("[supabase:dance_training_plans] load failed; using local data until sync recovers", error);
    }
  })();
}

function saveRemoteDailyTrainingPlans(plans: DailyTrainingPlan[]): void {
  if (!isSupabaseConfigured || plans.length === 0) return;
  void (async () => {
    try {
      const userId = await getUserId();
      if (!userId) return;
      const normalizedPlans = plans.map(normalizeDailyTrainingPlan);
      const planRows = normalizedPlans.map((plan) => ({ ...dailyTrainingPlanToRow(plan), user_id: userId }));
      const sectionRows = normalizedPlans.flatMap((plan) =>
        plan.sections.map((section) => ({ ...sectionToRow(plan.id, section), user_id: userId })),
      );
      const focusRows = normalizedPlans.flatMap((plan) =>
        plan.sections.flatMap((section) =>
          section.focusAreas.map((focus) => ({ ...focusToRow(section.id, focus), user_id: userId })),
        ),
      );

      const { error: planError } = await supabase
        .from("dance_training_plans")
        .upsert(planRows, { onConflict: "user_id,date" });
      if (planError) throw planError;

      const planIds = normalizedPlans.map((plan) => plan.id);
      const sectionIds = sectionRows.map((section) => section.id);
      const focusIds = focusRows.map((focus) => focus.id);

      const { error: staleFocusError } = sectionIds.length > 0
        ? focusIds.length > 0
          ? await supabase
              .from("dance_training_plan_section_items")
              .delete()
              .in("section_id", sectionIds)
              .not("id", "in", `(${focusIds.map((id) => `"${id}"`).join(",")})`)
          : await supabase
              .from("dance_training_plan_section_items")
              .delete()
              .in("section_id", sectionIds)
        : { error: null };
      if (staleFocusError) throw staleFocusError;

      const { error: staleSectionError } = planIds.length > 0
        ? sectionIds.length > 0
          ? await supabase
              .from("dance_training_plan_sections")
              .delete()
              .in("plan_id", planIds)
              .not("id", "in", `(${sectionIds.map((id) => `"${id}"`).join(",")})`)
          : await supabase
              .from("dance_training_plan_sections")
              .delete()
              .in("plan_id", planIds)
        : { error: null };
      if (staleSectionError) throw staleSectionError;

      if (sectionRows.length > 0) {
        const { error: sectionError } = await supabase
          .from("dance_training_plan_sections")
          .upsert(sectionRows, { onConflict: "id" });
        if (sectionError) throw sectionError;
      }

      if (focusRows.length > 0) {
        const { error: focusError } = await supabase
          .from("dance_training_plan_section_items")
          .upsert(focusRows, { onConflict: "id" });
        if (focusError) throw focusError;
      }
    } catch (error) {
      console.warn("[supabase:dance_training_plans] save failed; using local data until sync recovers", error);
    }
  })();
}

export function loadDailyTrainingPlans(): DailyTrainingPlan[] {
  if (typeof window === "undefined") return [];
  ensureDataRecoveryMigration();
  const plans = readDailyTrainingPlansCache();
  syncDailyTrainingPlans(plans);
  return plans;
}

export function saveDailyTrainingPlans(plans: DailyTrainingPlan[]): void {
  if (typeof window === "undefined") return;
  const normalizedPlans = plans.map((plan) =>
    normalizeDailyTrainingPlan({ ...plan, updatedAt: new Date().toISOString() }),
  );
  writeDailyTrainingPlansCache(normalizedPlans);
  saveRemoteDailyTrainingPlans(normalizedPlans);
  notifyAppDataUpdated();
}

export function loadTrainingPlan(): TrainingPlan {
  if (typeof window === "undefined") return emptyTrainingPlan();
  try {
    const raw = localStorage.getItem(TRAINING_PLAN_KEY);
    if (!raw) return emptyTrainingPlan();
    const parsed = JSON.parse(raw) as Partial<TrainingPlan>;
    const empty = emptyTrainingPlan();
    return {
      ...empty,
      ...parsed,
      currentFocus: { ...empty.currentFocus, ...parsed.currentFocus },
      realityCheck: { ...empty.realityCheck, ...parsed.realityCheck },
      bodyStatus: { ...empty.bodyStatus, ...parsed.bodyStatus },
      goals: Array.isArray(parsed.goals) ? parsed.goals : [],
      weeklyMap: { ...empty.weeklyMap, ...parsed.weeklyMap },
      updatedAt: parsed.updatedAt ?? empty.updatedAt,
    };
  } catch {
    return emptyTrainingPlan();
  }
}

export function saveTrainingPlan(plan: TrainingPlan): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TRAINING_PLAN_KEY, JSON.stringify({ ...plan, updatedAt: new Date().toISOString() }));
  notifyAppDataUpdated();
}

export function generateTrainingGoalId(): string {
  return `goal-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
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
