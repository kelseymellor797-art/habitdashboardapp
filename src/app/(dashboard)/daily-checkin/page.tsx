"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Panel from "@/components/dashboard/Panel";
import SectionTitle from "@/components/dashboard/SectionTitle";
import {
  type DailyCheckIn,
  loadDailyCheckIns,
  saveDailyCheckIns,
  getCheckInForDate,
  generateCheckInId,
  todayDateString,
  emptyCheckIn,
  MOOD_CATEGORIES,
  getMoodCategory,
  getMoodCategoryForFeelings,
  getMoodFeelingsLabel,
  moodScoreFromCategory,
  type MoodCategory,
} from "@/lib/dailyCheckinData";

// ── Constants ──────────────────────────────────────────────────────────────────

const MOOD_CATEGORY_META: Record<MoodCategory, { icon: string; tone: string }> = {
  "Depressed / Low": { icon: "🌧️", tone: "text-blue-200 border-blue-300/30 bg-blue-400/10" },
  "Meh / Neutral": { icon: "☁️", tone: "text-white/80 border-white/15 bg-white/[0.05]" },
  Good: { icon: "🌤️", tone: "text-emerald-100 border-emerald-300/30 bg-emerald-400/10" },
  "High / Amazing": { icon: "✨", tone: "text-amber-100 border-amber-300/30 bg-amber-400/10" },
};
const ENERGY_EMOJIS: Record<number, string> = {
  1: "🪫", 2: "😴", 3: "⚡", 4: "🔥", 5: "💥",
};

function monthPrefixFromDate(date: string): string {
  return date.slice(0, 7);
}

// ── Scale buttons ──────────────────────────────────────────────────────────────

function ScaleButtons({
  value,
  onChange,
  low = "Low",
  high = "High",
}: {
  value: number;
  onChange: (v: number) => void;
  low?: string;
  high?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`flex-1 h-10 rounded-xl text-sm font-semibold transition-all border ${
              value === n
                ? "bg-violet-500/25 border-violet-500/50 text-violet-200"
                : "border-white/[0.07] text-white/30 hover:border-white/20 hover:text-white/60"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="flex justify-between px-0.5">
        <span className="text-[10px] text-white/20">{low}</span>
        <span className="text-[10px] text-white/20">{high}</span>
      </div>
    </div>
  );
}

function EnergySlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-2xl">{ENERGY_EMOJIS[value]}</span>
        <span className="text-sm font-semibold text-white">{value}/5</span>
      </div>
      <input
        type="range"
        min="1"
        max="5"
        step="1"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-2 w-full cursor-pointer accent-amber-400"
      />
      <div className="mt-2 flex justify-between px-0.5 text-[10px] text-white/25">
        <span>🪫 Drained</span>
        <span>💥 Energized</span>
      </div>
    </div>
  );
}

// ── History item ───────────────────────────────────────────────────────────────

function HistoryRow({ entry }: { entry: DailyCheckIn }) {
  const [expanded, setExpanded] = useState(false);
  const date = new Date(entry.date + "T12:00:00");
  const dateLabel = date.toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
  });
  const moodCategory = entry.moodCategory ?? getMoodCategory(entry.moodFeeling, entry.mood);
  const moodMeta = MOOD_CATEGORY_META[moodCategory];
  const moodLabel = getMoodFeelingsLabel(entry);

  return (
    <div className="border border-white/[0.06] rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((p) => !p)}
        className="w-full flex items-center gap-4 px-4 py-3 hover:bg-white/[0.03] transition-colors text-left"
      >
        <span className="text-[12px] text-white/40 w-28 shrink-0">{dateLabel}</span>
        <span className="text-base">{moodMeta.icon}</span>
        <span className="min-w-0 flex-1 truncate text-[11px] text-white/60">{moodLabel}</span>
        <span className="text-base ml-1">{ENERGY_EMOJIS[entry.energy]}</span>
        <span className="text-[11px] text-white/30">Energy {entry.energy}/5</span>
        {entry.trainedToday && (
          <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/20">
            Trained 💃
          </span>
        )}
        <span className="text-white/20 text-xs ml-2">{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-white/[0.04] space-y-3">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Energy", value: entry.energy },
              { label: "Motivation", value: entry.motivation },
              { label: "Confidence", value: entry.confidence },
              { label: "Soreness", value: entry.soreness },
              { label: "Flexibility", value: entry.flexibilityFeeling },
            ].map(({ label, value }) => (
              <div key={label} className="flex flex-col">
                <span className="text-[10px] text-white/25 uppercase tracking-wide">{label}</span>
                <div className="flex gap-0.5 mt-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <div
                      key={n}
                      className={`h-1.5 flex-1 rounded-full ${n <= value ? "bg-violet-500" : "bg-white/[0.07]"}`}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {entry.trainedToday && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-white/30">Trained:</span>
              <span className="text-[11px] text-white/60 capitalize">{entry.trainingType ?? "—"}</span>
              {entry.trainingDuration && (
                <span className="text-[11px] text-white/30">· {entry.trainingDuration} min</span>
              )}
            </div>
          )}

          {(entry.bodyNotes || entry.bodyAreas?.length) && (
            <div>
              <span className="text-[10px] text-white/25 uppercase tracking-wide block mb-0.5">Body notes</span>
              {entry.bodyAreas?.length ? (
                <div className="mb-1 flex flex-wrap gap-1">
                  {entry.bodyAreas.map((area) => (
                    <span key={area} className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[10px] text-white/45">{area}</span>
                  ))}
                </div>
              ) : null}
              {entry.bodyNotes && <p className="text-[12px] text-white/60">{entry.bodyNotes}</p>}
            </div>
          )}

          {entry.wins && (
            <div>
              <span className="text-[10px] text-white/25 uppercase tracking-wide block mb-0.5">Wins 🌟</span>
              <p className="text-[12px] text-white/60">{entry.wins}</p>
            </div>
          )}
          {entry.goalsForTomorrow && (
            <div>
              <span className="text-[10px] text-white/25 uppercase tracking-wide block mb-0.5">Tomorrow ✨</span>
              <p className="text-[12px] text-white/60">{entry.goalsForTomorrow}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function DailyCheckInPage() {
  const [mounted, setMounted] = useState(false);
  const [checkIns, setCheckIns] = useState<DailyCheckIn[]>([]);
  const [selectedDate, setSelectedDate] = useState(todayDateString());
  const [viewMode, setViewMode] = useState<"form" | "saved">("form");

  // Form state
  type FormState = {
    mood: number; moodFeeling: string; moodFeelings: string[]; moodCategory: MoodCategory;
    energy: number; motivation: number; confidence: number;
    soreness: number; flexibilityFeeling: number; strengthFeeling: number;
    bodyNotes: string; bodyAreas: string[];
    trainedToday: boolean; trainingType: string; trainingDuration: string;
    mentalStateNotes: string; wins: string; whatFeltHard: string; goalsForTomorrow: string;
  };

  const defaultForm = (): FormState => ({
    mood: 3, moodFeeling: "Just okay", moodFeelings: ["Just okay"], moodCategory: "Meh / Neutral",
    energy: 3, motivation: 3, confidence: 3,
    soreness: 3, flexibilityFeeling: 3, strengthFeeling: 3,
    bodyNotes: "", bodyAreas: [],
    trainedToday: false, trainingType: "", trainingDuration: "",
    mentalStateNotes: "", wins: "", whatFeltHard: "", goalsForTomorrow: "",
  });

  const formFromEntry = (e: DailyCheckIn): FormState => ({
    mood: e.mood,
    moodFeeling: e.moodFeeling ?? getMoodFeelingsLabel(e),
    moodFeelings: e.moodFeelings?.length ? e.moodFeelings : [e.moodFeeling ?? "Just okay"],
    moodCategory: e.moodCategory ?? getMoodCategoryForFeelings(e.moodFeelings, e.mood),
    energy: e.energy, motivation: e.motivation, confidence: e.confidence,
    soreness: e.soreness, flexibilityFeeling: e.flexibilityFeeling,
    bodyNotes: e.bodyNotes ?? "", bodyAreas: e.bodyAreas ?? [],
    strengthFeeling: e.strengthFeeling, trainedToday: e.trainedToday,
    trainingType: e.trainingType ?? "", trainingDuration: e.trainingDuration ? String(e.trainingDuration) : "",
    mentalStateNotes: e.mentalStateNotes ?? "", wins: e.wins ?? "",
    whatFeltHard: e.whatFeltHard ?? "", goalsForTomorrow: e.goalsForTomorrow ?? "",
  });

  const [form, setForm] = useState<FormState>(defaultForm());

  // Load all check-ins on mount
  useEffect(() => {
    const all = loadDailyCheckIns();
    setCheckIns(all);
    const existing = getCheckInForDate(all, selectedDate);
    if (existing) {
      setForm(formFromEntry(existing));
      setViewMode("saved");
    }
    setMounted(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When date changes, load that date's data or reset form
  useEffect(() => {
    if (!mounted) return;
    const existing = getCheckInForDate(checkIns, selectedDate);
    if (existing) {
      setForm(formFromEntry(existing));
      setViewMode("saved");
    } else {
      setForm(defaultForm());
      setViewMode("form");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function selectFeeling(feeling: string, category: MoodCategory) {
    setForm((prev) => {
      const currentFeelings = prev.moodFeelings.length === 1 && prev.moodFeelings[0] === "Just okay" && feeling !== "Just okay"
        ? []
        : prev.moodFeelings;
      const toggledFeelings = currentFeelings.includes(feeling)
        ? currentFeelings.filter((item) => item !== feeling)
        : [...currentFeelings, feeling];
      const nextFeelings = toggledFeelings.length ? toggledFeelings : ["Just okay"];
      const nextCategory = toggledFeelings.includes(feeling)
        ? category
        : getMoodCategoryForFeelings(nextFeelings, prev.mood);
      return {
        ...prev,
        moodFeelings: nextFeelings,
        moodFeeling: nextFeelings.join(", "),
        moodCategory: nextCategory,
        mood: moodScoreFromCategory(nextCategory),
      };
    });
  }

  function handleSave() {
    const existing = getCheckInForDate(checkIns, selectedDate);
    const now = new Date().toISOString();
    const entry: DailyCheckIn = {
      ...emptyCheckIn(),
      id: existing?.id ?? generateCheckInId(),
      date: selectedDate,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      mood: form.mood,
      moodFeeling: form.moodFeeling,
      moodFeelings: form.moodFeelings,
      moodCategory: form.moodCategory,
      energy: form.energy,
      motivation: form.motivation,
      confidence: form.confidence,
      soreness: existing?.soreness ?? form.soreness,
      flexibilityFeeling: existing?.flexibilityFeeling ?? form.flexibilityFeeling,
      strengthFeeling: existing?.strengthFeeling ?? form.strengthFeeling,
      bodyNotes: existing?.bodyNotes,
      bodyAreas: existing?.bodyAreas ?? [],
      trainedToday: existing?.trainedToday ?? false,
      trainingType: existing?.trainingType,
      trainingDuration: existing?.trainingDuration,
      mentalStateNotes: existing?.mentalStateNotes,
      wins: existing?.wins,
      whatFeltHard: existing?.whatFeltHard,
      goalsForTomorrow: existing?.goalsForTomorrow,
    };
    const updated = existing
      ? checkIns.map((c) => (c.id === existing.id ? entry : c))
      : [entry, ...checkIns];
    saveDailyCheckIns(updated);
    setCheckIns(updated);
    setViewMode("saved");
  }

  function navigateDate(dir: -1 | 1) {
    const d = new Date(selectedDate + "T12:00:00");
    d.setDate(d.getDate() + dir);
    const next = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    // Don't allow navigating to future dates beyond today
    if (next > todayDateString()) return;
    setSelectedDate(next);
  }

  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="text-white/20 text-sm">Loading…</div>
      </div>
    );
  }

  const isToday = selectedDate === todayDateString();
  const selectedDateObj = new Date(selectedDate + "T12:00:00");
  const dateLabel = selectedDateObj.toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });
  const existing = getCheckInForDate(checkIns, selectedDate);
  const recentHistory = checkIns.filter((c) => c.date !== selectedDate)
    .sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7);
  const selectedMoodCategory = existing?.moodCategory ?? getMoodCategory(existing?.moodFeeling, existing?.mood ?? 3);
  const selectedMoodMeta = MOOD_CATEGORY_META[selectedMoodCategory];
  const selectedMoodLabel = existing ? getMoodFeelingsLabel(existing) : "";
  const recentMoodCounts = MOOD_CATEGORIES.map(({ category }) => ({
    category,
    count: checkIns
      .filter((entry) => entry.date >= monthPrefixFromDate(todayDateString()))
      .filter((entry) => (entry.moodCategory ?? getMoodCategory(entry.moodFeeling, entry.mood)) === category)
      .length,
  }));

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* Date navigation header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigateDate(-1)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-white/40 hover:text-white/70 hover:bg-white/[0.04] transition-colors"
        >
          ← Prev
        </button>
        <div className="text-center">
          <p className="text-[11px] text-white/25 uppercase tracking-widest">{dateLabel}</p>
          {!isToday && (
            <button
              type="button"
              onClick={() => setSelectedDate(todayDateString())}
              className="text-[10px] text-violet-400/70 hover:text-violet-300 mt-0.5 transition-colors"
            >
              Back to today
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => navigateDate(1)}
          disabled={isToday}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-white/40 hover:text-white/70 hover:bg-white/[0.04] transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
        >
          Next →
        </button>
      </div>

      {/* ── SAVED VIEW ─────────────────────────────────────────────────── */}
      {viewMode === "saved" && existing ? (
        <>
          {/* Success banner */}
          <div className="flex items-center justify-between px-5 py-4 rounded-2xl bg-gradient-to-r from-violet-600/20 to-pink-600/15 border border-violet-500/20">
            <div className="flex items-center gap-3">
              <span className="text-2xl">✅</span>
              <div>
                <p className="text-sm font-semibold text-white">Check-in saved</p>
                <p className="text-[11px] text-white/40">{dateLabel}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setViewMode("form")}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-white/[0.07] hover:bg-white/[0.12] text-white/70 transition-colors"
            >
              ✏️ Edit
            </button>
          </div>

          {/* Summary card */}
          <Panel>
            <div className="grid grid-cols-2 gap-4">
              {/* Feelings row */}
              <div className="col-span-2">
                <p className="text-[10px] text-white/25 uppercase tracking-widest mb-3">How you felt</p>
                <div className={`mb-3 rounded-xl border px-4 py-3 ${selectedMoodMeta.tone}`}>
                  <p className="text-[11px] uppercase tracking-widest opacity-70">{selectedMoodCategory}</p>
                  <p className="mt-1 text-lg font-semibold">{selectedMoodMeta.icon} {selectedMoodLabel}</p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Energy", val: existing.energy, emoji: ENERGY_EMOJIS[existing.energy] },
                    { label: "Motivation", val: existing.motivation, emoji: existing.motivation >= 4 ? "🔥" : existing.motivation >= 3 ? "💫" : "😶" },
                    { label: "Confidence", val: existing.confidence, emoji: existing.confidence >= 4 ? "💫" : existing.confidence >= 3 ? "😊" : "😬" },
                  ].map(({ label, val, emoji }) => (
                    <div key={label} className="flex flex-col items-center gap-1 p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                      <span className="text-xl">{emoji}</span>
                      <span className="text-sm font-semibold text-white">{val}/5</span>
                      <span className="text-[10px] text-white/30">{label}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </Panel>
        </>
      ) : (
        <>
      {/* Section 1: How I feel */}
      <Panel>
        <SectionTitle title="How I Feel" subtitle="Choose every feeling that fits today" />
        <div className="space-y-5">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3">
            <p className="text-[10px] uppercase tracking-widest text-white/25">Selected feelings</p>
            <p className="mt-1 text-base font-semibold text-white">{MOOD_CATEGORY_META[form.moodCategory].icon} {form.moodFeeling}</p>
            <p className="text-[12px] text-white/35">{form.moodCategory}</p>
          </div>
          <div className="space-y-4">
            {MOOD_CATEGORIES.map(({ category, feelings }) => (
              <div key={category}>
                <p className="mb-2 text-[12px] font-semibold text-white/65">{MOOD_CATEGORY_META[category].icon} {category}</p>
                <div className="flex flex-wrap gap-2">
                  {feelings.map((feeling) => {
                    const selected = form.moodFeelings.includes(feeling);
                    return (
                      <button
                        key={feeling}
                        type="button"
                        onClick={() => selectFeeling(feeling, category)}
                        className={`rounded-xl border px-3 py-2 text-[12px] font-medium transition-colors ${
                          selected
                            ? "border-emerald-300/50 bg-emerald-400/20 text-emerald-50"
                            : "border-white/[0.08] bg-white/[0.03] text-white/45 hover:border-white/20 hover:text-white/70"
                        }`}
                      >
                        {feeling}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          {[
            { key: "motivation" as const, label: "Motivation", low: "😶 Unmotivated", high: "🔥 Fired up" },
            { key: "confidence" as const, label: "Confidence", low: "😬 Shaky", high: "💫 Strong" },
          ].map(({ key, label, low, high }) => (
            <div key={key}>
              <p className="text-[12px] font-medium text-white/60 mb-2">{label}</p>
              <ScaleButtons
                value={form[key] as number}
                onChange={(v) => set(key, v)}
                low={low}
                high={high}
              />
            </div>
          ))}
          <div>
            <p className="text-[12px] font-medium text-white/60 mb-2">Energy</p>
            <EnergySlider value={form.energy} onChange={(v) => set("energy", v)} />
          </div>
        </div>
      </Panel>

      {checkIns.length > 0 && (
        <Panel>
          <SectionTitle title="Mood Pattern" subtitle="Feeling categories logged this month" />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {recentMoodCounts.map(({ category, count }) => (
              <div key={category} className={`rounded-xl border p-3 ${MOOD_CATEGORY_META[category].tone}`}>
                <p className="text-[10px] uppercase tracking-widest opacity-70">{category}</p>
                <p className="mt-1 text-xl font-semibold">{count}</p>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* Save button */}
      <button
        type="button"
        onClick={handleSave}
        className="w-full py-4 rounded-2xl font-semibold text-sm transition-all bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white shadow-lg shadow-violet-900/30 active:scale-[0.98]"
      >
        {existing ? "Update check-in" : "Save check-in ✓"}
      </button>
        </>
      )}

      {/* History — always visible below */}
      {recentHistory.length > 0 && (
        <div>
          <SectionTitle title="Recent Check-Ins" />
          <div className="space-y-2">
            {recentHistory.map((entry) => (
              <HistoryRow key={entry.id} entry={entry} />
            ))}
          </div>
        </div>
      )}

      {/* Quick nav */}
      <div className="pb-4">
        <Link
          href="/dashboard"
          className="text-[12px] text-white/25 hover:text-white/50 transition-colors"
        >
          ← Back to dashboard
        </Link>
      </div>
    </div>
  );
}
