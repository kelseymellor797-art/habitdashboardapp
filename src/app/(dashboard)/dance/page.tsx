"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import Panel from "@/components/dashboard/Panel";
import SectionTitle from "@/components/dashboard/SectionTitle";
import {
  DANCE_CATEGORIES,
  type DanceCategoryKey, type DanceCheckIn, type DanceDailyStatus,
  loadCheckIns, loadDailyStatuses, saveDailyStatuses,
  loadTrainingPlan,
  DAILY_TRAINING_FOCUS_CATEGORIES,
  blankTrainingSectionItem,
  calculateDailyTrainingPlan,
  emptyDailyTrainingPlan,
  loadDailyTrainingPlans,
  saveDailyTrainingPlans,
  getWeekStart, formatWeekRange, todayISO,
  getCategoryAvg, getWeekAvg, getStrongestCategory, getWeakestCategory,
  getMostImproved, getScoreLabel,
  emptyTrainingPlan,
  type DailyTrainingFocus,
  type DailyTrainingFocusCategory,
  type DailyTrainingSection,
  type DailyTrainingPlan,
  type TrainingPlan,
} from "@/lib/danceData";
import {
  type DanceSkill, type DanceSkillLog,
  loadSkills, saveSkills, loadSkillLogs, saveSkillLogs,
  getHighestConfidenceSkill, getLowestConfidenceSkill, getMostImprovedSkill,
  getAttemptedLogs, getCategoryConfig, getStatusConfig,
} from "@/lib/danceSkillData";
import SkillsTab from "@/components/dashboard/dance/SkillsTab";
import { type ConditioningRoutine, loadConditioningRoutines } from "@/lib/conditioningData";
import { type MediaEntry, loadMediaEntries } from "@/lib/progressData";

// ── Constants ──────────────────────────────────────────────────────────────────

const QUOTES = [
  "Slow progress is still progress.",
  "You are building, not failing.",
  "Consistency counts even before visible results.",
  "Every rep is a deposit in your future body.",
  "Trust the process. Trust yourself.",
  "Strength doesn't arrive. It accumulates.",
];

type Tab = "overview" | "checkin" | "plan" | "analytics" | "history" | "skills" | "conditioning" | "media" | "progress";

const TRAINING_FOCUS_OPTIONS = [
  "Pole", "Floorwork", "Flexibility", "Strength", "Conditioning", "Heels",
  "Spins", "Tricks", "Choreo", "Freestyle", "Recovery / mobility",
];

const BODY_FEEL_OPTIONS = [
  "Strong", "Tight", "Tired", "Flexible", "Weak", "Balanced", "Shaky", "Sore", "Better than expected",
];

const TRAINING_QUALITY_OPTIONS = [
  "Amazing", "Good", "Okay", "Frustrating", "Hard but productive", "Not great", "Skipped",
];

function todayWeekdayLabel(): string {
  return new Date().toLocaleDateString("en-US", { weekday: "long" });
}

function toggleString(list: string[] | undefined, value: string): string[] {
  const current = list ?? [];
  return current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
}

function ChipButton({ selected, children, onClick }: { selected: boolean; children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-3 py-2 text-sm transition-colors ${
        selected
          ? "border-emerald-300/50 bg-emerald-400/20 text-emerald-50 shadow-sm shadow-emerald-950/30"
          : "border-white/[0.08] bg-white/[0.03] text-white/45 hover:border-white/20 hover:text-white/70"
      }`}
    >
      {children}
    </button>
  );
}

function ScalePicker({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`h-11 rounded-xl border text-sm font-semibold transition-colors ${
            value === n
              ? "border-violet-400/40 bg-violet-500/20 text-violet-100"
              : "border-white/[0.08] bg-white/[0.03] text-white/35 hover:border-white/20"
          }`}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

const inputClass = "w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-sm text-white/80 placeholder-white/20 outline-none focus:border-violet-400/40";
const textareaClass = `${inputClass} min-h-24 resize-none`;

// ── Shared: score tap buttons ──────────────────────────────────────────────────

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
  const previousWeekStart = useMemo(() => {
    const date = new Date(`${weekStart}T00:00:00`);
    date.setDate(date.getDate() - 7);
    return getWeekStart(date);
  }, [weekStart]);
  const lastWeek  = checkIns.find((c) => c.weekOf === previousWeekStart) ?? null;
  const todayStatus = dailyStatuses.find((d) => d.date === today);

  const quote = QUOTES[weekStart.charCodeAt(weekStart.length - 1) % QUOTES.length];

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
      {/* Check-in header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] text-white/30 uppercase tracking-widest">Training check-in</p>
          <p className="text-lg font-semibold mt-0.5">{formatWeekRange(weekStart)}</p>
        </div>
        <button
          onClick={onStartCheckIn}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-pink-600 hover:opacity-90 text-sm font-semibold transition-opacity shadow-lg shadow-violet-900/30"
        >
          {thisWeek ? "✏️ Edit check-in" : "✦ Complete daily check-in"}
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
              Start daily check-in
            </button>
          </div>
        </Panel>
      )}

      {/* Summary row */}
      {thisWeek && (
        <div className="grid grid-cols-3 gap-3">
          <Panel className="flex flex-col gap-1 text-center">
            <p className="text-[10px] text-white/25 uppercase tracking-widest">Check-in avg</p>
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
          <SectionTitle title="Training Reflection" />
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
  dailyStatuses,
  onSaveDaily,
  trainingPlan,
  skills,
  conditioningRoutines,
  mediaEntries,
}: {
  dailyStatuses: DanceDailyStatus[];
  onSaveDaily: (status: DanceDailyStatus) => void;
  trainingPlan: TrainingPlan;
  skills: DanceSkill[];
  conditioningRoutines: ConditioningRoutine[];
  mediaEntries: MediaEntry[];
}) {
  const today = todayISO();
  const existing = dailyStatuses.find((status) => status.date === today);
  const todayPlan = trainingPlan.weeklyMap[todayWeekdayLabel()];
  const todaysMedia = mediaEntries.filter((entry) => entry.date === today);
  const activeGoals = trainingPlan.goals.filter((goal) => !["Mastered", "Paused"].includes(goal.status));
  const [saved, setSaved] = useState(false);
  const [daily, setDaily] = useState<DanceDailyStatus>(
    existing ?? {
      date: today,
      mood: 3,
      soreness: 3,
      confidence: 3,
      trainedToday: false,
      trainingStatus: "",
      trainingFocus: [],
      energy: 3,
      painNotes: "",
      bodyFelt: [],
      trainingQuality: "",
      smallWin: "",
      needsWork: "",
      tomorrowNotes: "",
      followedPlan: "",
      skillsPracticed: [],
      conditioningCompleted: [],
      mediaLinked: [],
      goalsWorkedOn: [],
      goalProgressNotes: "",
      notes: "",
    }
  );

  function setStatus(status: "yes" | "no" | "light") {
    setDaily((current) => ({
      ...current,
      trainingStatus: status,
      trainedToday: status === "yes" || status === "light",
      trainingQuality: status === "no" && !current.trainingQuality ? "Skipped" : current.trainingQuality,
    }));
    setSaved(false);
  }

  function save() {
    onSaveDaily({
      ...daily,
      mood: daily.energy ?? daily.mood ?? 3,
      confidence: daily.confidence || 3,
      notes: [daily.smallWin, daily.needsWork, daily.tomorrowNotes, daily.goalProgressNotes].filter(Boolean).join("\n"),
    });
    setSaved(true);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="pb-3 border-b border-white/[0.06]">
        <div>
          <h2 className="text-xl font-semibold">Daily Dance Check-In</h2>
          <p className="text-sm text-white/35 mt-1">{today}</p>
        </div>
      </div>

      <Panel>
        <SectionTitle title="Today's Plan" subtitle="Pulled from Training Plan" />
        {todayPlan && (todayPlan.restDay || todayPlan.plannedFocus || todayPlan.plannedSkills || todayPlan.plannedConditioning) ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
              <p className="text-[11px] uppercase tracking-widest text-white/25">Planned focus</p>
              <p className="mt-1 text-sm text-white/75">{todayPlan.restDay ? "Rest day" : todayPlan.plannedFocus || "Not set"}</p>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
              <p className="text-[11px] uppercase tracking-widest text-white/25">Skills / conditioning</p>
              <p className="mt-1 text-sm text-white/75">{[todayPlan.plannedSkills, todayPlan.plannedConditioning].filter(Boolean).join(" · ") || "Not set"}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-white/35">No plan set for today yet.</p>
        )}
        <div className="mt-4">
          <p className="mb-2 text-sm text-white/60">Did I follow the plan?</p>
          <div className="grid grid-cols-3 gap-2">
            {(["yes", "partly", "no"] as const).map((option) => (
              <ChipButton key={option} selected={daily.followedPlan === option} onClick={() => setDaily((current) => ({ ...current, followedPlan: option }))}>
                {option === "yes" ? "Yes" : option === "partly" ? "Partly" : "No"}
              </ChipButton>
            ))}
          </div>
        </div>
      </Panel>

      <Panel>
        <SectionTitle title="Training Status" />
        <div className="grid gap-2 sm:grid-cols-3">
          {[
            ["yes", "Yes"],
            ["no", "No"],
            ["light", "Light / recovery only"],
          ].map(([value, label]) => (
            <ChipButton key={value} selected={daily.trainingStatus === value} onClick={() => setStatus(value as "yes" | "no" | "light")}>
              {label}
            </ChipButton>
          ))}
        </div>
      </Panel>

      <Panel>
        <SectionTitle title="Training Focus" subtitle="Choose all that apply" />
        <div className="flex flex-wrap gap-2">
          {TRAINING_FOCUS_OPTIONS.map((focus) => (
            <ChipButton key={focus} selected={daily.trainingFocus?.includes(focus) ?? false} onClick={() => setDaily((current) => ({ ...current, trainingFocus: toggleString(current.trainingFocus, focus) }))}>
              {focus}
            </ChipButton>
          ))}
        </div>
      </Panel>

      <Panel>
        <SectionTitle title="Body Check" />
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-sm text-white/60">Energy level</p>
            <ScalePicker value={daily.energy ?? daily.mood ?? 3} onChange={(energy) => setDaily((current) => ({ ...current, energy, mood: energy }))} />
          </div>
          <div>
            <p className="mb-2 text-sm text-white/60">Soreness level</p>
            <ScalePicker value={daily.soreness || 3} onChange={(soreness) => setDaily((current) => ({ ...current, soreness }))} />
          </div>
        </div>
        <div className="mt-5">
          <p className="mb-2 text-sm text-white/60">Body felt</p>
          <div className="flex flex-wrap gap-2">
            {BODY_FEEL_OPTIONS.map((feeling) => (
              <ChipButton key={feeling} selected={daily.bodyFelt?.includes(feeling) ?? false} onClick={() => setDaily((current) => ({ ...current, bodyFelt: toggleString(current.bodyFelt, feeling) }))}>
                {feeling}
              </ChipButton>
            ))}
          </div>
        </div>
        <textarea
          className={`${textareaClass} mt-4 min-h-20`}
          placeholder="Pain or injury notes..."
          value={daily.painNotes ?? ""}
          onChange={(event) => setDaily((current) => ({ ...current, painNotes: event.target.value }))}
        />
      </Panel>

      <Panel>
        <SectionTitle title="Training Quality" />
        <div className="flex flex-wrap gap-2">
          {TRAINING_QUALITY_OPTIONS.map((quality) => (
            <ChipButton key={quality} selected={daily.trainingQuality === quality} onClick={() => setDaily((current) => ({ ...current, trainingQuality: quality }))}>
              {quality}
            </ChipButton>
          ))}
        </div>
      </Panel>

      <Panel>
        <SectionTitle title="Progress Notes" />
        <div className="grid gap-3">
          <input className={inputClass} placeholder="Small win today" value={daily.smallWin ?? ""} onChange={(event) => setDaily((current) => ({ ...current, smallWin: event.target.value }))} />
          <input className={inputClass} placeholder="What needs work?" value={daily.needsWork ?? ""} onChange={(event) => setDaily((current) => ({ ...current, needsWork: event.target.value }))} />
          <input className={inputClass} placeholder="Notes for tomorrow" value={daily.tomorrowNotes ?? ""} onChange={(event) => setDaily((current) => ({ ...current, tomorrowNotes: event.target.value }))} />
        </div>
      </Panel>

      <Panel>
        <SectionTitle title="Linked Items" subtitle="Optional" />
        <div className="grid gap-5">
          <div>
            <p className="mb-2 text-sm text-white/60">Skills practiced</p>
            <div className="flex max-h-40 flex-wrap gap-2 overflow-auto">
              {skills.filter((skill) => skill.active).slice(0, 40).map((skill) => (
                <ChipButton key={skill.id} selected={daily.skillsPracticed?.includes(skill.id) ?? false} onClick={() => setDaily((current) => ({ ...current, skillsPracticed: toggleString(current.skillsPracticed, skill.id) }))}>
                  {skill.name}
                </ChipButton>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm text-white/60">Conditioning routines completed</p>
            <div className="flex flex-wrap gap-2">
              {conditioningRoutines.filter((routine) => routine.active).map((routine) => (
                <ChipButton key={routine.id} selected={daily.conditioningCompleted?.includes(routine.id) ?? false} onClick={() => setDaily((current) => ({ ...current, conditioningCompleted: toggleString(current.conditioningCompleted, routine.id) }))}>
                  {routine.name}
                </ChipButton>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm text-white/60">Media uploaded today</p>
            <div className="flex flex-wrap gap-2">
              {todaysMedia.length ? todaysMedia.map((entry) => (
                <ChipButton key={entry.id} selected={daily.mediaLinked?.includes(entry.id) ?? false} onClick={() => setDaily((current) => ({ ...current, mediaLinked: toggleString(current.mediaLinked, entry.id) }))}>
                  {entry.title}
                </ChipButton>
              )) : <p className="text-sm text-white/30">No media uploaded today.</p>}
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm text-white/60">Goals worked on</p>
            <div className="flex flex-wrap gap-2">
              {activeGoals.length ? activeGoals.map((goal) => (
                <ChipButton key={goal.id} selected={daily.goalsWorkedOn?.includes(goal.id) ?? false} onClick={() => setDaily((current) => ({ ...current, goalsWorkedOn: toggleString(current.goalsWorkedOn, goal.id) }))}>
                  {goal.title}
                </ChipButton>
              )) : <p className="text-sm text-white/30">No active goals yet. Add some in Training Plan.</p>}
            </div>
            <textarea
              className={`${textareaClass} mt-3 min-h-20`}
              placeholder="Goal progress notes..."
              value={daily.goalProgressNotes ?? ""}
              onChange={(event) => setDaily((current) => ({ ...current, goalProgressNotes: event.target.value }))}
            />
          </div>
        </div>
      </Panel>

      <div className="sticky bottom-4 z-10 flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-[#090c14]/95 p-3 shadow-2xl shadow-black/40 backdrop-blur">
        <button onClick={save} className="rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white hover:bg-violet-500">
          Save daily check-in
        </button>
        {saved && <p className="text-sm text-emerald-300">Saved for today.</p>}
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
    queueMicrotask(() => {
      const statuses = loadDailyStatuses();
      if (!statuses.length) return;
      const recent = statuses.slice(-7);
      setDailyStats({
        mood:         Math.round((recent.reduce((s, d) => s + (d.mood || 0), 0) / recent.length) * 10) / 10,
        soreness:     Math.round((recent.reduce((s, d) => s + (d.soreness || 0), 0) / recent.length) * 10) / 10,
        confidence:   Math.round((recent.reduce((s, d) => s + (d.confidence || 0), 0) / recent.length) * 10) / 10,
        trainingDays: recent.filter((d) => d.trainedToday).length,
      });
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
          <p className="text-white/25 text-sm">Complete your first training check-in to see analytics.</p>
        </div>
      </Panel>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Check-in avg",   value: thisWeek ? getWeekAvg(thisWeek).toFixed(1) : "—",    sub: getScoreLabel(thisWeek ? getWeekAvg(thisWeek) : 0), color: "text-violet-400" },
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
            <p className="text-[11px] text-emerald-400/80 font-medium">Most improved recently</p>
            <p className="text-sm text-white/70">{mostImprovedCat.label}</p>
          </div>
        </div>
      )}

      {/* Bar chart — current check-in */}
      {thisWeek && (
        <Panel>
          <SectionTitle title="Current Check-In — Category Averages" />
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
                  if (next.has(cat.key)) next.delete(cat.key);
                  else next.add(cat.key);
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

function minutesValue(value: number): string {
  return Number.isFinite(value) ? String(value) : "0";
}

function SummaryMetric({ label, value, sub, accent }: { label: string; value: string; sub: string; accent: string }) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.035] px-4 py-3">
      <p className="text-[10px] uppercase tracking-widest text-white/25">{label}</p>
      <p className={`mt-2 text-2xl font-bold tabular-nums ${accent}`}>{value}</p>
      <p className="mt-1 text-[11px] text-white/30">{sub}</p>
    </div>
  );
}

function MinutesInput({ value, onChange }: { value: number; onChange: (minutes: number) => void }) {
  return (
    <label className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-black/20 px-3 py-2">
      <input
        type="number"
        min={0}
        value={minutesValue(value)}
        onChange={(event) => onChange(Math.max(0, Number.parseInt(event.target.value, 10) || 0))}
        className="w-14 bg-transparent text-right text-sm font-semibold text-white outline-none tabular-nums"
      />
      <span className="text-[11px] text-white/30">min</span>
    </label>
  );
}

function SectionNotes({
  value,
  onChange,
  placeholder,
  compact = false,
}: {
  value: string;
  onChange: (notes: string) => void;
  placeholder: string;
  compact?: boolean;
}) {
  return (
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      rows={compact ? 2 : 3}
      className="w-full resize-none rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white/70 outline-none placeholder:text-white/20 focus:border-violet-400/50"
    />
  );
}

function FocusEditor({
  focus,
  onChange,
  index,
  onDelete,
}: {
  focus: DailyTrainingFocus;
  onChange: (focus: DailyTrainingFocus) => void;
  index: number;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-black/15 p-3">
      <div className="grid gap-2 md:grid-cols-[minmax(0,1.2fr)_150px_auto_auto]">
        <input
          value={focus.label}
          onChange={(event) => onChange({ ...focus, label: event.target.value })}
          placeholder={`Focus area ${index + 1}`}
          className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white/75 outline-none placeholder:text-white/20 focus:border-pink-400/50"
        />
        <select
          value={focus.type}
          onChange={(event) => onChange({ ...focus, type: event.target.value as DailyTrainingFocusCategory })}
          className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white/65 outline-none focus:border-pink-400/50"
        >
          {DAILY_TRAINING_FOCUS_CATEGORIES.map((category) => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>
        <label className="flex items-center justify-start gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[12px] text-white/45 md:justify-center">
          <input
            type="checkbox"
            checked={focus.completed}
            onChange={(event) => onChange({ ...focus, completed: event.target.checked })}
            className="h-4 w-4 accent-pink-500"
          />
          Done
        </label>
        <button
          type="button"
          onClick={onDelete}
          className="rounded-lg border border-rose-400/15 bg-rose-500/[0.08] px-3 py-2 text-[12px] text-rose-100/65 transition-colors hover:bg-rose-500/[0.14]"
        >
          Delete
        </button>
      </div>
      <input
        value={focus.notes}
        onChange={(event) => onChange({ ...focus, notes: event.target.value })}
        placeholder="Optional notes"
        className="mt-2 w-full rounded-lg border border-white/[0.06] bg-white/[0.025] px-3 py-2 text-[12px] text-white/55 outline-none placeholder:text-white/18 focus:border-pink-400/40"
      />
    </div>
  );
}

function SectionItemEditor({
  item,
  onChange,
  index,
  onDelete,
}: {
  item: DailyTrainingFocus;
  onChange: (item: DailyTrainingFocus) => void;
  index: number;
  onDelete: () => void;
}) {
  return (
    <div className="grid gap-2 rounded-xl border border-white/[0.07] bg-black/15 p-3 md:grid-cols-[minmax(0,1fr)_80px_auto_auto]">
      <input
        value={item.label}
        onChange={(event) => onChange({ ...item, label: event.target.value })}
        placeholder={`Item ${index + 1}`}
        className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white/75 outline-none placeholder:text-white/20 focus:border-violet-400/50"
      />
      <input
        type="number"
        min={0}
        value={item.minutes || ""}
        onChange={(event) => onChange({ ...item, minutes: Math.max(0, Number.parseInt(event.target.value, 10) || 0) })}
        placeholder="Min"
        className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white/75 outline-none placeholder:text-white/20 focus:border-violet-400/50"
      />
      <label className="flex items-center justify-start gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[12px] text-white/45 md:justify-center">
        <input
          type="checkbox"
          checked={item.completed}
          onChange={(event) => onChange({ ...item, completed: event.target.checked })}
          className="h-4 w-4 accent-violet-500"
        />
        Done
      </label>
      <button
        type="button"
        onClick={onDelete}
        className="rounded-lg border border-rose-400/15 bg-rose-500/[0.08] px-3 py-2 text-[12px] text-rose-100/65 transition-colors hover:bg-rose-500/[0.14]"
      >
        Delete
      </button>
    </div>
  );
}

function PlanSectionCard({
  section,
  index,
  onChange,
}: {
  section: DailyTrainingSection;
  index: number;
  onChange: (section: DailyTrainingSection) => void;
}) {
  function updateItem(index: number, item: DailyTrainingFocus) {
    onChange({
      ...section,
      focusAreas: section.focusAreas.map((current, itemIndex) => (itemIndex === index ? { ...item, sortOrder: itemIndex } : current)),
    });
  }

  function addItem() {
    onChange({
      ...section,
      focusAreas: [
        ...section.focusAreas,
        blankTrainingSectionItem(section.focusAreas.length, section.category === "Training Session" ? "focus" : "field"),
      ],
    });
  }

  function deleteItem(focusIndex: number) {
    onChange({
      ...section,
      focusAreas: section.focusAreas
        .filter((_, itemIndex) => itemIndex !== focusIndex)
        .map((focus, itemIndex) => ({ ...focus, sortOrder: itemIndex })),
    });
  }

  const isTrainingSession = section.category === "Training Session";
  const soft = section.category === "Break";
  const addLabel = isTrainingSession
    ? "+ Add Focus Area"
    : `+ Add ${section.category.replace("Training ", "")} Item`;

  return (
    <Panel className={`${isTrainingSession ? "border-pink-400/15 bg-pink-500/[0.035]" : soft ? "py-3 bg-white/[0.025]" : ""}`}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <p className="mb-2 text-[11px] uppercase tracking-widest text-white/25">{index + 1}. {section.category}</p>
            <input
              value={section.title}
              onChange={(event) => onChange({ ...section, title: event.target.value })}
              placeholder={section.category === "Training Session" ? `Training Session ${index + 1}` : section.category}
              className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm font-semibold text-white/85 outline-none placeholder:text-white/20 focus:border-violet-400/50"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <MinutesInput value={section.minutes} onChange={(minutes) => onChange({ ...section, minutes })} />
            <label className="flex items-center gap-2 rounded-lg border border-emerald-400/15 bg-emerald-400/[0.08] px-3 py-2 text-[12px] text-emerald-100/70">
              <input
                type="checkbox"
                checked={section.countsAsActiveTime}
                onChange={(event) => onChange({ ...section, countsAsActiveTime: event.target.checked })}
                className="h-4 w-4 accent-emerald-500"
              />
              Active
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[12px] text-white/45">
              <input type="checkbox" checked={section.completed} onChange={(event) => onChange({ ...section, completed: event.target.checked })} className="h-4 w-4 accent-violet-500" />
              Done
            </label>
          </div>
        </div>

        <div className="grid gap-3">
          {section.focusAreas.map((focus, index) => (
            isTrainingSession ? (
              <FocusEditor
                key={focus.id || index}
                focus={focus}
                index={index}
                onChange={(updated) => updateItem(index, updated)}
                onDelete={() => deleteItem(index)}
              />
            ) : (
              <SectionItemEditor
                key={focus.id || index}
                item={focus}
                index={index}
                onChange={(updated) => updateItem(index, updated)}
                onDelete={() => deleteItem(index)}
              />
            )
          ))}
        </div>

        <SectionNotes
          value={section.notes}
          onChange={(notes) => onChange({ ...section, notes })}
          placeholder={isTrainingSession ? "Session notes, combinations, reminders, safety cues" : "Notes / plan"}
          compact={soft}
        />
        <button
          type="button"
          onClick={addItem}
          className={`w-fit rounded-lg border px-3 py-2 text-[12px] font-semibold transition-colors ${
            isTrainingSession
              ? "border-pink-300/15 bg-pink-500/[0.08] text-pink-100/70 hover:bg-pink-500/[0.14]"
              : "border-violet-300/15 bg-violet-500/[0.08] text-violet-100/70 hover:bg-violet-500/[0.14]"
          }`}
        >
          {addLabel}
        </button>
      </div>
    </Panel>
  );
}

function TrainingPlanTab({
  plans,
  onSavePlans,
}: {
  plans: DailyTrainingPlan[];
  onSavePlans: (plans: DailyTrainingPlan[]) => void;
}) {
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const savedPlan = useMemo(() => plans.find((plan) => plan.date === selectedDate), [plans, selectedDate]);
  const [draft, setDraft] = useState<DailyTrainingPlan>(() => savedPlan ?? emptyDailyTrainingPlan(selectedDate));
  const calculated = calculateDailyTrainingPlan(draft);
  const completedSections = draft.sections.filter((section) => section.completed).length;
  const trainingSessionCount = draft.sections.filter((section) => section.category === "Training Session").length;
  const totalFocusAreas = draft.sections
    .flatMap((section) => section.focusAreas)
    .filter((focus) => focus.label.trim()).length;

  useEffect(() => {
    setDraft(savedPlan ?? emptyDailyTrainingPlan(selectedDate));
  }, [savedPlan, selectedDate]);

  function updateDraft(patch: Partial<DailyTrainingPlan>) {
    setDraft((current) => {
      const next = { ...current, ...patch };
      return { ...next, ...calculateDailyTrainingPlan(next), updatedAt: new Date().toISOString() };
    });
  }

  function updateSection(sectionId: string, section: DailyTrainingSection) {
    updateDraft({
      sections: draft.sections.map((item) =>
        item.id === sectionId ? { ...section, updatedAt: new Date().toISOString() } : item,
      ),
    });
  }

  function savePlan() {
    const normalized = {
      ...draft,
      ...calculateDailyTrainingPlan(draft),
      updatedAt: new Date().toISOString(),
    };
    const nextPlans = plans.some((plan) => plan.date === normalized.date)
      ? plans.map((plan) => (plan.date === normalized.date ? normalized : plan))
      : [...plans, normalized];
    onSavePlans(nextPlans);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 border-b border-white/[0.06] pb-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Training Plan</h2>
          <p className="mt-1 text-sm text-white/35">Plan one full dance or pole training day with real saved data.</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[11px] uppercase tracking-widest text-white/25">Date</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
            className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white/70 outline-none focus:border-violet-400/50"
          />
          <button
            type="button"
            onClick={savePlan}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-500"
          >
            Save
          </button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <SummaryMetric label="Active Training Time" value={`${calculated.activeTrainingTime}m`} sub="Active sections only" accent="text-emerald-300" />
        <SummaryMetric label="Total Plan Time" value={`${calculated.totalPlanTime}m`} sub="All sections" accent="text-violet-300" />
        <SummaryMetric label="Break / Prep / Cleanup Time" value={`${calculated.breakPrepCleanupTime}m`} sub="Non-active sections" accent="text-sky-300" />
        <SummaryMetric label="Completed Sections" value={`${completedSections}/${draft.sections.length}`} sub={`${trainingSessionCount} sessions`} accent="text-pink-300" />
        <SummaryMetric label="Total Focus Areas" value={String(totalFocusAreas)} sub="Named focus items" accent="text-amber-300" />
      </div>

      <div className="grid gap-4">
        {draft.sections.map((section, index) => (
          <PlanSectionCard
            key={section.id}
            section={section}
            index={index}
            onChange={(updated) => updateSection(section.id, updated)}
          />
        ))}
      </div>
    </div>
  );
}

const TABS: { id: Tab; label: string }[] = [
  { id: "overview",  label: "Overview"   },
  { id: "checkin",   label: "Check-In"   },
  { id: "plan",      label: "Training Plan" },
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
  const [trainingPlan, setTrainingPlan] = useState<TrainingPlan>(emptyTrainingPlan());
  const [dailyTrainingPlans, setDailyTrainingPlans] = useState<DailyTrainingPlan[]>([]);
  const [conditioningRoutines, setConditioningRoutines] = useState<ConditioningRoutine[]>([]);
  const [mediaEntries, setMediaEntries] = useState<MediaEntry[]>([]);
  const [mounted, setMounted]       = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      setCheckIns(loadCheckIns());
      setDailyStatuses(loadDailyStatuses());
      setSkills(loadSkills());
      setSkillLogs(loadSkillLogs());
      setTrainingPlan(loadTrainingPlan());
      setDailyTrainingPlans(loadDailyTrainingPlans());
      setConditioningRoutines(loadConditioningRoutines());
      setMediaEntries(loadMediaEntries());
      setMounted(true);
    });
  }, []);

  function handleSaveDaily(d: DanceDailyStatus) {
    const updated = dailyStatuses.some((s) => s.date === d.date)
      ? dailyStatuses.map((s) => s.date === d.date ? d : s)
      : [...dailyStatuses, d];
    setDailyStatuses(updated);
    saveDailyStatuses(updated);
  }

  function handleEditWeek() {
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

  function handleSaveDailyTrainingPlans(plans: DailyTrainingPlan[]) {
    setDailyTrainingPlans(plans);
    saveDailyTrainingPlans(plans);
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
        <CheckInTab
          dailyStatuses={dailyStatuses}
          onSaveDaily={handleSaveDaily}
          trainingPlan={trainingPlan}
          skills={skills}
          conditioningRoutines={conditioningRoutines}
          mediaEntries={mediaEntries}
        />
      )}
      {tab === "plan" && (
        <TrainingPlanTab plans={dailyTrainingPlans} onSavePlans={handleSaveDailyTrainingPlans} />
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
