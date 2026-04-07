export type Category = {
  id: string;
  name: string;
  color?: string;
};

export const CATEGORIES_KEY = "habitflow-categories";

export const CATEGORY_COLORS = [
  "#8b5cf6", "#10b981", "#0ea5e9", "#f59e0b",
  "#f43f5e", "#06b6d4", "#a78bfa", "#34d399",
  "#fb923c", "#22d3ee",
];

export function generateCategoryId(): string {
  return `cat-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function loadCategories(): Category[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CATEGORIES_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Category[];
  } catch {
    return [];
  }
}

export function saveCategories(categories: Category[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
}
