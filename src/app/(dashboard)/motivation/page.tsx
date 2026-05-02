"use client";

import { useEffect, useState } from "react";
import Panel from "@/components/dashboard/Panel";
import SectionTitle from "@/components/dashboard/SectionTitle";
import {
  generateQuoteId,
  getHourlyQuote,
  loadQuotes,
  saveQuotes,
  type Quote,
  type QuoteCategory,
} from "@/lib/motivationData";

const CATEGORY_LABELS: Record<QuoteCategory, string> = {
  dance: "Dance",
  strength: "Strength",
  mindset: "Mindset",
  consistency: "Consistency",
  confidence: "Confidence",
  growth: "Growth",
  self_love: "Self Love",
  general: "General",
};

const CATEGORIES = Object.keys(CATEGORY_LABELS) as QuoteCategory[];

type QuoteForm = {
  text: string;
  author: string;
  category: QuoteCategory;
  isActive: boolean;
  isFavorite: boolean;
};

const emptyForm: QuoteForm = {
  text: "",
  author: "",
  category: "general",
  isActive: true,
  isFavorite: false,
};

export default function MotivationPage() {
  const [mounted, setMounted] = useState(false);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [form, setForm] = useState<QuoteForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "favorites" | "inactive">("all");

  useEffect(() => {
    setQuotes(loadQuotes());
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="p-6 text-sm text-white/25">Loading...</div>;
  }

  const activeQuote = getHourlyQuote(quotes);
  const visibleQuotes = quotes.filter((quote) => {
    if (filter === "active") return quote.isActive;
    if (filter === "favorites") return quote.isFavorite;
    if (filter === "inactive") return !quote.isActive;
    return true;
  });

  function persist(next: Quote[]) {
    setQuotes(next);
    saveQuotes(next);
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  function saveQuote() {
    if (!form.text.trim()) return;
    const now = new Date().toISOString();

    if (editingId) {
      persist(
        quotes.map((quote) =>
          quote.id === editingId
            ? {
                ...quote,
                text: form.text.trim(),
                author: form.author.trim() || undefined,
                category: form.category,
                isActive: form.isActive,
                isFavorite: form.isFavorite,
                updatedAt: now,
              }
            : quote
        )
      );
      resetForm();
      return;
    }

    persist([
      ...quotes,
      {
        id: generateQuoteId(),
        text: form.text.trim(),
        author: form.author.trim() || undefined,
        category: form.category,
        isActive: form.isActive,
        isFavorite: form.isFavorite,
        isCustom: true,
        createdAt: now,
        updatedAt: now,
      },
    ]);
    resetForm();
  }

  function editQuote(quote: Quote) {
    setEditingId(quote.id);
    setForm({
      text: quote.text,
      author: quote.author ?? "",
      category: quote.category,
      isActive: quote.isActive,
      isFavorite: quote.isFavorite,
    });
  }

  function deleteQuote(id: string) {
    persist(quotes.filter((quote) => quote.id !== id));
    if (editingId === id) resetForm();
  }

  function toggleQuote(id: string, key: "isActive" | "isFavorite") {
    persist(quotes.map((quote) => quote.id === id ? { ...quote, [key]: !quote[key] } : quote));
  }

  const inputClass =
    "w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white placeholder-white/20 outline-none transition-colors focus:border-violet-500/40";

  return (
    <div className="max-w-5xl space-y-5">
      <div className="flex flex-col gap-2 border-b border-white/[0.06] pb-3">
        <h1 className="text-2xl font-semibold text-white">Motivation</h1>
        <p className="text-[13px] text-white/35">
          Manage your own quotes. The dashboard rotates through active quotes and keeps one stable for about one hour.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <Panel>
          <SectionTitle title={editingId ? "Edit Quote" : "Add Quote"} />
          <div className="mt-4 space-y-3">
            <div>
              <label className="mb-1 block text-[11px] uppercase tracking-widest text-white/35">Quote</label>
              <textarea
                rows={4}
                className={inputClass + " resize-none"}
                placeholder="Write a quote you want the dashboard to use..."
                value={form.text}
                onChange={(event) => setForm((prev) => ({ ...prev, text: event.target.value }))}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[11px] uppercase tracking-widest text-white/35">Author</label>
                <input
                  className={inputClass}
                  placeholder="Optional"
                  value={form.author}
                  onChange={(event) => setForm((prev) => ({ ...prev, author: event.target.value }))}
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] uppercase tracking-widest text-white/35">Category</label>
                <select
                  className={inputClass}
                  value={form.category}
                  onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value as QuoteCategory }))}
                >
                  {CATEGORIES.map((category) => (
                    <option key={category} value={category}>{CATEGORY_LABELS[category]}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, isActive: !prev.isActive }))}
                className={`rounded-lg border px-3 py-1.5 text-[12px] transition-colors ${
                  form.isActive
                    ? "border-emerald-500/25 bg-emerald-500/15 text-emerald-300"
                    : "border-white/[0.08] bg-white/[0.03] text-white/35"
                }`}
              >
                {form.isActive ? "Active" : "Inactive"}
              </button>
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, isFavorite: !prev.isFavorite }))}
                className={`rounded-lg border px-3 py-1.5 text-[12px] transition-colors ${
                  form.isFavorite
                    ? "border-pink-500/25 bg-pink-500/15 text-pink-300"
                    : "border-white/[0.08] bg-white/[0.03] text-white/35"
                }`}
              >
                {form.isFavorite ? "Favorite" : "Not favorite"}
              </button>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={saveQuote}
                disabled={!form.text.trim()}
                className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {editingId ? "Save Changes" : "Add Quote"}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-xl border border-white/[0.08] px-4 py-2 text-sm text-white/50 transition-colors hover:text-white"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </Panel>

        <Panel className="flex flex-col gap-3">
          <p className="text-[10px] uppercase tracking-widest text-white/25">Current Dashboard Quote</p>
          {activeQuote ? (
            <>
              <p className="text-lg font-semibold leading-relaxed text-white/85">&ldquo;{activeQuote.text}&rdquo;</p>
              {activeQuote.author && <p className="text-sm italic text-white/40">- {activeQuote.author}</p>}
              <p className="text-[12px] text-white/30">
                This quote stays stable for the current hour. Only active user-created quotes are eligible.
              </p>
            </>
          ) : (
            <p className="text-sm text-white/35">Add and activate at least one quote to show motivation on the dashboard.</p>
          )}
        </Panel>
      </div>

      <Panel>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <SectionTitle title="Quote Manager" subtitle={`${quotes.length} user-created quote${quotes.length === 1 ? "" : "s"}`} />
          <div className="flex flex-wrap gap-1 rounded-xl border border-white/[0.06] bg-white/[0.03] p-1">
            {(["all", "active", "favorites", "inactive"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setFilter(option)}
                className={`rounded-lg px-3 py-1.5 text-[12px] capitalize transition-colors ${
                  filter === option ? "bg-white/[0.09] text-white" : "text-white/35 hover:text-white/70"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        {visibleQuotes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/[0.08] p-8 text-center text-sm text-white/30">
            No quotes here yet. Add one above to start rotating your own motivation.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {visibleQuotes.map((quote) => (
              <div key={quote.id} className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm leading-relaxed text-white/80">&ldquo;{quote.text}&rdquo;</p>
                    {quote.author && <p className="mt-1 text-[12px] italic text-white/40">- {quote.author}</p>}
                  </div>
                  <span className="shrink-0 rounded-full border border-white/[0.08] px-2 py-0.5 text-[10px] text-white/35">
                    {CATEGORY_LABELS[quote.category]}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => toggleQuote(quote.id, "isActive")}
                    className={`rounded-lg border px-2.5 py-1 text-[11px] ${
                      quote.isActive
                        ? "border-emerald-500/25 bg-emerald-500/15 text-emerald-300"
                        : "border-white/[0.08] text-white/30"
                    }`}
                  >
                    {quote.isActive ? "Active" : "Inactive"}
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleQuote(quote.id, "isFavorite")}
                    className={`rounded-lg border px-2.5 py-1 text-[11px] ${
                      quote.isFavorite
                        ? "border-pink-500/25 bg-pink-500/15 text-pink-300"
                        : "border-white/[0.08] text-white/30"
                    }`}
                  >
                    {quote.isFavorite ? "Favorite" : "Favorite?"}
                  </button>
                  <button
                    type="button"
                    onClick={() => editQuote(quote)}
                    className="rounded-lg border border-white/[0.08] px-2.5 py-1 text-[11px] text-white/45 hover:text-white"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteQuote(quote.id)}
                    className="rounded-lg border border-red-500/20 px-2.5 py-1 text-[11px] text-red-300/70 hover:text-red-300"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
