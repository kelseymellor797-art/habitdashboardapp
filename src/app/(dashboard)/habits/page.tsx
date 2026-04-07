"use client";

import { useEffect, useState } from "react";
import Panel from "@/components/dashboard/Panel";
import SectionTitle from "@/components/dashboard/SectionTitle";
import { type Habit, type ScheduleType, loadHabits, saveHabits, generateId, notifyUpdate } from "@/lib/store";
import { type Category, loadCategories } from "@/lib/categoryData";
import { DOW_FULL_LABELS } from "@/lib/habitUtils";

const COLORS = [
  "#8b5cf6","#10b981","#0ea5e9","#f59e0b",
  "#06b6d4","#f43f5e","#22d3ee","#a78bfa","#34d399","#fb923c",
];

// ── Weekday picker ─────────────────────────────────────────────────────────────

function DayPicker({
  value,
  onChange,
}: {
  value: number[];
  onChange: (days: number[]) => void;
}) {
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

// ── Schedule selector (type + custom days) ─────────────────────────────────────

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

// ── Schedule badge helper ──────────────────────────────────────────────────────

function scheduleBadge(h: Habit): string {
  if (h.scheduleType === "custom") {
    if (!h.customDays?.length) return "custom";
    return h.customDays.map((d) => DOW_FULL_LABELS[d]).join(", ");
  }
  return h.scheduleType;
}

export default function HabitsPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<Habit> & { customDays: number[] }>({ customDays: [] });
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    name: "",
    scheduleType: "daily" as ScheduleType,
    customDays: [] as number[],
    goal: 20,
    color: "#8b5cf6",
    categoryId: "",
  });

  useEffect(() => {
    setHabits(loadHabits());
    setCategories(loadCategories());
    const handler = () => {
      setHabits(loadHabits());
      setCategories(loadCategories());
    };
    window.addEventListener("habitflow:updated", handler);
    return () => window.removeEventListener("habitflow:updated", handler);
  }, []);

  function persist(updated: Habit[]) {
    setHabits(updated);
    saveHabits(updated);
    notifyUpdate();
  }

  function addHabit() {
    if (!form.name.trim()) return;
    const h: Habit = {
      id: generateId(),
      name: form.name.trim(),
      scheduleType: form.scheduleType,
      customDays: form.scheduleType === "custom" ? form.customDays : undefined,
      goal: form.goal,
      color: form.color,
      createdAt: new Date().toISOString(),
    };
    if (form.categoryId) h.categoryId = form.categoryId;
    persist([...habits, h]);
    setForm({ name: "", scheduleType: "daily", customDays: [], goal: 20, color: "#8b5cf6", categoryId: "" });
    setShowAdd(false);
  }

  function startEdit(habit: Habit) {
    setEditingId(habit.id);
    setEditDraft({
      name: habit.name,
      scheduleType: habit.scheduleType ?? "daily",
      customDays: habit.customDays ?? [],
      goal: habit.goal,
      color: habit.color,
      categoryId: habit.categoryId ?? "",
    });
  }

  function saveEdit(id: string) {
    const patch: Partial<Habit> = {
      name: editDraft.name,
      scheduleType: editDraft.scheduleType ?? "daily",
      customDays: editDraft.scheduleType === "custom" ? editDraft.customDays : undefined,
      goal: editDraft.goal,
      color: editDraft.color,
      categoryId: editDraft.categoryId || undefined,
    };
    persist(habits.map((h) => (h.id === id ? { ...h, ...patch } : h)));
    setEditingId(null);
    setEditDraft({ customDays: [] });
  }

  function deleteHabit(id: string) {
    persist(habits.filter((h) => h.id !== id));
  }

  function catName(id?: string) {
    if (!id) return null;
    return categories.find((c) => c.id === id)?.name ?? null;
  }

  function catColor(id?: string) {
    if (!id) return null;
    return categories.find((c) => c.id === id)?.color ?? null;
  }

  const CategorySelect = ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (v: string) => void;
  }) => (
    <div className="flex items-center gap-3">
      <label className="text-[12px] text-white/40 shrink-0 w-20">Category</label>
      {categories.length === 0 ? (
        <p className="text-[11px] text-white/25 italic">
          No categories yet — create one in{" "}
          <a href="/settings" className="text-violet-400/70 hover:text-violet-400 underline underline-offset-2">
            Settings
          </a>
          .
        </p>
      ) : (
        <select
          className="flex-1 bg-white/[0.06] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-white/70 outline-none focus:border-violet-500/50"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">No category</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-5 max-w-[900px]">
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Habits</h1>
          <p className="text-[12px] text-white/30 mt-0.5">Manage your habits</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 transition-colors text-sm font-medium"
        >
          + Add Habit
        </button>
      </div>

      {showAdd && (
        <Panel>
          <SectionTitle title="New Habit" />
          <div className="flex flex-col gap-3 mt-2">
            <input
              className="bg-white/[0.06] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-violet-500/50"
              placeholder="Habit name"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              onKeyDown={(e) => e.key === "Enter" && addHabit()}
              autoFocus
            />
            <ScheduleField
              scheduleType={form.scheduleType}
              customDays={form.customDays}
              onTypeChange={(t) => setForm((p) => ({ ...p, scheduleType: t }))}
              onDaysChange={(d) => setForm((p) => ({ ...p, customDays: d }))}
            />
            <div className="flex items-center gap-3">
              <label className="text-[12px] text-white/40 shrink-0 w-20">Monthly goal</label>
              <input
                type="number" min={1} max={31}
                className="bg-white/[0.06] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-white w-32 outline-none focus:border-violet-500/50"
                placeholder="Monthly goal"
                value={form.goal}
                onChange={(e) => setForm((p) => ({ ...p, goal: parseInt(e.target.value) || 20 }))}
              />
            </div>
            <CategorySelect
              value={form.categoryId}
              onChange={(v) => setForm((p) => ({ ...p, categoryId: v }))}
            />
            <div className="flex gap-2 flex-wrap">
              {COLORS.map((c) => (
                <div
                  key={c}
                  onClick={() => setForm((p) => ({ ...p, color: c }))}
                  className="w-6 h-6 rounded-full cursor-pointer transition-transform hover:scale-110"
                  style={{ backgroundColor: c, outline: form.color === c ? `2px solid ${c}` : "none", outlineOffset: "2px" }}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={addHabit} className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 transition-colors text-sm font-medium">Save</button>
              <button onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] transition-colors text-sm text-white/60">Cancel</button>
            </div>
          </div>
        </Panel>
      )}

      {habits.length === 0 && !showAdd && (
        <Panel>
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <div className="text-3xl">🌱</div>
            <p className="text-white/40 text-sm">No habits yet. Add your first habit to get started.</p>
          </div>
        </Panel>
      )}

      <div className="flex flex-col gap-3">
        {habits.map((habit) => {
          const isEditing = editingId === habit.id;
          const cn = catName(habit.categoryId);
          const cc = catColor(habit.categoryId);
          return (
            <Panel key={habit.id}>
              {isEditing ? (
                <div className="flex flex-col gap-3">
                  <input
                    className="bg-white/[0.06] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-violet-500/50"
                    value={editDraft.name ?? ""}
                    onChange={(e) => setEditDraft((p) => ({ ...p, name: e.target.value }))}
                    onKeyDown={(e) => e.key === "Enter" && saveEdit(habit.id)}
                    autoFocus
                  />
                  <ScheduleField
                    scheduleType={(editDraft.scheduleType ?? "daily") as ScheduleType}
                    customDays={editDraft.customDays ?? []}
                    onTypeChange={(t) => setEditDraft((p) => ({ ...p, scheduleType: t }))}
                    onDaysChange={(d) => setEditDraft((p) => ({ ...p, customDays: d }))}
                  />
                  <div className="flex items-center gap-3">
                    <label className="text-[12px] text-white/40 shrink-0 w-20">Monthly goal</label>
                    <input
                      type="number" min={1} max={31}
                      className="bg-white/[0.06] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-white w-32 outline-none focus:border-violet-500/50"
                      placeholder="Monthly goal"
                      value={editDraft.goal ?? 20}
                      onChange={(e) => setEditDraft((p) => ({ ...p, goal: parseInt(e.target.value) || 20 }))}
                    />
                  </div>
                  <CategorySelect
                    value={(editDraft.categoryId as string) ?? ""}
                    onChange={(v) => setEditDraft((p) => ({ ...p, categoryId: v }))}
                  />
                  <div className="flex gap-2 flex-wrap">
                    {COLORS.map((c) => (
                      <div
                        key={c}
                        onClick={() => setEditDraft((p) => ({ ...p, color: c }))}
                        className="w-6 h-6 rounded-full cursor-pointer transition-transform hover:scale-110"
                        style={{
                          backgroundColor: c,
                          outline: (editDraft.color ?? habit.color) === c ? `2px solid ${c}` : "none",
                          outlineOffset: "2px",
                        }}
                      />
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => saveEdit(habit.id)}
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
              ) : (
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: habit.color }} />
                  <span className="flex-1 text-sm font-medium text-white/85">{habit.name}</span>
                  <span className="text-[10px] text-white/30 bg-white/[0.04] rounded-full px-2 py-0.5">{scheduleBadge(habit)}</span>
                  <span className="text-[10px] text-white/30 bg-white/[0.04] rounded-full px-2 py-0.5">Goal: {habit.goal}/mo</span>
                  {cn && (
                    <span
                      className="text-[10px] rounded-full px-2 py-0.5"
                      style={{
                        backgroundColor: cc ? `${cc}22` : "rgba(255,255,255,0.04)",
                        color: cc ?? "rgba(255,255,255,0.4)",
                        border: `1px solid ${cc ? `${cc}44` : "rgba(255,255,255,0.08)"}`,
                      }}
                    >
                      {cn}
                    </span>
                  )}
                  <div className="flex gap-1.5 ml-auto">
                    <button
                      onClick={() => startEdit(habit)}
                      className="text-[10px] px-2.5 py-1 rounded-md bg-white/[0.05] hover:bg-white/[0.1] text-white/40 hover:text-white/70 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteHabit(habit.id)}
                      className="text-[10px] px-2.5 py-1 rounded-md bg-rose-500/10 hover:bg-rose-500/20 text-rose-400/60 hover:text-rose-400 transition-colors"
                    >
                      Delete
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
