import { notifyAppDataUpdated } from "./appEvents";
import { ensureDataRecoveryMigration } from "./dataRecovery";
import { saveRemoteCollectionById, syncCollection } from "./supabaseSync";

export type QuoteCategory =
  | "dance"
  | "strength"
  | "mindset"
  | "consistency"
  | "confidence"
  | "growth"
  | "self_love"
  | "general";

export interface Quote {
  id: string;
  text: string;
  author?: string;
  category: QuoteCategory;
  isFavorite: boolean;
  isActive: boolean;
  isCustom: boolean;
  createdAt?: string;
  updatedAt?: string;
}

const QUOTES_KEY = "wellness-quotes";

type QuoteRow = {
  id: string;
  text: string;
  author: string | null;
  category: QuoteCategory;
  is_favorite: boolean;
  is_active: boolean;
  is_custom: boolean;
  created_at: string | null;
  updated_at: string | null;
};

function normalizeQuote(raw: Quote): Quote | null {
  if (!raw.text?.trim()) return null;
  if (raw.isCustom === false) return null;
  return {
    ...raw,
    text: raw.text.trim(),
    category: raw.category ?? "general",
    isFavorite: Boolean(raw.isFavorite),
    isActive: raw.isActive !== false,
    isCustom: true,
  };
}

function readQuotesCache(): Quote[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(QUOTES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Quote[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((quote) => normalizeQuote(quote))
      .filter((quote): quote is Quote => quote !== null);
  } catch {
    return [];
  }
}

function writeQuotesCache(quotes: Quote[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(QUOTES_KEY, JSON.stringify(quotes));
}

function quoteFromRow(row: QuoteRow): Quote {
  return {
    id: row.id,
    text: row.text,
    author: row.author ?? undefined,
    category: row.category,
    isFavorite: row.is_favorite,
    isActive: row.is_active,
    isCustom: row.is_custom,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  };
}

function quoteToRow(quote: Quote): QuoteRow {
  return {
    id: quote.id,
    text: quote.text,
    author: quote.author ?? null,
    category: quote.category,
    is_favorite: quote.isFavorite,
    is_active: quote.isActive,
    is_custom: quote.isCustom,
    created_at: quote.createdAt ?? null,
    updated_at: quote.updatedAt ?? null,
  };
}

export function loadQuotes(): Quote[] {
  if (typeof window === "undefined") return [];
  ensureDataRecoveryMigration();
  const quotes = readQuotesCache();
  syncCollection({
    key: QUOTES_KEY,
    table: "motivation_quotes",
    localData: quotes,
    readCache: readQuotesCache,
    writeCache: writeQuotesCache,
    fromRow: quoteFromRow,
    toRow: quoteToRow,
    orderBy: "created_at",
  });

  const raw = localStorage.getItem(QUOTES_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Quote[];
      if (Array.isArray(parsed) && quotes.length !== parsed.length) saveQuotes(quotes);
    } catch {
      return quotes;
    }
  }
  return quotes;
}

export function saveQuotes(quotes: Quote[]): void {
  if (typeof window === "undefined") return;
  writeQuotesCache(quotes);
  saveRemoteCollectionById("motivation_quotes", "id", quotes, (quote) => quote.id, quoteToRow);
  notifyAppDataUpdated();
}

export function generateQuoteId(): string {
  return `q-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function getHourlyQuote(quotes: Quote[]): Quote | null {
  const activeQuotes = quotes.filter((q) => q.isActive);
  if (!activeQuotes.length) return null;

  const hourBucket = Math.floor(Date.now() / (60 * 60 * 1000));
  const idx = hourBucket % activeQuotes.length;
  return activeQuotes[idx];
}

export function getDailyQuote(quotes: Quote[]): Quote | null {
  return getHourlyQuote(quotes);
}
