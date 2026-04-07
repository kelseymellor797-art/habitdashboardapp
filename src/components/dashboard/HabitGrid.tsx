"use client";

import { useEffect, useMemo, useState } from "react";
import { MONTH_CONFIG } from "@/lib/habitData";
import {
  loadRoutines,
  loadRoutineEntries,
  saveRoutineEntries,
  type Routine,
  type RoutineEntry,
} from "@/lib/routineData";
import {
  DOW_LABELS,
  calcCompleted,
  calcPct,
  calcStreak,
  dayOfWeek,
  isWeekBoundary,
} from "@/lib/habitUtils";
import {
  calcRoutinePct,
  routineEntryKey,
  routineCompletionSet,
} from "@/lib/routineUtils";
import {
  type Habit,
  type Completion,
  loadHabits,
  loadCompletions,
  saveCompletions,
  toggleCompletion,
  getMonthCompletionSet,
  dayToDate,
  notifyUpdate,
} from "@/lib/store";
import { loadCategories, type Category } from "@/lib/categoryData";
import Panel from "./Panel";
import SectionTitle from "./SectionTitle";
import RoutinePanel from "./RoutinePanel";

const { daysInMonth, todayDay, startDow, label: monthLabel } = MONTH_CONFIG;
const DAYS = Array.from({ length: daysInMonth }, (_, i) => i + 1);

type ActivePanel = { routineId: string; day: number };

// ── Habit cell ────────────────────────────────────────────────────────────────

function HabitCell({
  day,
  habit,
  completions,
  onClick,
}: {
  day: number;
  habit: Habit;
  completions: Completion[];
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const isFuture = day > todayDay;
  const done = !isFuture && getMonthCompletionSet(completions, habit.id).has(day);

  let bgColor: string;
  let border: string;
  let content: React.ReactNode = null;

  if (isFuture) {
    bgColor = "transparent";
    border = "1px solid rgba(255,255,255,0.04)";
  } else if (done) {
    bgColor = habit.color;
    border = `1px solid ${habit.color}`;
    content = (
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
        <path d="M1.5 5L4 7.5L8.5 2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  } else {
    bgColor = hovered ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)";
    border = hovered ? `1px solid ${habit.color}66` : "1px solid rgba(255,255,255,0.06)";
    content = hovered ? <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", lineHeight: 1 }}>+</span> : null;
  }

  return (
    <div
      role="button"
      tabIndex={isFuture ? -1 : 0}
      onClick={isFuture ? undefined : onClick}
      onKeyDown={isFuture ? undefined : (e) => e.key === "Enter" && onClick()}
      onMouseEnter={() => !isFuture && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 32, height: 32, borderRadius: 6,
        background: bgColor, border,
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: isFuture ? "default" : "pointer",
        transition: "background 0.15s, border 0.15s, transform 0.1s",
        transform: hovered && !isFuture ? "scale(1.08)" : "scale(1)",
        flexShrink: 0,
      }}
    >
      {content}
    </div>
  );
}

// ── Routine cell ──────────────────────────────────────────────────────────────

function RoutineCell({
  day,
  routine,
  routineEntries,
  onClick,
}: {
  day: number;
  routine: Routine;
  routineEntries: Record<string, RoutineEntry>;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const isFuture = day > todayDay;
  const entry = routineEntries[routineEntryKey(routine.id, day)];
  const pct = isFuture ? 0 : calcRoutinePct(entry, routine);

  let bgColor: string;
  let border: string;
  let content: React.ReactNode = null;

  if (isFuture) {
    bgColor = "transparent";
    border = "1px solid rgba(255,255,255,0.04)";
  } else if (pct === 100) {
    bgColor = routine.color;
    border = `1px solid ${routine.color}`;
    content = (
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
        <path d="M1.5 5L4 7.5L8.5 2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  } else if (pct > 0) {
    bgColor = `linear-gradient(to top, #f59e0bcc ${pct}%, rgba(255,255,255,0.06) ${pct}%)`;
    border = `1px solid #f59e0b66`;
    content = <span style={{ fontSize: "8px", color: "rgba(255,255,255,0.7)", lineHeight: 1 }}>{pct}%</span>;
  } else {
    bgColor = hovered ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)";
    border = hovered ? `1px solid ${routine.color}66` : "1px solid rgba(255,255,255,0.06)";
    content = hovered ? <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", lineHeight: 1 }}>+</span> : null;
  }

  return (
    <div
      role="button"
      tabIndex={isFuture ? -1 : 0}
      onClick={isFuture ? undefined : onClick}
      onKeyDown={isFuture ? undefined : (e) => e.key === "Enter" && onClick()}
      onMouseEnter={() => !isFuture && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 32, height: 32, borderRadius: 6,
        background: bgColor, border,
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: isFuture ? "default" : "pointer",
        transition: "background 0.15s, border 0.15s, transform 0.1s",
        transform: hovered && !isFuture ? "scale(1.08)" : "scale(1)",
        flexShrink: 0,
      }}
    >
      {content}
    </div>
  );
}

// ── Main grid ─────────────────────────────────────────────────────────────────

export default function HabitGrid() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [routineEntries, setRoutineEntries] = useState<Record<string, RoutineEntry>>({});
  const [categories,     setCategories]     = useState<Category[]>([]);
  const [activePanel,    setActivePanel]    = useState<ActivePanel | null>(null);

  useEffect(() => {
    setHabits(loadHabits());
    setRoutines(loadRoutines());
    setCompletions(loadCompletions());
    setRoutineEntries(loadRoutineEntries());
    setCategories(loadCategories());

    const handler = () => {
      setHabits(loadHabits());
      setRoutines(loadRoutines());
      setCompletions(loadCompletions());
      setRoutineEntries(loadRoutineEntries());
      setCategories(loadCategories());
    };
    window.addEventListener("habitflow:updated", handler);
    return () => window.removeEventListener("habitflow:updated", handler);
  }, []);

  function handleHabitCellClick(habitId: string, day: number) {
    const newCompletions = toggleCompletion(completions, habitId, dayToDate(day));
    setCompletions(newCompletions);
    saveCompletions(newCompletions);
    notifyUpdate();
  }

  function handleRoutineCellClick(routineId: string, day: number) {
    setActivePanel({ routineId, day });
  }

  function handleRoutineUpdate(completedIds: string[]) {
    if (!activePanel) return;
    const key = routineEntryKey(activePanel.routineId, activePanel.day);
    const newEntries = { ...routineEntries, [key]: { completedSubtaskIds: completedIds } };
    setRoutineEntries(newEntries);
    saveRoutineEntries(newEntries);
    notifyUpdate();
  }

  const habitStats = useMemo(() =>
    habits.map((h) => {
      const completionSet = getMonthCompletionSet(completions, h.id);
      const completed = calcCompleted(completionSet, todayDay);
      const pct = calcPct(completed, h.goal);
      const streak = calcStreak(completionSet, todayDay);
      return { ...h, completionSet, completed, pct, streak };
    }), [habits, completions]);

  const routineStats = useMemo(() =>
    routines.filter((r) => r.active).map((r) => {
      const completionSet = routineCompletionSet(r.id, todayDay, routineEntries, r);
      const completed = calcCompleted(completionSet, todayDay);
      const pct = calcPct(completed, todayDay);
      const streak = calcStreak(completionSet, todayDay);
      return { ...r, completionSet, completed, pct, streak };
    }), [routines, routineEntries]);

  // Group habits and routines by category
  const groups = useMemo(() => {
    type GridGroup = {
      cat: Category | null;
      habits: typeof habitStats;
      routines: typeof routineStats;
    };
    const map = new Map<string, GridGroup>();
    for (const cat of categories) map.set(cat.id, { cat, habits: [], routines: [] });
    map.set("__none__", { cat: null, habits: [], routines: [] });
    for (const h of habitStats) {
      const key = h.categoryId && map.has(h.categoryId) ? h.categoryId : "__none__";
      map.get(key)!.habits.push(h);
    }
    for (const r of routineStats) {
      const key = r.categoryId && map.has(r.categoryId) ? r.categoryId : "__none__";
      map.get(key)!.routines.push(r);
    }
    return [...map.values()].filter((g) => g.habits.length > 0 || g.routines.length > 0);
  }, [habitStats, routineStats, categories]);

  const hasCatLabels = categories.length > 0
    || habitStats.some((h) => !!h.categoryId)
    || routineStats.some((r) => !!r.categoryId);

  const activeRoutine = activePanel
    ? routines.find((r) => r.id === activePanel.routineId) ?? null
    : null;
  const activeEntry = activePanel && activeRoutine
    ? routineEntries[routineEntryKey(activeRoutine.id, activePanel.day)] ?? { completedSubtaskIds: [] }
    : { completedSubtaskIds: [] };

  return (
    <Panel className="flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <SectionTitle title="Habit Tracker" subtitle={monthLabel} />
        <span className="text-[10px] text-white/20">{todayDay} days logged</span>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-max">
          {/* Day header */}
          <div className="flex gap-1 mb-2 pl-[160px]">
            {DAYS.map((day) => (
              <div key={day} className={`w-8 text-center text-[9px] tabular-nums shrink-0 ${
                day === todayDay ? "text-violet-400 font-semibold" : day > todayDay ? "text-white/10" : "text-white/20"
              }`}>
                {day}
              </div>
            ))}
          </div>

          {/* DOW sub-header */}
          <div className="flex gap-1 mb-3 pl-[160px]">
            {DAYS.map((day) => {
              const dow = dayOfWeek(day, startDow);
              return (
                <div key={day} className={`w-8 text-center text-[8px] shrink-0 ${
                  day > todayDay ? "text-white/[0.08]" : "text-white/[0.15]"
                } ${isWeekBoundary(day, startDow) ? "border-l border-white/[0.06] -ml-px pl-px" : ""}`}>
                  {DOW_LABELS[dow]}
                </div>
              );
            })}
          </div>

          {habits.length === 0 && routineStats.length === 0 && (
            <p className="pl-[160px] py-6 text-[12px] text-white/25">
              No habits yet — add some on the Habits page.
            </p>
          )}

          {/* Category-grouped rows */}
          {groups.map(({ cat, habits: catHabits, routines: catRoutines }, gi) => (
            <div key={cat?.id ?? "__none__"} className={gi > 0 ? "mt-4" : ""}>
              {hasCatLabels && (
                <div className="pl-[160px] mb-1.5 flex items-center gap-2">
                  {cat?.color && (
                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                  )}
                  <span className="text-[10px] text-white/25 uppercase tracking-widest">
                    {cat?.name ?? "Other"}
                  </span>
                </div>
              )}

              {catHabits.map((h, rowIdx) => (
                <div key={h.id} className={`flex items-center gap-1 ${rowIdx < catHabits.length - 1 || catRoutines.length > 0 ? "mb-2.5" : ""}`}>
                  <div className="w-[152px] shrink-0 flex items-center gap-2 pr-2">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: h.color }} />
                    <span className="text-[11px] text-white/55 truncate">{h.name}</span>
                    <span className="ml-auto text-[10px] tabular-nums shrink-0" style={{ color: h.color + "99" }}>{h.pct}%</span>
                  </div>
                  {DAYS.map((day) => (
                    <HabitCell key={day} day={day} habit={h} completions={completions}
                      onClick={() => handleHabitCellClick(h.id, day)} />
                  ))}
                  <div className="ml-2 text-[10px] tabular-nums text-amber-400/70 w-8 shrink-0">
                    {h.streak > 0 ? `\uD83D\uDD25${h.streak}` : ""}
                  </div>
                </div>
              ))}

              {catRoutines.map((r, rowIdx) => (
                <div key={r.id} className={`flex items-center gap-1 ${rowIdx < catRoutines.length - 1 ? "mb-2.5" : ""}`}>
                  <div className="w-[152px] shrink-0 flex items-center gap-2 pr-2">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: r.color }} />
                    <span className="text-[11px] text-white/55 truncate">{r.name}</span>
                    <span className="ml-auto text-[10px] tabular-nums shrink-0" style={{ color: r.color + "99" }}>{r.pct}%</span>
                  </div>
                  {DAYS.map((day) => (
                    <RoutineCell key={day} day={day} routine={r} routineEntries={routineEntries}
                      onClick={() => handleRoutineCellClick(r.id, day)} />
                  ))}
                  <div className="ml-2 text-[10px] tabular-nums text-amber-400/70 w-8 shrink-0">
                    {r.streak > 0 ? `\uD83D\uDD25${r.streak}` : ""}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {activePanel && activeRoutine && (
        <RoutinePanel
          routine={activeRoutine}
          day={activePanel.day}
          entry={activeEntry}
          onUpdate={handleRoutineUpdate}
          onClose={() => setActivePanel(null)}
        />
      )}
    </Panel>
  );
}
