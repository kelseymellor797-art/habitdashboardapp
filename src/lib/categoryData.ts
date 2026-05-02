import { notifyAppDataUpdated } from "./appEvents";
import { saveRemoteCollectionById, syncCollection } from "./supabaseSync";

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

type CategoryRow = {
  id: string;
  name: string;
  color: string | null;
};

function readCategoriesCache(): Category[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CATEGORIES_KEY);
    return raw ? (JSON.parse(raw) as Category[]) : [];
  } catch {
    return [];
  }
}

function writeCategoriesCache(categories: Category[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
}

function categoryFromRow(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    color: row.color ?? undefined,
  };
}

function categoryToRow(category: Category): CategoryRow {
  return {
    id: category.id,
    name: category.name,
    color: category.color ?? null,
  };
}

export function loadCategories(): Category[] {
  if (typeof window === "undefined") return [];
  const categories = readCategoriesCache();
  syncCollection({
    key: CATEGORIES_KEY,
    table: "categories",
    localData: categories,
    readCache: readCategoriesCache,
    writeCache: writeCategoriesCache,
    fromRow: categoryFromRow,
    toRow: categoryToRow,
    orderBy: "created_at",
  });
  return categories;
}

export function saveCategories(categories: Category[]): void {
  if (typeof window === "undefined") return;
  writeCategoriesCache(categories);
  saveRemoteCollectionById("categories", "id", categories, (category) => category.id, categoryToRow);
  notifyAppDataUpdated();
}
