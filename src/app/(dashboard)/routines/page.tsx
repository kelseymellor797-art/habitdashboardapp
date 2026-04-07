"use client";

import { useEffect, useState } from "react";
import Panel from "@/components/dashboard/Panel";
import SectionTitle from "@/components/dashboard/SectionTitle";
import {
  type Routine,
  type SubtaskDef,
  loadRoutines,
  saveRoutines,
  generateRoutineId,
} from "@/lib/routineData";
import { type ScheduleType, notifyUpdate } from "@/lib/store";
import { type Category, loadCategories } from "@/lib/categoryData";
import { DOW_FULL_LABELS } from "@/lib/habitUtils";

const COLORS = [
  "#8b5cf6", "#6366f1", "#3b82f6", "#0ea5e9",
  "#10b981", "#f59e0b", "#ef4444", "#ec4899",
  "#14b8a6", "#f97316",
];

// ── Reusable weekday picker ────────────────────────────────────────────────────

function DayPicker({ value, onChange }: { value: number[]; onChange: (d: number[]) => void }) {
  function toggle(i: number) {
    onChange(value.includes(i) ? value.filter((d) => d !== i) : [...value, i].sort((a, b) => a - b));
  }
  return (
    <div className="flex gap-1.5 flex-wrap">
      {DOW_FULL_LABELS.map((label, i) => (
        <button
          key={i}
          type="button"
          onClick={() => toggle(i)}
          className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all border ${
            value.includes(i)
              ? "bg-violet-600 border-violet-500 text-white"
              : "bg-white/[0.04] border-white/[0.08] text-white/40 hover:text-white/70 hover:border-white/20"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ── Schedule selector ──────────────────────────────────────────────────────────

function ScheduleField({
  scheduleType,
  customDays,
  onTypeChange,
  onDaysChange,
}: {
  scheduleType: ScheduleType;
  customDays: number[];
  onTypeChange: (t: ScheduleType) => void;
  onDaysChange: (d: number[]) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <label className="text-[12px] text-white/40 shrink-0 w-20">Schedule</label>
        <div className="flex gap-1.5">
          {(["daily", "weekly", "custom"] as ScheduleType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onTypeChange(t)}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-medium capitalize transition-all border ${
                scheduleType === t
                  ? "bg-violet-600 border-violet-500 text-white"
                  : "bg-white/[0.04] border-white/[0.08] text-white/40 hover:text-white/70 hover:border-white/20"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      {scheduleType === "custom" && (
        <div className="flex items-start gap-3">
          <span className="text-[12px] text-white/40 shrink-0 w-20 pt-1">Days</span>
          <DayPicker value={customDays} onChange={onDaysChange} />
        </div>
      )}
    </div>
  );
}

// ── Schedule badge ─────────────────────────────────────────────────────────────

function scheduleBadge(r: Routine): string {
  if (r.scheduleType === "custom") {
    if (!r.customDays?.length) return "custom";
    return r.customDays.map((d) => DOW_FULL_LABELS[d]).join(", ");
  }
  return r.scheduleType;
}

export default function RoutinesPage() {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: "",
    scheduleType: "daily" as ScheduleType,
    customDays: [] as number[],
    color: COLORS[0],
  });

  // Per-card edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{
    name: string;
    scheduleType: ScheduleType;
    customDays: number[];
    categoryId: string;
  }>({ name: "", scheduleType: "daily", customDays: [], categoryId: "" });

  const [newSubtask, setNewSubtask] = useState<Record<string, string>>({});

  useEffect(() => {
    setRoutines(loadRoutines());
    setCategories(loadCategories());
    const handler = () => {
      setRoutines(loadRoutines());
      setCategories(loadCategories());
    };
    window.addEventListener("habitflow:updated", handler);
    return () => window.removeEventListener("habitflow:updated", handler);
  }, []);

  function persist(updated: Routine[]) {
    setRoutines(updated);
    saveRoutines(updated);
    notifyUpdate();
  }

  function createRoutine() {
    if (!form.name.trim()) return;
    const newRoutine: Routine = {
      id: generateRoutineId(),
      name: form.name.trim(),
      scheduleType: form.scheduleType,
      customDays: form.scheduleType === "custom" ? form.customDays : undefined,
      color: form.color,
      active: true,
      subtasks: [],
      createdAt: new Date().toISOString(),
    };
    persist([...routines, newRoutine]);
    setForm({ name: "", scheduleType: "daily", customDays: [], color: COLORS[0] });
    setCreating(false);
    setExpanded(newRoutine.id);
  }

  function startEdit(r: Routine) {
    setEditingId(r.id);
    setEditDraft({
      name: r.name,
      scheduleType: r.scheduleType ?? "daily",
      customDays: r.customDays ?? [],
      categoryId: r.categoryId ?? "",
    });
  }

  function saveEdit(id: string) {
    persist(
      routines.map((r) =>
        r.id === id
          ? {
              ...r,
              name: editDraft.name.trim() || r.name,
              scheduleType: editDraft.scheduleType,
              customDays: editDraft.scheduleType === "custom" ? editDraft.customDays : undefined,
              categoryId: editDraft.categoryId || undefined,
            }
          : r
      )
    );
    setEditingId(null);
  }

  function deleteRoutine(id: string) {
    if (!confirm("Delete this routine?")) return;
    persist(routines.filter((r) => r.id !== id));
    if (expanded === id) setExpanded(null);
  }

  function toggleActive(id: string) {
    persist(routines.map((r) => (r.id === id ? { ...r, active: !r.active } : r)));
  }

  function addSubtask(routineId: string) {
    const text = (newSubtask[routineId] ?? "").trim();
    if (!text) return;
    const subtask: SubtaskDef = { id: `st-${Date.now()}`, name: text };
    persist(
      routines.map((r) =>
        r.id === routineId ? { ...r, subtasks: [...r.subtasks, subtask] } : r
      )
    );
    setNewSubtask((p) => ({ ...p, [routineId]: "" }));
  }

  function deleteSubtask(routineId: string, subtaskId: string) {
    persist(
      routines.map((r) =>
        r.id === routineId
          ? { ...r, subtasks: r.subtasks.filter((s) => s.id !== subtaskId) }
          : r
      )
    );
  }

  return (
    <div className="flex flex-col gap-5 max-w-[900px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Routines</h1>
          <p className="text-[12px] text-white/30 mt-0.5">
            Multi-step tracked items with subtasks
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 transition-colors text-sm font-medium"
        >
          + New Routine
        </button>
      </div>

      {/* Create form */}
      {creating && (
        <Panel>
          <SectionTitle title="New Routine" />
          <div className="flex flex-col gap-3 mt-3">
            <input
              className="bg-white/[0.06] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-violet-500/50"
              placeholder="Routine name (e.g. Morning Routine)"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              onKeyDown={(e) => e.key === "Enter" && createRoutine()}
              autoFocus
            />
            <ScheduleField
              scheduleType={form.scheduleType}
              customDays={form.customDays}
              onTypeChange={(t) => setForm((f) => ({ ...f, scheduleType: t }))}
              onDaysChange={(d) => setForm((f) => ({ ...f, customDays: d }))}
            />
            <div className="flex items-center gap-3">
              <label className="text-[12px] text-white/40 shrink-0 w-20">Color</label>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setForm((f) => ({ ...f, color: c }))}
                    className="w-6 h-6 rounded-full border-2 transition-all"
                    style={{
                      backgroundColor: c,
                      borderColor: form.color === c ? "white" : "transparent",
                      transform: form.color === c ? "scale(1.2)" : "scale(1)",
                    }}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-2 mt-1">
              <button
                onClick={createRoutine}
                className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 transition-colors text-sm font-medium"
              >
                Create
              </button>
              <button
                onClick={() => setCreating(false)}
                className="px-4 py-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] transition-colors text-sm text-white/60"
              >
                Cancel
              </button>
            </div>
          </div>
        </Panel>
      )}

      {/* Empty state */}
      {routines.length === 0 && !creating && (
        <Panel>
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <div className="text-3xl">&#9672;</div>
            <p className="text-white/40 text-sm">No routines yet.</p>
            <p className="text-white/25 text-xs">
              Create a routine to track multi-step habits with subtasks.
            </p>
            <button
              onClick={() => setCreating(true)}
              className="mt-1 px-4 py-2 rounded-lg bg-violet-600/70 hover:bg-violet-600 transition-colors text-sm font-medium"
            >
              + New Routine
            </button>
          </div>
        </Panel>
      )}

      {/* Routine cards */}
      <div className="flex flex-col gap-3">
        {routines.map((r) => {
          const isExpanded = expanded === r.id;
          const isEditing = editingId === r.id;
          const cn = categories.find((c) => c.id === r.categoryId)?.name;
          const cc = categories.find((c) => c.id === r.categoryId)?.color;

          return (
            <Panel key={r.id} className="flex flex-col gap-0">
              {/* Card header */}
              <div className="flex items-center gap-3">
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: r.color }}
                />

                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <span className="text-sm font-medium text-white/85 truncate">{r.name}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.06] text-white/30 shrink-0">
                    {scheduleBadge(r)}
                  </span>
                  {!r.active && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.04] text-white/20 shrink-0">
                      paused
                    </span>
                  )}
                  {cn && (
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded shrink-0"
                      style={{
                        backgroundColor: cc ? `${cc}22` : "rgba(255,255,255,0.06)",
                        color: cc ?? "rgba(255,255,255,0.3)",
                        border: `1px solid ${cc ? `${cc}40` : "rgba(255,255,255,0.08)"}`,
                      }}
                    >
                      {cn}
                    </span>
                  )}
                </div>

                <span className="text-[10px] text-white/20 tabular-nums shrink-0">
                  {r.subtasks.length} step{r.subtasks.length !== 1 ? "s" : ""}
                </span>

                <div className="flex gap-1.5 ml-1">
                  <button
                    onClick={() => (isEditing ? setEditingId(null) : startEdit(r))}
                    className="text-[10px] px-2.5 py-1 rounded-md bg-white/[0.05] hover:bg-white/[0.1] text-white/40 hover:text-white/70 transition-colors"
                  >
                    {isEditing ? "Cancel" : "Edit"}
                  </button>
                  <button
                    onClick={() => setExpanded(isExpanded ? null : r.id)}
                    className="text-[10px] px-2.5 py-1 rounded-md bg-white/[0.05] hover:bg-white/[0.1] text-white/40 hover:text-white/70 transition-colors"
                  >
                    {isExpanded ? "Collapse" : "Subtasks"}
                  </button>
                  <button
                    onClick={() => toggleActive(r.id)}
                    className="text-[10px] px-2.5 py-1 rounded-md bg-white/[0.05] hover:bg-white/[0.1] text-white/40 hover:text-white/70 transition-colors"
                  >
                    {r.active ? "Pause" : "Resume"}
                  </button>
                  <button
                    onClick={() => deleteRoutine(r.id)}
                    className="text-[10px] px-2.5 py-1 rounded-md bg-rose-500/10 hover:bg-rose-500/20 text-rose-400/60 hover:text-rose-400 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {/* Edit form */}
              {isEditing && (
                <div className="border-t border-white/[0.06] mt-3 pt-3 flex flex-col gap-3">
                  <input
                    className="bg-white/[0.06] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-violet-500/50"
                    value={editDraft.name}
                    onChange={(e) => setEditDraft((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Routine name"
                    autoFocus
                  />
                  <ScheduleField
                    scheduleType={editDraft.scheduleType}
                    customDays={editDraft.customDays}
                    onTypeChange={(t) => setEditDraft((p) => ({ ...p, scheduleType: t }))}
                    onDaysChange={(d) => setEditDraft((p) => ({ ...p, customDays: d }))}
                  />
                  {categories.length > 0 && (
                    <div className="flex items-center gap-3">
                      <label className="text-[12px] text-white/40 shrink-0 w-20">Category</label>
                      <select
                        className="flex-1 bg-white/[0.06] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-white/70 outline-none focus:border-violet-500/50"
                        value={editDraft.categoryId}
                        onChange={(e) => setEditDraft((p) => ({ ...p, categoryId: e.target.value }))}
                      >
                        <option value="">No category</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => saveEdit(r.id)}
                      className="px-4 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 transition-colors text-sm font-medium"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-4 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] transition-colors text-sm text-white/60"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Subtask editor */}
              {isExpanded && (
                <div className="border-t border-white/[0.06] mt-3 pt-3 flex flex-col gap-2">
                  {r.subtasks.length === 0 && (
                    <p className="text-[11px] text-white/20">
                      No subtasks yet — add one below.
                    </p>
                  )}
                  {r.subtasks.map((st, i) => (
                    <div key={st.id} className="flex items-center gap-2">
                      <span className="text-[10px] text-white/15 tabular-nums w-4 text-right shrink-0">
                        {i + 1}
                      </span>
                      <div className="w-1.5 h-1.5 rounded-full bg-white/15 shrink-0" />
                      <span className="flex-1 text-[12px] text-white/60">{st.name}</span>
                      {st.target && (
                        <span className="text-[10px] text-white/25 tabular-nums">{st.target}</span>
                      )}
                      <button
                        onClick={() => deleteSubtask(r.id, st.id)}
                        className="text-[10px] text-rose-400/40 hover:text-rose-400 transition-colors px-1"
                      >
                        &#10005;
                      </button>
                    </div>
                  ))}
                  <div className="flex gap-2 mt-1">
                    <input
                      className="flex-1 bg-white/[0.06] border border-white/[0.1] rounded-lg px-3 py-1.5 text-[12px] text-white placeholder-white/30 outline-none focus:border-violet-500/50"
                      placeholder="Add subtask..."
                      value={newSubtask[r.id] ?? ""}
                      onChange={(e) => setNewSubtask((p) => ({ ...p, [r.id]: e.target.value }))}
                      onKeyDown={(e) => e.key === "Enter" && addSubtask(r.id)}
                    />
                    <button
                      onClick={() => addSubtask(r.id)}
                      className="px-3 py-1.5 rounded-lg bg-violet-600/70 hover:bg-violet-600 transition-colors text-[12px] font-medium"
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}
            </Panel>
          );
        })}
      </div>
    </div>
  );
}
