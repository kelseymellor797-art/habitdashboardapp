"use client";

import { useEffect, useState } from "react";
import HabitGrid from "@/components/dashboard/HabitGrid";
import Panel from "@/components/dashboard/Panel";
import SectionTitle from "@/components/dashboard/SectionTitle";
import SummaryCard from "@/components/dashboard/SummaryCard";
import MonthlyProgressChart from "@/components/dashboard/charts/MonthlyProgressChart";
import { loadHabits, loadCompletions, getMonthCompletionSet, type Habit, type Completion } from "@/lib/store";
import { MONTH_CONFIG } from "@/lib/habitData";
import { calcCompleted, calcPct, calcStreak, resolveHabitColor } from "@/lib/habitUtils";
import { loadCategories, type Category } from "@/lib/categoryData";

const { todayDay, daysInMonth, label: monthLabel, year, month } = MONTH_CONFIG;

function computeStats(habits: Habit[], completions: Completion[]) {
  const rows = habits.map((h) => {
    const set = getMonthCompletionSet(completions, h.id);
    const completed = calcCompleted(set, todayDay);
    const pct = calcPct(completed, h.goal);
    const streak = calcStreak(set, todayDay);
    return { name: h.name, color: h.color, categoryId: h.categoryId, streak, pct, completed };
  });

  const totalDone = rows.reduce((s, r) => s + r.completed, 0);
  const totalPossible = habits.length * todayDay;
  const monthlyPct = totalPossible > 0 ? Math.round((totalDone / totalPossible) * 100) : 0;

  const todayDate = `${year}-${String(month).padStart(2, "0")}-${String(todayDay).padStart(2, "0")}`;
  const todayDone = completions.filter((c) => c.date === todayDate && c.value === 1).length;
  const todayPct = habits.length > 0 ? Math.round((todayDone / habits.length) * 100) : 0;

  const weekStart = Math.max(1, todayDay - 6);
  let weekDone = 0, weekPossible = 0;
  for (let d = weekStart; d <= todayDay; d++) {
    weekPossible += habits.length;
    for (const h of habits) {
      if (getMonthCompletionSet(completions, h.id).has(d)) weekDone++;
    }
  }
  const weeklyPct = weekPossible > 0 ? Math.round((weekDone / weekPossible) * 100) : 0;
  const bestStreak = rows.reduce((m, r) => Math.max(m, r.streak), 0);
  const goalsHit = rows.filter((r) => r.pct >= 100).length;

  return { monthlyPct, todayPct, weeklyPct, bestStreak, goalsHit, totalDone, totalRemaining: totalPossible - totalDone, rows };
}

export default function MonthlyPage() {
  const [stats, setStats] = useState(() => computeStats([], []));
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    const reload = () => {
      setStats(computeStats(loadHabits(), loadCompletions()));
      setCategories(loadCategories());
    };
    reload();
    window.addEventListener("habitflow:updated", reload);
    return () => window.removeEventListener("habitflow:updated", reload);
  }, []);

  const summaryCards = [
    { label: "Monthly Progress", value: `${stats.monthlyPct}%`, hex: "#8b5cf6", subtext: `${monthLabel} completion rate` },
    { label: "Today",            value: `${stats.todayPct}%`,  hex: "#10b981", subtext: "Habits completed today" },
    { label: "This Week",        value: `${stats.weeklyPct}%`, hex: "#0ea5e9", subtext: "7-day completion rate" },
    { label: "Best Streak",      value: `${stats.bestStreak}d`, hex: "#f59e0b", subtext: "Current best streak" },
  ];

  const monthStats = [
    { label: "Completed",  value: String(stats.totalDone),      color: "text-emerald-400" },
    { label: "Remaining",  value: String(stats.totalRemaining), color: "text-rose-400" },
    { label: "Goals Hit",  value: String(stats.goalsHit),       color: "text-amber-400" },
    { label: "Best Streak",value: `${stats.bestStreak}d`,        color: "text-violet-400" },
    { label: "Days Logged",value: String(todayDay),             color: "text-white/60" },
  ];

  return (
    <div className="flex flex-col gap-5 max-w-[1400px]">
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Monthly Dashboard</h1>
          <p className="text-[12px] text-white/30 mt-0.5 tracking-wide">{monthLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-white/20 bg-white/[0.04] border border-white/[0.07] rounded-full px-3 py-1">{todayDay} / {daysInMonth} days logged</span>
          <span className="text-[11px] font-medium text-violet-400 bg-violet-500/10 border border-violet-500/20 rounded-full px-3 py-1">● Live</span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {summaryCards.map((card) => <SummaryCard key={card.label} {...card} />)}
      </div>

      <HabitGrid />

      <div className="grid grid-cols-[220px_1fr_220px] gap-3">
        <Panel className="flex flex-col">
          <SectionTitle title={`${monthLabel} Stats`} />
          <div className="flex flex-col divide-y divide-white/[0.05]">
            {monthStats.map(({ label, value, color }) => (
              <div key={label} className="flex justify-between items-center py-2.5">
                <span className="text-[11px] text-white/35">{label}</span>
                <span className={`text-[13px] font-semibold tabular-nums ${color}`}>{value}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel className="flex flex-col">
          <SectionTitle title="Progress Over Time" subtitle={`Daily completion rate — ${monthLabel}`} />
          <div className="flex-1 min-h-[200px]">
            <MonthlyProgressChart />
          </div>
        </Panel>
        <Panel className="flex flex-col">
          <SectionTitle title="Top Habits" subtitle="By streak length" />
          <div className="flex flex-col gap-3">
            {stats.rows.length === 0 && (
              <p className="text-[11px] text-white/20 text-center py-4">No habits yet</p>
            )}
            {stats.rows.sort((a,b) => b.streak - a.streak).slice(0, 5).map((h, i) => {
              const resolvedColor = resolveHabitColor(h, categories);
              return (
              <div key={h.name} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-white/20 tabular-nums w-3">{i + 1}</span>
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: resolvedColor }} />
                    <span className="text-[11px] text-white/60 truncate max-w-[100px]">{h.name}</span>
                  </div>
                  <span className="text-[11px] font-semibold text-amber-400 tabular-nums">🔥 {h.streak}d</span>
                </div>
                <div className="h-[3px] rounded-full bg-white/[0.06]">
                  <div className="h-full rounded-full" style={{ width: `${h.pct}%`, backgroundColor: resolvedColor }} />
                </div>
              </div>
              );
            })}
          </div>
        </Panel>
      </div>
    </div>
  );
}
