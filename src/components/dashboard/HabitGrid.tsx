"use client";

import { useEffect, useRef, useState } from "react";
import { HABITS, MONTH_CONFIG, STORAGE_KEY } from "@/lib/habitData";
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
import Panel from "./Panel";
import SectionTitle from "./SectionTitle";

const { daysInMonth, todayDay, startDow, label: monthLabel } = MONTH_CONFIG;
const DAYS = Array.from({ length: daysInMonth }, (_, i) => i + 1);

const LEGEND = [
  { label: "Done",   bg: "rgba(16,185,129,0.15)", border: "rgba(16,185,129,0.3)", color: "#10b981", symbol: "✓" },
  { label: "Missed", bg: "rgba(255,255,255,0.03)", border: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.25)", symbol: "–" },
  { label: "Future", bg: "transparent",             border: "rgba(255,255,255,0.04)", color: "transparent", symbol: "" },
];

export default function HabitGrid() {
  const [completions, setCompletions] = useState<Record<string, Set<number>>>(
    () => {
      if (typeof window === "undefined") {
        return defaultCompletions(HABITS);
      }

      const saved = window.localStorage.getItem(STORAGE_KEY);
      return saved ? deserializeCompletions(saved, HABITS) : defaultCompletions(HABITS);
    }
  );
  const hasMounted = useRef(false);

  // ── Persist to localStorage whenever completions change (after hydration) ──
  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(serializeCompletions(completions)));
  }, [completions]);

  function toggle(id: string, day: number) {
    if (day > todayDay) return;
    setCompletions((prev) => {
      const next = new Set(prev[id]);
      if (next.has(day)) {
        next.delete(day);
      } else {
        next.add(day);
      }
      return { ...prev, [id]: next };
    });
  }

  return (
    <Panel>
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <SectionTitle
          title="Habit Tracker Grid"
          subtitle={`${monthLabel} · click any cell to toggle`}
        />
        <div className="flex items-center gap-3 mt-0.5">
          {LEGEND.map(({ label, bg, border, color, symbol }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div
                className="w-4 h-4 rounded-[4px] flex items-center justify-center text-[8px] font-bold shrink-0"
                style={{ backgroundColor: bg, border: `1px solid ${border}`, color }}
              >
                {symbol}
              </div>
              <span className="text-[10px] text-white/25">{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="border-collapse" style={{ minWidth: "900px" }}>

          {/* ── Column headers ─────────────────────────────────────────────── */}
          <thead>
            <tr>
              <th className="text-left pb-3 pr-4 w-40" />

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

              {/* Stats column headers */}
              {["Done", "Goal", "Left", "%", "Streak"].map((col) => (
                <th key={col} className="text-left pb-3 pl-3 border-l border-white/[0.07]">
                  <span className="text-[10px] text-white/25 font-medium">{col}</span>
                </th>
              ))}
            </tr>
          </thead>

          {/* ── Habit rows ─────────────────────────────────────────────────── */}
          <tbody>
            {HABITS.map((habit, idx) => {
              const done = completions[habit.id];
              const completed  = calcCompleted(done, todayDay);
              const pct        = calcPct(completed, habit.monthlyGoal);
              const remaining  = calcRemaining(completed, habit.monthlyGoal);
              const streak     = calcStreak(done, todayDay);
              const goalHit    = completed >= habit.monthlyGoal;

              return (
                <tr
                  key={habit.id}
                  className={`group ${idx !== 0 ? "border-t border-white/[0.04]" : ""}`}
                >
                  {/* Habit name */}
                  <td className="pr-4 py-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: habit.hex }} />
                      <span className="text-[11px] text-white/45 group-hover:text-white/70 transition-colors truncate max-w-[140px]">
                        {habit.name}
                      </span>
                    </div>
                  </td>

                  {/* Day cells */}
                  {DAYS.map((day) => {
                    const checked   = done.has(day);
                    const isFuture  = day > todayDay;
                    const isToday   = day === todayDay;
                    const sep       = isWeekBoundary(day, startDow);

                    return (
                      <td
                        key={day}
                        className={`py-1.5 ${sep ? "border-l border-white/[0.07]" : ""}`}
                      >
                        <button
                          onClick={() => toggle(habit.id, day)}
                          disabled={isFuture}
                          title={
                            isFuture
                              ? "Future date"
                              : checked
                              ? "Mark incomplete"
                              : "Mark complete"
                          }
                          className={`w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-bold transition-all border ${
                            isFuture
                              ? "cursor-default"
                              : "cursor-pointer hover:scale-110 active:scale-95"
                          } ${isToday && !isFuture ? "ring-1 ring-white/20" : ""}`}
                          style={
                            isFuture
                              ? { backgroundColor: "transparent", borderColor: "rgba(255,255,255,0.04)", color: "transparent" }
                              : checked
                              ? { backgroundColor: `${habit.hex}22`, borderColor: `${habit.hex}55`, color: habit.hex }
                              : { backgroundColor: "rgba(255,255,255,0.025)", borderColor: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.2)" }
                          }
                        >
                          {isFuture ? "" : checked ? "✓" : "–"}
                        </button>
                      </td>
                    );
                  })}

                  {/* Done */}
                  <td className="pl-3 py-1.5 border-l border-white/[0.07]">
                    <span className="text-[12px] font-semibold tabular-nums" style={{ color: habit.hex }}>
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
  );
}
