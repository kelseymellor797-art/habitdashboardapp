"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { HABITS, MONTH_CONFIG, STORAGE_KEY } from "@/lib/habitData";
import { ROUTINE_BY_HABIT_ID, ROUTINE_STORAGE_KEY } from "@/lib/routineData";
import type { RoutineEntry } from "@/lib/routineData";
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

// ── Initial state loaders (run once on mount) ────────────────────────────────

function loadCompletions() {
  if (typeof window === "undefined") return defaultCompletions(HABITS);
  const saved = window.localStorage.getItem(STORAGE_KEY);
  return saved
    ? deserializeCompletions(saved, HABITS)
    : defaultCompletions(HABITS);
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

  const hasMounted = useRef(false);

  // ── Persist to localStorage after hydration ──────────────────────────────
  // hasMounted guard: skip on first render so seed data never overwrites saved state.
  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serializeCompletions(completions)));
    localStorage.setItem(
      ROUTINE_STORAGE_KEY,
      JSON.stringify(serializeRoutineEntries(routineEntries))
    );
  }, [completions, routineEntries]);

  // ── Derived: effective completions (routine habits use routineCompletionSet) ─
  const effectiveCompletions = useMemo(() => {
    const result: Record<string, Set<number>> = {};
    for (const habit of HABITS) {
      const routine = ROUTINE_BY_HABIT_ID[habit.id];
      if (routine) {
        result[habit.id] = routineCompletionSet(
          routine.id,
          todayDay,
          routineEntries,
          routine
        );
      } else {
        result[habit.id] = completions[habit.id] ?? new Set();
      }
    }
    return result;
  }, [completions, routineEntries]);

  // ── Cell click handler ────────────────────────────────────────────────────
  function handleCellClick(habitId: string, day: number) {
    if (day > todayDay) return;
    const routine = ROUTINE_BY_HABIT_ID[habitId];
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

  // ── Routine entry update ──────────────────────────────────────────────────
  function updateRoutineEntry(
    routineId: string,
    day: number,
    completedIds: string[]
  ) {
    setRoutineEntries((prev) => ({
      ...prev,
      [routineEntryKey(routineId, day)]: { completedSubtaskIds: completedIds },
    }));
  }

  // ── Active panel data ─────────────────────────────────────────────────────
  const activePanelData = useMemo(() => {
    if (!activePanel) return null;
    const habit = HABITS.find((h) => h.id === activePanel.habitId);
    const routine = habit ? ROUTINE_BY_HABIT_ID[habit.id] : undefined;
    if (!habit || !routine) return null;
    const key = routineEntryKey(routine.id, activePanel.day);
    const entry = routineEntries[key] ?? { completedSubtaskIds: [] };
    return { habit, routine, entry };
  }, [activePanel, routineEntries]);

  return (
    <>
      <Panel>
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between mb-5">
          <SectionTitle
            title="Habit Tracker Grid"
            subtitle={`${monthLabel} · click any cell to toggle`}
          />
          <div className="flex items-center gap-4 mt-0.5">
            <LegendItem color="#10b981" label="Done" symbol="✓" />
            <LegendItem color="#f59e0b" label="Partial" partial />
            <LegendItem color="rgba(255,255,255,0.2)" label="Missed" symbol="–" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="border-collapse" style={{ minWidth: "920px" }}>
            {/* ── Column headers ─────────────────────────────────────────── */}
            <thead>
              <tr>
                <th className="text-left pb-3 pr-4 w-44" />
                {DAYS.map((day) => {
                  const dow = dayOfWeek(day, startDow);
                  const isWeekend = dow === 5 || dow === 6;
                  const isToday = day === todayDay;
                  const sep = isWeekBoundary(day, startDow);
                  return (
                    <th
                      key={day}
                      className={`text-center pb-3 ${sep ? "border-l border-white/[0.07]" : ""}`}
                    >
                      <div className={`text-[9px] leading-none mb-1 ${isWeekend ? "text-white/15" : "text-white/20"}`}>
                        {DOW_LABELS[dow]}
                      </div>
                      <div
                        className={`text-[10px] tabular-nums font-medium w-6 h-6 flex items-center justify-center mx-auto rounded-full ${
                          isToday
                            ? "bg-violet-500/25 text-violet-300 font-semibold"
                            : isWeekend
                            ? "text-white/20"
                            : "text-white/35"
                        }`}
                      >
                        {day}
                      </div>
                    </th>
                  );
                })}
                {["Done", "Goal", "Left", "%", "Streak"].map((col) => (
                  <th key={col} className="text-left pb-3 pl-3 border-l border-white/[0.07]">
                    <span className="text-[10px] text-white/25 font-medium">{col}</span>
                  </th>
                ))}
              </tr>
            </thead>

            {/* ── Habit rows ─────────────────────────────────────────────── */}
            <tbody>
              {HABITS.map((habit, idx) => {
                const routine = ROUTINE_BY_HABIT_ID[habit.id];
                const done = effectiveCompletions[habit.id];
                const completed = calcCompleted(done, todayDay);
                const pct = calcPct(completed, habit.monthlyGoal);
                const remaining = calcRemaining(completed, habit.monthlyGoal);
                const streak = calcStreak(done, todayDay);
                const goalHit = completed >= habit.monthlyGoal;

                return (
                  <tr
                    key={habit.id}
                    className={`group ${idx !== 0 ? "border-t border-white/[0.04]" : ""}`}
                  >
                    {/* Habit name */}
                    <td className="pr-4 py-1.5">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: habit.hex }}
                        />
                        <span className="text-[11px] text-white/45 group-hover:text-white/70 transition-colors truncate max-w-[150px]">
                          {habit.name}
                        </span>
                        {routine && (
                          <span className="text-[8px] text-white/20 border border-white/10 rounded px-1 leading-none py-0.5 shrink-0">
                            ROUTINE
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Day cells */}
                    {DAYS.map((day) => {
                      const isFuture = day > todayDay;
                      const sep = isWeekBoundary(day, startDow);
                      const isToday = day === todayDay;

                      // Determine cell state
                      let cellState: "complete" | "partial" | "none" | "future";
                      let routinePct = 0;

                      if (routine) {
                        const key = routineEntryKey(routine.id, day);
                        const entry = routineEntries[key];
                        routinePct = calcRoutinePct(entry, routine);
                        cellState = getCellState(day, todayDay, true, false, routinePct);
                      } else {
                        const isToggled = completions[habit.id]?.has(day) ?? false;
                        cellState = getCellState(day, todayDay, false, isToggled, 0);
                      }

                      // Cell styles
                      let bg: string;
                      let border: string;
                      let color: string;
                      let symbol: string;
                      let title: string;

                      if (cellState === "future") {
                        bg = "transparent";
                        border = "rgba(255,255,255,0.04)";
                        color = "transparent";
                        symbol = "";
                        title = "Future date";
                      } else if (cellState === "complete") {
                        bg = `${habit.hex}22`;
                        border = `${habit.hex}55`;
                        color = habit.hex;
                        symbol = "✓";
                        title = routine ? `100% · ${routine.name}` : "Complete · click to undo";
                      } else if (cellState === "partial") {
                        // Gradient fill from bottom, proportional to routinePct
                        bg = `linear-gradient(to top, rgba(245,158,11,0.22) ${routinePct}%, rgba(255,255,255,0.025) ${routinePct}%)`;
                        border = "rgba(245,158,11,0.35)";
                        color = "#f59e0b";
                        symbol = "";
                        title = `${routinePct}% · ${routine?.name ?? ""}`;
                      } else {
                        // none
                        bg = "rgba(255,255,255,0.025)";
                        border = "rgba(255,255,255,0.07)";
                        color = "rgba(255,255,255,0.2)";
                        symbol = "–";
                        title = routine ? `Open ${routine.name}` : "Mark complete";
                      }

                      return (
                        <td
                          key={day}
                          className={`py-1.5 ${sep ? "border-l border-white/[0.07]" : ""}`}
                        >
                          <button
                            onClick={() => handleCellClick(habit.id, day)}
                            disabled={isFuture}
                            title={title}
                            className={`w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-bold border transition-all ${
                              isFuture
                                ? "cursor-default"
                                : "cursor-pointer hover:scale-110 active:scale-95"
                            } ${isToday && !isFuture ? "ring-1 ring-white/20" : ""}`}
                            style={{
                              background: bg,
                              borderColor: border,
                              color,
                            }}
                          >
                            {symbol}
                          </button>
                        </td>
                      );
                    })}

                    {/* Done */}
                    <td className="pl-3 py-1.5 border-l border-white/[0.07]">
                      <span
                        className="text-[12px] font-semibold tabular-nums"
                        style={{ color: habit.hex }}
                      >
                        {completed}
                      </span>
                    </td>

                    {/* Goal */}
                    <td className="pl-3 py-1.5 border-l border-white/[0.07]">
                      <span className="text-[11px] tabular-nums text-white/30">
                        {habit.monthlyGoal}
                      </span>
                    </td>

                    {/* Remaining */}
                    <td className="pl-3 py-1.5 border-l border-white/[0.07]">
                      <span
                        className={`text-[11px] tabular-nums font-medium ${
                          goalHit
                            ? "text-emerald-400"
                            : remaining <= 3
                            ? "text-amber-400"
                            : "text-white/30"
                        }`}
                      >
                        {goalHit ? "✓" : remaining}
                      </span>
                    </td>

                    {/* Percentage + mini bar */}
                    <td className="pl-3 py-1.5 border-l border-white/[0.07]">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] tabular-nums text-white/40">{pct}%</span>
                        <div className="w-10 h-[3px] rounded-full bg-white/[0.07]">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{ width: `${pct}%`, backgroundColor: habit.hex }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Streak */}
                    <td className="pl-3 py-1.5 border-l border-white/[0.07]">
                      {streak > 0 ? (
                        <span className="text-[11px] tabular-nums text-amber-400 font-medium">
                          🔥 {streak}d
                        </span>
                      ) : (
                        <span className="text-[11px] text-white/20">–</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* ── Routine Panel modal ──────────────────────────────────────────────── */}
      {activePanel && activePanelData && (
        <RoutinePanel
          habit={activePanelData.habit}
          routine={activePanelData.routine}
          day={activePanel.day}
          entry={activePanelData.entry}
          onUpdate={(completedIds) =>
            updateRoutineEntry(
              activePanelData.routine.id,
              activePanel.day,
              completedIds
            )
          }
          onClose={() => setActivePanel(null)}
        />
      )}
    </>
  );
}

// ── Legend helper ─────────────────────────────────────────────────────────────

function LegendItem({
  color,
  label,
  symbol,
  partial,
}: {
  color: string;
  label: string;
  symbol?: string;
  partial?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <div
        className="w-4 h-4 rounded-[4px] flex items-center justify-center text-[8px] font-bold shrink-0 border"
        style={
          partial
            ? {
                background: "linear-gradient(to top, rgba(245,158,11,0.22) 60%, rgba(255,255,255,0.025) 60%)",
                borderColor: "rgba(245,158,11,0.35)",
              }
            : {
                backgroundColor: symbol === "✓" ? `${color}22` : "rgba(255,255,255,0.025)",
                borderColor: symbol === "✓" ? `${color}55` : "rgba(255,255,255,0.08)",
                color,
              }
        }
      >
        {symbol}
      </div>
      <span className="text-[10px] text-white/25">{label}</span>
    </div>
  );
}
