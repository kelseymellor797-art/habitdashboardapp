"use client";

import { useState, useEffect } from "react";
import Panel from "@/components/dashboard/Panel";
import SectionTitle from "@/components/dashboard/SectionTitle";
import { HABITS, Habit } from "@/lib/habitData";

const HABITS_STORAGE_KEY = "habitflow-habits";

const COLOR_SWATCHES = ["#8b5cf6","#10b981","#0ea5e9","#f59e0b","#06b6d4","#f43f5e","#22d3ee","#e879f9"];

type HabitType = "daily" | "weekly";

type ManagedHabit = Habit & {
  active: boolean;
  type: HabitType;
};

function seedHabits(): ManagedHabit[] {
  return HABITS.map((h) => ({
    ...h,
    active: true,
    type: "daily" as HabitType,
  }));
}

type FormState = {
  name: string;
  type: HabitType;
  monthlyGoal: number;
  hex: string;
  active: boolean;
};

const defaultForm: FormState = {
  name: "",
  type: "daily",
  monthlyGoal: 20,
  hex: "#8b5cf6",
  active: true,
};

export default function HabitsPage() {
  const [habits, setHabits] = useState<ManagedHabit[]>(seedHabits());
  const [hydrated, setHydrated] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState<FormState>(defaultForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormState>(defaultForm);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(HABITS_STORAGE_KEY);
    if (stored) {
      try {
        setHabits(JSON.parse(stored));
      } catch {
        setHabits(seedHabits());
      }
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) {
      localStorage.setItem(HABITS_STORAGE_KEY, JSON.stringify(habits));
    }
  }, [habits, hydrated]);

  function handleAdd() {
    if (!addForm.name.trim()) return;
    const newHabit: ManagedHabit = {
      id: addForm.name.toLowerCase().replace(/\s+/g, "-") + "-" + Date.now(),
      name: addForm.name.trim(),
      monthlyGoal: addForm.monthlyGoal,
      hex: addForm.hex,
      initialCompletions: [],
      active: addForm.active,
      type: addForm.type,
    };
    setHabits((prev) => [...prev, newHabit]);
    setAddForm(defaultForm);
    setShowAddForm(false);
  }

  function handleEdit(habit: ManagedHabit) {
    setEditId(habit.id);
    setEditForm({ name: habit.name, type: habit.type, monthlyGoal: habit.monthlyGoal, hex: habit.hex, active: habit.active });
    setDeleteConfirm(null);
  }

  function handleSaveEdit(id: string) {
    setHabits((prev) =>
      prev.map((h) =>
        h.id === id
          ? { ...h, name: editForm.name, type: editForm.type, monthlyGoal: editForm.monthlyGoal, hex: editForm.hex, active: editForm.active }
          : h
      )
    );
    setEditId(null);
  }

  function handleDelete(id: string) {
    if (deleteConfirm === id) {
      setHabits((prev) => prev.filter((h) => h.id !== id));
      setDeleteConfirm(null);
    } else {
      setDeleteConfirm(id);
      setTimeout(() => setDeleteConfirm(null), 3000);
    }
  }

  function getStreak(habit: ManagedHabit): number {
    if (habit.initialCompletions.length === 0) return 0;
    const sorted = [...habit.initialCompletions].sort((a, b) => b - a);
    let streak = 0;
    let expected = sorted[0];
    for (const day of sorted) {
      if (day === expected) { streak++; expected--; } else break;
    }
    return streak;
  }

  return (
    <div className="flex flex-col gap-5 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Habits</h1>
          <p className="text-[12px] text-white/30 mt-0.5 tracking-wide">Manage your tracked habits</p>
        </div>
        <button
          onClick={() => { setShowAddForm((v) => !v); setEditId(null); }}
          className="text-[11px] font-medium text-white bg-violet-600 hover:bg-violet-500 transition-colors rounded-lg px-4 py-2"
        >
          {showAddForm ? "Cancel" : "+ Add Habit"}
        </button>
      </div>

      {/* Add Habit Form */}
      {showAddForm && (
        <Panel className="flex flex-col gap-4">
          <SectionTitle title="New Habit" />
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-white/35 uppercase tracking-widest">Name</label>
              <input
                type="text"
                value={addForm.name}
                onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Morning Run"
                className="bg-[#080B12] border border-white/[0.07] rounded-lg px-3 py-2 text-[12px] text-white placeholder-white/20 focus:outline-none focus:border-violet-500/50"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-white/35 uppercase tracking-widest">Monthly Goal (days)</label>
              <input
                type="number"
                value={addForm.monthlyGoal}
                onChange={(e) => setAddForm((f) => ({ ...f, monthlyGoal: Number(e.target.value) }))}
                min={1} max={31}
                className="bg-[#080B12] border border-white/[0.07] rounded-lg px-3 py-2 text-[12px] text-white focus:outline-none focus:border-violet-500/50"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-white/35 uppercase tracking-widest">Frequency</label>
              <div className="flex gap-2">
                {(["daily", "weekly"] as HabitType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setAddForm((f) => ({ ...f, type: t }))}
                    className={`flex-1 py-2 rounded-lg text-[11px] font-medium transition-colors border ${addForm.type === t ? "bg-violet-600 border-violet-500 text-white" : "bg-white/[0.03] border-white/[0.07] text-white/40 hover:text-white/60"}`}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-white/35 uppercase tracking-widest">Active</label>
              <button
                onClick={() => setAddForm((f) => ({ ...f, active: !f.active }))}
                className={`py-2 rounded-lg text-[11px] font-medium transition-colors border ${addForm.active ? "bg-emerald-600/20 border-emerald-500/30 text-emerald-400" : "bg-white/[0.03] border-white/[0.07] text-white/40"}`}
              >
                {addForm.active ? "Active" : "Inactive"}
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] text-white/35 uppercase tracking-widest">Color</label>
            <div className="flex gap-2">
              {COLOR_SWATCHES.map((color) => (
                <button
                  key={color}
                  onClick={() => setAddForm((f) => ({ ...f, hex: color }))}
                  className={`w-7 h-7 rounded-full transition-all ${addForm.hex === color ? "ring-2 ring-white/50 ring-offset-2 ring-offset-[#0C0F1A]" : ""}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => { setShowAddForm(false); setAddForm(defaultForm); }} className="text-[11px] text-white/40 hover:text-white/60 transition-colors px-4 py-2">Cancel</button>
            <button onClick={handleAdd} className="text-[11px] font-medium text-white bg-violet-600 hover:bg-violet-500 transition-colors rounded-lg px-4 py-2">Add Habit</button>
          </div>
        </Panel>
      )}

      {/* Habits List */}
      <Panel className="flex flex-col">
        <SectionTitle title={`All Habits`} subtitle={`${habits.length} habits tracked`} />
        <div className="flex flex-col divide-y divide-white/[0.05]">
          {/* Header row */}
          <div className="grid grid-cols-[1fr_100px_80px_80px_80px_120px] gap-3 pb-2.5">
            <span className="text-[10px] text-white/25 uppercase tracking-widest">Habit</span>
            <span className="text-[10px] text-white/25 uppercase tracking-widest">Frequency</span>
            <span className="text-[10px] text-white/25 uppercase tracking-widest">Goal</span>
            <span className="text-[10px] text-white/25 uppercase tracking-widest">Streak</span>
            <span className="text-[10px] text-white/25 uppercase tracking-widest">Status</span>
            <span className="text-[10px] text-white/25 uppercase tracking-widest text-right">Actions</span>
          </div>

          {habits.map((habit) => (
            <div key={habit.id}>
              {editId === habit.id ? (
                /* Edit row */
                <div className="py-3 flex flex-col gap-3">
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                      className="bg-[#080B12] border border-white/[0.07] rounded-lg px-3 py-1.5 text-[12px] text-white focus:outline-none focus:border-violet-500/50"
                    />
                    <input
                      type="number"
                      value={editForm.monthlyGoal}
                      onChange={(e) => setEditForm((f) => ({ ...f, monthlyGoal: Number(e.target.value) }))}
                      min={1} max={31}
                      className="bg-[#080B12] border border-white/[0.07] rounded-lg px-3 py-1.5 text-[12px] text-white focus:outline-none focus:border-violet-500/50"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1.5">
                      {(["daily", "weekly"] as HabitType[]).map((t) => (
                        <button
                          key={t}
                          onClick={() => setEditForm((f) => ({ ...f, type: t }))}
                          className={`px-3 py-1 rounded-md text-[10px] font-medium transition-colors border ${editForm.type === t ? "bg-violet-600 border-violet-500 text-white" : "bg-white/[0.03] border-white/[0.07] text-white/40"}`}
                        >
                          {t.charAt(0).toUpperCase() + t.slice(1)}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => setEditForm((f) => ({ ...f, active: !f.active }))}
                      className={`px-3 py-1 rounded-md text-[10px] font-medium transition-colors border ${editForm.active ? "bg-emerald-600/20 border-emerald-500/30 text-emerald-400" : "bg-white/[0.03] border-white/[0.07] text-white/40"}`}
                    >
                      {editForm.active ? "Active" : "Inactive"}
                    </button>
                    <div className="flex gap-1.5 ml-2">
                      {COLOR_SWATCHES.map((color) => (
                        <button
                          key={color}
                          onClick={() => setEditForm((f) => ({ ...f, hex: color }))}
                          className={`w-5 h-5 rounded-full transition-all ${editForm.hex === color ? "ring-2 ring-white/50 ring-offset-1 ring-offset-[#0C0F1A]" : ""}`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <div className="ml-auto flex gap-2">
                      <button onClick={() => setEditId(null)} className="text-[11px] text-white/40 hover:text-white/60 px-3 py-1">Cancel</button>
                      <button onClick={() => handleSaveEdit(habit.id)} className="text-[11px] font-medium text-white bg-violet-600 hover:bg-violet-500 rounded-md px-3 py-1">Save</button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Normal row */
                <div className="grid grid-cols-[1fr_100px_80px_80px_80px_120px] gap-3 items-center py-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: habit.hex }} />
                    <span className="text-[12px] text-white/75">{habit.name}</span>
                  </div>
                  <span className="text-[11px] text-white/40 capitalize">{habit.type}</span>
                  <span className="text-[11px] text-white/40">{habit.monthlyGoal}d</span>
                  <span className="text-[11px] text-white/60 font-medium">{getStreak(habit)}d 🔥</span>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full w-fit ${habit.active ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20" : "text-white/30 bg-white/[0.04] border border-white/[0.07]"}`}>
                    {habit.active ? "Active" : "Inactive"}
                  </span>
                  <div className="flex justify-end gap-1.5">
                    <button
                      onClick={() => handleEdit(habit)}
                      className="text-[10px] text-white/35 hover:text-white/60 bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.07] rounded-md px-2.5 py-1 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(habit.id)}
                      className={`text-[10px] rounded-md px-2.5 py-1 transition-colors border ${deleteConfirm === habit.id ? "text-white bg-rose-600 border-rose-500 hover:bg-rose-500" : "text-rose-400/60 hover:text-rose-400 bg-rose-500/5 border-rose-500/20 hover:bg-rose-500/10"}`}
                    >
                      {deleteConfirm === habit.id ? "Confirm?" : "Delete"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {habits.length === 0 && (
            <div className="py-8 text-center text-[12px] text-white/20">
              No habits yet. Add one above.
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}
