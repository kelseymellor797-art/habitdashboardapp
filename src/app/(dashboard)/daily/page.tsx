"use client";

import { useEffect, useMemo, useState } from "react";
import { MONTH_CONFIG } from "@/lib/habitData";
import {
  loadRoutines, loadRoutineEntries, saveRoutineEntries,
  type Routine, type RoutineEntry,
} from "@/lib/routineData";
import { calcRoutinePct, routineEntryKey } from "@/lib/routineUtils";
import {
  type Habit, type Completion,
  loadHabits, loadCompletions, saveCompletions, toggleCompletion,
  getMonthCompletionSet, dayToDate, notifyUpdate,
} from "@/lib/store";
import { isDueToday, DOW_FULL_LABELS, resolveHabitColor } from "@/lib/habitUtils";
import { loadCategories, type Category } from "@/lib/categoryData";
import Panel from "@/components/dashboard/Panel";
import SectionTitle from "@/components/dashboard/SectionTitle";
import RoutinePanel from "@/components/dashboard/RoutinePanel";

const { todayDay, startDow, year, month } = MONTH_CONFIG;
const todayWeekday = (startDow + todayDay - 1) % 7;
const todayDOW = DOW_FULL_LABELS[todayWeekday];
// Suppress unused-var lint warning — kept for potential use
void todayDOW;

type HabitState   = { habit: Habit; isComplete: boolean };
type RoutineState = { routine: Routine; entry: RoutineEntry; pct: number; isComplete: boolean };
type DailyItem    = ({ kind: "habit" } & HabitState) | ({ kind: "routine" } & RoutineState);

export default function DailyPage() {
  const [habits,         setHabits]         = useState<Habit[]>([]);
  const [routines,       setRoutines]       = useState<Routine[]>([]);
  const [completions,    setCompletions]    = useState<Completion[]>([]);
  const [routineEntries, setRoutineEntries] = useState<Record<string, RoutineEntry>>({});
  const [categories,     setCategories]     = useState<Category[]>([]);
  const [activeRoutineId, setActiveRoutineId] = useState<string | null>(null);
  // Computed client-side to avoid SSR/client hydration mismatch on date strings
  const [todayDateStr, setTodayDateStr] = useState("");

  useEffect(() => {
    setTodayDateStr(
      new Date(year, month - 1, todayDay).toLocaleDateString("en-US", {
        weekday: "long", month: "short", day: "numeric", year: "numeric",
      })
    );
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

  function toggleHabit(habitId: string) {
    const next = toggleCompletion(completions, habitId, dayToDate(todayDay));
    setCompletions(next);
    saveCompletions(next);
    notifyUpdate();
  }

  function updateRoutineEntry(routineId: string, completedIds: string[]) {
    const key = routineEntryKey(routineId, todayDay);
    const next = { ...routineEntries, [key]: { completedSubtaskIds: completedIds } };
    setRoutineEntries(next);
    saveRoutineEntries(next);
    notifyUpdate();
  }

  const habitStates = useMemo<HabitState[]>(() =>
    habits
      .filter((h) => isDueToday(h.scheduleType ?? "daily", h.customDays, todayDay, startDow))
      .map((habit) => ({
        habit,
        isComplete: getMonthCompletionSet(completions, habit.id).has(todayDay),
      })),
    [habits, completions]
  );

  const dailyRoutines = useMemo<RoutineState[]>(() =>
    routines
      .filter((r) => r.active && isDueToday(r.scheduleType ?? "daily", r.customDays, todayDay, startDow))
      .map((r) => {
        const entry = routineEntries[routineEntryKey(r.id, todayDay)];
        const pct   = calcRoutinePct(entry, r);
        return { routine: r, entry: entry ?? { completedSubtaskIds: [] }, pct, isComplete: pct === 100 };
      }),
    [routines, routineEntries]
  );

  const totalItems = habitStates.length + dailyRoutines.length;
  const doneItems  = habitStates.filter((h) => h.isComplete).length
                   + dailyRoutines.filter((r) => r.isComplete).length;
  const donePct    = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;

  const allItems = useMemo<DailyItem[]>(() => [
    ...habitStates.map((s) => ({ kind: "habit"    as const, ...s })),
    ...dailyRoutines.map((r) => ({ kind: "routine" as const, ...r })),
  ], [habitStates, dailyRoutines]);

  // Group items by categoryId; uncategorised fall into __none__
  const categoryGroups = useMemo(() => {
    const map = new Map<string, { cat: Category | null; items: DailyItem[] }>();
    for (const cat of categories) map.set(cat.id, { cat, items: [] });
    map.set("__none__", { cat: null, items: [] });
    for (const item of allItems) {
      const catId = item.kind === "habit" ? item.habit.categoryId : item.routine.categoryId;
      const key   = catId && map.has(catId) ? catId : "__none__";
      map.get(key)!.items.push(item);
    }
    return [...map.values()].filter((g) => g.items.length > 0);
  }, [allItems, categories]);

  const hasCategoryLabels = categories.length > 0 || allItems.some((i) =>
    i.kind === "habit" ? !!i.habit.categoryId : !!i.routine.categoryId
  );

  const activeRoutine = activeRoutineId ? routines.find((r) => r.id === activeRoutineId) ?? null : null;
  const activeEntry   = activeRoutine
    ? routineEntries[routineEntryKey(activeRoutine.id, todayDay)] ?? { completedSubtaskIds: [] }
    : { completedSubtaskIds: [] };

  return (
    <>
      <div className="flex flex-col gap-5 max-w-[800px]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-white">Today</h1>
            <p className="text-[12px] text-white/30 mt-0.5 tracking-wide">{todayDateStr}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-[28px] font-bold tabular-nums text-white leading-none">
                {doneItems}<span className="text-white/25 text-[18px] font-normal">/{totalItems}</span>
              </p>
              <p className="text-[10px] text-white/30 mt-1">done today</p>
            </div>
            <RingProgress pct={donePct} />
          </div>
        </div>

        {/* All complete celebration */}
        {totalItems > 0 && doneItems === totalItems && (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="text-4xl">&#127881;</div>
            <p className="text-[16px] font-semibold text-white/70">Everything complete!</p>
            <p className="text-[12px] text-white/30">Great work today.</p>
          </div>
        )}

        {/* Category-grouped sections */}
        {categoryGroups.map(({ cat, items }) => {
          const pending   = items.filter((i) => !i.isComplete);
          const completed = items.filter((i) => i.isComplete);
          const title = cat?.name ?? (hasCategoryLabels ? "Other" : "Today");
          return (
            <Panel key={cat?.id ?? "__none__"}>
              <div className="flex items-center gap-2 mb-0">
                {cat?.color && (
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                )}
                <SectionTitle
                  title={title}
                  subtitle={`${completed.length}/${items.length} done`}
                />
              </div>
              <div className="flex flex-col divide-y divide-white/[0.04] mt-4">
                {pending.map((item) =>
                  item.kind === "habit"
                    ? <HabitRow   key={item.habit.id}    habit={item.habit}       isComplete={false} onToggle={() => toggleHabit(item.habit.id)} color={resolveHabitColor(item.habit, categories)} />
                    : <RoutineRow key={item.routine.id}  routine={item.routine}   isComplete={false} pct={item.pct} onOpen={() => setActiveRoutineId(item.routine.id)} />
                )}
                {completed.map((item) =>
                  item.kind === "habit"
                    ? <HabitRow   key={item.habit.id}   habit={item.habit}      isComplete onToggle={() => toggleHabit(item.habit.id)} color={resolveHabitColor(item.habit, categories)} />
                    : <RoutineRow key={item.routine.id} routine={item.routine}  isComplete pct={item.pct} onOpen={() => setActiveRoutineId(item.routine.id)} />
                )}
              </div>
            </Panel>
          );
        })}

        {/* Empty state */}
        {totalItems === 0 && (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="text-4xl">&#127807;</div>
            <p className="text-[16px] font-semibold text-white/40">Nothing tracked yet</p>
            <p className="text-[12px] text-white/25">
              Add habits on the Habits page or create routines on the Routines page.
            </p>
          </div>
        )}
      </div>

      {activeRoutineId && activeRoutine && (
        <RoutinePanel
          routine={activeRoutine}
          day={todayDay}
          entry={activeEntry}
          onUpdate={(ids) => updateRoutineEntry(activeRoutine.id, ids)}
          onClose={() => setActiveRoutineId(null)}
        />
      )}
    </>
  );
}

function RingProgress({ pct }: { pct: number }) {
  const c = 2 * Math.PI * 20;
  return (
    <div className="relative w-12 h-12 flex items-center justify-center">
      <svg width="48" height="48" viewBox="0 0 48 48" className="-rotate-90">
        <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3.5" />
        <circle cx="24" cy="24" r="20" fill="none"
          stroke={pct === 100 ? "#10b981" : "#8b5cf6"}
          strokeWidth="3.5" strokeLinecap="round"
          strokeDasharray={`${(pct / 100) * c} ${c}`}
          className="transition-all duration-500"
        />
      </svg>
      <span className="absolute text-[10px] font-bold tabular-nums"
        style={{ color: pct === 100 ? "#10b981" : "#8b5cf6" }}>
        {pct}%
      </span>
    </div>
  );
}

function HabitRow({ habit, isComplete, onToggle, color }: { habit: Habit; isComplete: boolean; onToggle: () => void; color: string }) {
  return (
    <div className={`flex items-center gap-4 py-4 transition-opacity ${isComplete ? "opacity-50" : "opacity-100"}`}>
      <div className="w-[3px] h-10 rounded-full shrink-0" style={{ backgroundColor: color }} />
      <div className="flex-1 min-w-0">
        <span className={`text-[14px] font-medium transition-colors ${isComplete ? "text-white/35 line-through decoration-white/15" : "text-white/85"}`}>
          {habit.name}
        </span>
      </div>
      <button onClick={onToggle}
        className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center transition-all active:scale-[0.85] ${
          isComplete ? "border-transparent" : "border-white/15 hover:border-white/35 bg-white/[0.02] hover:bg-white/[0.05]"
        }`}
        style={isComplete ? { backgroundColor: `${color}25`, borderColor: `${color}55` } : {}}>
        {isComplete && (
          <svg width="14" height="11" viewBox="0 0 14 11" fill="none">
            <path d="M1 5.5l4 4L13 1" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
    </div>
  );
}

function RoutineRow({ routine, isComplete, pct, onOpen }: { routine: Routine; isComplete: boolean; pct: number; onOpen: () => void }) {
  const isPartial = pct > 0 && pct < 100;
  return (
    <div className={`flex items-center gap-4 py-4 transition-opacity ${isComplete ? "opacity-50" : "opacity-100"}`}>
      <div className="w-[3px] h-10 rounded-full shrink-0" style={{ backgroundColor: routine.color }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-[14px] font-medium ${isComplete ? "text-white/35 line-through decoration-white/15" : "text-white/85"}`}>
            {routine.name}
          </span>
          <span className="text-[8px] font-semibold px-1.5 py-0.5 rounded border shrink-0 leading-none"
            style={{ color: routine.color, borderColor: `${routine.color}40`, backgroundColor: `${routine.color}10` }}>
            {routine.subtasks.length} steps
          </span>
        </div>
        {isPartial && (
          <div className="flex items-center gap-2">
            <div className="w-28 h-1 rounded-full bg-white/[0.07] overflow-hidden">
              <div className="h-full rounded-full bg-amber-400 transition-all duration-300" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-[10px] text-amber-400 tabular-nums">{pct}% done</span>
          </div>
        )}
      </div>
      <button onClick={onOpen}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-[12px] font-medium transition-all active:scale-95 ${
          isComplete ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
          : isPartial  ? "bg-amber-500/10 border-amber-500/25 text-amber-400 hover:bg-amber-500/15"
          : "bg-white/[0.04] border-white/[0.09] text-white/50 hover:text-white/80 hover:bg-white/[0.07] hover:border-white/15"
        }`}>
        {isComplete ? "Complete" : isPartial ? `${pct}%` : "Log routine"}
      </button>
    </div>
  );
}
