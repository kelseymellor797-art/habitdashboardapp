"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Panel from "@/components/dashboard/Panel";
import SectionTitle from "@/components/dashboard/SectionTitle";
import {
  type DailyCheckIn,
  loadDailyCheckIns,
  saveDailyCheckIns,
  getTodayCheckIn,
  generateCheckInId,
  todayDateString,
  emptyCheckIn,
} from "@/lib/dailyCheckinData";

// ── Constants ──────────────────────────────────────────────────────────────────

const TRAINING_TYPES = [
  { value: "pole", label: "Pole" },
  { value: "heels", label: "Heels" },
  { value: "conditioning", label: "Conditioning" },
  { value: "flexibility", label: "Flexibility" },
  { value: "performance", label: "Performance" },
  { value: "other", label: "Other" },
];

const MOOD_EMOJIS: Record<number, string> = {
  1: "😞", 2: "😕", 3: "😐", 4: "😊", 5: "🤩",
};
const ENERGY_EMOJIS: Record<number, string> = {
  1: "🪫", 2: "😴", 3: "⚡", 4: "🔥", 5: "💥",
};

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

// ── History item ───────────────────────────────────────────────────────────────

function HistoryRow({ entry }: { entry: DailyCheckIn }) {
  const [expanded, setExpanded] = useState(false);
  const date = new Date(entry.date + "T12:00:00");
  const dateLabel = date.toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
  });

  return (
    <div className="border border-white/[0.06] rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((p) => !p)}
        className="w-full flex items-center gap-4 px-4 py-3 hover:bg-white/[0.03] transition-colors text-left"
      >
        <span className="text-[12px] text-white/40 w-28 shrink-0">{dateLabel}</span>
        <span className="text-base">{MOOD_EMOJIS[entry.mood]}</span>
        <span className="text-[11px] text-white/30">Mood {entry.mood}/5</span>
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
              { label: "Mood", value: entry.mood },
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
  const [saved, setSaved] = useState(false);

  // Form state
  type FormState = {
    mood: number; energy: number; motivation: number; confidence: number;
    soreness: number; flexibilityFeeling: number; strengthFeeling: number;
    trainedToday: boolean; trainingType: string; trainingDuration: string;
    mentalStateNotes: string; wins: string; whatFeltHard: string; goalsForTomorrow: string;
  };

  const defaultForm = (): FormState => ({
    mood: 3, energy: 3, motivation: 3, confidence: 3,
    soreness: 3, flexibilityFeeling: 3, strengthFeeling: 3,
    trainedToday: false, trainingType: "", trainingDuration: "",
    mentalStateNotes: "", wins: "", whatFeltHard: "", goalsForTomorrow: "",
  });

  const [form, setForm] = useState<FormState>(defaultForm());

  useEffect(() => {
    const all = loadDailyCheckIns();
    setCheckIns(all);
    const today = getTodayCheckIn(all);
    if (today) {
      setForm({
        mood: today.mood,
        energy: today.energy,
        motivation: today.motivation,
        confidence: today.confidence,
        soreness: today.soreness,
        flexibilityFeeling: today.flexibilityFeeling,
        strengthFeeling: today.strengthFeeling,
        trainedToday: today.trainedToday,
        trainingType: today.trainingType ?? "",
        trainingDuration: today.trainingDuration ? String(today.trainingDuration) : "",
        mentalStateNotes: today.mentalStateNotes ?? "",
        wins: today.wins ?? "",
        whatFeltHard: today.whatFeltHard ?? "",
        goalsForTomorrow: today.goalsForTomorrow ?? "",
      });
    }
    setMounted(true);
  }, []);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function handleSave() {
    const today = todayDateString();
    const existing = getTodayCheckIn(checkIns);
    const now = new Date().toISOString();
    const entry: DailyCheckIn = {
      ...emptyCheckIn(),
      id: existing?.id ?? generateCheckInId(),
      date: today,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      mood: form.mood,
      energy: form.energy,
      motivation: form.motivation,
      confidence: form.confidence,
      soreness: form.soreness,
      flexibilityFeeling: form.flexibilityFeeling,
      strengthFeeling: form.strengthFeeling,
      trainedToday: form.trainedToday,
      trainingType: form.trainedToday && form.trainingType ? form.trainingType : undefined,
      trainingDuration: form.trainedToday && form.trainingDuration
        ? Number(form.trainingDuration) : undefined,
      mentalStateNotes: form.mentalStateNotes || undefined,
      wins: form.wins || undefined,
      whatFeltHard: form.whatFeltHard || undefined,
      goalsForTomorrow: form.goalsForTomorrow || undefined,
    };
    const updated = existing
      ? checkIns.map((c) => (c.id === existing.id ? entry : c))
      : [entry, ...checkIns];
    saveDailyCheckIns(updated);
    setCheckIns(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="text-white/20 text-sm">Loading…</div>
      </div>
    );
  }

  const today = todayDateString();
  const todayDate = new Date(today + "T12:00:00");
  const dateLabel = todayDate.toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });
  const hasExisting = Boolean(getTodayCheckIn(checkIns));
  const recentHistory = checkIns.filter((c) => c.date !== today).slice(0, 7);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <p className="text-[11px] text-white/25 uppercase tracking-widest mb-1">{dateLabel}</p>
        <h1 className="text-2xl font-bold text-white">
          {hasExisting ? "Edit today's check-in ✏️" : "How are you feeling today? 🌿"}
        </h1>
        <p className="text-sm text-white/35 mt-1">
          {hasExisting
            ? "You already checked in today — update your entry below."
            : "Take a moment to check in with yourself."}
        </p>
      </div>

      {/* Section 1: How I feel */}
      <Panel>
        <SectionTitle title="How I Feel" subtitle="Rate yourself 1 (low) → 5 (high)" />
        <div className="space-y-5">
          {[
            { key: "mood" as const, label: "Mood", low: "😞 Low", high: "🤩 Amazing" },
            { key: "energy" as const, label: "Energy", low: "🪫 Drained", high: "💥 Energised" },
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
        </div>
      </Panel>

      {/* Section 2: Body check */}
      <Panel>
        <SectionTitle title="Body Check" subtitle="How does your body feel right now?" />
        <div className="space-y-5">
          {[
            { key: "soreness" as const, label: "Soreness", low: "😭 Very sore", high: "✨ Feeling fresh" },
            { key: "flexibilityFeeling" as const, label: "Flexibility feeling", low: "🪨 Super stiff", high: "🤸 Super flexible" },
            { key: "strengthFeeling" as const, label: "Strength feeling", low: "😓 Weak today", high: "💪 Feeling strong" },
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
        </div>
      </Panel>

      {/* Section 3: Training today */}
      <Panel>
        <SectionTitle title="Training Today" />
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => set("trainedToday", !form.trainedToday)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                form.trainedToday ? "bg-violet-500" : "bg-white/[0.1]"
              }`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  form.trainedToday ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
            <span className="text-[13px] text-white/70">
              {form.trainedToday ? "Yes, I trained today 💪" : "No training today"}
            </span>
          </div>

          {form.trainedToday && (
            <div className="space-y-4 pt-1">
              <div>
                <p className="text-[11px] text-white/30 uppercase tracking-wide mb-2">Type of training</p>
                <div className="flex flex-wrap gap-2">
                  {TRAINING_TYPES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => set("trainingType", t.value)}
                      className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all border ${
                        form.trainingType === t.value
                          ? "bg-violet-500/25 border-violet-500/50 text-violet-200"
                          : "border-white/[0.08] text-white/35 hover:border-white/20 hover:text-white/60"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[11px] text-white/30 uppercase tracking-wide block mb-2">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  min="1"
                  max="300"
                  value={form.trainingDuration}
                  onChange={(e) => set("trainingDuration", e.target.value)}
                  placeholder="e.g. 60"
                  className="w-32 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/80 placeholder-white/20 outline-none focus:border-violet-500/50"
                />
              </div>
            </div>
          )}
        </div>
      </Panel>

      {/* Section 4: Reflection */}
      <Panel>
        <SectionTitle title="Reflection" subtitle="Your private journal — be honest ✍️" />
        <div className="space-y-4">
          {[
            { key: "mentalStateNotes" as const, label: "Mental state", placeholder: "How's your head today? Any anxiety, focus issues, stress…" },
            { key: "wins" as const, label: "Wins today 🌟", placeholder: "What went well? No win is too small." },
            { key: "whatFeltHard" as const, label: "What felt hard 😤", placeholder: "What challenged you today? Be real with yourself." },
            { key: "goalsForTomorrow" as const, label: "Goals for tomorrow ✨", placeholder: "One thing you want to focus on tomorrow." },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="text-[12px] font-medium text-white/50 block mb-1.5">{label}</label>
              <textarea
                rows={2}
                value={form[key] as string}
                onChange={(e) => set(key, e.target.value)}
                placeholder={placeholder}
                className="w-full bg-white/[0.03] border border-white/[0.07] rounded-xl px-4 py-3 text-sm text-white/75 placeholder-white/20 resize-none outline-none focus:border-violet-500/40 focus:bg-white/[0.05] transition-colors"
              />
            </div>
          ))}
        </div>
      </Panel>

      {/* Save button */}
      <button
        type="button"
        onClick={handleSave}
        className="w-full py-4 rounded-2xl font-semibold text-sm transition-all bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white shadow-lg shadow-violet-900/30 active:scale-[0.98]"
      >
        {saved ? "✓ Saved!" : hasExisting ? "Update check-in" : "Save today's check-in"}
      </button>

      {/* History */}
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
