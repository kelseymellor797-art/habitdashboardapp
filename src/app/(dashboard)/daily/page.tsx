"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { HABITS, MONTH_CONFIG, STORAGE_KEY } from "@/lib/habitData";
import { ROUTINE_BY_HABIT_ID, ROUTINE_STORAGE_KEY, ROUTINE_DEFS_STORAGE_KEY } from "@/lib/routineData";
import type { Routine, RoutineEntry } from "@/lib/routineData";
import {
  defaultCompletions,
  deserializeCompletions,
  serializeCompletions,
} from "@/lib/habitUtils";
import {
  calcRoutinePct,
  routineEntryKey,
  serializeRoutineEntries,
  deserializeRoutineEntries,
} from "@/lib/routineUtils";
import Panel from "@/components/dashboard/Panel";
import SectionTitle from "@/components/dashboard/SectionTitle";
import RoutinePanel from "@/components/dashboard/RoutinePanel";

const { todayDay, startDow } = MONTH_CONFIG;
const DOW_FULL = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const todayDOW = DOW_FULL[(startDow + todayDay - 1) % 7];

function loadCompletions() {
  if (typeof window === "undefined") return defaultCompletions(HABITS);
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved ? deserializeCompletions(saved, HABITS) : defaultCompletions(HABITS);
}

function loadRoutineEntries(): Record<string, RoutineEntry> {
  if (typeof window === "undefined") return {};
  const saved = localStorage.getItem(ROUTINE_STORAGE_KEY);
  return saved ? deserializeRoutineEntries(saved) : {};
}

export default function DailyPage() {
  const [completions, setCompletions] = useState(loadCompletions);
  const [routineEntries, setRoutineEntries] = useState<Record<string, RoutineEntry>>(loadRoutineEntries);
  const [activeHabitId, setActiveHabitId] = useState<string | null>(null);
  const [routineMap, setRoutineMap] = useState<Record<string, Routine>>(() => ROUTINE_BY_HABIT_ID);
  const hasMounted = useRef(false);

  // Merge user-edited routine defs over seeds
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

  function toggleHabit(habitId: string) {
    setCompletions((prev) => {
      const next = new Set(prev[habitId]);
      next.has(todayDay) ? next.delete(todayDay) : next.add(todayDay);
      return { ...prev, [habitId]: next };
    });
  }

  function updateRoutineEntry(routineId: string, completedIds: string[]) {
    setRoutineEntries((prev) => ({
      ...prev,
      [routineEntryKey(routineId, todayDay)]: { completedSubtaskIds: completedIds },
    }));
  }

  const habitStates = useMemo(() => HABITS.map((habit) => {
    const routine = routineMap[habit.id];
    let isComplete = false;
    let routinePct = 0;
    if (routine) {
      const entry = routineEntries[routineEntryKey(routine.id, todayDay)];
      routinePct = calcRoutinePct(entry, routine);
      isComplete = routinePct === 100;
    } else {
      isComplete = completions[habit.id]?.has(todayDay) ?? false;
    }
    return { habit, routine: routine ?? null, isComplete, routinePct };
  }), [completions, routineEntries, routineMap]);

  const doneCount = habitStates.filter((h) => h.isComplete).length;
  const totalCount = habitStates.length;
  const donePct = Math.round((doneCount / totalCount) * 100);

  const pending = habitStates.filter((h) => !h.isComplete);
  const completed = habitStates.filter((h) => h.isComplete);

  const activePanelData = useMemo(() => {
    if (!activeHabitId) return null;
    const state = habitStates.find((h) => h.habit.id === activeHabitId);
    if (!state?.routine) return null;
    const key = routineEntryKey(state.routine.id, todayDay);
    const entry = routineEntries[key] ?? { completedSubtaskIds: [] };
    return { habit: state.habit, routine: state.routine, entry };
  }, [activeHabitId, habitStates, routineEntries]);

  return (
    <>
      <div className="flex flex-col gap-5 max-w-[800px]">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-white">Today</h1>
            <p className="text-[12px] text-white/30 mt-0.5 tracking-wide">
              {todayDOW}, Jan {todayDay}, 2025
            </p>
          </div>

          {/* Ring progress */}
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-[28px] font-bold tabular-nums text-white leading-none">
                {doneCount}
                <span className="text-white/25 text-[18px] font-normal">/{totalCount}</span>
              </p>
              <p className="text-[10px] text-white/30 mt-1">habits done today</p>
            </div>
            <RingProgress pct={donePct} />
          </div>
        </div>

        {/* ── Pending habits ──────────────────────────────────────────────── */}
        {pending.length > 0 && (
          <Panel>
            <SectionTitle
              title="To Do"
              subtitle={`${pending.length} habit${pending.length !== 1 ? "s" : ""} remaining`}
            />
            <div className="flex flex-col divide-y divide-white/[0.04] mt-4">
              {pending.map(({ habit, routine, routinePct }) => (
                <HabitRow
                  key={habit.id}
                  habit={habit}
                  routine={routine}
                  isComplete={false}
                  routinePct={routinePct}
                  onToggle={() => toggleHabit(habit.id)}
                  onOpenRoutine={() => setActiveHabitId(habit.id)}
                />
              ))}
            </div>
          </Panel>
        )}

        {/* ── Completed habits ────────────────────────────────────────────── */}
        {completed.length > 0 && (
          <Panel>
            <SectionTitle
              title="Done"
              subtitle={`${completed.length} completed`}
            />
            <div className="flex flex-col divide-y divide-white/[0.04] mt-4">
              {completed.map(({ habit, routine, routinePct }) => (
                <HabitRow
                  key={habit.id}
                  habit={habit}
                  routine={routine}
                  isComplete
                  routinePct={routinePct}
                  onToggle={() => toggleHabit(habit.id)}
                  onOpenRoutine={() => setActiveHabitId(habit.id)}
                />
              ))}
            </div>
          </Panel>
        )}

        {/* ── All done ────────────────────────────────────────────────────── */}
        {pending.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="text-4xl">🎉</div>
            <p className="text-[16px] font-semibold text-white/70">All habits complete!</p>
            <p className="text-[12px] text-white/30">Great work today. See you tomorrow.</p>
          </div>
        )}
      </div>

      {/* ── Routine modal ───────────────────────────────────────────────────── */}
      {activeHabitId && activePanelData && (
        <RoutinePanel
          habit={activePanelData.habit}
          routine={activePanelData.routine}
          day={todayDay}
          entry={activePanelData.entry}
          onUpdate={(ids) => updateRoutineEntry(activePanelData.routine.id, ids)}
          onClose={() => setActiveHabitId(null)}
        />
      )}
    </>
  );
}

// ── Ring progress ─────────────────────────────────────────────────────────────

function RingProgress({ pct }: { pct: number }) {
  const circumference = 2 * Math.PI * 20; // r=20
  return (
    <div className="relative w-12 h-12 flex items-center justify-center">
      <svg width="48" height="48" viewBox="0 0 48 48" className="-rotate-90">
        <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3.5" />
        <circle
          cx="24" cy="24" r="20" fill="none"
          stroke={pct === 100 ? "#10b981" : "#8b5cf6"}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={`${(pct / 100) * circumference} ${circumference}`}
          className="transition-all duration-500"
        />
      </svg>
      <span
        className="absolute text-[10px] font-bold tabular-nums"
        style={{ color: pct === 100 ? "#10b981" : "#8b5cf6" }}
      >
        {pct}%
      </span>
    </div>
  );
}

// ── Habit row ─────────────────────────────────────────────────────────────────

type HabitRowProps = {
  habit: typeof HABITS[number];
  routine: Routine | null;
  isComplete: boolean;
  routinePct: number;
  onToggle: () => void;
  onOpenRoutine: () => void;
};

function HabitRow({ habit, routine, isComplete, routinePct, onToggle, onOpenRoutine }: HabitRowProps) {
  const isPartial = !!routine && routinePct > 0 && routinePct < 100;

  return (
    <div className={`flex items-center gap-4 py-4 transition-opacity ${isComplete ? "opacity-50" : "opacity-100"}`}>
      {/* Left color bar */}
      <div className="w-[3px] h-10 rounded-full shrink-0 transition-opacity" style={{ backgroundColor: habit.hex }} />

      {/* Name + badge + partial bar */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-[14px] font-medium transition-colors ${isComplete ? "text-white/35 line-through decoration-white/15" : "text-white/85"}`}>
            {habit.name}
          </span>
          {routine && (
            <span
              className="text-[8px] font-semibold px-1.5 py-0.5 rounded border shrink-0 leading-none"
              style={{ color: habit.hex, borderColor: `${habit.hex}40`, backgroundColor: `${habit.hex}10` }}
            >
              {routine.subtasks.length} steps
            </span>
          )}
        </div>
        {isPartial && (
          <div className="flex items-center gap-2">
            <div className="w-28 h-1 rounded-full bg-white/[0.07] overflow-hidden">
              <div className="h-full rounded-full bg-amber-400 transition-all duration-300" style={{ width: `${routinePct}%` }} />
            </div>
            <span className="text-[10px] text-amber-400 tabular-nums">{routinePct}% done</span>
          </div>
        )}
      </div>

      {/* Action */}
      {routine ? (
        <button
          onClick={onOpenRoutine}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-[12px] font-medium transition-all active:scale-95 ${
            isComplete
              ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
              : isPartial
              ? "bg-amber-500/10 border-amber-500/25 text-amber-400 hover:bg-amber-500/15"
              : "bg-white/[0.04] border-white/[0.09] text-white/50 hover:text-white/80 hover:bg-white/[0.07] hover:border-white/15"
          }`}
        >
          {isComplete ? "✓ Complete" : isPartial ? `${routinePct}%` : "Log routine →"}
        </button>
      ) : (
        <button
          onClick={onToggle}
          className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center transition-all active:scale-[0.85] ${
            isComplete
              ? "border-transparent"
              : "border-white/15 hover:border-white/35 bg-white/[0.02] hover:bg-white/[0.05]"
          }`}
          style={isComplete ? { backgroundColor: `${habit.hex}25`, borderColor: `${habit.hex}55` } : {}}
        >
          {isComplete && (
            <svg width="14" height="11" viewBox="0 0 14 11" fill="none">
              <path d="M1 5.5l4 4L13 1" stroke={habit.hex} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      )}
    </div>
  );
}
