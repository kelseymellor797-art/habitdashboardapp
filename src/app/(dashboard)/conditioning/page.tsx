"use client";

import { useState, useEffect } from "react";
import Panel from "@/components/dashboard/Panel";
import SectionTitle from "@/components/dashboard/SectionTitle";
import {
  loadConditioningRoutines, saveConditioningRoutines,
  loadConditioningSessions, saveConditioningSessions,
  generateRoutineId, generateSessionId,
  todayDateString,
  ConditioningRoutine, ConditioningSession, Exercise, MuscleGroup,
} from "@/lib/conditioningData";

type Tab = "log" | "routines" | "history";

const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  core: "Core",
  upper_body: "Upper Body",
  lower_body: "Lower Body",
  full_body: "Full Body",
  shoulders: "Shoulders",
  back: "Back",
  legs: "Legs",
  flexibility: "Flexibility",
  cardio: "Cardio",
};

const MUSCLE_GROUP_COLORS: Record<MuscleGroup, string> = {
  core: "bg-violet-500/20 text-violet-300 border-violet-500/30",
  upper_body: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  lower_body: "bg-green-500/20 text-green-300 border-green-500/30",
  full_body: "bg-pink-500/20 text-pink-300 border-pink-500/30",
  shoulders: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  back: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
  legs: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  flexibility: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  cardio: "bg-orange-500/20 text-orange-300 border-orange-500/30",
};

function DifficultyStars({ value, max = 5, onChange }: { value: number; max?: number; onChange?: (v: number) => void }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange?.(i + 1)}
          className={`text-sm transition-colors ${i < value ? "text-yellow-400" : "text-white/20"} ${onChange ? "hover:text-yellow-300 cursor-pointer" : "cursor-default"}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function generateExId(): string {
  return `ex-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export default function ConditioningPage() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("log");
  const [routines, setRoutines] = useState<ConditioningRoutine[]>([]);
  const [sessions, setSessions] = useState<ConditioningSession[]>([]);

  // Log session state
  const [selectedRoutine, setSelectedRoutine] = useState<ConditioningRoutine | null>(null);
  const [isCustomSession, setIsCustomSession] = useState(false);
  const [checkedExercises, setCheckedExercises] = useState<Set<string>>(new Set());
  const [sessionDuration, setSessionDuration] = useState("");
  const [sessionDifficulty, setSessionDifficulty] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [sessionNotes, setSessionNotes] = useState("");
  const [customSessionName, setCustomSessionName] = useState("");
  const [sessionSaved, setSessionSaved] = useState(false);

  // Routine form state
  const [showRoutineForm, setShowRoutineForm] = useState(false);
  const [editingRoutineId, setEditingRoutineId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState<MuscleGroup>("core");
  const [formDifficulty, setFormDifficulty] = useState<1 | 2 | 3 | 4 | 5>(2);
  const [formDuration, setFormDuration] = useState("");
  const [formRoutineNotes, setFormRoutineNotes] = useState("");
  const [formExercises, setFormExercises] = useState<Exercise[]>([]);
  const [expandedRoutine, setExpandedRoutine] = useState<string | null>(null);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  // Delete confirmation
  const [deletingRoutineId, setDeletingRoutineId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    setRoutines(loadConditioningRoutines());
    setSessions(loadConditioningSessions());
  }, []);

  if (!mounted) return null;

  const today = todayDateString();
  const displayDate = new Date(today + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });

  // --- LOG SESSION ---

  function handleSelectRoutine(routine: ConditioningRoutine) {
    setSelectedRoutine(routine);
    setIsCustomSession(false);
    setCheckedExercises(new Set());
    setSessionSaved(false);
  }

  function handleCustomSession() {
    setSelectedRoutine(null);
    setIsCustomSession(true);
    setCheckedExercises(new Set());
    setSessionSaved(false);
  }

  function toggleExercise(id: string) {
    setCheckedExercises(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function handleSaveSession() {
    const name = isCustomSession ? customSessionName.trim() || "Custom Session" : (selectedRoutine?.name ?? "Session");
    const newSession: ConditioningSession = {
      id: generateSessionId(),
      routineId: selectedRoutine?.id,
      routineName: name,
      date: today,
      duration: sessionDuration ? parseInt(sessionDuration) : undefined,
      completedExercises: Array.from(checkedExercises),
      difficulty: sessionDifficulty,
      notes: sessionNotes.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    const updated = [...sessions, newSession];
    setSessions(updated);
    saveConditioningSessions(updated);
    setSessionSaved(true);
    // Reset
    setTimeout(() => {
      setSelectedRoutine(null);
      setIsCustomSession(false);
      setCheckedExercises(new Set());
      setSessionDuration("");
      setSessionDifficulty(3);
      setSessionNotes("");
      setCustomSessionName("");
      setSessionSaved(false);
    }, 2000);
  }

  // --- ROUTINE FORM ---

  function resetRoutineForm() {
    setFormName("");
    setFormCategory("core");
    setFormDifficulty(2);
    setFormDuration("");
    setFormRoutineNotes("");
    setFormExercises([]);
    setEditingRoutineId(null);
  }

  function openAddRoutineForm() {
    resetRoutineForm();
    setShowRoutineForm(true);
  }

  function openEditRoutineForm(r: ConditioningRoutine) {
    setFormName(r.name);
    setFormCategory(r.category);
    setFormDifficulty(r.difficulty);
    setFormDuration(r.estimatedDuration ? String(r.estimatedDuration) : "");
    setFormRoutineNotes(r.notes || "");
    setFormExercises([...r.exercises]);
    setEditingRoutineId(r.id);
    setShowRoutineForm(true);
  }

  function addFormExercise() {
    setFormExercises(prev => [...prev, { id: generateExId(), name: "", sets: 3, reps: "" }]);
  }

  function updateFormExercise(idx: number, field: keyof Exercise, value: string | number) {
    setFormExercises(prev => prev.map((ex, i) => i === idx ? { ...ex, [field]: value } : ex));
  }

  function removeFormExercise(idx: number) {
    setFormExercises(prev => prev.filter((_, i) => i !== idx));
  }

  function handleSaveRoutine() {
    if (!formName.trim()) return;
    if (editingRoutineId) {
      const updated = routines.map((r) =>
        r.id === editingRoutineId
          ? {
              ...r,
              name: formName.trim(),
              category: formCategory,
              difficulty: formDifficulty,
              estimatedDuration: formDuration ? parseInt(formDuration) : undefined,
              notes: formRoutineNotes.trim() || undefined,
              exercises: formExercises.filter(e => e.name.trim()),
            }
          : r
      );
      setRoutines(updated);
      saveConditioningRoutines(updated);
    } else {
      const newRoutine: ConditioningRoutine = {
        id: generateRoutineId(),
        name: formName.trim(),
        category: formCategory,
        difficulty: formDifficulty,
        estimatedDuration: formDuration ? parseInt(formDuration) : undefined,
        notes: formRoutineNotes.trim() || undefined,
        exercises: formExercises.filter(e => e.name.trim()),
        active: true,
        createdAt: new Date().toISOString(),
      };
      const updated = [...routines, newRoutine];
      setRoutines(updated);
      saveConditioningRoutines(updated);
    }
    setShowRoutineForm(false);
    resetRoutineForm();
  }

  function handleDeleteRoutine(id: string) {
    const updated = routines.filter((r) => r.id !== id);
    setRoutines(updated);
    saveConditioningRoutines(updated);
    setDeletingRoutineId(null);
  }

  // --- HISTORY STATS ---

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const thisMonthSessions = sessions.filter(s => s.date.startsWith(currentMonth));

  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  const startOfWeekStr = `${startOfWeek.getFullYear()}-${String(startOfWeek.getMonth()+1).padStart(2,'0')}-${String(startOfWeek.getDate()).padStart(2,'0')}`;
  const thisWeekSessions = sessions.filter(s => s.date >= startOfWeekStr);

  const routineFreq: Record<string, number> = {};
  sessions.forEach(s => { routineFreq[s.routineName] = (routineFreq[s.routineName] || 0) + 1; });
  const mostFrequent = Object.entries(routineFreq).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
  const avgDuration = sessions.filter(s => s.duration).length > 0
    ? Math.round(sessions.filter(s => s.duration).reduce((sum, s) => sum + (s.duration ?? 0), 0) / sessions.filter(s => s.duration).length)
    : 0;

  const sortedSessions = [...sessions].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">🏋️ Conditioning</h1>
        <p className="text-white/40 text-sm mt-0.5">{displayDate}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-white/[0.03] rounded-xl border border-white/[0.06] w-fit">
        {(["log", "routines", "history"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab
                ? "bg-violet-500/20 text-violet-300 border border-violet-500/30"
                : "text-white/40 hover:text-white/60"
            }`}
          >
            {tab === "log" ? "Log Session" : tab === "routines" ? "Routines" : "History"}
          </button>
        ))}
      </div>

      {/* LOG SESSION TAB */}
      {activeTab === "log" && (
        <div className="space-y-5">
          {sessionSaved ? (
            <Panel className="text-center py-10">
              <p className="text-4xl mb-3">✅</p>
              <p className="text-white font-semibold text-lg">Session logged!</p>
              <p className="text-white/40 text-sm mt-1">Great work 💪</p>
            </Panel>
          ) : !selectedRoutine && !isCustomSession ? (
            <>
              <Panel>
                <SectionTitle title="Choose a Routine" />
                <div className="grid grid-cols-1 gap-3">
                  {routines.filter(r => r.active).map((routine) => (
                    <button
                      key={routine.id}
                      onClick={() => handleSelectRoutine(routine)}
                      className="flex items-start justify-between p-4 rounded-xl bg-white/[0.03] border border-white/[0.07] hover:border-violet-500/30 hover:bg-violet-500/5 transition-all text-left"
                    >
                      <div>
                        <p className="text-white font-medium">{routine.name}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${MUSCLE_GROUP_COLORS[routine.category]}`}>
                            {MUSCLE_GROUP_LABELS[routine.category]}
                          </span>
                          <span className="text-white/30 text-xs">{routine.exercises.length} exercises</span>
                          {routine.estimatedDuration && <span className="text-white/30 text-xs">{routine.estimatedDuration} min</span>}
                        </div>
                        <DifficultyStars value={routine.difficulty} />
                      </div>
                      <span className="text-white/30 text-lg">›</span>
                    </button>
                  ))}
                  <button
                    onClick={handleCustomSession}
                    className="flex items-center justify-center gap-2 p-4 rounded-xl border border-dashed border-white/15 hover:border-violet-500/30 text-white/40 hover:text-violet-300 transition-all"
                  >
                    <span>+</span>
                    <span className="text-sm">Custom session</span>
                  </button>
                </div>
              </Panel>
            </>
          ) : (
            <Panel>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <SectionTitle title="Log Session" />
                  <h3 className="text-white font-semibold -mt-2">
                    {isCustomSession ? "Custom Session" : selectedRoutine?.name}
                  </h3>
                </div>
                <button
                  onClick={() => { setSelectedRoutine(null); setIsCustomSession(false); }}
                  className="text-white/30 hover:text-white/60 text-sm transition-colors"
                >
                  ← Back
                </button>
              </div>

              {isCustomSession && (
                <div className="mb-4">
                  <label className="text-xs text-white/40 block mb-1.5">Session Name</label>
                  <input
                    type="text"
                    value={customSessionName}
                    onChange={(e) => setCustomSessionName(e.target.value)}
                    placeholder="e.g. Morning stretch"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-violet-500/50"
                  />
                </div>
              )}

              {selectedRoutine && (
                <div className="mb-5">
                  <label className="text-xs text-white/40 block mb-2">Exercises Completed</label>
                  <div className="space-y-2">
                    {selectedRoutine.exercises.map((ex) => (
                      <label
                        key={ex.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                          checkedExercises.has(ex.id)
                            ? "bg-violet-500/10 border-violet-500/30"
                            : "bg-white/[0.02] border-white/[0.06] hover:border-white/15"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checkedExercises.has(ex.id)}
                          onChange={() => toggleExercise(ex.id)}
                          className="w-4 h-4 accent-violet-500 rounded"
                        />
                        <div className="flex-1">
                          <p className="text-white text-sm">{ex.name}</p>
                          <p className="text-white/35 text-xs">
                            {[ex.sets ? `${ex.sets} sets` : "", ex.reps || ""].filter(Boolean).join(" × ")}
                          </p>
                        </div>
                        {checkedExercises.has(ex.id) && <span className="text-violet-400 text-sm">✓</span>}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-xs text-white/40 block mb-1.5">Duration (min)</label>
                  <input
                    type="number"
                    value={sessionDuration}
                    onChange={(e) => setSessionDuration(e.target.value)}
                    placeholder="e.g. 30"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-violet-500/50"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/40 block mb-1.5">Difficulty Felt</label>
                  <DifficultyStars value={sessionDifficulty} onChange={(v) => setSessionDifficulty(v as 1 | 2 | 3 | 4 | 5)} />
                </div>
              </div>

              <div className="mb-5">
                <label className="text-xs text-white/40 block mb-1.5">Notes</label>
                <textarea
                  value={sessionNotes}
                  onChange={(e) => setSessionNotes(e.target.value)}
                  placeholder="How did it go? Any notes..."
                  rows={2}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-violet-500/50 resize-none"
                />
              </div>

              <button
                onClick={handleSaveSession}
                className="w-full py-3 rounded-xl bg-violet-500/20 border border-violet-500/30 text-violet-300 font-medium hover:bg-violet-500/30 transition-all"
              >
                Save Session
              </button>
            </Panel>
          )}
        </div>
      )}

      {/* ROUTINES TAB */}
      {activeTab === "routines" && (
        <div className="space-y-5">
          <div className="flex justify-between items-center">
            <p className="text-white/40 text-sm">{routines.length} routine{routines.length !== 1 ? "s" : ""}</p>
            <button
              onClick={openAddRoutineForm}
              className="px-4 py-2 rounded-xl bg-violet-500/20 text-violet-300 border border-violet-500/30 text-sm font-medium hover:bg-violet-500/30 transition-all"
            >
              + Add Routine
            </button>
          </div>

          {/* Add/Edit Form */}
          {showRoutineForm && (
            <Panel className="border-violet-500/20">
              <SectionTitle title={editingRoutineId ? "Edit Routine" : "Add Routine"} />
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-white/40 block mb-1.5">Routine Name *</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Morning Mobility"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-violet-500/50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-white/40 block mb-1.5">Category</label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value as MuscleGroup)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/50"
                    >
                      {(Object.keys(MUSCLE_GROUP_LABELS) as MuscleGroup[]).map(k => (
                        <option key={k} value={k} className="bg-[#0C0F1A]">{MUSCLE_GROUP_LABELS[k]}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-white/40 block mb-1.5">Est. Duration (min)</label>
                    <input
                      type="number"
                      value={formDuration}
                      onChange={(e) => setFormDuration(e.target.value)}
                      placeholder="30"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-violet-500/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-white/40 block mb-1.5">Difficulty</label>
                  <DifficultyStars value={formDifficulty} onChange={(v) => setFormDifficulty(v as 1 | 2 | 3 | 4 | 5)} />
                </div>

                <div>
                  <label className="text-xs text-white/40 block mb-2">Exercises</label>
                  <div className="space-y-2 mb-2">
                    {formExercises.map((ex, idx) => (
                      <div key={ex.id} className="flex gap-2 items-start p-3 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                        <div className="flex-1 grid grid-cols-3 gap-2">
                          <input
                            type="text"
                            value={ex.name}
                            onChange={(e) => updateFormExercise(idx, "name", e.target.value)}
                            placeholder="Exercise name"
                            className="col-span-3 bg-white/5 border border-white/10 rounded px-2 py-1.5 text-xs text-white placeholder-white/25 focus:outline-none focus:border-violet-500/40"
                          />
                          <input
                            type="number"
                            value={ex.sets ?? ""}
                            onChange={(e) => updateFormExercise(idx, "sets", parseInt(e.target.value) || 0)}
                            placeholder="Sets"
                            className="bg-white/5 border border-white/10 rounded px-2 py-1.5 text-xs text-white placeholder-white/25 focus:outline-none focus:border-violet-500/40"
                          />
                          <input
                            type="text"
                            value={ex.reps ?? ""}
                            onChange={(e) => updateFormExercise(idx, "reps", e.target.value)}
                            placeholder="Reps"
                            className="col-span-2 bg-white/5 border border-white/10 rounded px-2 py-1.5 text-xs text-white placeholder-white/25 focus:outline-none focus:border-violet-500/40"
                          />
                        </div>
                        <button onClick={() => removeFormExercise(idx)} className="text-white/25 hover:text-red-400 text-xs mt-1 transition-colors shrink-0">✕</button>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={addFormExercise}
                    className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
                  >
                    + Add exercise
                  </button>
                </div>

                <div>
                  <label className="text-xs text-white/40 block mb-1.5">Notes</label>
                  <textarea
                    value={formRoutineNotes}
                    onChange={(e) => setFormRoutineNotes(e.target.value)}
                    placeholder="Optional notes..."
                    rows={2}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-violet-500/50 resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleSaveRoutine}
                    className="px-5 py-2 rounded-lg bg-violet-500/20 text-violet-300 border border-violet-500/30 text-sm font-medium hover:bg-violet-500/30 transition-all"
                  >
                    {editingRoutineId ? "Save Changes" : "Add Routine"}
                  </button>
                  <button
                    onClick={() => { setShowRoutineForm(false); resetRoutineForm(); }}
                    className="px-4 py-2 rounded-lg text-white/40 hover:text-white/60 text-sm transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </Panel>
          )}

          {routines.length === 0 && !showRoutineForm ? (
            <Panel className="text-center py-10">
              <p className="text-4xl mb-3">🏋️</p>
              <p className="text-white/40 text-sm">No routines yet. Add one to get started.</p>
            </Panel>
          ) : (
            <div className="space-y-3">
              {routines.map((routine) => (
                <Panel key={routine.id} hoverable>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-white font-medium">{routine.name}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${MUSCLE_GROUP_COLORS[routine.category]}`}>
                          {MUSCLE_GROUP_LABELS[routine.category]}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mb-1">
                        <DifficultyStars value={routine.difficulty} />
                        <span className="text-white/30 text-xs">{routine.exercises.length} exercises</span>
                        {routine.estimatedDuration && <span className="text-white/30 text-xs">{routine.estimatedDuration} min</span>}
                      </div>
                    </div>
                    <div className="flex gap-2 items-center">
                      <button
                        onClick={() => setExpandedRoutine(expandedRoutine === routine.id ? null : routine.id)}
                        className="text-white/30 hover:text-white/60 text-xs px-2 py-1 rounded transition-colors"
                      >
                        {expandedRoutine === routine.id ? "Hide" : "View"}
                      </button>
                      {deletingRoutineId === routine.id ? (
                        <div className="flex gap-2 items-center">
                          <span className="text-xs text-white/40">Delete?</span>
                          <button onClick={() => handleDeleteRoutine(routine.id)} className="text-xs text-red-400 hover:text-red-300">Yes</button>
                          <button onClick={() => setDeletingRoutineId(null)} className="text-xs text-white/30 hover:text-white/50">No</button>
                        </div>
                      ) : (
                        <>
                          <button onClick={() => openEditRoutineForm(routine)} className="text-white/30 hover:text-white/60 text-xs px-2 py-1 rounded transition-colors">Edit</button>
                          <button onClick={() => setDeletingRoutineId(routine.id)} className="text-white/20 hover:text-red-400 text-xs px-2 py-1 rounded transition-colors">Delete</button>
                        </>
                      )}
                    </div>
                  </div>
                  {expandedRoutine === routine.id && (
                    <div className="mt-3 pt-3 border-t border-white/[0.06] space-y-1.5">
                      {routine.exercises.map((ex) => (
                        <div key={ex.id} className="flex items-center gap-3 text-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-violet-500/60 shrink-0" />
                          <span className="text-white/70">{ex.name}</span>
                          <span className="text-white/30 text-xs ml-auto">
                            {[ex.sets ? `${ex.sets} sets` : "", ex.reps || ""].filter(Boolean).join(" × ")}
                          </span>
                        </div>
                      ))}
                      {routine.notes && <p className="text-white/30 text-xs mt-2 pt-2 border-t border-white/[0.04]">{routine.notes}</p>}
                    </div>
                  )}
                </Panel>
              ))}
            </div>
          )}
        </div>
      )}

      {/* HISTORY TAB */}
      {activeTab === "history" && (
        <div className="space-y-5">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "This Month", value: String(thisMonthSessions.length), sub: "sessions" },
              { label: "This Week", value: String(thisWeekSessions.length), sub: "sessions" },
              { label: "Most Frequent", value: mostFrequent.length > 12 ? mostFrequent.slice(0, 12) + "…" : mostFrequent, sub: "routine" },
              { label: "Avg Duration", value: avgDuration > 0 ? `${avgDuration} min` : "—", sub: "per session" },
            ].map(({ label, value, sub }) => (
              <Panel key={label}>
                <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">{label}</p>
                <p className="text-xl font-bold text-white">{value}</p>
                <p className="text-[10px] text-white/25">{sub}</p>
              </Panel>
            ))}
          </div>

          {/* Session List */}
          <Panel>
            <SectionTitle title="Past Sessions" subtitle={`${sessions.length} total`} />
            {sortedSessions.length === 0 ? (
              <p className="text-white/30 text-sm text-center py-6">No sessions logged yet. Start your first session!</p>
            ) : (
              <div className="space-y-2">
                {sortedSessions.map((session) => (
                  <div key={session.id}>
                    <button
                      onClick={() => setExpandedSession(expandedSession === session.id ? null : session.id)}
                      className="w-full flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/[0.05] hover:border-white/10 transition-all text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-left">
                          <p className="text-white text-sm font-medium">{session.routineName}</p>
                          <p className="text-white/35 text-xs">
                            {new Date(session.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {session.duration && <span className="text-white/40 text-xs">{session.duration} min</span>}
                        <DifficultyStars value={session.difficulty} />
                        <span className="text-white/25 text-xs">{expandedSession === session.id ? "▲" : "▼"}</span>
                      </div>
                    </button>
                    {expandedSession === session.id && (
                      <div className="px-3 py-3 bg-white/[0.015] rounded-b-lg border-x border-b border-white/[0.05] -mt-1 space-y-2">
                        {session.completedExercises.length > 0 && (
                          <div>
                            <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Completed</p>
                            <div className="flex flex-wrap gap-1.5">
                              {session.completedExercises.map((exId) => {
                                const routine = routines.find(r => r.id === session.routineId);
                                const ex = routine?.exercises.find(e => e.id === exId);
                                return (
                                  <span key={exId} className="px-2 py-0.5 rounded bg-violet-500/10 text-violet-300/70 text-[10px]">
                                    {ex?.name ?? exId}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        {session.notes && (
                          <div>
                            <p className="text-[10px] text-white/30 uppercase tracking-wider mb-0.5">Notes</p>
                            <p className="text-white/50 text-xs">{session.notes}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      )}
    </div>
  );
}
