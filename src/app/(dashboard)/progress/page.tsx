"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Panel from "@/components/dashboard/Panel";
import SectionTitle from "@/components/dashboard/SectionTitle";
import {
  generateTrainingProgressId,
  generateWeightId,
  loadMediaEntries,
  loadTrainingProgressEntries,
  loadWeightEntries,
  saveTrainingProgressEntries,
  saveWeightEntriesAsync,
  todayDateString,
  type MediaEntry,
  type TrainingProgressEntry,
  type TrainingProgressType,
  type WeightEntry,
} from "@/lib/progressData";
import {
  generateLogId,
  getCategoryConfig,
  getStatusConfig,
  loadSkills,
  loadSkillLogs,
  saveSkillLogs,
  saveSkills,
  type DanceSkill,
  type DanceSkillLog,
  type SkillMilestoneStatus,
} from "@/lib/danceSkillData";
import { loadConditioningRoutines, type ConditioningRoutine } from "@/lib/conditioningData";

type HistoryFilter = TrainingProgressType | "All";
type ProgressHistoryItem =
  | { source: "skill"; id: string; date: string; filters: HistoryFilter[]; log: DanceSkillLog; skill?: DanceSkill }
  | { source: "manual"; id: string; date: string; filters: HistoryFilter[]; entry: TrainingProgressEntry };

const PROGRESS_TYPES: TrainingProgressType[] = [
  "Strength",
  "Flexibility",
  "Pole trick",
  "Conditioning",
  "Endurance",
  "Balance",
  "Confidence",
  "Choreo",
  "Recovery",
  "Weight",
];

const FILTERS: HistoryFilter[] = ["All", ...PROGRESS_TYPES, "Wins"];
const FLEX_AREAS = ["Front splits", "Middle splits", "Backbend", "Shoulders", "Hips", "Hamstrings", "Active flexibility"];
const FLEX_STATUSES = ["Tight", "Improving", "Close", "Hit it", "Regressed"] as const;
const TRICK_STATUSES = ["Attempted", "Improved", "Landed once", "Landed consistently", "Cleaned up", "Mastered"] as const;
const SIDES = ["Right", "Left", "Both"] as const;

const inputClass = "w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-violet-500/40";
const textareaClass = `${inputClass} min-h-24 resize-none`;

const emptyForm = (): TrainingProgressEntry => ({
  id: generateTrainingProgressId(),
  date: todayDateString(),
  types: ["Strength"],
  strength: {},
  flexibility: {},
  poleTrick: {},
  conditioning: {},
  weight: { unit: "lbs" },
  win: {},
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

function kgFromWeight(value: number, unit: "kg" | "lbs"): number {
  return unit === "lbs" ? value / 2.2046 : value;
}

function toggleType(types: TrainingProgressType[], type: TrainingProgressType): TrainingProgressType[] {
  if (types.includes(type)) {
    const next = types.filter((item) => item !== type);
    return next.length ? next : [type];
  }
  return [...types, type];
}

function statusToSkillStatus(status: NonNullable<TrainingProgressEntry["poleTrick"]>["status"]): SkillMilestoneStatus | null {
  if (status === "Landed once") return "landed_once";
  if (status === "Landed consistently") return "consistent";
  if (status === "Mastered") return "mastered";
  if (status === "Improved" || status === "Cleaned up") return "building_consistency";
  if (status === "Attempted") return "attempting";
  return null;
}

const LANDED_STATUSES: SkillMilestoneStatus[] = ["landed_once", "building_consistency", "consistent", "mastered"];

function skillStatusOrder(status: SkillMilestoneStatus): number {
  const order: Record<SkillMilestoneStatus, number> = {
    not_started: 0,
    curious: 1,
    attempting: 2,
    close: 3,
    landed_once: 4,
    building_consistency: 5,
    consistent: 6,
    mastered: 7,
  };
  return order[status] ?? 0;
}

function isSkillLogImprovement(log: DanceSkillLog, logs: DanceSkillLog[]): boolean {
  const previous = logs
    .filter((item) => item.skillId === log.skillId && (item.date < log.date || (item.date === log.date && item.id < log.id)))
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))[0];
  return skillStatusOrder(log.outcome) > skillStatusOrder(previous?.outcome ?? "not_started");
}

function filtersForSkillLog(log: DanceSkillLog, skill?: DanceSkill, isWin = false): HistoryFilter[] {
  const filters = new Set<HistoryFilter>(["All", "Pole trick"]);
  const category = log.category ?? skill?.category;
  const tags = [...(skill?.tags ?? []), ...(log.tags ?? [])].map((tag) => tag.toLowerCase());
  if (category === "conditioning" || tags.includes("conditioning")) filters.add("Conditioning");
  if (category === "flexibility_shapes" || tags.includes("flexibility")) filters.add("Flexibility");
  if (tags.includes("strength")) filters.add("Strength");
  if (tags.includes("endurance")) filters.add("Endurance");
  if (tags.includes("balance") || ["holds", "leg_hangs", "shapes_poses"].includes(category ?? "")) filters.add("Balance");
  if (tags.includes("confidence") || (log.confidence ?? log.confidenceAfter ?? log.confidenceBefore) >= 4) filters.add("Confidence");
  if (tags.includes("choreo") || ["floorwork", "heels_technique", "freestyle", "transitions"].includes(category ?? "")) filters.add("Choreo");
  if (tags.includes("recovery")) filters.add("Recovery");
  if (isWin || log.win) filters.add("Wins");
  return [...filters];
}

function Chip({ selected, children, onClick }: { selected: boolean; children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-3 py-2 text-sm transition-colors ${
        selected
          ? "border-violet-400/40 bg-violet-500/15 text-violet-100"
          : "border-white/[0.08] bg-white/[0.03] text-white/45 hover:border-white/20 hover:text-white/70"
      }`}
    >
      {children}
    </button>
  );
}

function Scale({ value, onChange }: { value?: number; onChange: (value: number) => void }) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`h-10 rounded-xl border text-sm font-semibold ${
            value === n ? "border-violet-400/40 bg-violet-500/20 text-violet-100" : "border-white/[0.08] bg-white/[0.03] text-white/35"
          }`}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

function entrySummary(entry: TrainingProgressEntry): { improved: string; result: string; notes: string } {
  if (entry.types.includes("Pole trick")) {
    return {
      improved: entry.poleTrick?.skillName || "Pole trick",
      result: entry.poleTrick?.status || "Logged",
      notes: entry.poleTrick?.notes || entry.win?.biggestWin || "",
    };
  }
  if (entry.types.includes("Strength")) {
    return {
      improved: entry.strength?.movement || "Strength",
      result: [entry.strength?.previousLevel, entry.strength?.currentLevel].filter(Boolean).join(" -> ") || entry.strength?.metric || "Logged",
      notes: entry.strength?.notes || entry.win?.improved || "",
    };
  }
  if (entry.types.includes("Flexibility")) {
    return {
      improved: entry.flexibility?.area || "Flexibility",
      result: entry.flexibility?.status || entry.flexibility?.measurement || "Logged",
      notes: entry.flexibility?.notes || "",
    };
  }
  if (entry.types.includes("Conditioning")) {
    return {
      improved: entry.conditioning?.routineName || "Conditioning",
      result: entry.conditioning?.completed ? "Completed" : "Logged",
      notes: entry.conditioning?.notes || "",
    };
  }
  if (entry.types.includes("Weight")) {
    return {
      improved: "Weight",
      result: entry.weight?.value ? `${entry.weight.value} ${entry.weight.unit ?? ""}` : "Logged",
      notes: entry.weight?.notes || "",
    };
  }
  return {
    improved: entry.win?.improved || entry.types[0] || "Progress",
    result: entry.win?.biggestWin || "Logged",
    notes: entry.win?.nextTime || entry.win?.needsWork || "",
  };
}

export default function ProgressPage() {
  const [mounted, setMounted] = useState(false);
  const [entries, setEntries] = useState<TrainingProgressEntry[]>([]);
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const [skills, setSkills] = useState<DanceSkill[]>([]);
  const [skillLogs, setSkillLogs] = useState<DanceSkillLog[]>([]);
  const [routines, setRoutines] = useState<ConditioningRoutine[]>([]);
  const [media, setMedia] = useState<MediaEntry[]>([]);
  const [form, setForm] = useState<TrainingProgressEntry>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<HistoryFilter>("All");
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    queueMicrotask(() => {
      setEntries(loadTrainingProgressEntries());
      setWeights(loadWeightEntries());
      setSkills(loadSkills());
      setSkillLogs(loadSkillLogs());
      setRoutines(loadConditioningRoutines());
      setMedia(loadMediaEntries());
      setMounted(true);
    });
  }, []);

  const monthPrefix = todayDateString().slice(0, 7);
  const landedSkillIds = new Set([
    ...skills.filter((skill) => LANDED_STATUSES.includes(skill.currentStatus)).map((skill) => skill.id),
    ...skillLogs.filter((log) => LANDED_STATUSES.includes(log.outcome)).map((log) => log.skillId),
  ]);
  const landedCount = landedSkillIds.size;
  const strengthEntries = entries.filter((entry) => entry.types.includes("Strength"));
  const flexibilityEntries = entries.filter((entry) => entry.types.includes("Flexibility"));
  const skillWinsThisMonth = skillLogs.filter((log) => log.date.startsWith(monthPrefix) && (log.win || isSkillLogImprovement(log, skillLogs))).length;
  const monthlyWins = skillWinsThisMonth + entries.filter((entry) => entry.date.startsWith(monthPrefix) && (entry.win?.biggestWin || entry.types.includes("Wins"))).length;
  const latestWeight = [...weights].sort((a, b) => b.date.localeCompare(a.date))[0];

  const historyItems = useMemo<ProgressHistoryItem[]>(() => {
    const skillItems: ProgressHistoryItem[] = skillLogs.map((log) => {
      const skill = skills.find((item) => item.id === log.skillId);
      const improvement = isSkillLogImprovement(log, skillLogs);
      return {
        source: "skill",
        id: `skill-${log.id}`,
        date: log.date,
        filters: filtersForSkillLog(log, skill, improvement),
        log,
        skill,
      };
    });
    const manualItems: ProgressHistoryItem[] = entries.map((entry) => ({
      source: "manual",
      id: `manual-${entry.id}`,
      date: entry.date,
      filters: ["All", ...entry.types, ...(entry.win?.biggestWin || entry.win?.improved ? ["Wins" as const] : [])],
      entry,
    }));
    return [...skillItems, ...manualItems].sort((a, b) => b.date.localeCompare(a.date));
  }, [entries, skillLogs, skills]);

  const filtered = historyItems.filter((item) => item.filters.includes(filter));

  async function persist(next: TrainingProgressEntry[]) {
    await saveTrainingProgressEntries(next);
    setEntries(next);
  }

  function updateSkillFromEntry(entry: TrainingProgressEntry) {
    if (!entry.poleTrick) return;
    const nextStatus = statusToSkillStatus(entry.poleTrick.status);
    if (!nextStatus) return;
    const skillId = entry.poleTrick.skillId;
    const skillName = entry.poleTrick.skillName?.trim().toLowerCase();
    const matched = skills.find((skill) => skill.id === skillId || skill.name.toLowerCase() === skillName);
    if (!matched) return;
    const updated = skills.map((skill) => skill.id === matched.id ? { ...skill, currentStatus: nextStatus } : skill);
    setSkills(updated);
    saveSkills(updated);
  }

  function skillLogFromEntry(entry: TrainingProgressEntry): DanceSkillLog | null {
    if (!entry.poleTrick?.skillId) return null;
    const matched = skills.find((skill) => skill.id === entry.poleTrick?.skillId);
    if (!matched) return null;
    const outcome = statusToSkillStatus(entry.poleTrick.status) ?? matched.currentStatus;
    const confidence = entry.poleTrick.confidence ?? 3;
    return {
      id: generateLogId(),
      skillId: matched.id,
      skillName: matched.name,
      category: matched.category,
      date: entry.date,
      attempts: Math.max(1, entry.poleTrick.attempts ?? 1),
      confidence,
      confidenceBefore: confidence,
      confidenceAfter: confidence,
      outcome,
      attempted: true,
      notes: entry.poleTrick.notes || entry.win?.biggestWin || undefined,
      filmed: Boolean(entry.poleTrick.mediaId),
      mediaId: entry.poleTrick.mediaId,
      tags: matched.tags,
      win: Boolean(entry.win?.biggestWin || LANDED_STATUSES.includes(outcome)),
    };
  }

  async function saveEntry() {
    setIsSaving(true);
    setSaveError("");
    setSaveMessage("");
    const now = new Date().toISOString();
    const entry: TrainingProgressEntry = {
      ...form,
      id: editingId ?? form.id,
      updatedAt: now,
      createdAt: editingId ? form.createdAt : now,
      types: form.types.includes("Weight") && form.weight?.value ? form.types : form.types.filter((type) => type !== "Weight"),
    };
    const attachedSkillLog = entry.types.includes("Pole trick") ? skillLogFromEntry(entry) : null;
    const manualTypes = attachedSkillLog ? entry.types.filter((type) => type !== "Pole trick") : entry.types;
    const manualEntry = { ...entry, types: manualTypes };
    const shouldSaveManualEntry = manualEntry.types.length > 0 || Boolean(manualEntry.win?.biggestWin || manualEntry.win?.improved || manualEntry.win?.needsWork || manualEntry.win?.nextTime);
    const next = editingId
      ? shouldSaveManualEntry
        ? entries.map((item) => item.id === editingId ? manualEntry : item)
        : entries.filter((item) => item.id !== editingId)
      : shouldSaveManualEntry
        ? [manualEntry, ...entries]
        : entries;

    try {
      let nextWeights: WeightEntry[] | null = null;
      if (manualEntry.types.includes("Weight") && manualEntry.weight?.value && manualEntry.weight.unit) {
        const existingWeight = manualEntry.legacyWeightId ? weights.find((weight) => weight.id === manualEntry.legacyWeightId) : undefined;
        const weightEntry: WeightEntry = {
          id: existingWeight?.id ?? generateWeightId(),
          date: manualEntry.date,
          weightKg: Math.round(kgFromWeight(manualEntry.weight.value, manualEntry.weight.unit) * 1000) / 1000,
          notes: manualEntry.weight.notes || manualEntry.win?.biggestWin || undefined,
          createdAt: existingWeight?.createdAt ?? now,
        };
        nextWeights = existingWeight
          ? weights.map((weight) => weight.id === existingWeight.id ? weightEntry : weight)
          : [...weights, weightEntry];
      }

      await saveTrainingProgressEntries(next);
      if (attachedSkillLog) {
        const nextSkillLogs = [attachedSkillLog, ...skillLogs];
        saveSkillLogs(nextSkillLogs);
        setSkillLogs(nextSkillLogs);
        updateSkillFromEntry(entry);
      }
      if (nextWeights) {
        await saveWeightEntriesAsync(nextWeights);
        setWeights(nextWeights);
      }

      setEntries(next);
      setEditingId(null);
      setForm(emptyForm());
      setSaveMessage(attachedSkillLog ? "Skill log saved to Skills Library." : "Progress entry saved.");
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Progress entry could not be saved. Your form data is still here.");
    } finally {
      setIsSaving(false);
    }
  }

  function editEntry(entry: TrainingProgressEntry) {
    setEditingId(entry.id);
    setForm({
      ...emptyForm(),
      ...entry,
      strength: { ...entry.strength },
      flexibility: { ...entry.flexibility },
      poleTrick: { ...entry.poleTrick },
      conditioning: { ...entry.conditioning },
      weight: { unit: "lbs", ...entry.weight },
      win: { ...entry.win },
    });
  }

  function deleteEntry(id: string) {
    void persist(entries.filter((entry) => entry.id !== id));
    if (editingId === id) {
      setEditingId(null);
      setForm(emptyForm());
    }
  }

  if (!mounted) return null;

  return (
    <div className="max-w-6xl space-y-5">
      <div className="border-b border-white/[0.06] pb-3">
        <h1 className="text-2xl font-semibold text-white">Progress</h1>
        <p className="mt-0.5 text-[12px] text-white/30">
          Track strength, flexibility, tricks landed, conditioning wins, and optional weight notes.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: "Skills Landed", value: landedCount, sub: "from skill logs", color: "text-violet-300" },
          { label: "Strength Progress", value: strengthEntries.length || "No entries yet", sub: strengthEntries[0]?.strength?.movement ?? "manual strength logs", color: "text-emerald-300" },
          { label: "Flexibility Progress", value: flexibilityEntries.length || "No entries yet", sub: flexibilityEntries[0]?.flexibility?.area ?? "manual flexibility logs", color: "text-pink-300" },
          { label: "Training Wins", value: monthlyWins, sub: "this month", color: "text-amber-300" },
          { label: "Weight", value: latestWeight ? `${Math.round(latestWeight.weightKg * 2.2046 * 10) / 10} lbs` : "-", sub: latestWeight?.date ?? "optional", color: "text-sky-300", hidden: !latestWeight },
        ].filter((card) => !card.hidden).map((card) => (
          <Panel key={card.label}>
            <p className="text-[10px] uppercase tracking-widest text-white/25">{card.label}</p>
            <p className={`mt-1 text-2xl font-bold tabular-nums ${card.color}`}>{card.value}</p>
            <p className="mt-1 truncate text-[11px] text-white/30">{card.sub}</p>
          </Panel>
        ))}
      </div>

      <Panel>
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <SectionTitle title={editingId ? "Edit Progress Entry" : "Log Non-Skill Progress"} subtitle="Attach to a skill only when this belongs in Skills Library too." />
          <input type="date" className={`${inputClass} sm:max-w-48`} value={form.date} onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))} />
        </div>

        <div className="space-y-6">
          <section>
            <p className="mb-2 text-sm font-medium text-white/70">Progress Type</p>
            <div className="flex flex-wrap gap-2">
              {PROGRESS_TYPES.map((type) => (
                <Chip key={type} selected={form.types.includes(type)} onClick={() => setForm((prev) => ({ ...prev, types: toggleType(prev.types, type) }))}>
                  {type}
                </Chip>
              ))}
            </div>
          </section>

          {form.types.includes("Strength") && (
            <section className="rounded-2xl border border-emerald-500/10 bg-emerald-500/[0.04] p-4">
              <SectionTitle title="Strength Progress" />
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <input className={inputClass} placeholder="Exercise or movement" value={form.strength?.movement ?? ""} onChange={(event) => setForm((prev) => ({ ...prev, strength: { ...prev.strength, movement: event.target.value } }))} />
                <input className={inputClass} placeholder="Reps / hold time / weight" value={form.strength?.metric ?? ""} onChange={(event) => setForm((prev) => ({ ...prev, strength: { ...prev.strength, metric: event.target.value } }))} />
                <input className={inputClass} placeholder="Previous level optional" value={form.strength?.previousLevel ?? ""} onChange={(event) => setForm((prev) => ({ ...prev, strength: { ...prev.strength, previousLevel: event.target.value } }))} />
                <input className={inputClass} placeholder="Current level" value={form.strength?.currentLevel ?? ""} onChange={(event) => setForm((prev) => ({ ...prev, strength: { ...prev.strength, currentLevel: event.target.value } }))} />
                <textarea className={`${textareaClass} md:col-span-2`} placeholder="Strength notes" value={form.strength?.notes ?? ""} onChange={(event) => setForm((prev) => ({ ...prev, strength: { ...prev.strength, notes: event.target.value } }))} />
              </div>
            </section>
          )}

          {form.types.includes("Flexibility") && (
            <section className="rounded-2xl border border-pink-500/10 bg-pink-500/[0.04] p-4">
              <SectionTitle title="Flexibility Progress" />
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <select className={inputClass} value={form.flexibility?.area ?? ""} onChange={(event) => setForm((prev) => ({ ...prev, flexibility: { ...prev.flexibility, area: event.target.value } }))}>
                  <option value="">Area</option>
                  {FLEX_AREAS.map((area) => <option key={area}>{area}</option>)}
                </select>
                <select className={inputClass} value={form.flexibility?.status ?? ""} onChange={(event) => setForm((prev) => ({ ...prev, flexibility: { ...prev.flexibility, status: event.target.value as NonNullable<TrainingProgressEntry["flexibility"]>["status"] } }))}>
                  <option value="">Current status</option>
                  {FLEX_STATUSES.map((status) => <option key={status}>{status}</option>)}
                </select>
                <input className={inputClass} placeholder="Measurement optional" value={form.flexibility?.measurement ?? ""} onChange={(event) => setForm((prev) => ({ ...prev, flexibility: { ...prev.flexibility, measurement: event.target.value } }))} />
                <textarea className={`${textareaClass} md:col-span-2`} placeholder="Flexibility notes" value={form.flexibility?.notes ?? ""} onChange={(event) => setForm((prev) => ({ ...prev, flexibility: { ...prev.flexibility, notes: event.target.value } }))} />
              </div>
            </section>
          )}

          {form.types.includes("Pole trick") && (
            <section className="rounded-2xl border border-violet-500/10 bg-violet-500/[0.04] p-4">
              <SectionTitle title="Attach to Skill" subtitle="Selected skills save as Skills Library log entries." />
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <select
                  className={inputClass}
                  value={form.poleTrick?.skillId ?? ""}
                  onChange={(event) => {
                    const skill = skills.find((item) => item.id === event.target.value);
                    setForm((prev) => ({ ...prev, poleTrick: { ...prev.poleTrick, skillId: skill?.id, skillName: skill?.name ?? prev.poleTrick?.skillName, attempts: skill ? (prev.poleTrick?.attempts ?? 1) : undefined, confidence: skill ? (prev.poleTrick?.confidence ?? 3) : undefined } }));
                  }}
                >
                  <option value="">No skill attached</option>
                  {skills.map((skill) => <option key={skill.id} value={skill.id}>{skill.name}</option>)}
                </select>
                <input className={inputClass} placeholder="General trick note optional" value={form.poleTrick?.skillName ?? ""} onChange={(event) => setForm((prev) => ({ ...prev, poleTrick: { ...prev.poleTrick, skillName: event.target.value } }))} />
                {form.poleTrick?.skillId && (
                  <>
                    <input type="number" min={1} className={inputClass} placeholder="Attempts" value={form.poleTrick?.attempts ?? ""} onChange={(event) => setForm((prev) => ({ ...prev, poleTrick: { ...prev.poleTrick, attempts: Math.max(1, Number(event.target.value) || 1) } }))} />
                    <select className={inputClass} value={form.poleTrick?.status ?? ""} onChange={(event) => setForm((prev) => ({ ...prev, poleTrick: { ...prev.poleTrick, status: event.target.value as NonNullable<TrainingProgressEntry["poleTrick"]>["status"] } }))}>
                      <option value="">Status</option>
                      {TRICK_STATUSES.map((status) => <option key={status}>{status}</option>)}
                    </select>
                    <select className={inputClass} value={form.poleTrick?.side ?? ""} onChange={(event) => setForm((prev) => ({ ...prev, poleTrick: { ...prev.poleTrick, side: event.target.value as NonNullable<TrainingProgressEntry["poleTrick"]>["side"] } }))}>
                      <option value="">Side</option>
                      {SIDES.map((side) => <option key={side}>{side}</option>)}
                    </select>
                    <div>
                      <p className="mb-2 text-sm text-white/60">Confidence</p>
                      <Scale value={form.poleTrick?.confidence} onChange={(confidence) => setForm((prev) => ({ ...prev, poleTrick: { ...prev.poleTrick, confidence } }))} />
                    </div>
                    <div className="flex flex-col gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
                      <label className="flex items-center gap-2 text-sm text-white/60">
                        <input type="checkbox" checked={form.poleTrick?.spottingNeeded ?? false} onChange={(event) => setForm((prev) => ({ ...prev, poleTrick: { ...prev.poleTrick, spottingNeeded: event.target.checked } }))} />
                        Spotting needed
                      </label>
                      <p className="text-[12px] text-white/35">Choosing a skill saves this as a Skills Library log and updates the skill milestone.</p>
                    </div>
                  </>
                )}
                <select className={inputClass} value={form.poleTrick?.mediaId ?? ""} onChange={(event) => setForm((prev) => ({ ...prev, poleTrick: { ...prev.poleTrick, mediaId: event.target.value || undefined } }))}>
                  <option value="">Optional media link</option>
                  {media.map((entry) => <option key={entry.id} value={entry.id}>{entry.date} - {entry.title}</option>)}
                </select>
                <textarea className={`${textareaClass} md:col-span-2`} placeholder="Pole trick notes" value={form.poleTrick?.notes ?? ""} onChange={(event) => setForm((prev) => ({ ...prev, poleTrick: { ...prev.poleTrick, notes: event.target.value } }))} />
              </div>
            </section>
          )}

          {form.types.includes("Conditioning") && (
            <section className="rounded-2xl border border-sky-500/10 bg-sky-500/[0.04] p-4">
              <SectionTitle title="Conditioning Progress" />
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <select className={inputClass} value={form.conditioning?.routineId ?? ""} onChange={(event) => {
                  const routine = routines.find((item) => item.id === event.target.value);
                  setForm((prev) => ({ ...prev, conditioning: { ...prev.conditioning, routineId: routine?.id, routineName: routine?.name ?? prev.conditioning?.routineName } }));
                }}>
                  <option value="">Choose routine or type below</option>
                  {routines.map((routine) => <option key={routine.id} value={routine.id}>{routine.name}</option>)}
                </select>
                <input className={inputClass} placeholder="Routine/exercise name" value={form.conditioning?.routineName ?? ""} onChange={(event) => setForm((prev) => ({ ...prev, conditioning: { ...prev.conditioning, routineName: event.target.value } }))} />
                <label className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white/60">
                  <input type="checkbox" checked={form.conditioning?.completed ?? false} onChange={(event) => setForm((prev) => ({ ...prev, conditioning: { ...prev.conditioning, completed: event.target.checked } }))} />
                  Completed
                </label>
                <div>
                  <p className="mb-2 text-sm text-white/60">Difficulty</p>
                  <Scale value={form.conditioning?.difficulty} onChange={(difficulty) => setForm((prev) => ({ ...prev, conditioning: { ...prev.conditioning, difficulty } }))} />
                </div>
                <textarea className={`${textareaClass} md:col-span-2`} placeholder="Conditioning notes" value={form.conditioning?.notes ?? ""} onChange={(event) => setForm((prev) => ({ ...prev, conditioning: { ...prev.conditioning, notes: event.target.value } }))} />
              </div>
            </section>
          )}

          {form.types.includes("Weight") && (
            <section className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
              <SectionTitle title="Weight Tracking" subtitle="Optional" />
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <input type="number" step="0.1" className={inputClass} placeholder="Weight" value={form.weight?.value ?? ""} onChange={(event) => setForm((prev) => ({ ...prev, weight: { ...prev.weight, value: Number(event.target.value), unit: prev.weight?.unit ?? "lbs" } }))} />
                <select className={inputClass} value={form.weight?.unit ?? "lbs"} onChange={(event) => setForm((prev) => ({ ...prev, weight: { ...prev.weight, unit: event.target.value as "lbs" | "kg" } }))}>
                  <option value="lbs">lbs</option>
                  <option value="kg">kg</option>
                </select>
                <input className={inputClass} placeholder="Weight notes optional" value={form.weight?.notes ?? ""} onChange={(event) => setForm((prev) => ({ ...prev, weight: { ...prev.weight, notes: event.target.value } }))} />
              </div>
            </section>
          )}

          <section className="rounded-2xl border border-amber-500/10 bg-amber-500/[0.04] p-4">
            <SectionTitle title="Win / Reflection" />
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <input className={inputClass} placeholder="Biggest win today" value={form.win?.biggestWin ?? ""} onChange={(event) => setForm((prev) => ({ ...prev, win: { ...prev.win, biggestWin: event.target.value } }))} />
              <input className={inputClass} placeholder="What improved?" value={form.win?.improved ?? ""} onChange={(event) => setForm((prev) => ({ ...prev, win: { ...prev.win, improved: event.target.value } }))} />
              <input className={inputClass} placeholder="What still needs work?" value={form.win?.needsWork ?? ""} onChange={(event) => setForm((prev) => ({ ...prev, win: { ...prev.win, needsWork: event.target.value } }))} />
              <input className={inputClass} placeholder="Notes for next time" value={form.win?.nextTime ?? ""} onChange={(event) => setForm((prev) => ({ ...prev, win: { ...prev.win, nextTime: event.target.value } }))} />
            </div>
          </section>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={saveEntry}
            disabled={isSaving}
            className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? "Saving..." : editingId ? "Save Entry" : "Add Entry"}
          </button>
          {editingId && (
            <button type="button" onClick={() => { setEditingId(null); setForm(emptyForm()); }} className="rounded-xl border border-white/[0.08] px-4 py-2.5 text-sm text-white/45 hover:text-white">
              Cancel
            </button>
          )}
          {saveMessage && <span className="text-sm text-emerald-300">{saveMessage}</span>}
          {saveError && <span className="text-sm text-red-300">{saveError}</span>}
        </div>
      </Panel>

      <Panel>
        <div className="mb-4 flex flex-col gap-3">
          <SectionTitle title="Progress History" subtitle="Strength, flexibility, tricks, conditioning, wins, and optional weight" />
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((item) => (
              <Chip key={item} selected={filter === item} onClick={() => setFilter(item)}>
                {item === "Pole trick" ? "Pole tricks" : item}
              </Chip>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/[0.08] p-6 text-center text-sm text-white/30">
            No progress entries for this filter yet.
          </p>
        ) : (
          <div className="space-y-3">
            {filtered.map((item) => {
              if (item.source === "skill") {
                const skill = item.skill;
                const log = item.log;
                const category = log.category ?? skill?.category;
                const categoryLabel = category ? getCategoryConfig(category).label : "Skill";
                const status = getStatusConfig(log.outcome);
                const confidence = log.confidence ?? log.confidenceAfter ?? log.confidenceBefore;
                const linkedMedia = log.mediaId ? media.find((mediaEntry) => mediaEntry.id === log.mediaId) : null;
                return (
                  <div key={item.id} className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-white">{log.skillName ?? skill?.name ?? "Skill log"}</p>
                          <span className="rounded-full border border-violet-400/20 bg-violet-500/10 px-2 py-0.5 text-[10px] text-violet-200">Skills Library</span>
                          <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[10px] text-white/45">{categoryLabel}</span>
                        </div>
                        <p className="mt-1 text-[12px] text-white/35">{log.date}</p>
                      </div>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-4">
                      <div className="rounded-xl bg-black/15 p-3">
                        <p className="text-[10px] uppercase tracking-widest text-white/25">Confidence</p>
                        <p className="mt-1 text-sm text-white/70">{confidence}/5</p>
                      </div>
                      <div className="rounded-xl bg-black/15 p-3">
                        <p className="text-[10px] uppercase tracking-widest text-white/25">Status</p>
                        <p className="mt-1 text-sm text-white/70">{status.label}</p>
                      </div>
                      <div className="rounded-xl bg-black/15 p-3">
                        <p className="text-[10px] uppercase tracking-widest text-white/25">Attempts</p>
                        <p className="mt-1 text-sm text-white/70">{log.attempts ?? (log.attempted ? 1 : 0)}</p>
                      </div>
                      <div className="rounded-xl bg-black/15 p-3">
                        <p className="text-[10px] uppercase tracking-widest text-white/25">Notes</p>
                        <p className="mt-1 text-sm text-white/70">{log.notes || "-"}</p>
                      </div>
                    </div>
                    {linkedMedia && (
                      <p className="mt-3 text-[12px] text-sky-300">Linked media: {linkedMedia.title}</p>
                    )}
                  </div>
                );
              }
              const entry = item.entry;
              const summary = entrySummary(entry);
              const linkedMedia = entry.poleTrick?.mediaId ? media.find((mediaEntry) => mediaEntry.id === entry.poleTrick?.mediaId) : null;
              return (
                <div key={item.id} className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-white">{summary.improved}</p>
                        {entry.types.map((type) => (
                          <span key={type} className="rounded-full border border-violet-400/20 bg-violet-500/10 px-2 py-0.5 text-[10px] text-violet-200">{type}</span>
                        ))}
                      </div>
                      <p className="mt-1 text-[12px] text-white/35">{entry.date}</p>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => editEntry(entry)} className="rounded-lg border border-white/[0.08] px-3 py-1.5 text-[12px] text-white/45 hover:text-white">Edit</button>
                      <button type="button" onClick={() => deleteEntry(entry.id)} className="rounded-lg border border-red-500/20 px-3 py-1.5 text-[12px] text-red-300/70 hover:text-red-300">Delete</button>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    <div className="rounded-xl bg-black/15 p-3">
                      <p className="text-[10px] uppercase tracking-widest text-white/25">What improved</p>
                      <p className="mt-1 text-sm text-white/70">{summary.improved}</p>
                    </div>
                    <div className="rounded-xl bg-black/15 p-3">
                      <p className="text-[10px] uppercase tracking-widest text-white/25">Status / result</p>
                      <p className="mt-1 text-sm text-white/70">{summary.result}</p>
                    </div>
                    <div className="rounded-xl bg-black/15 p-3">
                      <p className="text-[10px] uppercase tracking-widest text-white/25">Notes</p>
                      <p className="mt-1 text-sm text-white/70">{summary.notes || entry.win?.biggestWin || "-"}</p>
                    </div>
                  </div>
                  {linkedMedia && (
                    <p className="mt-3 text-[12px] text-sky-300">Linked media: {linkedMedia.title}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
}
