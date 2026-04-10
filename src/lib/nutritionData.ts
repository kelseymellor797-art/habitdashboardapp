export type MealType =
  | "breakfast"
  | "lunch"
  | "dinner"
  | "snack"
  | "pre_training"
  | "post_training";

export interface FoodItem {
  id: string;
  name: string;
  calories?: number;
  proteinG?: number;
  notes?: string;
}

export interface NutritionEntry {
  id: string;
  date: string; // YYYY-MM-DD local
  mealType: MealType;
  foods: FoodItem[];
  totalCalories?: number;
  totalProteinG?: number;
  notes?: string;
  createdAt: string;
}

export interface NutritionGoals {
  dailyCalories?: number;
  dailyProteinG?: number;
  waterGlasses?: number; // legacy, now handled by water tracker
}

const ENTRIES_KEY = "wellness-nutrition";
const GOALS_KEY = "wellness-nutrition-goals";

export function todayDateString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function generateNutritionId(): string {
  return `nut-${Date.now()}`;
}

export function generateFoodId(): string {
  return `food-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function loadNutritionEntries(): NutritionEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ENTRIES_KEY);
    return raw ? (JSON.parse(raw) as NutritionEntry[]) : [];
  } catch {
    return [];
  }
}

export function saveNutritionEntries(entries: NutritionEntry[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));
}

export function loadNutritionGoals(): NutritionGoals {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(GOALS_KEY);
    return raw ? (JSON.parse(raw) as NutritionGoals) : {};
  } catch {
    return {};
  }
}

export function saveNutritionGoals(goals: NutritionGoals): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(GOALS_KEY, JSON.stringify(goals));
}

export function getTodayEntries(entries: NutritionEntry[]): NutritionEntry[] {
  const today = todayDateString();
  return entries.filter((e) => e.date === today);
}

export function getDayTotals(
  entries: NutritionEntry[],
  date: string
): { calories: number; proteinG: number; mealCount: number } {
  const dayEntries = entries.filter((e) => e.date === date);
  const calories = dayEntries.reduce((sum, e) => {
    const c =
      e.totalCalories !== undefined
        ? e.totalCalories
        : e.foods.reduce((s, f) => s + (f.calories ?? 0), 0);
    return sum + c;
  }, 0);
  const proteinG = dayEntries.reduce((sum, e) => {
    const p =
      e.totalProteinG !== undefined
        ? e.totalProteinG
        : e.foods.reduce((s, f) => s + (f.proteinG ?? 0), 0);
    return sum + p;
  }, 0);
  return { calories, proteinG, mealCount: dayEntries.length };
}
