"use client";

import { useState, useEffect } from "react";
import Panel from "@/components/dashboard/Panel";
import SectionTitle from "@/components/dashboard/SectionTitle";
import {
  loadMedications, saveMedications,
  loadMedicationLogs, saveMedicationLogs,
  getTodayLogs, getLogsForDate,
  generateMedicationId, generateLogId,
  todayDateString,
  Medication, MedicationLog,
} from "@/lib/medicationData";

const MEDICATION_COLORS = [
  "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b",
  "#f43f5e", "#0ea5e9", "#a78bfa", "#34d399",
];

function formatTime12(time24: string): string {
  const [h, m] = time24.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}

function getLastNDays(n: number): string[] {
  const days: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`);
  }
  return days;
}

type Tab = "today" | "medications";

interface TimeNoteState {
  [key: string]: boolean; // medicationId-scheduledTime -> show note input
}

interface NoteInputState {
  [key: string]: string; // medicationId-scheduledTime -> note text
}

export default function MedicationPage() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("today");
  const [medications, setMedications] = useState<Medication[]>([]);
  const [logs, setLogs] = useState<MedicationLog[]>([]);

  // Form state for add/edit
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formDosage, setFormDosage] = useState("");
  const [formTimes, setFormTimes] = useState<string[]>(["08:00"]);
  const [formNotes, setFormNotes] = useState("");
  const [formColor, setFormColor] = useState(MEDICATION_COLORS[0]);
  const [formActive, setFormActive] = useState(true);

  // Note inputs for today's log
  const [showNoteInput, setShowNoteInput] = useState<TimeNoteState>({});
  const [noteInputs, setNoteInputs] = useState<NoteInputState>({});

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    setMedications(loadMedications());
    setLogs(loadMedicationLogs());
  }, []);

  if (!mounted) return null;

  const today = todayDateString();
  const displayDate = new Date(today + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });
  const todayLogs = getTodayLogs(logs);
  const activeMeds = medications.filter((m) => m.active);

  function getLogForSlot(medicationId: string, scheduledTime: string): MedicationLog | undefined {
    return todayLogs.find((l) => l.medicationId === medicationId && l.scheduledTime === scheduledTime);
  }

  function markTaken(medication: Medication, scheduledTime: string) {
    const key = `${medication.id}-${scheduledTime}`;
    const newLog: MedicationLog = {
      id: generateLogId(),
      medicationId: medication.id,
      date: today,
      scheduledTime,
      taken: true,
      takenAt: new Date().toISOString(),
      notes: noteInputs[key] || undefined,
    };
    const updated = [...logs.filter(l => !(l.medicationId === medication.id && l.scheduledTime === scheduledTime && l.date === today)), newLog];
    setLogs(updated);
    saveMedicationLogs(updated);
  }

  function markUntaken(medication: Medication, scheduledTime: string) {
    const updated = logs.filter(l => !(l.medicationId === medication.id && l.scheduledTime === scheduledTime && l.date === today));
    setLogs(updated);
    saveMedicationLogs(updated);
  }

  function getMedStatus(med: Medication): { taken: number; total: number } {
    const total = med.scheduledTimes.length;
    const taken = med.scheduledTimes.filter(t => getLogForSlot(med.id, t)?.taken).length;
    return { taken, total };
  }

  function toggleNoteInput(key: string) {
    setShowNoteInput(prev => ({ ...prev, [key]: !prev[key] }));
  }

  function resetForm() {
    setFormName("");
    setFormDosage("");
    setFormTimes(["08:00"]);
    setFormNotes("");
    setFormColor(MEDICATION_COLORS[0]);
    setFormActive(true);
    setEditingId(null);
  }

  function openAddForm() {
    resetForm();
    setShowForm(true);
  }

  function openEditForm(med: Medication) {
    setFormName(med.name);
    setFormDosage(med.dosage);
    setFormTimes([...med.scheduledTimes]);
    setFormNotes(med.notes || "");
    setFormColor(med.color || MEDICATION_COLORS[0]);
    setFormActive(med.active);
    setEditingId(med.id);
    setShowForm(true);
  }

  function handleSaveMed() {
    if (!formName.trim() || !formDosage.trim()) return;
    if (editingId) {
      const updated = medications.map((m) =>
        m.id === editingId
          ? { ...m, name: formName.trim(), dosage: formDosage.trim(), scheduledTimes: formTimes.filter(Boolean), notes: formNotes.trim() || undefined, color: formColor, active: formActive }
          : m
      );
      setMedications(updated);
      saveMedications(updated);
    } else {
      const newMed: Medication = {
        id: generateMedicationId(),
        name: formName.trim(),
        dosage: formDosage.trim(),
        scheduledTimes: formTimes.filter(Boolean),
        notes: formNotes.trim() || undefined,
        color: formColor,
        active: formActive,
        createdAt: new Date().toISOString(),
      };
      const updated = [...medications, newMed];
      setMedications(updated);
      saveMedications(updated);
    }
    setShowForm(false);
    resetForm();
  }

  function handleDeleteMed(id: string) {
    const updated = medications.filter((m) => m.id !== id);
    setMedications(updated);
    saveMedications(updated);
    setDeletingId(null);
  }

  function addTimeSlot() {
    setFormTimes(prev => [...prev, "12:00"]);
  }

  function removeTimeSlot(idx: number) {
    setFormTimes(prev => prev.filter((_, i) => i !== idx));
  }

  function updateTimeSlot(idx: number, value: string) {
    setFormTimes(prev => prev.map((t, i) => i === idx ? value : t));
  }

  // Adherence calculation
  const last7Days = getLastNDays(7);
  const last30Days = getLastNDays(30);

  function getDayAdherence(date: string): "all" | "partial" | "missed" | "none" {
    if (activeMeds.length === 0) return "none";
    const dayLogs = getLogsForDate(logs, date);
    let total = 0;
    let taken = 0;
    activeMeds.forEach(med => {
      med.scheduledTimes.forEach(t => {
        total++;
        if (dayLogs.find(l => l.medicationId === med.id && l.scheduledTime === t && l.taken)) taken++;
      });
    });
    if (total === 0) return "none";
    if (taken === total) return "all";
    if (taken > 0) return "partial";
    return "missed";
  }

  const adherence30 = last30Days.reduce((acc, date) => {
    if (activeMeds.length === 0) return acc;
    const dayLogs = getLogsForDate(logs, date);
    let total = 0;
    let taken = 0;
    activeMeds.forEach(med => {
      med.scheduledTimes.forEach(t => {
        total++;
        if (dayLogs.find(l => l.medicationId === med.id && l.scheduledTime === t && l.taken)) taken++;
      });
    });
    return { total: acc.total + total, taken: acc.taken + taken };
  }, { total: 0, taken: 0 });

  const adherencePct = adherence30.total > 0
    ? Math.round((adherence30.taken / adherence30.total) * 100)
    : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">💊 Medication</h1>
        <p className="text-white/40 text-sm mt-0.5">{displayDate}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-white/[0.03] rounded-xl border border-white/[0.06] w-fit">
        {(["today", "medications"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab
                ? "bg-violet-500/20 text-violet-300 border border-violet-500/30"
                : "text-white/40 hover:text-white/60"
            }`}
          >
            {tab === "today" ? "Today" : "Medications"}
          </button>
        ))}
      </div>

      {/* TODAY TAB */}
      {activeTab === "today" && (
        <div className="space-y-5">
          {activeMeds.length === 0 ? (
            <Panel className="text-center py-10">
              <p className="text-4xl mb-3">💊</p>
              <p className="text-white/60 mb-4">No medications added yet</p>
              <button
                onClick={() => { setActiveTab("medications"); openAddForm(); }}
                className="px-5 py-2.5 rounded-xl bg-violet-500/20 text-violet-300 border border-violet-500/30 text-sm font-medium hover:bg-violet-500/30 transition-all"
              >
                Add your first medication →
              </button>
            </Panel>
          ) : (
            activeMeds.map((med) => {
              const { taken, total } = getMedStatus(med);
              const allDone = taken === total;
              return (
                <Panel key={med.id}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full shrink-0 mt-0.5"
                        style={{ backgroundColor: med.color || MEDICATION_COLORS[0] }}
                      />
                      <div>
                        <h3 className="text-white font-semibold">{med.name}</h3>
                        <p className="text-white/40 text-sm">{med.dosage}</p>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      allDone ? "bg-green-500/20 text-green-400 border border-green-500/30" :
                      taken > 0 ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30" :
                      "bg-white/5 text-white/40 border border-white/10"
                    }`}>
                      {allDone ? "All done ✓" : taken > 0 ? `${taken} of ${total} taken` : "Pending"}
                    </span>
                  </div>
                  <div className="space-y-2.5">
                    {med.scheduledTimes.map((scheduledTime) => {
                      const log = getLogForSlot(med.id, scheduledTime);
                      const key = `${med.id}-${scheduledTime}`;
                      const isTaken = log?.taken ?? false;
                      return (
                        <div key={scheduledTime} className="space-y-1.5">
                          <div className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                            <span className="text-white/60 text-sm font-medium">{formatTime12(scheduledTime)}</span>
                            <div className="flex items-center gap-2">
                              {!isTaken ? (
                                <>
                                  <button
                                    onClick={() => toggleNoteInput(key)}
                                    className="text-white/30 hover:text-white/50 text-xs transition-colors"
                                  >
                                    Add note
                                  </button>
                                  <button
                                    onClick={() => markTaken(med, scheduledTime)}
                                    className="px-3 py-1.5 rounded-lg bg-green-500/15 border border-green-500/25 text-green-400 text-xs font-medium hover:bg-green-500/25 transition-all"
                                  >
                                    ✓ Mark taken
                                  </button>
                                </>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span className="text-green-400 text-xs">
                                    ✅ Taken {log?.takenAt ? `at ${new Date(log.takenAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}` : ""}
                                  </span>
                                  <button
                                    onClick={() => markUntaken(med, scheduledTime)}
                                    className="text-white/20 hover:text-white/40 text-xs transition-colors"
                                  >
                                    undo
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                          {showNoteInput[key] && !isTaken && (
                            <div className="flex gap-2 pl-3">
                              <input
                                type="text"
                                value={noteInputs[key] || ""}
                                onChange={(e) => setNoteInputs(prev => ({ ...prev, [key]: e.target.value }))}
                                placeholder="Side effects or notes..."
                                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-white/25 focus:outline-none focus:border-violet-500/40"
                              />
                            </div>
                          )}
                          {isTaken && log?.notes && (
                            <p className="text-white/30 text-xs pl-3">Note: {log.notes}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </Panel>
              );
            })
          )}

          {/* Adherence Section */}
          {activeMeds.length > 0 && (
            <Panel>
              <SectionTitle title="Last 7 Days Adherence" subtitle={`${adherencePct}% over 30 days`} />
              <div className="flex gap-2 mb-3">
                {last7Days.map((date) => {
                  const status = getDayAdherence(date);
                  const isToday = date === today;
                  return (
                    <div key={date} className="flex flex-col items-center gap-1.5 flex-1">
                      <div
                        className={`w-full h-8 rounded-lg border transition-all
                          ${status === "all" ? "bg-green-500/25 border-green-500/40" :
                            status === "partial" ? "bg-yellow-500/20 border-yellow-500/35" :
                            status === "missed" ? "bg-red-500/15 border-red-500/25" :
                            "bg-white/5 border-white/10"}
                          ${isToday ? "ring-1 ring-violet-400/50" : ""}`}
                      />
                      <span className="text-[9px] text-white/30">
                        {new Date(date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short" })}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-4 text-[10px] text-white/30">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-green-500/50 inline-block" />All taken</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-yellow-500/50 inline-block" />Partial</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-red-500/40 inline-block" />Missed</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-white/15 inline-block" />No meds</span>
              </div>
            </Panel>
          )}
        </div>
      )}

      {/* MEDICATIONS TAB */}
      {activeTab === "medications" && (
        <div className="space-y-5">
          <div className="flex justify-between items-center">
            <p className="text-white/40 text-sm">{medications.length} medication{medications.length !== 1 ? "s" : ""}</p>
            <button
              onClick={openAddForm}
              className="px-4 py-2 rounded-xl bg-violet-500/20 text-violet-300 border border-violet-500/30 text-sm font-medium hover:bg-violet-500/30 transition-all"
            >
              + Add Medication
            </button>
          </div>

          {/* Add/Edit Form */}
          {showForm && (
            <Panel className="border-violet-500/20">
              <SectionTitle title={editingId ? "Edit Medication" : "Add Medication"} />
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-white/40 block mb-1.5">Name *</label>
                    <input
                      type="text"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g. Vitamin D"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-violet-500/50"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-white/40 block mb-1.5">Dosage *</label>
                    <input
                      type="text"
                      value={formDosage}
                      onChange={(e) => setFormDosage(e.target.value)}
                      placeholder="e.g. 1000 IU"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-violet-500/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-white/40 block mb-1.5">Scheduled Times</label>
                  <div className="space-y-2">
                    {formTimes.map((t, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <input
                          type="time"
                          value={t}
                          onChange={(e) => updateTimeSlot(idx, e.target.value)}
                          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/50"
                        />
                        {formTimes.length > 1 && (
                          <button onClick={() => removeTimeSlot(idx)} className="text-white/30 hover:text-red-400 text-sm transition-colors">✕</button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={addTimeSlot}
                      className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
                    >
                      + Add time slot
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-white/40 block mb-1.5">Color</label>
                  <div className="flex gap-2">
                    {MEDICATION_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => setFormColor(color)}
                        className={`w-6 h-6 rounded-full transition-all ${formColor === color ? "ring-2 ring-white/50 ring-offset-1 ring-offset-[#0C0F1A]" : ""}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-white/40 block mb-1.5">Notes</label>
                  <textarea
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder="Optional notes..."
                    rows={2}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-violet-500/50 resize-none"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <label className="text-xs text-white/40">Active</label>
                  <button
                    onClick={() => setFormActive(!formActive)}
                    className={`w-10 h-5 rounded-full transition-all relative ${formActive ? "bg-violet-500" : "bg-white/10"}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${formActive ? "left-5" : "left-0.5"}`} />
                  </button>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleSaveMed}
                    className="px-5 py-2 rounded-lg bg-violet-500/20 text-violet-300 border border-violet-500/30 text-sm font-medium hover:bg-violet-500/30 transition-all"
                  >
                    {editingId ? "Save Changes" : "Add Medication"}
                  </button>
                  <button
                    onClick={() => { setShowForm(false); resetForm(); }}
                    className="px-4 py-2 rounded-lg text-white/40 hover:text-white/60 text-sm transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </Panel>
          )}

          {medications.length === 0 && !showForm ? (
            <Panel className="text-center py-10">
              <p className="text-4xl mb-3">💊</p>
              <p className="text-white/40 text-sm">No medications yet. Add one to get started.</p>
            </Panel>
          ) : (
            <div className="space-y-3">
              {medications.map((med) => (
                <Panel key={med.id} hoverable>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full shrink-0 mt-0.5" style={{ backgroundColor: med.color || MEDICATION_COLORS[0] }} />
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-white font-medium">{med.name}</h3>
                          {!med.active && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] bg-white/5 text-white/25">inactive</span>
                          )}
                        </div>
                        <p className="text-white/40 text-sm">{med.dosage}</p>
                        <p className="text-white/25 text-xs mt-0.5">{med.scheduledTimes.map(formatTime12).join(", ")}</p>
                        {med.notes && <p className="text-white/30 text-xs mt-1">{med.notes}</p>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {deletingId === med.id ? (
                        <div className="flex gap-2 items-center">
                          <span className="text-xs text-white/40">Delete?</span>
                          <button onClick={() => handleDeleteMed(med.id)} className="text-xs text-red-400 hover:text-red-300">Yes</button>
                          <button onClick={() => setDeletingId(null)} className="text-xs text-white/30 hover:text-white/50">No</button>
                        </div>
                      ) : (
                        <>
                          <button onClick={() => openEditForm(med)} className="text-white/30 hover:text-white/60 text-xs px-2 py-1 rounded transition-colors">Edit</button>
                          <button onClick={() => setDeletingId(med.id)} className="text-white/20 hover:text-red-400 text-xs px-2 py-1 rounded transition-colors">Delete</button>
                        </>
                      )}
                    </div>
                  </div>
                </Panel>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
