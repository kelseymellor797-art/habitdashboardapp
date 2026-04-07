"use client";

import type { Routine, RoutineEntry } from "@/lib/routineData";
import { MONTH_CONFIG } from "@/lib/habitData";
import { calcRoutinePct } from "@/lib/routineUtils";

const DOW_FULL = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type Props = {
  routine: Routine;
  day: number;
  entry: RoutineEntry;
  onUpdate: (completedIds: string[]) => void;
  onClose: () => void;
};

export default function RoutinePanel({
  routine,
  day,
  entry,
  onUpdate,
  onClose,
}: Props) {
  const dow = DOW_FULL[(MONTH_CONFIG.startDow + day - 1) % 7];
  const pct = calcRoutinePct(entry, routine);
  const completedCount = routine.subtasks.filter((s) =>
    entry.completedSubtaskIds.includes(s.id)
  ).length;
  const total = routine.subtasks.length;

  const stateLabel =
    pct === 100 ? "Complete" : pct > 0 ? "In Progress" : "Not Started";
  const stateColor =
    pct === 100 ? "#10b981" : pct > 0 ? "#f59e0b" : "rgba(255,255,255,0.25)";
  const barColor =
    pct === 100 ? "#10b981" : pct > 0 ? "#f59e0b" : routine.color;

  function toggle(subtaskId: string) {
    const ids = entry.completedSubtaskIds;
    const next = ids.includes(subtaskId)
      ? ids.filter((id) => id !== subtaskId)
      : [...ids, subtaskId];
    onUpdate(next);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ backgroundColor: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-md bg-[#0C0F1A] border border-white/[0.09] rounded-2xl shadow-2xl overflow-hidden">
        {/* Accent bar */}
        <div className="h-[3px] w-full" style={{ backgroundColor: routine.color }} />

        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-white/[0.06]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[17px] font-semibold text-white leading-tight">
                {routine.name}
              </h2>
              <p className="text-[11px] text-white/30 mt-1">
                {dow}, Jan {day}, 2025
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white/20 hover:text-white/60 transition-colors text-xl leading-none mt-0.5 shrink-0 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/[0.05]"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="px-6 py-4 border-b border-white/[0.06]">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] text-white/30">
              {completedCount} of {total} steps
            </span>
            <span
              className="text-[11px] font-semibold tabular-nums"
              style={{ color: stateColor }}
            >
              {pct}% · {stateLabel}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-white/[0.07] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${pct}%`, backgroundColor: barColor }}
            />
          </div>
        </div>

        {/* Subtask list */}
        <div className="px-6 py-4 flex flex-col gap-2">
          {routine.subtasks.map((subtask) => {
            const isDone = entry.completedSubtaskIds.includes(subtask.id);
            return (
              <button
                key={subtask.id}
                onClick={() => toggle(subtask.id)}
                className={`flex items-center gap-3 w-full text-left rounded-xl px-4 py-3 border transition-all ${
                  isDone
                    ? "bg-emerald-500/[0.07] border-emerald-500/20 hover:bg-emerald-500/[0.1]"
                    : "bg-white/[0.025] border-white/[0.06] hover:bg-white/[0.05] hover:border-white/10"
                }`}
              >
                {/* Checkbox */}
                <div
                  className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0 border transition-all ${
                    isDone
                      ? "bg-emerald-500 border-emerald-500 text-white"
                      : "border-white/[0.15] text-transparent"
                  }`}
                >
                  ✓
                </div>

                {/* Label */}
                <span
                  className={`flex-1 text-[13px] font-medium transition-colors ${
                    isDone ? "text-white/40 line-through decoration-white/20" : "text-white/75"
                  }`}
                >
                  {subtask.name}
                </span>

                {/* Target */}
                {subtask.target && (
                  <span className="text-[10px] text-white/20 shrink-0 tabular-nums">
                    {subtask.target}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 pt-1">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-[13px] font-medium text-white/35 border border-white/[0.07] hover:border-white/[0.15] hover:text-white/60 transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
