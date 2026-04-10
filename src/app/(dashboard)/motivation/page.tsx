"use client";

import { useEffect, useState, useRef } from "react";
import Panel from "@/components/dashboard/Panel";
import SectionTitle from "@/components/dashboard/SectionTitle";
import {
  type Quote,
  type QuoteCategory,
  loadQuotes,
  saveQuotes,
  generateQuoteId,
  getDailyQuote,
} from "@/lib/motivationData";

// ── Category config ────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<QuoteCategory, string> = {
  dance: "💃 Dance",
  strength: "💪 Strength",
  mindset: "🧠 Mindset",
  consistency: "📅 Consistency",
  confidence: "🌟 Confidence",
  growth: "🌱 Growth",
  self_love: "💕 Self Love",
  general: "✨ General",
};

const CATEGORY_COLORS: Record<QuoteCategory, string> = {
  dance: "bg-pink-500/20 text-pink-300 border-pink-500/20",
  strength: "bg-violet-500/20 text-violet-300 border-violet-500/20",
  mindset: "bg-sky-500/20 text-sky-300 border-sky-500/20",
  consistency: "bg-indigo-500/20 text-indigo-300 border-indigo-500/20",
  confidence: "bg-amber-500/20 text-amber-300 border-amber-500/20",
  growth: "bg-emerald-500/20 text-emerald-300 border-emerald-500/20",
  self_love: "bg-rose-500/20 text-rose-300 border-rose-500/20",
  general: "bg-purple-500/20 text-purple-300 border-purple-500/20",
};

const ALL_CATEGORIES: QuoteCategory[] = [
  "dance", "strength", "mindset", "consistency",
  "confidence", "growth", "self_love", "general",
];

type Tab = "all" | "favorites" | "add";

const EMPTY_FORM = { text: "", author: "", category: "general" as QuoteCategory };

// ── Quote card ─────────────────────────────────────────────────────────────────

function QuoteCard({
  quote,
  onToggleFavorite,
  onEdit,
  onDelete,
}: {
  quote: Quote;
  onToggleFavorite: (id: string) => void;
  onEdit: (quote: Quote) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-4 flex flex-col gap-2 hover:border-white/[0.12] transition-colors">
      <p className="text-[14px] text-white/80 leading-relaxed">&ldquo;{quote.text}&rdquo;</p>
      {quote.author && (
        <p className="text-[12px] text-white/40 italic">— {quote.author}</p>
      )}
      <div className="flex items-center justify-between mt-1 flex-wrap gap-2">
        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${CATEGORY_COLORS[quote.category]}`}>
          {CATEGORY_LABELS[quote.category]}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onToggleFavorite(quote.id)}
            title={quote.isFavorite ? "Unfavorite" : "Favorite"}
            className={`p-1.5 rounded-lg transition-colors text-sm ${
              quote.isFavorite
                ? "text-rose-400 bg-rose-500/10 hover:bg-rose-500/20"
                : "text-white/25 hover:text-rose-300 hover:bg-rose-500/10"
            }`}
          >
            {quote.isFavorite ? "❤️" : "🤍"}
          </button>
          {quote.isCustom && (
            <>
              <button
                type="button"
                onClick={() => onEdit(quote)}
                title="Edit"
                className="p-1.5 rounded-lg text-white/25 hover:text-violet-300 hover:bg-violet-500/10 transition-colors text-sm"
              >
                ✏️
              </button>
              <button
                type="button"
                onClick={() => onDelete(quote.id)}
                title="Delete"
                className="p-1.5 rounded-lg text-white/25 hover:text-red-400 hover:bg-red-500/10 transition-colors text-sm"
              >
                🗑️
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function MotivationPage() {
  const [mounted, setMounted] = useState(false);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [dailyQuote, setDailyQuote] = useState<Quote | null>(null);
  const [featuredQuote, setFeaturedQuote] = useState<Quote | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [filterCategory, setFilterCategory] = useState<QuoteCategory | "all">("all");
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState("");
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loaded = loadQuotes();
    setQuotes(loaded);
    const dq = getDailyQuote(loaded);
    setDailyQuote(dq);
    setFeaturedQuote(dq);
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="text-white/20 text-sm">Loading…</div>
      </div>
    );
  }

  // ── Handlers ─────────────────────────────────────────────────────────────────

  function shuffleQuote() {
    if (quotes.length === 0) return;
    const idx = Math.floor(Math.random() * quotes.length);
    setFeaturedQuote(quotes[idx]);
  }

  function toggleFavorite(id: string) {
    const updated = quotes.map((q) =>
      q.id === id ? { ...q, isFavorite: !q.isFavorite } : q
    );
    setQuotes(updated);
    saveQuotes(updated);
    if (featuredQuote?.id === id) {
      setFeaturedQuote((prev) => prev ? { ...prev, isFavorite: !prev.isFavorite } : prev);
    }
  }

  function handleEdit(quote: Quote) {
    setEditingId(quote.id);
    setForm({ text: quote.text, author: quote.author ?? "", category: quote.category });
    setActiveTab("add");
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }

  function handleDelete(id: string) {
    const updated = quotes.filter((q) => q.id !== id);
    setQuotes(updated);
    saveQuotes(updated);
    if (featuredQuote?.id === id && updated.length > 0) {
      setFeaturedQuote(updated[0]);
    }
  }

  function handleSave() {
    if (!form.text.trim()) {
      setFormError("Quote text is required.");
      return;
    }
    setFormError("");

    if (editingId) {
      const updated = quotes.map((q) =>
        q.id === editingId
          ? { ...q, text: form.text.trim(), author: form.author.trim() || undefined, category: form.category }
          : q
      );
      setQuotes(updated);
      saveQuotes(updated);
      setEditingId(null);
    } else {
      const newQuote: Quote = {
        id: generateQuoteId(),
        text: form.text.trim(),
        author: form.author.trim() || undefined,
        category: form.category,
        isFavorite: false,
        isCustom: true,
        createdAt: new Date().toISOString(),
      };
      const updated = [...quotes, newQuote];
      setQuotes(updated);
      saveQuotes(updated);
    }
    setForm(EMPTY_FORM);
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError("");
  }

  // ── Filtered lists ────────────────────────────────────────────────────────────

  const filteredAll = quotes.filter(
    (q) => filterCategory === "all" || q.category === filterCategory
  );
  const filteredFavorites = quotes.filter((q) => q.isFavorite);
  const customQuotes = quotes.filter((q) => q.isCustom);

  const featured = featuredQuote ?? dailyQuote;

  return (
    <div className="space-y-7 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-[28px] font-bold text-white leading-tight">✨ Motivation</h1>
        <p className="text-[13px] text-white/35 mt-1">Your daily dose of encouragement</p>
      </div>

      {/* Daily featured quote */}
      {featured && (
        <div
          className="relative overflow-hidden rounded-2xl px-6 py-7 border border-violet-500/20"
          style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.18) 0%, rgba(236,72,153,0.12) 100%)" }}
        >
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{ backgroundImage: "radial-gradient(circle at 15% 50%, #8b5cf6 0%, transparent 60%)" }}
          />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <span className={`text-[10px] px-2.5 py-1 rounded-full border ${CATEGORY_COLORS[featured.category]}`}>
                {CATEGORY_LABELS[featured.category]}
              </span>
              <button
                type="button"
                onClick={shuffleQuote}
                className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-xl bg-white/[0.07] border border-white/[0.1] text-white/60 hover:text-white hover:bg-white/[0.12] transition-all"
              >
                🔀 New quote
              </button>
            </div>
            <p className="text-[20px] font-semibold text-white leading-relaxed mb-3">
              &ldquo;{featured.text}&rdquo;
            </p>
            {featured.author && (
              <p className="text-[14px] text-white/50 italic">— {featured.author}</p>
            )}
            <div className="flex items-center gap-3 mt-4 flex-wrap">
              <button
                type="button"
                onClick={() => toggleFavorite(featured.id)}
                className={`flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-xl border transition-all ${
                  featured.isFavorite
                    ? "bg-rose-500/20 border-rose-500/30 text-rose-300"
                    : "bg-white/[0.05] border-white/[0.1] text-white/40 hover:text-rose-300"
                }`}
              >
                {featured.isFavorite ? "❤️ Favorited" : "🤍 Favorite"}
              </button>
              {featured.id === dailyQuote?.id ? (
                <span className="text-[11px] text-white/25">Today&apos;s quote</span>
              ) : (
                <span className="text-[11px] text-white/25">Random pick</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-white/[0.04] rounded-xl border border-white/[0.06] w-fit">
        {(["all", "favorites", "add"] as Tab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-lg text-[13px] transition-all ${
              activeTab === tab
                ? "bg-violet-500/20 text-white border border-violet-500/25 font-medium"
                : "text-white/40 hover:text-white/70"
            }`}
          >
            {tab === "all" ? "All Quotes" : tab === "favorites" ? "Favorites" : "Add Your Own"}
          </button>
        ))}
      </div>

      {/* ALL QUOTES TAB */}
      {activeTab === "all" && (
        <div className="space-y-5">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setFilterCategory("all")}
              className={`text-[12px] px-3 py-1 rounded-full border transition-all ${
                filterCategory === "all"
                  ? "bg-violet-500/20 text-violet-200 border-violet-500/30"
                  : "bg-white/[0.03] text-white/40 border-white/[0.08] hover:text-white/60"
              }`}
            >
              All
            </button>
            {ALL_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setFilterCategory(cat)}
                className={`text-[12px] px-3 py-1 rounded-full border transition-all ${
                  filterCategory === cat
                    ? CATEGORY_COLORS[cat]
                    : "bg-white/[0.03] text-white/40 border-white/[0.08] hover:text-white/60"
                }`}
              >
                {CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>

          <p className="text-[12px] text-white/30">{filteredAll.length} quotes</p>

          <div className="columns-1 md:columns-2 gap-4">
            {filteredAll.map((q) => (
              <div key={q.id} className="break-inside-avoid mb-4">
                <QuoteCard
                  quote={q}
                  onToggleFavorite={toggleFavorite}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              </div>
            ))}
          </div>

          {filteredAll.length === 0 && (
            <Panel>
              <p className="text-white/30 text-center text-[13px] py-4">
                No quotes in this category yet.
              </p>
            </Panel>
          )}
        </div>
      )}

      {/* FAVORITES TAB */}
      {activeTab === "favorites" && (
        <div className="space-y-5">
          {filteredFavorites.length === 0 ? (
            <Panel>
              <div className="flex flex-col items-center py-8 gap-2">
                <span className="text-3xl">💕</span>
                <p className="text-white/40 text-[14px]">Heart the quotes that speak to you 💕</p>
                <p className="text-white/25 text-[12px]">Tap ❤️ on any quote to save it here</p>
              </div>
            </Panel>
          ) : (
            <>
              <p className="text-[12px] text-white/30">{filteredFavorites.length} favorites</p>
              <div className="columns-1 md:columns-2 gap-4">
                {filteredFavorites.map((q) => (
                  <div key={q.id} className="break-inside-avoid mb-4">
                    <QuoteCard
                      quote={q}
                      onToggleFavorite={toggleFavorite}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ADD YOUR OWN TAB */}
      {activeTab === "add" && (
        <div className="space-y-6" ref={formRef}>
          <Panel>
            <SectionTitle title={editingId ? "Edit Quote" : "Add a Quote"} />
            <div className="space-y-4 mt-4">
              <div>
                <label className="block text-[11px] text-white/40 uppercase tracking-widest mb-2">
                  Quote text <span className="text-rose-400">*</span>
                </label>
                <textarea
                  value={form.text}
                  onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))}
                  placeholder="Enter an inspiring quote…"
                  rows={3}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-[14px] text-white/80 placeholder-white/20 resize-none focus:outline-none focus:border-violet-500/40 transition-colors"
                />
                {formError && <p className="text-rose-400 text-[12px] mt-1">{formError}</p>}
              </div>

              <div>
                <label className="block text-[11px] text-white/40 uppercase tracking-widest mb-2">
                  Author (optional)
                </label>
                <input
                  type="text"
                  value={form.author}
                  onChange={(e) => setForm((f) => ({ ...f, author: e.target.value }))}
                  placeholder="e.g. Maya Angelou"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-[14px] text-white/80 placeholder-white/20 focus:outline-none focus:border-violet-500/40 transition-colors"
                />
              </div>

              <div>
                <label className="block text-[11px] text-white/40 uppercase tracking-widest mb-2">
                  Category
                </label>
                <div className="flex flex-wrap gap-2">
                  {ALL_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, category: cat }))}
                      className={`text-[12px] px-3 py-1.5 rounded-full border transition-all ${
                        form.category === cat
                          ? CATEGORY_COLORS[cat]
                          : "bg-white/[0.03] text-white/40 border-white/[0.08] hover:text-white/60"
                      }`}
                    >
                      {CATEGORY_LABELS[cat]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleSave}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-pink-600 text-white text-[14px] font-semibold hover:opacity-90 transition-opacity"
                >
                  {editingId ? "Save Changes" : "Save Quote"}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="px-5 py-2.5 rounded-xl border border-white/[0.1] text-white/50 text-[14px] hover:text-white/70 transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </Panel>

          {customQuotes.length > 0 && (
            <div className="space-y-3">
              <SectionTitle title="Your Custom Quotes" />
              <div className="columns-1 md:columns-2 gap-4">
                {customQuotes.map((q) => (
                  <div key={q.id} className="break-inside-avoid mb-4">
                    <QuoteCard
                      quote={q}
                      onToggleFavorite={toggleFavorite}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {customQuotes.length === 0 && (
            <Panel>
              <p className="text-white/30 text-center text-[13px] py-4">
                Your custom quotes will appear here ✨
              </p>
            </Panel>
          )}
        </div>
      )}
    </div>
  );
}
