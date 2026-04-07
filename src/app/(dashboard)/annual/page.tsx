"use client";

import { useEffect, useState } from "react";
import Panel from "@/components/dashboard/Panel";
import SectionTitle from "@/components/dashboard/SectionTitle";
import SummaryCard from "@/components/dashboard/SummaryCard";
import AnnualProgressChart from "@/components/dashboard/charts/AnnualProgressChart";
import { loadHabits, loadCompletions, getMonthCompletionSet, type Habit, type Completion } from "@/lib/store";
import { loadRoutines, loadRoutineEntries, type Routine, type RoutineEntry } from "@/lib/routineData";
import { MONTH_CONFIG } from "@/lib/habitData";
import { calcCompleted, calcPct, calcStreak } from "@/lib/habitUtils";
import { calcRoutinePct, routineEntryKey } from "@/lib/routineUtils";
import { loadCategories, type Category } from "@/lib/categoryData";

const CURRENT_YEAR = new Date().getFullYear();

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate(); // month is 1-based
}

const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const MONTHS_META = MONTH_LABELS.map((label, i) => {
  const m = String(i + 1).padStart(2, "0");
  return {
    label,
    prefix: `${CURRENT_YEAR}-${m}-`,
    days: daysInMonth(CURRENT_YEAR, i + 1),
  };
});

function getWeekColor(pct: number) {
  if (pct > 85) return "#10b981";
  if (pct > 70) return "#0ea5e9";
  if (pct > 55) return "#f59e0b";
  if (pct > 0) return "#f43f5e";
  return "rgba(255,255,255,0.1)";
}

function compute(
  habits: Habit[],
  completions: Completion[],
  routines: Routine[],
  routineEntries: Record<string, RoutineEntry>
) {
  const { todayDay } = MONTH_CONFIG;
  const habitCompletions = completions.filter((c) => c.value === 1).length;

  const dailyRoutines = routines.filter((r) => r.active);
  let routineCompletionsCount = 0;
  for (const r of dailyRoutines) {
    for (let d = 1; d <= todayDay; d++) {
      if (calcRoutinePct(routineEntries[routineEntryKey(r.id, d)], r) === 100) {
        routineCompletionsCount++;
      }
    }
  }
  const totalDone = habitCompletions + routineCompletionsCount;

  const habitRows = habits.map((h) => {
    const set = getMonthCompletionSet(completions, h.id);
    const completed = calcCompleted(set, todayDay);
    const pct = calcPct(completed, h.goal);
    const streak = calcStreak(set, todayDay);
    return { id: h.id, name: h.name, color: h.color, categoryId: h.categoryId, pct, streak };
  }).sort((a, b) => b.pct - a.pct);

  const bestStreak = habitRows.reduce((m, r) => Math.max(m, r.streak), 0);
  const goalsHit = habitRows.filter((r) => r.pct >= 100).length;

  const monthCards = MONTHS_META.map(({ label, prefix, days }) => {
    const habitDone = completions.filter((c) => c.date.startsWith(prefix) && c.value === 1).length;
    const isJan = prefix === `${CURRENT_YEAR}-01-`;
    let rDone = 0;
    if (isJan) {
      for (const r of dailyRoutines) {
        for (let d = 1; d <= days; d++) {
          if (calcRoutinePct(routineEntries[routineEntryKey(r.id, d)], r) === 100) rDone++;
        }
      }
    }
    const done = habitDone + rDone;
    const possible = days * (habits.length + (isJan ? dailyRoutines.length : 0));
    const pct = possible > 0 ? Math.round((done / possible) * 100) : 0;
    const weekSize = Math.ceil(days / 4);
    const weeks = [0,1,2,3].map((wi) => {
      const start = wi * weekSize + 1;
      const end = Math.min(start + weekSize - 1, days);
      const wHabitDone = completions.filter((c) => {
        if (!c.date.startsWith(prefix) || c.value !== 1) return false;
        const d = parseInt(c.date.slice(8), 10);
        return d >= start && d <= end;
      }).length;
      let wRoutineDone = 0;
      if (isJan) {
        for (const r of dailyRoutines) {
          for (let d = start; d <= end; d++) {
            if (calcRoutinePct(routineEntries[routineEntryKey(r.id, d)], r) === 100) wRoutineDone++;
          }
        }
      }
      const wPossible = (end - start + 1) * (habits.length + (isJan ? dailyRoutines.length : 0));
      return wPossible > 0 ? Math.round(((wHabitDone + wRoutineDone) / wPossible) * 100) : 0;
    });
    return { month: label, pct, weeks, done, total: possible };
  });

  const monthlyAvg = monthCards.filter((m) => m.done > 0).reduce((s, m) => s + m.pct, 0) / Math.max(1, monthCards.filter((m) => m.done > 0).length) || 0;

  return { habitRows, bestStreak, goalsHit, totalDone, monthlyAvg: Math.round(monthlyAvg), monthCards };
}

export default function AnnualPage() {
  const [stats,      setStats]      = useState(() => compute([], [], [], {}));
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    const reload = () => {
      setStats(compute(loadHabits(), loadCompletions(), loadRoutines(), loadRoutineEntries()));
      setCategories(loadCategories());
    };
    reload();
    window.addEventListener("habitflow:updated", reload);
    return () => window.removeEventListener("habitflow:updated", reload);
  }, []);

  const summaryCards = [
    { label: "Annual Progress",  value: `${stats.monthlyAvg}%`,    hex: "#8b5cf6", subtext: "Avg monthly completion" },
    { label: "Total Completions",value: String(stats.totalDone),    hex: "#10b981", subtext: `Across all of ${CURRENT_YEAR}` },
    { label: "Goals Hit",        value: String(stats.goalsHit),     hex: "#0ea5e9", subtext: "Habits at 100% goal" },
    { label: "Best Streak",      value: `${stats.bestStreak}d`,    hex: "#f59e0b", subtext: "Longest current streak" },
  ];

  return (
    <div className="flex flex-col gap-5 max-w-[1400px]">
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Annual Overview</h1>
          <p className="text-[12px] text-white/30 mt-0.5 tracking-wide">{CURRENT_YEAR} · Year in progress</p>
        </div>
        <span className="text-[11px] font-medium text-violet-400 bg-violet-500/10 border border-violet-500/20 rounded-full px-3 py-1">● Live</span>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {summaryCards.map((c) => <SummaryCard key={c.label} {...c} />)}
      </div>

      <div className="grid grid-cols-[200px_1fr_200px] gap-3">
        <Panel className="flex flex-col">
          <SectionTitle title={`${CURRENT_YEAR} Stats`} />
          <div className="flex flex-col divide-y divide-white/[0.05]">
            {[
              { label: "Total Done",    value: String(stats.totalDone),    color: "text-emerald-400" },
              { label: "Goals Hit",     value: String(stats.goalsHit),     color: "text-sky-400" },
              { label: "Best Streak",   value: `${stats.bestStreak}d`,    color: "text-violet-400" },
              { label: "Monthly Avg",   value: `${stats.monthlyAvg}%`,    color: "text-amber-400" },
              { label: "Active Habits", value: String(stats.habitRows.length), color: "text-white/60" },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex justify-between items-center py-2.5">
                <span className="text-[11px] text-white/35">{label}</span>
                <span className={`text-[12px] font-semibold tabular-nums ${color}`}>{value}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="flex flex-col">
          <SectionTitle title="Yearly Progress" subtitle={`Monthly completion rate · ${CURRENT_YEAR}`} />
          <div className="flex-1 min-h-[200px]">
            <AnnualProgressChart />
          </div>
          <div className="mt-3 flex items-center gap-4 pt-3 border-t border-white/[0.05]">
            {[{ label: "Excellent (>85%)", color: "#10b981" }, { label: "Good (>50%)", color: "#0ea5e9" }, { label: "Needs work", color: "#f59e0b" }].map(({ label, color }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: color }} />
                <span className="text-[10px] text-white/30">{label}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="flex flex-col">
          <SectionTitle title="Top Habits" subtitle="By completion rate" />
          <div className="flex flex-col gap-3">
            {stats.habitRows.length === 0 && (
              <p className="text-[11px] text-white/20 text-center py-4">No data yet</p>
            )}
            {(() => {
              // Group by category
              const map = new Map<string, { cat: Category | null; rows: typeof stats.habitRows }>();
              for (const cat of categories) map.set(cat.id, { cat, rows: [] });
              map.set("__none__", { cat: null, rows: [] });
              for (const h of stats.habitRows) {
                const key = h.categoryId && map.has(h.categoryId) ? h.categoryId : "__none__";
                map.get(key)!.rows.push(h);
              }
              const grouped = [...map.values()].filter((g) => g.rows.length > 0);
              const hasCats = categories.length > 0 || stats.habitRows.some((h) => !!h.categoryId);
              let globalIdx = 0;
              return grouped.map(({ cat, rows }) => (
                <div key={cat?.id ?? "__none__"}>
                  {hasCats && (
                    <div className="flex items-center gap-1.5 mb-1.5 mt-1">
                      {cat?.color && <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cat.color }} />}
                      <span className="text-[9px] text-white/20 uppercase tracking-widest">{cat?.name ?? "Other"}</span>
                    </div>
                  )}
                  {rows.sort((a, b) => b.pct - a.pct).map((h) => {
                    const idx = globalIdx++;
                    return (
                      <div key={h.id ?? h.name} className="flex flex-col gap-1.5 mb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-white/20 tabular-nums w-3">{idx + 1}</span>
                            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: h.color }} />
                            <span className="text-[10px] text-white/55 truncate max-w-[100px]">{h.name}</span>
                          </div>
                          <span className="text-[11px] font-semibold tabular-nums" style={{ color: h.color }}>{h.pct}%</span>
                        </div>
                        <div className="h-[3px] rounded-full bg-white/[0.06]">
                          <div className="h-full rounded-full" style={{ width: `${h.pct}%`, backgroundColor: h.color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ));
            })()}
          </div>
        </Panel>
      </div>

      <Panel className="flex flex-col">
        <SectionTitle title="Monthly Breakdown" subtitle={`All 12 months · ${CURRENT_YEAR}`} />
        <div className="grid grid-cols-4 gap-3">
          {stats.monthCards.map((month) => (
            <div key={month.month} className="bg-[#080B12] rounded-lg p-3.5 border border-white/[0.06] flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-semibold text-white/75">{month.month}</span>
                <span className="text-[12px] font-bold tabular-nums" style={{ color: getWeekColor(month.pct) }}>{month.pct}%</span>
              </div>
              <div className="flex gap-1">
                {month.weeks.map((wpct, i) => (
                  <div key={i} className="flex-1 h-3 rounded-sm" style={{ backgroundColor: getWeekColor(wpct) + "66" }} />
                ))}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-white/20">{month.done}/{month.total}</span>
                <div className="w-16 h-1 bg-white/[0.06] rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${month.pct}%`, backgroundColor: getWeekColor(month.pct) }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
