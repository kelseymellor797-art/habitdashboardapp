"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Panel from "@/components/dashboard/Panel";
import SectionTitle from "@/components/dashboard/SectionTitle";
import SummaryCard from "@/components/dashboard/SummaryCard";
import WeeklyCompletionChart from "@/components/dashboard/charts/WeeklyCompletionChart";
import { loadHabits, loadCompletions, getMonthCompletionSet, type Habit, type Completion } from "@/lib/store";
import { loadRoutines, loadRoutineEntries, type Routine, type RoutineEntry } from "@/lib/routineData";
import { calcRoutinePct, routineEntryKey } from "@/lib/routineUtils";
import { MONTH_CONFIG } from "@/lib/habitData";
import { calcStreak, isDueOnDay } from "@/lib/habitUtils";
import { loadCategories, type Category } from "@/lib/categoryData";

const { todayDay, startDow } = MONTH_CONFIG;

// Build current week (Mon–Sun containing today)
function buildCurrentWeek(): number[] {
  const { year, month, todayDay: td } = MONTH_CONFIG;
  const date = new Date(year, month - 1, td);
  const dow  = date.getDay(); // Sun=0
  const monday = td - ((dow === 0 ? 6 : dow - 1));
  return Array.from({ length: 7 }, (_, i) => monday + i);
}

const WEEK_DAYS   = buildCurrentWeek();
const WEEK_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const WEEK_LABEL  = (() => {
  const { year, month } = MONTH_CONFIG;
  const fmt = (d: number) =>
    new Date(year, month - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(WEEK_DAYS[0])} – ${fmt(WEEK_DAYS[6])}`;
})();

type RowData = {
  id: string;
  name: string;
  color: string;
  categoryId?: string;
  streak: number;
  weekPct: number;
  cells: { day: number; done: boolean; pct: number; future: boolean; scheduled: boolean }[];
  weekDone: number;
  isRoutine: boolean;
  scheduleType: string;
};

function compute(
  habits: Habit[],
  completions: Completion[],
  routines: Routine[],
  routineEntries: Record<string, RoutineEntry>
) {
  const loggedDays = WEEK_DAYS.filter((d) => d <= todayDay);

  const habitRows: RowData[] = habits.map((h) => {
    const set            = getMonthCompletionSet(completions, h.id);
    const streak         = calcStreak(set, todayDay);
    const scheduledLogged = loggedDays.filter((d) => isDueOnDay(h.scheduleType ?? "daily", h.customDays, d, startDow));
    const weekDone       = scheduledLogged.filter((d) => set.has(d)).length;
    const weekPct        = scheduledLogged.length > 0 ? Math.round((weekDone / scheduledLogged.length) * 100) : 0;
    const cells          = WEEK_DAYS.map((d) => ({
      day: d, future: d > todayDay, pct: 0,
      scheduled: isDueOnDay(h.scheduleType ?? "daily", h.customDays, d, startDow),
      done: d <= todayDay && set.has(d),
    }));
    return { id: h.id, name: h.name, color: h.color, categoryId: h.categoryId,
             streak, weekPct, cells, weekDone, isRoutine: false, scheduleType: h.scheduleType ?? "daily" };
  });

  const activeRoutines = routines.filter((r) => r.active);
  const routineRows: RowData[] = activeRoutines.map((r) => {
    const scheduledLogged = loggedDays.filter((d) => isDueOnDay(r.scheduleType ?? "daily", r.customDays, d, startDow));
    const weekDone        = scheduledLogged.filter((d) => calcRoutinePct(routineEntries[routineEntryKey(r.id, d)], r) === 100).length;
    const weekPct         = scheduledLogged.length > 0 ? Math.round((weekDone / scheduledLogged.length) * 100) : 0;
    const cells           = WEEK_DAYS.map((d) => {
      const scheduled = isDueOnDay(r.scheduleType ?? "daily", r.customDays, d, startDow);
      if (d > todayDay) return { day: d, done: false, pct: 0, future: true, scheduled };
      const pct = calcRoutinePct(routineEntries[routineEntryKey(r.id, d)], r);
      return { day: d, done: pct === 100, pct, future: false, scheduled };
    });
    const streakSet = new Set(scheduledLogged.filter((d) => calcRoutinePct(routineEntries[routineEntryKey(r.id, d)], r) === 100));
    return { id: r.id, name: r.name, color: r.color, categoryId: r.categoryId,
             streak: streakSet.size, weekPct, cells, weekDone, isRoutine: true, scheduleType: r.scheduleType ?? "daily" };
  });

  const allRows = [...habitRows, ...routineRows];

  const dayTotals = WEEK_LABELS.map((label, i) => {
    const d = WEEK_DAYS[i];
    if (d > todayDay || !allRows.length) return { label, pct: 0, future: d > todayDay };
    const scheduledRows = allRows.filter((row) => row.cells[i].scheduled);
    if (!scheduledRows.length) return { label, pct: 0, future: false };
    const done = scheduledRows.filter((row) => row.cells[i].done).length;
    return { label, pct: Math.round((done / scheduledRows.length) * 100), future: false };
  });

  const totalPossible = allRows.reduce((s, r) => {
    const scheduled = loggedDays.filter((d) => {
      const i = WEEK_DAYS.indexOf(d);
      return i >= 0 && r.cells[i].scheduled;
    }).length;
    return s + scheduled;
  }, 0);
  const totalDone  = allRows.reduce((s, r) => s + r.weekDone, 0);
  const weeklyPct  = totalPossible > 0 ? Math.round((totalDone / totalPossible) * 100) : 0;
  const bestDay    = dayTotals.filter((d) => !d.future).reduce((b, d) => d.pct > b.pct ? d : b, { label: "—", pct: 0, future: false });
  const bestStreak = allRows.reduce((m, r) => Math.max(m, r.streak), 0);

  return { habitRows, routineRows, dayTotals, weeklyPct, bestDay, bestStreak, totalDone, totalPossible };
}

function groupRows(rows: RowData[], categories: Category[]) {
  const map = new Map<string, { cat: Category | null; rows: RowData[] }>();
  for (const cat of categories) map.set(cat.id, { cat, rows: [] });
  map.set("__none__", { cat: null, rows: [] });
  for (const row of rows) {
    const key = row.categoryId && map.has(row.categoryId) ? row.categoryId : "__none__";
    map.get(key)!.rows.push(row);
  }
  return [...map.values()].filter((g) => g.rows.length > 0);
}

export default function WeeklyPage() {
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

  const allRows = [...stats.habitRows, ...stats.routineRows];
  const grouped = useMemo(() => groupRows(allRows, categories), [allRows, categories]);
  const hasCatLabels = categories.length > 0 || allRows.some((r) => !!r.categoryId);

  const summaryCards = [
    { label: "Week Progress",   value: `${stats.weeklyPct}%`,      hex: "#8b5cf6", subtext: `${WEEK_LABEL} completion`    },
    { label: "Best Day",        value: stats.bestDay.label,         hex: "#10b981", subtext: `${stats.bestDay.pct}% done`  },
    { label: "Best Streak",     value: `${stats.bestStreak}d`,      hex: "#f59e0b", subtext: "Current best streak"         },
    { label: "Completions",     value: `${stats.totalDone}`,        hex: "#0ea5e9", subtext: `of ${stats.totalPossible} possible` },
  ];

  return (
    <div className="flex flex-col gap-5 max-w-[1400px]">
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Weekly Dashboard</h1>
          <p className="text-[12px] text-white/30 mt-0.5 tracking-wide">{WEEK_LABEL}</p>
        </div>
        <span className="text-[11px] font-medium text-violet-400 bg-violet-500/10 border border-violet-500/20 rounded-full px-3 py-1">● Live</span>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {summaryCards.map((c) => <SummaryCard key={c.label} {...c} />)}
      </div>

      <Panel className="flex flex-col">
        <SectionTitle title="This Week" subtitle={WEEK_LABEL} />
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left text-[10px] text-white/25 font-medium pb-2 pr-4 w-[160px]">Item</th>
                {WEEK_LABELS.map((label, i) => (
                  <th key={label} className={`text-center text-[10px] font-medium pb-2 w-12 ${
                    WEEK_DAYS[i] > todayDay ? "text-white/15"
                    : WEEK_DAYS[i] === todayDay ? "text-violet-400"
                    : "text-white/25"
                  }`}>
                    {label}
                    <div className={`text-[9px] font-normal ${WEEK_DAYS[i] > todayDay ? "text-white/10" : "text-white/15"}`}>
                      {WEEK_DAYS[i]}
                    </div>
                  </th>
                ))}
                <th className="text-right text-[10px] text-white/25 font-medium pb-2 pl-4 w-16">Wk%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {grouped.map(({ cat, rows }) => (
                <Fragment key={`group-${cat?.id ?? "__none__"}`}>
                  {/* Category header row */}
                  {hasCatLabels && (
                    <tr>
                      <td colSpan={9} className="pt-4 pb-1.5">
                        <div className="flex items-center gap-2">
                          {cat?.color && (
                            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                          )}
                          <span className="text-[10px] font-semibold text-white/30 uppercase tracking-widest">
                            {cat?.name ?? "Other"}
                          </span>
                        </div>
                      </td>
                    </tr>
                  )}
                  {rows.map(({ id, name, color, weekPct, cells, isRoutine }) => (
                    <tr key={id}>
                      <td className="py-2.5 pr-4">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                          <span className="text-[12px] text-white/65 truncate max-w-[130px]">{name}</span>
                          {isRoutine && (
                            <span className="text-[8px] text-white/25 bg-white/[0.05] px-1 py-0.5 rounded shrink-0">routine</span>
                          )}
                        </div>
                      </td>
                      {cells.map(({ day, done, pct, future, scheduled }) => (
                        <td key={day} className="py-2.5 text-center">
                          <div className="flex items-center justify-center">
                            <div className="w-7 h-7 rounded-md flex items-center justify-center"
                              style={{
                                backgroundColor:
                                  future || !scheduled ? "transparent"
                                  : done ? color
                                  : (isRoutine && pct > 0) ? "#f59e0b33"
                                  : "rgba(255,255,255,0.05)",
                                border:
                                  future ? "1px solid rgba(255,255,255,0.04)"
                                  : !scheduled ? "1px solid rgba(255,255,255,0.03)"
                                  : done ? `1px solid ${color}`
                                  : (isRoutine && pct > 0) ? "1px solid #f59e0b66"
                                  : "1px solid rgba(255,255,255,0.08)",
                              }}>
                              {done && scheduled && (
                                <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                                  <path d="M1.5 5L4 7.5L8.5 2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              )}
                              {!done && isRoutine && pct > 0 && scheduled && (
                                <span style={{ fontSize: "7px", color: "#f59e0b", lineHeight: 1 }}>{pct}%</span>
                              )}
                              {!scheduled && !future && (
                                <span style={{ fontSize: "8px", color: "rgba(255,255,255,0.1)", lineHeight: 1 }}>–</span>
                              )}
                            </div>
                          </div>
                        </td>
                      ))}
                      <td className="py-2.5 pl-4 text-right">
                        <span className="text-[11px] font-semibold tabular-nums" style={{ color }}>{weekPct}%</span>
                      </td>
                    </tr>
                  ))}
                </Fragment>
              ))}
              {allRows.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-[12px] text-white/25">
                    No habits or routines yet.
                  </td>
                </tr>
              )}
            </tbody>
            {allRows.length > 0 && (
              <tfoot>
                <tr className="border-t border-white/[0.08]">
                  <td className="pt-2.5 pr-4 text-[10px] text-white/25">Daily %</td>
                  {stats.dayTotals.map(({ label, pct, future }) => (
                    <td key={label} className="pt-2.5 text-center">
                      <span className={`text-[10px] font-semibold tabular-nums ${
                        future ? "text-white/10"
                        : pct >= 80 ? "text-emerald-400"
                        : pct >= 50 ? "text-amber-400"
                        : "text-rose-400"
                      }`}>
                        {future ? "—" : `${pct}%`}
                      </span>
                    </td>
                  ))}
                  <td className="pt-2.5 pl-4 text-right">
                    <span className="text-[10px] font-bold tabular-nums text-violet-400">{stats.weeklyPct}%</span>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Panel>

      <Panel className="flex flex-col">
        <SectionTitle title="Weekly Completion" subtitle={`By week · ${MONTH_CONFIG.year}`} />
        <div className="min-h-[180px]">
          <WeeklyCompletionChart />
        </div>
      </Panel>
    </div>
  );
}
