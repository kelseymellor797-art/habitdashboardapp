"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { HABITS, MONTH_CONFIG, STORAGE_KEY } from "@/lib/habitData";
import { ROUTINE_BY_HABIT_ID, ROUTINE_STORAGE_KEY, ROUTINE_DEFS_STORAGE_KEY } from "@/lib/routineData";
import type { Routine, RoutineEntry } from "@/lib/routineData";
import {
  DOW_LABELS,
  calcCompleted,
  calcPct,
  calcRemaining,
  calcStreak,
  dayOfWeek,
  defaultCompletions,
  deserializeCompletions,
  isWeekBoundary,
  serializeCompletions,
} from "@/lib/habitUtils";
import {
  calcRoutinePct,
  getCellState,
  routineEntryKey,
  serializeRoutineEntries,
  deserializeRoutineEntries,
  routineCompletionSet,
} from "@/lib/routineUtils";
import Panel from "./Panel";
import SectionTitle from "./SectionTitle";
import RoutinePanel from "./RoutinePanel";

const { daysInMonth, todayDay, startDow, label: monthLabel } = MONTH_CONFIG;
const DAYS = Array.from({ length: daysInMonth }, (_, i) => i + 1);

type ActivePanel = { habitId: string; day: number };

function loadCompletions() {
  if (typeof window === "undefined") return defaultCompletions(HABITS);
  const saved = window.localStorage.getItem(STORAGE_KEY);
  return saved ? deserializeCompletions(saved, HABITS) : defaultCompletions(HABITS);
}

function loadRoutineEntries(): Record<string, RoutineEntry> {
  if (typeof window === "undefined") return {};
  const saved = window.localStorage.getItem(ROUTINE_STORAGE_KEY);
  return saved ? deserializeRoutineEntries(saved) : {};
}

export default function HabitGrid() {
  const [completions, setCompletions] = useState<Record<string, Set<number>>>(loadCompletions);
  const [routineEntries, setRoutineEntries] = useState<Record<string, RoutineEntry>>(loadRoutineEntries);
  const [activePanel, setActivePanel] = useState<ActivePanel | null>(null);
  const [routineMap, setRoutineMap] = useState<Record<string, Routine>>(() => ROUTINE_BY_HABIT_ID);
  const hasMounted = useRef(false);

  // Load user-edited routine defs from localStorage and merge over seeds
  useEffect(() => {
    try {
      const raw = localStorage.getItem(ROUTINE_DEFS_STORAGE_KEY);
      if (!raw) return;
      const defs = JSON.parse(raw) as Record<string, { name: string; subtasks: Array<{ id: string; name: string; target?: string }> }>;
      setRoutineMap((prev) => {
        const next = { ...prev };
        for (const [habitId, def] of Object.entries(defs)) {
          if (!def.name || !def.subtasks?.length) continue;
          const routineId = `routine-${habitId}`;
          next[habitId] = {
            id: routineId, name: def.name, habitId,
            subtasks: def.subtasks.map((s) => ({ id: s.id, routineId, name: s.name, target: s.target })),
          };
        }
        return next;
      });
    } catch {}
  }, []);

  // Persist on change, skip first render
  useEffect(() => {
    if (!hasMounted.current) { hasMounted.current = true; return; }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serializeCompletions(completions)));
    localStorage.setItem(ROUTINE_STORAGE_KEY, JSON.stringify(serializeRoutineEntries(routineEntries)));
  }, [completions, routineEntries]);

  // Derive "done" sets — routine habits pull from routineEntries (100% only counts)
  const effectiveCompletions = useMemo(() => {
    const result: Record<string, Set<number>> = {};
    for (const habit of HABITS) {
      const routine = routineMap[habit.id];
      result[habit.id] = routine
        ? routineCompletionSet(routine.id, todayDay, routineEntries, routine)
        : completions[habit.id] ?? new Set();
    }
    return result;
  }, [completions, routineEntries, routineMap]);

  function handleCellClick(habitId: string, day: number) {
    if (day > todayDay) return;
    const routine = routineMap[habitId];
    if (routine) {
      setActivePanel({ habitId, day });
    } else {
      setCompletions((prev) => {
        const next = new Set(prev[habitId]);
        next.has(day) ? next.delete(day) : next.add(day);
        return { ...prev, [habitId]: next };
      });
    }
  }

  function updateRoutineEntry(routineId: string, day: number, completedIds: string[]) {
    setRoutineEntries((prev) => ({
      ...prev,
      [routineEntryKey(routineId, day)]: { completedSubtaskIds: completedIds },
    }));
  }

  const activePanelData = useMemo(() => {
    if (!activePanel) return null;
    const habit = HABITS.find((h) => h.id === activePanel.habitId);
    const routine = habit ? routineMap[habit.id] : undefined;
    if (!habit || !routine) return null;
    const key = routineEntryKey(routine.id, activePanel.day);
    const entry = routineEntries[key] ?? { completedSubtaskIds: [] };
    return { habit, routine, entry };
  }, [activePanel, routineEntries, routineMap]);

  return (
    <>
      <Panel>
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-6">
          <SectionTitle
            title="Habit Tracker"
            subtitle={`${monthLabel} · click a cell to log · routine habits open a checklist`}
          />
          <div className="flex items-center gap-5">
            <LegendItem hex="#10b981" label="Done" filled />
            <LegendItem hex="#f59e0b" label="Partial" partial />
            <LegendItem label="Missed" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="border-collapse" style={{ minWidth: "1020px" }}>

            {/* ── Column headers ───────────────────────────────────────────── */}
            <thead>
              <tr>
                {/* Habit name col — same width as name cells */}
                <th className="text-left pb-4 pr-3" style={{ width: 168 }} />

                {DAYS.map((day) => {
                  const dow = dayOfWeek(day, startDow);
                  const isWeekend = dow === 5 || dow === 6;
                  const isToday = day === todayDay;
                  const sep = isWeekBoundary(day, startDow);
                  return (
                    <th
                      key={day}
                      className={`pb-4 ${sep ? "pl-2 border-l border-white/[0.07]" : ""}`}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <span className={`text-[9px] leading-none ${isWeekend ? "text-white/15" : "text-white/20"}`}>
                          {DOW_LABELS[dow]}
                        </span>
                        <div
                          className={`w-7 h-7 flex items-center justify-center rounded-full text-[11px] tabular-nums font-medium ${
                            isToday
                              ? "bg-violet-500/30 text-violet-300 ring-1 ring-violet-500/40"
                              : isWeekend
                              ? "text-white/20"
                              : "text-white/40"
                          }`}
                        >
                          {day}
                        </div>
                      </div>
                    </th>
                  );
                })}

                {/* Stats headers */}
                {["Done", "Goal", "Left", "%", "Streak"].map((col) => (
                  <th key={col} className="text-left pb-4 pl-4 border-l border-white/[0.07]">
                    <span className="text-[10px] text-white/25 font-medium uppercase tracking-wide">{col}</span>
                  </th>
                ))}
              </tr>
            </thead>

            {/* ── Habit rows ───────────────────────────────────────────────── */}
            <tbody>
              {HABITS.map((habit, idx) => {
                const routine = routineMap[habit.id];
                const done = effectiveCompletions[habit.id];
                const completed = calcCompleted(done, todayDay);
                const pct = calcPct(completed, habit.monthlyGoal);
                const remaining = calcRemaining(completed, habit.monthlyGoal);
                const streak = calcStreak(done, todayDay);
                const goalHit = completed >= habit.monthlyGoal;

                return (
                  <tr key={habit.id} className={`group ${idx !== 0 ? "border-t border-white/[0.05]" : ""}`}>

                    {/* ── Habit name ─────────────────────────────────────── */}
                    <td className="pr-3 py-2" style={{ width: 168 }}>
                      <div className="flex items-center gap-2.5">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: habit.hex }} />
                        <span className="text-[12px] text-white/50 group-hover:text-white/80 transition-colors truncate leading-none">
                          {habit.name}
                        </span>
                        {routine && (
                          <span
                            className="shrink-0 text-[8px] font-semibold px-1 py-0.5 rounded leading-none border"
                            style={{ color: habit.hex, borderColor: `${habit.hex}40`, backgroundColor: `${habit.hex}12` }}
                          >
                            ✦
                          </span>
                        )}
                      </div>
                    </td>

                    {/* ── Day cells ──────────────────────────────────────── */}
                    {DAYS.map((day) => {
                      const isFuture = day > todayDay;
                      const sep = isWeekBoundary(day, startDow);
                      const isToday = day === todayDay;

                      let cellState: "complete" | "partial" | "none" | "future";
                      let routinePct = 0;

                      if (routine) {
                        const entry = routineEntries[routineEntryKey(routine.id, day)];
                        routinePct = calcRoutinePct(entry, routine);
                        cellState = getCellState(day, todayDay, true, false, routinePct);
                      } else {
                        const isToggled = completions[habit.id]?.has(day) ?? false;
                        cellState = getCellState(day, todayDay, false, isToggled, 0);
                      }

                      return (
                        <td key={day} className={`py-2 ${sep ? "pl-2 border-l border-white/[0.07]" : ""}`}>
                          <Cell
                            state={cellState}
                            hex={habit.hex}
                            routinePct={routinePct}
                            hasRoutine={!!routine}
                            isToday={isToday}
                            onClick={() => handleCellClick(habit.id, day)}
                            disabled={isFuture}
                          />
                        </td>
                      );
                    })}

                    {/* ── Stats ──────────────────────────────────────────── */}
                    <td className="pl-4 py-2 border-l border-white/[0.07]">
                      <span className="text-[13px] font-semibold tabular-nums" style={{ color: habit.hex }}>
                        {completed}
                      </span>
                    </td>
                    <td className="pl-4 py-2">
                      <span className="text-[12px] tabular-nums text-white/30">{habit.monthlyGoal}</span>
                    </td>
                    <td className="pl-4 py-2">
                      <span className={`text-[12px] tabular-nums font-medium ${goalHit ? "text-emerald-400" : remaining <= 3 ? "text-amber-400" : "text-white/30"}`}>
                        {goalHit ? "✓" : remaining}
                      </span>
                    </td>
                    <td className="pl-4 py-2">
                      <div className="flex flex-col gap-1">
                        <span className="text-[11px] tabular-nums text-white/40">{pct}%</span>
                        <div className="w-12 h-[3px] rounded-full bg-white/[0.07]">
                          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: habit.hex }} />
                        </div>
                      </div>
                    </td>
                    <td className="pl-4 py-2">
                      {streak > 0
                        ? <span className="text-[12px] tabular-nums text-amber-400 font-medium">🔥 {streak}d</span>
                        : <span className="text-[12px] text-white/20">–</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* ── Routine modal ─────────────────────────────────────────────────────── */}
      {activePanel && activePanelData && (
        <RoutinePanel
          habit={activePanelData.habit}
          routine={activePanelData.routine}
          day={activePanel.day}
          entry={activePanelData.entry}
          onUpdate={(ids) => updateRoutineEntry(activePanelData.routine.id, activePanel.day, ids)}
          onClose={() => setActivePanel(null)}
        />
      )}
    </>
  );
}

// ── Cell component ────────────────────────────────────────────────────────────

type CellProps = {
  state: "complete" | "partial" | "none" | "future";
  hex: string;
  routinePct: number;
  hasRoutine: boolean;
  isToday: boolean;
  onClick: () => void;
  disabled: boolean;
};

function Cell({ state, hex, routinePct, hasRoutine, isToday, onClick, disabled }: CellProps) {
  const [hovered, setHovered] = useState(false);

  let bg: string;
  let border: string;
  let content: React.ReactNode;

  if (state === "future") {
    bg = "transparent";
    border = "rgba(255,255,255,0.04)";
    content = null;
  } else if (state === "complete") {
    bg = hovered ? `${hex}40` : `${hex}28`;
    border = hovered ? `${hex}90` : `${hex}60`;
    content = (
      <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
        <path d="M1 5l3.5 3.5L11 1" stroke={hex} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  } else if (state === "partial") {
    // Filled from bottom based on progress
    const fillPct = routinePct;
    bg = hovered
      ? `linear-gradient(to top, rgba(245,158,11,0.35) ${fillPct}%, rgba(255,255,255,0.04) ${fillPct}%)`
      : `linear-gradient(to top, rgba(245,158,11,0.22) ${fillPct}%, rgba(255,255,255,0.025) ${fillPct}%)`;
    border = hovered ? "rgba(245,158,11,0.60)" : "rgba(245,158,11,0.35)";
    content = (
      <span className="text-[9px] font-bold tabular-nums" style={{ color: hovered ? "#fbbf24" : "#f59e0b" }}>
        {routinePct}
      </span>
    );
  } else {
    // none — past/today, not logged
    bg = hovered
      ? hasRoutine ? `${hex}14` : "rgba(255,255,255,0.07)"
      : "rgba(255,255,255,0.03)";
    border = hovered
      ? hasRoutine ? `${hex}50` : "rgba(255,255,255,0.18)"
      : "rgba(255,255,255,0.08)";
    content = hovered ? (
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ opacity: 0.4 }}>
        <path d="M5 2v6M2 5h6" stroke={hasRoutine ? hex : "white"} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ) : null;
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => !disabled && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`
        relative w-8 h-8 rounded-lg border flex items-center justify-center
        transition-all duration-150 outline-none
        ${disabled ? "cursor-default" : "cursor-pointer"}
        ${!disabled && state !== "future" ? "active:scale-[0.82]" : ""}
        ${isToday && !disabled ? "ring-1 ring-white/25" : ""}
      `}
      style={{ background: bg, borderColor: border }}
    >
      {content}
    </button>
  );
}

// ── Legend ────────────────────────────────────────────────────────────────────

function LegendItem({ hex, label, filled, partial }: { hex?: string; label: string; filled?: boolean; partial?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <div
        className="w-5 h-5 rounded-md border flex items-center justify-center"
        style={
          filled
            ? { backgroundColor: `${hex}28`, borderColor: `${hex}60` }
            : partial
            ? { background: `linear-gradient(to top, rgba(245,158,11,0.22) 60%, rgba(255,255,255,0.025) 60%)`, borderColor: "rgba(245,158,11,0.35)" }
            : { backgroundColor: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)" }
        }
      >
        {filled && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4l2.5 2.5L9 1" stroke={hex} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <span className="text-[10px] text-white/30">{label}</span>
    </div>
  );
}
