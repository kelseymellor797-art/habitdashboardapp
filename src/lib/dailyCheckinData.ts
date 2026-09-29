import { notifyAppDataUpdated } from "./appEvents";
import { ensureDataRecoveryMigration } from "./dataRecovery";
import { saveRemoteCollectionById, syncCollection } from "./supabaseSync";

export interface DailyCheckIn {
  id: string;
  date: string; // YYYY-MM-DD

  // Legacy mood score kept for old entries and analytics fallbacks
  mood: number;
  moodFeeling?: string;
  moodFeelings?: string[];
  moodCategory?: MoodCategory;
  energy: number;
  motivation: number;
  confidence: number;

  // Body
  soreness: number;
  flexibilityFeeling: number;
  strengthFeeling: number;
  bodyNotes?: string;
  bodyAreas?: string[];

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

export type MoodCategory = "Depressed / Low" | "Meh / Neutral" | "Good" | "High / Amazing";

export const MOOD_CATEGORIES: { category: MoodCategory; feelings: string[] }[] = [
  {
    category: "Depressed / Low",
    feelings: [
      "Depressed", "Empty", "Hopeless", "Numb", "Drained", "Lonely", "Worthless", "Overwhelmed", "Defeated", "Exhausted",
      "Heavy", "Lost", "Fragile", "Sad", "Grieving", "Tearful", "Hurt", "Rejected", "Abandoned", "Isolated",
      "Ashamed", "Guilty", "Regretful", "Disappointed", "Discouraged", "Powerless", "Helpless", "Stuck", "Trapped", "Small",
      "Invisible", "Unwanted", "Unlovable", "Broken", "Disconnected", "Distant", "Checked out", "Shut down", "Burned out", "Depleted",
      "Foggy", "Dissociated", "Detached", "Hollow", "Apathetic", "Flat", "Unsteady", "Vulnerable", "Raw", "Sensitive",
      "Anxious", "Panicked", "Fearful", "Worried", "Dread-filled", "Unsafe", "Paranoid", "Startled", "On edge", "Hypervigilant",
      "Irritable", "Angry", "Bitter", "Resentful", "Jealous", "Embarrassed", "Humiliated", "Defensive", "Frustrated", "Agitated",
      "Tense", "Restless", "Scattered", "Confused", "Unfocused", "Unmotivated", "Tired", "Sleepy", "Sluggish", "Weak",
      "Sore-hearted", "Over it", "Done", "Crying inside", "Needy", "Clingy", "Unseen", "Misunderstood", "Insecure", "Self-critical",
      "Pessimistic", "Doubtful", "Deflated", "Crushed", "Melancholy", "Homesick", "Longing", "Heartbroken", "Low", "Barely here",
    ],
  },
  {
    category: "Meh / Neutral",
    feelings: [
      "Meh", "Indifferent", "Numb-ish", "Calm", "Bored", "Unmotivated", "Distracted", "Flat", "Low energy", "Just okay",
      "Fine", "Neutral", "Steady", "Quiet", "Plain", "Settled", "Even", "Unbothered", "Mild", "Average",
      "Okay-ish", "Tolerable", "Functional", "Present", "Grounded", "Soft", "Still", "Slow", "Sleepy-calm", "Reserved",
      "Detached", "Observant", "Patient", "Waiting", "Paused", "Drifting", "Daydreamy", "Spacey", "Foggy but fine", "Unclear",
      "Undecided", "Unsure", "Nonchalant", "Casual", "Low-key", "Simple", "Routine", "Normal", "Ordinary", "Uneventful",
      "Introverted", "Withdrawn", "Private", "Reflective", "Thoughtful", "Pensive", "Curious", "Open", "Accepting", "Allowing",
      "Balanced-ish", "Comfortable", "Cozy", "Mellow", "Chill", "Easy", "Unrushed", "Slow-moving", "Resting", "Recovering",
      "Mildly tired", "Mildly focused", "Mildly hopeful", "Mildly stressed", "Mildly annoyed", "Mildly sad", "Mildly anxious", "Mildly motivated", "Mildly social", "Mildly creative",
      "Blank", "In-between", "Transitioning", "Processing", "Digesting", "Resetting", "Recharging", "Coasting", "Autopilot", "Matter-of-fact",
      "Clear enough", "Stable enough", "Keeping up", "Making it", "Not bad", "Not great", "Neutral-good", "Neutral-low", "Sober", "Centered enough",
    ],
  },
  {
    category: "Good",
    feelings: [
      "Good", "Content", "Relaxed", "Focused", "Stable", "Positive", "Motivated", "Clear-headed", "Productive", "Balanced",
      "Peaceful", "Grounded", "Centered", "Secure", "Safe", "Comforted", "Supported", "Connected", "Seen", "Understood",
      "Hopeful", "Optimistic", "Encouraged", "Capable", "Prepared", "Ready", "Determined", "Driven", "Disciplined", "Consistent",
      "Proud", "Satisfied", "Accomplished", "Useful", "Organized", "Intentional", "In control", "Responsible", "Resilient", "Patient",
      "Kind", "Gentle", "Compassionate", "Warm", "Open-hearted", "Grateful", "Appreciative", "Loved", "Loving", "Friendly",
      "Social", "Playful", "Light", "Refreshed", "Rested", "Restored", "Nourished", "Comfortable", "Cozy", "At ease",
      "Creative", "Inspired", "Curious", "Interested", "Engaged", "Present", "Mindful", "Alert", "Sharp", "Clear",
      "Confident", "Brave", "Trusting", "Independent", "Strong", "Healthy", "Flexible", "Flowy", "Beautiful", "Radiant",
      "Soft but strong", "Emotionally steady", "Mentally clear", "Physically okay", "In my body", "Aligned", "Rooted", "Sincere", "Calm-happy", "Low-key happy",
      "Energetic", "Upbeat", "Cheerful", "Bright", "Lighthearted", "Easygoing", "Productive calm", "Pleased", "Relieved", "Whole",
    ],
  },
  {
    category: "High / Amazing",
    feelings: [
      "Happy", "Excited", "Energized", "Confident", "Strong", "Inspired", "Proud", "Euphoric", "On fire", "Ecstatic",
      "Joyful", "Radiant", "Glowing", "Alive", "Free", "Electric", "Powerful", "Magnetic", "Unstoppable", "Fearless",
      "Bold", "Brave", "Ready", "Driven", "Ambitious", "Locked in", "In flow", "In the zone", "Focused-fire", "Laser-focused",
      "Creative-high", "Inspired-high", "Visionary", "Imaginative", "Expressive", "Artistic", "Playful", "Flirty", "Sexy", "Sensual",
      "Beautiful", "Hot", "Iconic", "That girl", "Main character", "Expansive", "Limitless", "Abundant", "Blessed", "Lucky",
      "Loved", "Adored", "Desired", "Cherished", "Connected", "Socially full", "Celebrated", "Validated", "Seen", "Recognized",
      "Triumphant", "Victorious", "Accomplished", "Successful", "Pumped", "Fired up", "Hyped", "Thrilled", "Delighted", "Giddy",
      "Silly", "Laughy", "Sparkly", "Bright", "Light-filled", "Peacefully happy", "Deeply grateful", "Emotionally full", "Heart-open", "Soft-happy",
      "Motivated-high", "Productive-high", "Clear-high", "Strong-high", "Flexible-high", "Rested-high", "Healthy-high", "Embodied", "Fluid", "Graceful",
      "Confident-soft", "Confident-bold", "Self-trusting", "Self-loving", "Worthy", "Aligned", "Purposeful", "Magical", "Amazing", "Best-self",
    ],
  },
];

export const BODY_AREAS = ["Shoulder", "Back", "Hips", "Hamstrings", "Knees", "Ankles", "Wrists", "Neck"];

type DailyCheckInRow = {
  id: string;
  date: string;
  mood: number;
  mood_feeling?: string | null;
  mood_feelings?: string[] | null;
  mood_category?: MoodCategory | null;
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
    const parsed = raw ? (JSON.parse(raw) as DailyCheckIn[]) : [];
    return Array.isArray(parsed) ? parsed.map(normalizeCheckIn) : [];
  } catch {
    return [];
  }
}

function writeDailyCheckInsCache(data: DailyCheckIn[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(DAILY_CHECKINS_KEY, JSON.stringify(data));
}

function checkInFromRow(row: DailyCheckInRow): DailyCheckIn {
  return normalizeCheckIn({
    id: row.id,
    date: row.date,
    mood: row.mood,
    moodFeeling: row.mood_feeling ?? undefined,
    moodFeelings: row.mood_feelings ?? undefined,
    moodCategory: row.mood_category ?? undefined,
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
  });
}

function checkInToRow(checkIn: DailyCheckIn): DailyCheckInRow {
  return {
    id: checkIn.id,
    date: checkIn.date,
    mood: checkIn.mood,
    mood_feeling: checkIn.moodFeeling ?? null,
    mood_feelings: checkIn.moodFeelings ?? (checkIn.moodFeeling ? [checkIn.moodFeeling] : null),
    mood_category: checkIn.moodCategory ?? null,
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
  ensureDataRecoveryMigration();
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

export function moodFromScore(score: number): { feeling: string; category: MoodCategory } {
  if (score <= 1) return { feeling: "Depressed", category: "Depressed / Low" };
  if (score === 2) return { feeling: "Meh", category: "Meh / Neutral" };
  if (score === 3) return { feeling: "Just okay", category: "Meh / Neutral" };
  if (score === 4) return { feeling: "Good", category: "Good" };
  return { feeling: "Happy", category: "High / Amazing" };
}

export function moodScoreFromCategory(category?: MoodCategory): number {
  if (category === "Depressed / Low") return 1;
  if (category === "Meh / Neutral") return 3;
  if (category === "Good") return 4;
  if (category === "High / Amazing") return 5;
  return 3;
}

export function getMoodCategory(feeling?: string, fallbackScore = 3): MoodCategory {
  const found = MOOD_CATEGORIES.find((group) => feeling && group.feelings.includes(feeling));
  return found?.category ?? moodFromScore(fallbackScore).category;
}

export function getMoodCategoryForFeelings(feelings?: string[], fallbackScore = 3): MoodCategory {
  const primaryFeeling = feelings?.find(Boolean);
  return getMoodCategory(primaryFeeling, fallbackScore);
}

export function getMoodFeelingsLabel(checkIn: Pick<DailyCheckIn, "moodFeeling" | "moodFeelings" | "mood">): string {
  const feelings = checkIn.moodFeelings?.length
    ? checkIn.moodFeelings
    : checkIn.moodFeeling
      ? [checkIn.moodFeeling]
      : [moodFromScore(checkIn.mood).feeling];
  return feelings.join(", ");
}

function normalizeCheckIn(checkIn: DailyCheckIn): DailyCheckIn {
  const legacyMood = moodFromScore(checkIn.mood);
  const moodFeelings = checkIn.moodFeelings?.length
    ? checkIn.moodFeelings
    : [checkIn.moodFeeling || legacyMood.feeling];
  const moodFeeling = checkIn.moodFeeling || moodFeelings.join(", ");
  const moodCategory = checkIn.moodCategory || getMoodCategoryForFeelings(moodFeelings, checkIn.mood);
  return {
    ...checkIn,
    moodFeeling,
    moodFeelings,
    moodCategory,
    mood: checkIn.mood || moodScoreFromCategory(moodCategory),
    bodyNotes: checkIn.bodyNotes ?? "",
    bodyAreas: checkIn.bodyAreas ?? [],
  };
}

export function emptyCheckIn(): Omit<DailyCheckIn, "id" | "date" | "createdAt" | "updatedAt"> {
  return {
    mood: 3,
    moodFeeling: "Just okay",
    moodFeelings: ["Just okay"],
    moodCategory: "Meh / Neutral",
    energy: 3,
    motivation: 3,
    confidence: 3,
    soreness: 3,
    flexibilityFeeling: 3,
    strengthFeeling: 3,
    bodyNotes: "",
    bodyAreas: [],
    trainedToday: false,
    trainingType: undefined,
    trainingDuration: undefined,
    mentalStateNotes: "",
    wins: "",
    whatFeltHard: "",
    goalsForTomorrow: "",
  };
}
