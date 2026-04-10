"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend,
} from "recharts";
import Panel from "@/components/dashboard/Panel";
import SectionTitle from "@/components/dashboard/SectionTitle";
import {
  DANCE_CATEGORIES, DANCE_ITEMS,
  type DanceCategoryKey, type DanceCheckIn, type DanceDailyStatus,
  type DanceChecklistScore, type DanceReflection, type ScoreValue,
  loadCheckIns, saveCheckIns, loadDailyStatuses, saveDailyStatuses,
  getWeekStart, formatWeekRange, todayISO, generateDanceId,
  getCategoryAvg, getWeekAvg, getStrongestCategory, getWeakestCategory,
  getMostImproved, getScoreLabel, emptyReflection, emptyScores,
} from "@/lib/danceData";
import {
  type DanceSkill, type DanceSkillLog,
  loadSkills, saveSkills, loadSkillLogs, saveSkillLogs,
  getHighestConfidenceSkill, getLowestConfidenceSkill, getMostImprovedSkill,
  getAttemptedLogs, getCategoryConfig, getStatusConfig,
} from "@/lib/danceSkillData";
import SkillsTab from "@/components/dashboard/dance/SkillsTab";

// ── Constants ──────────────────────────────────────────────────────────────────

const QUOTES = [
  "Slow progress is still progress.",
  "You are building, not failing.",
  "Consistency counts even before visible results.",
  "Every rep is a deposit in your future body.",
  "Trust the process. Trust yourself.",
  "Strength doesn't arrive. It accumulates.",
];

const SCORE_LABELS: Record<ScoreValue, string> = {
  0: "Not yet", 1: "Improving", 2: "Solid", 3: "Strong",
};
const SCORE_COLORS: Record<ScoreValue, string> = {
  0: "rgba(255,255,255,0.08)",
  1: "rgba(251,191,36,0.25)",
  2: "rgba(16,185,129,0.25)",
  3: "rgba(139,92,246,0.35)",
};
const SCORE_TEXT: Record<ScoreValue, string> = {
  0: "text-white/30",
  1: "text-amber-400",
  2: "text-emerald-400",
  3: "text-violet-400",
};

type Tab = "overview" | "checkin" | "analytics" | "history" | "skills";

// ── Shared: score tap buttons ──────────────────────────────────────────────────

function ScoreButtons({
  value, onChange, disabled = false,
}: { value: ScoreValue; onChange: (s: ScoreValue) => void; disabled?: boolean }) {
  return (
    <div className="flex gap-1.5">
      {([0, 1, 2, 3] as ScoreValue[]).map((s) => (
        <button
          key={s}
          type="button"
          disabled={disabled}
          onClick={() => onChange(s)}
          className={`w-9 h-9 rounded-lg text-xs font-semibold transition-all border ${
            value === s
              ? `border-transparent ${SCORE_TEXT[s]}`
              : "border-white/[0.07] text-white/25 hover:border-white/20 hover:text-white/50"
          }`}
          style={value === s ? { background: SCORE_COLORS[s] } : {}}
        >
          {s}
        </button>
      ))}
    </div>
  );
}

// ── Shared: category average bar card ─────────────────────────────────────────

function CategoryCard({
  catKey, avg, prevAvg,
}: { catKey: DanceCategoryKey; avg: number; prevAvg: number | null }) {
  const cat    = DANCE_CATEGORIES.find((c) => c.key === catKey)!;
  const label  = getScoreLabel(avg);
  const delta  = prevAvg !== null ? avg - prevAvg : null;
  const pct    = (avg / 3) * 100;

  return (
    <div className="flex flex-col gap-2 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-white/10 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">{cat.icon}</span>
          <span className="text-[11px] font-medium text-white/70">{cat.label}</span>
        </div>
        {delta !== null && (
          <span className={`text-[10px] font-medium tabular-nums ${delta > 0 ? "text-emerald-400" : delta < 0 ? "text-rose-400" : "text-white/25"}`}>
            {delta > 0 ? `▲ +${delta.toFixed(1)}` : delta < 0 ? `▼ ${delta.toFixed(1)}` : "→"}
          </span>
        )}
      </div>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-bold tabular-nums" style={{ color: cat.color }}>{avg.toFixed(1)}</span>
        <span className={`text-[10px] mb-0.5 ${getScoreLabel(avg) === "Strong" ? "text-violet-400" : getScoreLabel(avg) === "Solid" ? "text-emerald-400" : getScoreLabel(avg) === "Building" ? "text-amber-400" : "text-white/30"}`}>{label}</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/[0.06]">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: cat.color }}
        />
      </div>
    </div>
  );
}

// ── Overview tab ───────────────────────────────────────────────────────────────

function OverviewTab({
  checkIns,
  dailyStatuses,
  onSaveDaily,
  onStartCheckIn,
  skills,
  skillLogs,
  onGoToSkills,
}: {
  checkIns: DanceCheckIn[];
  dailyStatuses: DanceDailyStatus[];
  onSaveDaily: (d: DanceDailyStatus) => void;
  onStartCheckIn: () => void;
  skills: DanceSkill[];
  skillLogs: DanceSkillLog[];
  onGoToSkills: () => void;
}) {
  const today     = todayISO();
  const weekStart = getWeekStart();
  const thisWeek  = checkIns.find((c) => c.weekOf === weekStart) ?? null;
  const lastWeek  = checkIns.find((c) => c.weekOf === getWeekStart(new Date(Date.now() - 7 * 86400000))) ?? null;
  const todayStatus = dailyStatuses.find((d) => d.date === today);

  const quote = useMemo(() => QUOTES[Math.floor(Math.random() * QUOTES.length)], []);

  const [daily, setDaily] = useState<DanceDailyStatus>(
    todayStatus ?? { date: today, mood: 0, soreness: 0, confidence: 0, trainedToday: false, notes: "" }
  );
  const [savedToday, setSavedToday] = useState(!!todayStatus);

  function saveDaily() {
    onSaveDaily(daily);
    setSavedToday(true);
  }

  const strongest = thisWeek ? DANCE_CATEGORIES.find((c) => c.key === getStrongestCategory(thisWeek)) : null;
  const weakest   = thisWeek ? DANCE_CATEGORIES.find((c) => c.key === getWeakestCategory(thisWeek)) : null;
  const weekAvg   = thisWeek ? getWeekAvg(thisWeek) : null;

  return (
    <div className="flex flex-col gap-5">
      {/* Week header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] text-white/30 uppercase tracking-widest">Current week</p>
          <p className="text-lg font-semibold mt-0.5">{formatWeekRange(weekStart)}</p>
        </div>
        <button
          onClick={onStartCheckIn}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-pink-600 hover:opacity-90 text-sm font-semibold transition-opacity shadow-lg shadow-violet-900/30"
        >
          {thisWeek ? "✏️ Edit check-in" : "✦ Complete weekly check-in"}
        </button>
      </div>

      {/* Quote */}
      <div className="px-4 py-3 rounded-xl bg-gradient-to-r from-violet-900/20 to-pink-900/10 border border-violet-500/15">
        <p className="text-[12px] text-violet-300/70 italic">✦ {quote}</p>
      </div>

      {/* No check-in empty state */}
      {!thisWeek && (
        <Panel>
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <div className="text-4xl">🌸</div>
            <p className="text-white/60 font-medium">Progress is more than landing a new trick.</p>
            <p className="text-white/30 text-sm max-w-xs">
              Start your first check-in and track what&#39;s actually improving.
            </p>
            <button
              onClick={onStartCheckIn}
              className="mt-2 px-5 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-pink-600 text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Start weekly check-in
            </button>
          </div>
        </Panel>
      )}

      {/* Summary row */}
      {thisWeek && (
        <div className="grid grid-cols-3 gap-3">
          <Panel className="flex flex-col gap-1 text-center">
            <p className="text-[10px] text-white/25 uppercase tracking-widest">Weekly avg</p>
            <p className="text-3xl font-bold text-violet-400 tabular-nums">{weekAvg?.toFixed(1)}</p>
            <p className="text-[11px] text-white/40">{getScoreLabel(weekAvg ?? 0)}</p>
          </Panel>
          {strongest && (
            <Panel className="flex flex-col gap-1 text-center">
              <p className="text-[10px] text-white/25 uppercase tracking-widest">Strongest</p>
              <p className="text-xl mt-1">{strongest.icon}</p>
              <p className="text-[11px] font-medium" style={{ color: strongest.color }}>{strongest.label}</p>
            </Panel>
          )}
          {weakest && weakest.key !== strongest?.key && (
            <Panel className="flex flex-col gap-1 text-center">
              <p className="text-[10px] text-white/25 uppercase tracking-widest">Needs love</p>
              <p className="text-xl mt-1">{weakest.icon}</p>
              <p className="text-[11px] font-medium text-white/50">{weakest.label}</p>
            </Panel>
          )}
        </div>
      )}

      {/* Category grid */}
      {thisWeek && (
        <Panel>
          <SectionTitle title="Category Scores" subtitle={`${formatWeekRange(weekStart)}`} />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {DANCE_CATEGORIES.map((cat) => (
              <CategoryCard
                key={cat.key}
                catKey={cat.key}
                avg={getCategoryAvg(thisWeek, cat.key)}
                prevAvg={lastWeek ? getCategoryAvg(lastWeek, cat.key) : null}
              />
            ))}
          </div>
        </Panel>
      )}

      {/* Today's status */}
      <Panel>
        <SectionTitle title="Today's Training Status" subtitle={today} />
        <div className="flex flex-col gap-4">
          {/* Mood */}
          <div>
            <p className="text-[11px] text-white/40 mb-2">Mood</p>
            <div className="flex gap-2">
              {["😫","😔","😐","😊","🤩"].map((emoji, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setDaily((d) => ({ ...d, mood: i + 1 }))}
                  className={`w-10 h-10 rounded-xl text-lg transition-all border ${daily.mood === i + 1 ? "border-violet-500/40 bg-violet-500/15 scale-110" : "border-white/[0.06] hover:border-white/20"}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
          {/* Soreness / Confidence */}
          <div className="grid grid-cols-2 gap-4">
            {(["soreness","confidence"] as const).map((field) => (
              <div key={field}>
                <p className="text-[11px] text-white/40 mb-2 capitalize">{field}</p>
                <div className="flex gap-1.5">
                  {[1,2,3,4,5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setDaily((d) => ({ ...d, [field]: n }))}
                      className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all border ${
                        daily[field] === n
                          ? "border-transparent bg-violet-500/25 text-violet-300"
                          : "border-white/[0.07] text-white/25 hover:border-white/20"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {/* Trained today */}
          <div className="flex items-center gap-3">
            <p className="text-[11px] text-white/40">Trained today?</p>
            {[true, false].map((v) => (
              <button
                key={String(v)}
                type="button"
                onClick={() => setDaily((d) => ({ ...d, trainedToday: v }))}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-medium border transition-all ${
                  daily.trainedToday === v
                    ? "border-violet-500/40 bg-violet-500/15 text-violet-300"
                    : "border-white/[0.07] text-white/30 hover:border-white/20"
                }`}
              >
                {v ? "Yes 🔥" : "Not today"}
              </button>
            ))}
          </div>
          {/* Notes */}
          <textarea
            className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white/70 placeholder-white/20 outline-none focus:border-violet-500/40 resize-none"
            rows={2}
            placeholder="Quick note about today…"
            value={daily.notes}
            onChange={(e) => setDaily((d) => ({ ...d, notes: e.target.value }))}
          />
          <div className="flex items-center gap-3">
            <button
              onClick={saveDaily}
              className="px-4 py-2 rounded-xl bg-violet-600/80 hover:bg-violet-600 text-sm font-medium transition-colors"
            >
              {savedToday ? "✓ Saved" : "Save status"}
            </button>
            {savedToday && <p className="text-[11px] text-white/30 italic">Small progress still counts.</p>}
          </div>
        </div>
      </Panel>

      {/* Latest reflection */}
      {thisWeek && (thisWeek.reflection.wins || thisWeek.reflection.evidenceOfProgress) && (
        <Panel>
          <SectionTitle title="This Week's Reflection" />
          <div className="grid grid-cols-2 gap-3">
            {thisWeek.reflection.wins && (
              <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                <p className="text-[10px] text-emerald-400/60 uppercase tracking-widest mb-1">Wins</p>
                <p className="text-[12px] text-white/60 leading-relaxed">{thisWeek.reflection.wins}</p>
              </div>
            )}
            {thisWeek.reflection.evidenceOfProgress && (
              <div className="p-3 rounded-xl bg-violet-500/5 border border-violet-500/10">
                <p className="text-[10px] text-violet-400/60 uppercase tracking-widest mb-1">Evidence of progress</p>
                <p className="text-[12px] text-white/60 leading-relaxed">{thisWeek.reflection.evidenceOfProgress}</p>
              </div>
            )}
          </div>
        </Panel>
      )}

      {/* Skills mini-summary */}
      {skills.length > 0 && (() => {
        const activeSkills  = skills.filter((s) => s.active);
        const highConf      = getHighestConfidenceSkill(activeSkills, skillLogs);
        const lowConf       = getLowestConfidenceSkill(activeSkills, skillLogs);
        const mostImproved  = getMostImprovedSkill(activeSkills, skillLogs);
        const totalAttempts = activeSkills.reduce((s, sk) => s + getAttemptedLogs(skillLogs, sk.id).length, 0);
        const inProgress    = activeSkills.filter((s) =>
          ["attempting","close","landed_once","building_consistency"].includes(s.currentStatus)
        ).length;
        return (
          <Panel>
            <div className="flex items-center justify-between mb-4">
              <SectionTitle title="Skills Snapshot" subtitle={`${activeSkills.length} moves tracked`} />
              <button onClick={onGoToSkills}
                className="text-[11px] text-violet-400/70 hover:text-violet-400 transition-colors">
                View all →
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 mb-3">
              {[
                { label: "In progress",    value: String(inProgress),        color: "text-amber-400"   },
                { label: "Total sessions", value: String(totalAttempts),     color: "text-violet-400"  },
                { label: "Highest conf.",  value: highConf?.name  ?? "—",    color: "text-emerald-400" },
                { label: "Most improved",  value: mostImproved?.name ?? "—", color: "text-sky-400"     },
              ].map(({ label, value, color }) => (
                <div key={label} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] flex flex-col gap-0.5">
                  <p className="text-[9px] text-white/25 uppercase tracking-widest">{label}</p>
                  <p className={`text-[13px] font-semibold truncate ${color}`}>{value}</p>
                </div>
              ))}
            </div>
            {lowConf && (
              <div className="px-3 py-2 rounded-xl bg-white/[0.02] border border-white/[0.05] flex items-center gap-2">
                <span className="text-base">{getCategoryConfig(lowConf.category).icon}</span>
                <div>
                  <p className="text-[10px] text-white/25">Needs confidence work</p>
                  <p className="text-[12px] text-white/60 font-medium">{lowConf.name}</p>
                </div>
                <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full"
                  style={{ color: getStatusConfig(lowConf.currentStatus).color, background: getStatusConfig(lowConf.currentStatus).bg }}>
                  {getStatusConfig(lowConf.currentStatus).label}
                </span>
              </div>
            )}
          </Panel>
        );
      })()}
    </div>
  );
}

// ── Check-In tab ───────────────────────────────────────────────────────────────

function CheckInTab({
  checkIns,
  onSave,
}: {
  checkIns: DanceCheckIn[];
  onSave: (checkIn: DanceCheckIn) => void;
}) {
  const weekStart   = getWeekStart();
  const existing    = checkIns.find((c) => c.weekOf === weekStart);
  const [scores, setScores]         = useState<DanceChecklistScore[]>(existing?.scores ?? emptyScores());
  const [reflection, setReflection] = useState<DanceReflection>(existing?.reflection ?? emptyReflection());
  const [expandedCats, setExpandedCats] = useState<Set<DanceCategoryKey>>(new Set(["strength"]));
  const [saved, setSaved]           = useState(false);

  // On first mount checkIns is [] (parent useEffect hasn't fired yet).
  // Once localStorage data loads and existing transitions from undefined → found,
  // sync local form state so the user sees their saved scores.
  useEffect(() => {
    if (existing) {
      setScores(existing.scores);
      setReflection(existing.reflection);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing?.id]);

  function setScore(itemId: string, score: ScoreValue) {
    setScores((prev) =>
      prev.map((s) => s.itemId === itemId ? { ...s, score } : s)
    );
    setSaved(false);
  }

  function toggleCat(key: DanceCategoryKey) {
    setExpandedCats((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  function save() {
    const now = new Date().toISOString();
    const checkIn: DanceCheckIn = {
      id:        existing?.id ?? generateDanceId(),
      weekOf:    weekStart,
      scores,
      reflection,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    onSave(checkIn);
    setSaved(true);
  }

  // Category completion %
  function catProgress(catKey: DanceCategoryKey): number {
    const items = DANCE_ITEMS.filter((i) => i.category === catKey);
    const scored = items.filter((item) => {
      const s = scores.find((sc) => sc.itemId === item.id);
      return s && s.score > 0;
    });
    return items.length ? Math.round((scored.length / items.length) * 100) : 0;
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
        <div>
          <h2 className="text-base font-semibold">Weekly Check-In</h2>
          <p className="text-[11px] text-white/30 mt-0.5">{formatWeekRange(weekStart)}</p>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-[10px] text-white/20">0 = Not yet · 1 = Improving · 2 = Solid · 3 = Strong</p>
        </div>
      </div>

      {/* Categories */}
      {DANCE_CATEGORIES.map((cat) => {
        const catItems = DANCE_ITEMS.filter((i) => i.category === cat.key);
        const subcats  = [...new Set(catItems.map((i) => i.subcategory).filter(Boolean))] as string[];
        const isOpen   = expandedCats.has(cat.key);
        const prog     = catProgress(cat.key);

        return (
          <Panel key={cat.key} className="flex flex-col gap-0 !p-0 overflow-hidden">
            {/* Category header — always visible */}
            <button
              type="button"
              onClick={() => toggleCat(cat.key)}
              className="flex items-center gap-3 w-full px-5 py-4 hover:bg-white/[0.02] transition-colors text-left"
            >
              <span className="text-lg">{cat.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{cat.label}</span>
                  <span className="text-[10px] text-white/25">{catItems.length} items</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-1 rounded-full bg-white/[0.06]">
                    <div className="h-full rounded-full transition-all duration-300" style={{ width: `${prog}%`, background: cat.color }} />
                  </div>
                  <span className="text-[10px] tabular-nums text-white/30">{prog}%</span>
                </div>
              </div>
              <span className="text-white/20 text-sm">{isOpen ? "▲" : "▼"}</span>
            </button>

            {/* Items */}
            {isOpen && (
              <div className="px-5 pb-5 flex flex-col gap-4 border-t border-white/[0.05]">
                {subcats.length > 0 ? (
                  subcats.map((sub) => (
                    <div key={sub} className="flex flex-col gap-3 mt-3">
                      <p className="text-[10px] font-semibold text-white/25 uppercase tracking-widest">{sub}</p>
                      {catItems.filter((i) => i.subcategory === sub).map((item) => {
                        const current = scores.find((s) => s.itemId === item.id)?.score ?? 0 as ScoreValue;
                        return (
                          <div key={item.id} className="flex items-center gap-3">
                            <p className="flex-1 text-[12px] text-white/60 leading-snug">{item.label}</p>
                            <ScoreButtons value={current as ScoreValue} onChange={(s) => setScore(item.id, s)} />
                          </div>
                        );
                      })}
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col gap-3 mt-3">
                    {catItems.map((item) => {
                      const current = scores.find((s) => s.itemId === item.id)?.score ?? 0 as ScoreValue;
                      return (
                        <div key={item.id} className="flex items-center gap-3">
                          <p className="flex-1 text-[12px] text-white/60 leading-snug">{item.label}</p>
                          <ScoreButtons value={current as ScoreValue} onChange={(s) => setScore(item.id, s)} />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </Panel>
        );
      })}

      {/* Reflection */}
      <Panel>
        <SectionTitle title="Reflection" subtitle="Take a moment — this is where growth becomes visible." />
        <div className="grid grid-cols-2 gap-3">
          {([
            ["wins",                    "🌟 Wins",                          "What went well this week?"],
            ["evidenceOfProgress",      "📈 Evidence of progress",          "What feels different or better?"],
            ["needsPatience",           "🌱 What needs patience",           "What are you still working on?"],
            ["nextWeekStrengthGoal",    "💪 Next week: strength goal",      "One strength focus…"],
            ["nextWeekFlexibilityGoal", "🌸 Next week: flexibility goal",   "One flexibility focus…"],
            ["nextWeekTechniqueGoal",   "✨ Next week: technique goal",     "One technique focus…"],
          ] as [keyof DanceReflection, string, string][]).map(([field, label, placeholder]) => (
            <div key={field} className="flex flex-col gap-1.5">
              <p className="text-[11px] text-white/40">{label}</p>
              <textarea
                className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-[12px] text-white/70 placeholder-white/20 outline-none focus:border-violet-500/40 resize-none"
                rows={3}
                placeholder={placeholder}
                value={reflection[field]}
                onChange={(e) => setReflection((r) => ({ ...r, [field]: e.target.value }))}
              />
            </div>
          ))}
        </div>
        <div className="mt-3">
          <p className="text-[11px] text-white/40 mb-1.5">📝 Additional notes</p>
          <textarea
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-[12px] text-white/70 placeholder-white/20 outline-none focus:border-violet-500/40 resize-none"
            rows={2}
            placeholder="Anything else you want to remember…"
            value={reflection.notes}
            onChange={(e) => setReflection((r) => ({ ...r, notes: e.target.value }))}
          />
        </div>
      </Panel>

      {/* Save */}
      <div className="flex items-center gap-3 pb-2">
        <button
          onClick={save}
          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-pink-600 hover:opacity-90 text-sm font-semibold transition-opacity shadow-lg shadow-violet-900/30"
        >
          Save weekly check-in
        </button>
        {saved && (
          <div className="flex flex-col">
            <p className="text-[12px] text-emerald-400">✓ Weekly check-in saved.</p>
            <p className="text-[11px] text-white/30 italic">Small progress still counts.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Analytics tab ──────────────────────────────────────────────────────────────

const RANGE_OPTIONS = [
  { label: "4 weeks",  weeks: 4 },
  { label: "8 weeks",  weeks: 8 },
  { label: "All time", weeks: 999 },
];

function AnalyticsTab({ checkIns }: { checkIns: DanceCheckIn[] }) {
  const [rangeIdx, setRangeIdx]         = useState(0);
  const [visibleCats, setVisibleCats]   = useState<Set<DanceCategoryKey>>(
    new Set(DANCE_CATEGORIES.map((c) => c.key))
  );

  const sorted = useMemo(
    () => [...checkIns].sort((a, b) => a.weekOf.localeCompare(b.weekOf)),
    [checkIns]
  );

  const sliced = useMemo(() => {
    const limit = RANGE_OPTIONS[rangeIdx].weeks;
    return sorted.slice(-limit);
  }, [sorted, rangeIdx]);

  // Line chart data: one row per week, one key per category
  const lineData = useMemo(() =>
    sliced.map((ci) => {
      const row: Record<string, string | number> = { week: formatWeekRange(ci.weekOf) };
      DANCE_CATEGORIES.forEach((cat) => {
        row[cat.key] = getCategoryAvg(ci, cat.key);
      });
      return row;
    }),
    [sliced]
  );

  // Bar chart: current week averages
  const thisWeek = checkIns.find((c) => c.weekOf === getWeekStart()) ?? null;
  const barData = DANCE_CATEGORIES.map((cat) => ({
    name: cat.label.split(" ")[0],
    avg: thisWeek ? getCategoryAvg(thisWeek, cat.key) : 0,
    color: cat.color,
  }));

  // Summary stats
  const lastWeek  = sorted.length >= 2 ? sorted[sorted.length - 2] : null;
  const mostImproved = thisWeek ? getMostImproved(thisWeek, lastWeek) : null;
  const mostImprovedCat = mostImproved ? DANCE_CATEGORIES.find((c) => c.key === mostImproved) : null;

  // Avg mood/soreness/confidence from daily statuses
  // (calculated from raw localStorage here to avoid prop drilling)
  const [dailyStats, setDailyStats] = useState({ mood: 0, soreness: 0, confidence: 0, trainingDays: 0 });
  useEffect(() => {
    const statuses = loadDailyStatuses();
    if (!statuses.length) return;
    const recent = statuses.slice(-7);
    setDailyStats({
      mood:         Math.round((recent.reduce((s, d) => s + (d.mood || 0), 0) / recent.length) * 10) / 10,
      soreness:     Math.round((recent.reduce((s, d) => s + (d.soreness || 0), 0) / recent.length) * 10) / 10,
      confidence:   Math.round((recent.reduce((s, d) => s + (d.confidence || 0), 0) / recent.length) * 10) / 10,
      trainingDays: recent.filter((d) => d.trainedToday).length,
    });
  }, []);

  const tooltipStyle = {
    contentStyle: { backgroundColor: "#0C0F1A", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", color: "white", fontSize: "11px" },
    cursor: { stroke: "rgba(255,255,255,0.08)" },
  };

  if (!checkIns.length) {
    return (
      <Panel>
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <div className="text-4xl">📊</div>
          <p className="text-white/50 font-medium">No data yet.</p>
          <p className="text-white/25 text-sm">Complete your first weekly check-in to see analytics.</p>
        </div>
      </Panel>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Weekly avg",     value: thisWeek ? getWeekAvg(thisWeek).toFixed(1) : "—",    sub: getScoreLabel(thisWeek ? getWeekAvg(thisWeek) : 0), color: "text-violet-400" },
          { label: "Check-ins done", value: String(checkIns.length),                              sub: "total sessions",                                    color: "text-sky-400"    },
          { label: "Training days",  value: String(dailyStats.trainingDays),                      sub: "last 7 days",                                       color: "text-emerald-400"},
          { label: "Avg confidence", value: dailyStats.confidence ? dailyStats.confidence.toFixed(1) + "/5" : "—", sub: "last 7 days",                    color: "text-pink-400"   },
        ].map(({ label, value, sub, color }) => (
          <Panel key={label} className="flex flex-col gap-1">
            <p className="text-[10px] text-white/25 uppercase tracking-widest">{label}</p>
            <p className={`text-2xl font-bold tabular-nums ${color}`}>{value}</p>
            <p className="text-[10px] text-white/30">{sub}</p>
          </Panel>
        ))}
      </div>

      {/* Most improved */}
      {mostImprovedCat && (
        <div className="px-4 py-3 rounded-xl bg-emerald-900/15 border border-emerald-500/15 flex items-center gap-3">
          <span className="text-xl">{mostImprovedCat.icon}</span>
          <div>
            <p className="text-[11px] text-emerald-400/80 font-medium">Most improved this week</p>
            <p className="text-sm text-white/70">{mostImprovedCat.label}</p>
          </div>
        </div>
      )}

      {/* Bar chart — this week */}
      {thisWeek && (
        <Panel>
          <SectionTitle title="This Week — Category Averages" />
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 3]} ticks={[0,1,2,3]} tick={{ fill: "rgba(255,255,255,0.2)", fontSize: 9 }} axisLine={false} tickLine={false} />
                <Tooltip {...tooltipStyle} formatter={(v) => [Number(v).toFixed(1), "Avg"]} />
                <Bar dataKey="avg" radius={[5, 5, 0, 0]}>
                  {barData.map((d, i) => <Cell key={i} fill={d.color} fillOpacity={0.8} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      )}

      {/* Line chart — trends */}
      {sliced.length >= 2 && (
        <Panel>
          <div className="flex items-start justify-between mb-4">
            <SectionTitle title="Category Trends Over Time" />
            <div className="flex gap-1">
              {RANGE_OPTIONS.map((opt, i) => (
                <button
                  key={opt.label}
                  onClick={() => setRangeIdx(i)}
                  className={`text-[10px] px-2.5 py-1 rounded-lg border transition-colors ${
                    rangeIdx === i ? "bg-violet-600/30 border-violet-500/30 text-violet-300" : "border-white/[0.07] text-white/30 hover:border-white/20"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          {/* Category toggles */}
          <div className="flex gap-1.5 flex-wrap mb-3">
            {DANCE_CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                type="button"
                onClick={() => setVisibleCats((prev) => {
                  const next = new Set(prev);
                  next.has(cat.key) ? next.delete(cat.key) : next.add(cat.key);
                  return next;
                })}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] border transition-all"
                style={visibleCats.has(cat.key) ? { borderColor: cat.color + "44", background: cat.color + "18", color: cat.color } : { borderColor: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.25)" }}
              >
                <span>{cat.icon}</span>
                <span>{cat.label.split(" ")[0]}</span>
              </button>
            ))}
          </div>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
                <XAxis dataKey="week" tick={{ fill: "rgba(255,255,255,0.2)", fontSize: 8 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 3]} ticks={[0,1,2,3]} tick={{ fill: "rgba(255,255,255,0.2)", fontSize: 9 }} axisLine={false} tickLine={false} />
                <Tooltip {...tooltipStyle} formatter={(v) => [Number(v).toFixed(1)]} />
                {DANCE_CATEGORIES.filter((c) => visibleCats.has(c.key)).map((cat) => (
                  <Line
                    key={cat.key}
                    type="monotone"
                    dataKey={cat.key}
                    stroke={cat.color}
                    strokeWidth={2}
                    dot={{ fill: cat.color, r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      )}

      {sliced.length < 2 && (
        <Panel>
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <p className="text-[13px] text-white/40">Complete 2+ check-ins to see trend graphs.</p>
            <p className="text-[11px] text-white/20 italic">You are building, not failing.</p>
          </div>
        </Panel>
      )}

      {/* Wellness metrics */}
      {(dailyStats.mood > 0 || dailyStats.soreness > 0) && (
        <Panel>
          <SectionTitle title="Wellness — Last 7 Days" subtitle="Averages from daily status logs" />
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Avg mood",        value: dailyStats.mood,       max: 5, color: "#ec4899" },
              { label: "Avg soreness",    value: dailyStats.soreness,   max: 5, color: "#f59e0b" },
              { label: "Avg confidence",  value: dailyStats.confidence, max: 5, color: "#8b5cf6" },
            ].map(({ label, value, max, color }) => (
              <div key={label} className="flex flex-col gap-1.5">
                <p className="text-[10px] text-white/30">{label}</p>
                <p className="text-xl font-bold tabular-nums" style={{ color }}>{value > 0 ? value.toFixed(1) : "—"}<span className="text-[10px] text-white/20">/{max}</span></p>
                <div className="h-1.5 rounded-full bg-white/[0.06]">
                  <div className="h-full rounded-full" style={{ width: `${(value / max) * 100}%`, background: color }} />
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}

// ── History tab ────────────────────────────────────────────────────────────────

function HistoryTab({
  checkIns,
  onEdit,
}: {
  checkIns: DanceCheckIn[];
  onEdit: (weekOf: string) => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const sorted = useMemo(
    () => [...checkIns].sort((a, b) => b.weekOf.localeCompare(a.weekOf)),
    [checkIns]
  );

  if (!sorted.length) {
    return (
      <Panel>
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <div className="text-4xl">🌸</div>
          <p className="text-white/50">No check-ins yet.</p>
          <p className="text-white/25 text-sm">Your history will appear here after your first check-in.</p>
        </div>
      </Panel>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {sorted.map((ci) => {
        const isOpen = expanded === ci.id;
        const avg    = getWeekAvg(ci);
        const strong = DANCE_CATEGORIES.find((c) => c.key === getStrongestCategory(ci));
        return (
          <Panel key={ci.id} className="flex flex-col gap-0 !p-0 overflow-hidden">
            {/* Row header */}
            <button
              type="button"
              className="flex items-center gap-3 w-full px-5 py-4 hover:bg-white/[0.02] transition-colors text-left"
              onClick={() => setExpanded(isOpen ? null : ci.id)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{formatWeekRange(ci.weekOf)}</span>
                  <span className="text-[10px] text-white/25">{ci.weekOf}</span>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-[11px] text-violet-400 tabular-nums font-semibold">{avg.toFixed(1)} avg</span>
                  {strong && (
                    <span className="text-[10px] text-white/30">
                      {strong.icon} {strong.label} strongest
                    </span>
                  )}
                </div>
              </div>
              <div
                role="button"
                tabIndex={0}
                onClick={(e) => { e.stopPropagation(); onEdit(ci.weekOf); }}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); onEdit(ci.weekOf); } }}
                className="text-[10px] px-2.5 py-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-white/40 hover:text-white/70 transition-colors mr-2 cursor-pointer"
              >
                Edit
              </div>
              <span className="text-white/20 text-sm">{isOpen ? "▲" : "▼"}</span>
            </button>

            {/* Expanded detail */}
            {isOpen && (
              <div className="px-5 pb-5 border-t border-white/[0.05] flex flex-col gap-4 mt-0">
                {/* Category scores */}
                <div className="grid grid-cols-2 gap-2 mt-4 sm:grid-cols-4">
                  {DANCE_CATEGORIES.map((cat) => (
                    <CategoryCard
                      key={cat.key}
                      catKey={cat.key}
                      avg={getCategoryAvg(ci, cat.key)}
                      prevAvg={null}
                    />
                  ))}
                </div>
                {/* Reflection snippets */}
                {(ci.reflection.wins || ci.reflection.evidenceOfProgress || ci.reflection.needsPatience) && (
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      ["wins",               "🌟 Wins",                ci.reflection.wins],
                      ["evidenceOfProgress", "📈 Evidence",            ci.reflection.evidenceOfProgress],
                      ["needsPatience",      "🌱 Needs patience",      ci.reflection.needsPatience],
                    ].filter(([,, v]) => v).map(([key, label, val]) => (
                      <div key={key} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                        <p className="text-[10px] text-white/30 mb-1">{label}</p>
                        <p className="text-[11px] text-white/55 leading-relaxed">{val}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Panel>
        );
      })}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string }[] = [
  { id: "overview",  label: "Overview"   },
  { id: "checkin",   label: "Check-In"   },
  { id: "analytics", label: "Analytics"  },
  { id: "history",   label: "History"    },
  { id: "skills",    label: "Skills"     },
];

export default function DancePage() {
  const [tab, setTab]               = useState<Tab>("overview");
  const [checkIns, setCheckIns]     = useState<DanceCheckIn[]>([]);
  const [dailyStatuses, setDailyStatuses] = useState<DanceDailyStatus[]>([]);
  const [skills,    setSkills]      = useState<DanceSkill[]>([]);
  const [skillLogs, setSkillLogs]   = useState<DanceSkillLog[]>([]);
  const [mounted, setMounted]       = useState(false);

  useEffect(() => {
    setCheckIns(loadCheckIns());
    setDailyStatuses(loadDailyStatuses());
    setSkills(loadSkills());
    setSkillLogs(loadSkillLogs());
    setMounted(true);
  }, []);

  function handleSaveCheckIn(ci: DanceCheckIn) {
    const updated = checkIns.some((c) => c.weekOf === ci.weekOf)
      ? checkIns.map((c) => c.weekOf === ci.weekOf ? ci : c)
      : [...checkIns, ci];
    setCheckIns(updated);
    saveCheckIns(updated);
  }

  function handleSaveDaily(d: DanceDailyStatus) {
    const updated = dailyStatuses.some((s) => s.date === d.date)
      ? dailyStatuses.map((s) => s.date === d.date ? d : s)
      : [...dailyStatuses, d];
    setDailyStatuses(updated);
    saveDailyStatuses(updated);
  }

  function handleEditWeek(weekOf: string) {
    // pre-load existing check-in and switch to check-in tab
    setTab("checkin");
    // scroll to top
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleSaveSkill(skill: DanceSkill) {
    const updated = skills.some((s) => s.id === skill.id)
      ? skills.map((s) => (s.id === skill.id ? skill : s))
      : [...skills, skill];
    setSkills(updated);
    saveSkills(updated);
  }

  function handleDeleteSkill(skillId: string) {
    const updated = skills.filter((s) => s.id !== skillId);
    setSkills(updated);
    saveSkills(updated);
  }

  function handleSaveLog(log: DanceSkillLog) {
    const updated = [...skillLogs, log];
    setSkillLogs(updated);
    saveSkillLogs(updated);
  }

  if (!mounted) return null;

  return (
    <div className="flex flex-col gap-5 max-w-[960px]">
      {/* Page header */}
      <div className="pb-3 border-b border-white/[0.06]">
        <h1 className="text-2xl font-semibold tracking-tight">Dance Training</h1>
        <p className="text-[12px] text-white/30 mt-0.5">Your personal training analytics — strength, flexibility, technique & more</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.06] w-fit">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              tab === id
                ? "bg-white/[0.09] text-white shadow-sm"
                : "text-white/35 hover:text-white/60"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "overview" && (
        <OverviewTab
          checkIns={checkIns}
          dailyStatuses={dailyStatuses}
          onSaveDaily={handleSaveDaily}
          onStartCheckIn={() => setTab("checkin")}
          skills={skills}
          skillLogs={skillLogs}
          onGoToSkills={() => setTab("skills")}
        />
      )}
      {tab === "checkin" && (
        <CheckInTab checkIns={checkIns} onSave={handleSaveCheckIn} />
      )}
      {tab === "analytics" && (
        <AnalyticsTab checkIns={checkIns} />
      )}
      {tab === "history" && (
        <HistoryTab checkIns={checkIns} onEdit={handleEditWeek} />
      )}
      {tab === "skills" && (
        <SkillsTab
          skills={skills}
          skillLogs={skillLogs}
          onSaveSkill={handleSaveSkill}
          onDeleteSkill={handleDeleteSkill}
          onSaveLog={handleSaveLog}
        />
      )}
    </div>
  );
}
