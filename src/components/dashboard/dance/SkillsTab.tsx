"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import Panel from "@/components/dashboard/Panel";
import SectionTitle from "@/components/dashboard/SectionTitle";
import {
  SKILL_CATEGORIES, MILESTONE_STATUSES,
  type DanceSkill, type DanceSkillLog, type SkillMilestoneStatus, type SkillCategory,
  getLogsForSkill, getAttemptedLogs, getAvgConfidence, getConfidenceTrend,
  getDaysSinceLastAttempt, getMostPracticedSkill, getHighestConfidenceSkill,
  getLowestConfidenceSkill, getMostImprovedSkill, getSkillsReadyToLevel,
  getStatusConfig, getCategoryConfig, generateSkillId, generateLogId, todayISODate,
  getAllCategoryStats, getMostPracticedCategory, getHighestConfidenceCategory,
  getLowestConfidenceCategory, getCategoryWithMostLanded, getCategoryWithMostInProgress,
} from "@/lib/danceSkillData";

// ── Shared small components ───────────────────────────────────────────────────

function StatusBadge({ status }: { status: SkillMilestoneStatus }) {
  const cfg = getStatusConfig(status);
  return (
    <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ color: cfg.color, background: cfg.bg }}>
      {cfg.label}
    </span>
  );
}

function RatingButtons({ value, onChange, max = 5, color = "#8b5cf6" }: {
  value: number; onChange: (n: number) => void; max?: number; color?: string;
}) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
        <button key={n} type="button" onClick={() => onChange(n)}
          className="w-8 h-8 rounded-lg text-xs font-semibold border transition-all"
          style={value === n
            ? { background: color + "33", borderColor: color + "66", color }
            : { background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.25)" }
          }>
          {n}
        </button>
      ))}
    </div>
  );
}

// ── Log Attempt Modal ─────────────────────────────────────────────────────────

function LogAttemptModal({ skill, onSave, onClose }: {
  skill: DanceSkill;
  onSave: (log: DanceSkillLog) => void;
  onClose: () => void;
}) {
  const catCfg = getCategoryConfig(skill.category);
  const [date,              setDate]              = useState(todayISODate());
  const [attempted,         setAttempted]         = useState(true);
  const [confidenceBefore,  setConfidenceBefore]  = useState(3);
  const [confidenceAfter,   setConfidenceAfter]   = useState<number>(3);
  const [fearLevel,         setFearLevel]         = useState<number>(3);
  const [formQuality,       setFormQuality]       = useState<number>(3);
  const [effortLevel,       setEffortLevel]       = useState<number>(3);
  const [outcome,           setOutcome]           = useState<SkillMilestoneStatus>(skill.currentStatus);
  const [notes,             setNotes]             = useState("");
  const [filmed,            setFilmed]            = useState(false);

  function save() {
    onSave({
      id: generateLogId(), skillId: skill.id, date, attempted,
      confidenceBefore, confidenceAfter, fearLevel, formQuality, effortLevel,
      outcome, notes, filmed,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)" }}>
      <div className="bg-[#0C0F1A] border border-white/[0.1] rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto flex flex-col gap-5">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-base font-semibold">Log Attempt</h3>
            <p className="text-[11px] mt-0.5" style={{ color: catCfg.color }}>{catCfg.icon} {skill.name}</p>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors text-xl leading-none">×</button>
        </div>

        <div>
          <label className="text-[11px] text-white/40 block mb-1.5">Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white/70 outline-none focus:border-violet-500/40 w-full" />
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] text-white/40">Attempted?</span>
          {([true, false] as const).map((v) => (
            <button key={String(v)} type="button" onClick={() => setAttempted(v)}
              className="px-3 py-1.5 rounded-lg text-[11px] border transition-all"
              style={attempted === v
                ? { background: catCfg.color + "22", borderColor: catCfg.color + "55", color: catCfg.color }
                : { background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.35)" }
              }>
              {v ? "Yes" : "No"}
            </button>
          ))}
          <label className="ml-auto flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={filmed} onChange={(e) => setFilmed(e.target.checked)}
              className="accent-violet-500" />
            <span className="text-[11px] text-white/30">🎬 Filmed</span>
          </label>
        </div>

        {attempted && (
          <>
            {[
              { label: "Confidence before (1–5)", val: confidenceBefore, set: setConfidenceBefore, color: "#8b5cf6" },
              { label: "Confidence after (1–5)",  val: confidenceAfter,  set: setConfidenceAfter,  color: "#10b981" },
              { label: "Fear / intimidation",     val: fearLevel,        set: setFearLevel,        color: "#f43f5e" },
              { label: "Form quality",            val: formQuality,      set: setFormQuality,      color: "#0ea5e9" },
              { label: "Effort level",            val: effortLevel,      set: setEffortLevel,      color: "#f59e0b" },
            ].map(({ label, val, set, color }) => (
              <div key={label}>
                <p className="text-[11px] text-white/40 mb-2">{label}</p>
                <RatingButtons value={val} onChange={set} color={color} />
              </div>
            ))}

            <div>
              <p className="text-[11px] text-white/40 mb-2">Outcome / status after this session</p>
              <div className="flex flex-wrap gap-1.5">
                {MILESTONE_STATUSES.map((ms) => (
                  <button key={ms.key} type="button" onClick={() => setOutcome(ms.key)}
                    className="text-[10px] px-2.5 py-1 rounded-full border transition-all"
                    style={outcome === ms.key
                      ? { background: ms.bg, borderColor: ms.color + "55", color: ms.color }
                      : { background: "transparent", borderColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.3)" }
                    }>
                    {ms.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        <div>
          <p className="text-[11px] text-white/40 mb-1.5">Notes</p>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
            placeholder="How did it feel? What clicked?"
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white/70 placeholder-white/20 outline-none focus:border-violet-500/40 resize-none" />
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={save}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
            style={{ background: `linear-gradient(to right, ${catCfg.color}, #8b5cf6)` }}>
            Save log
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-white/[0.1] text-sm text-white/40 hover:text-white/60 transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Add / Edit Skill Modal ────────────────────────────────────────────────────

function SkillFormModal({ skill, onSave, onClose }: {
  skill?: DanceSkill;
  onSave: (s: DanceSkill) => void;
  onClose: () => void;
}) {
  const [name,              setName]              = useState(skill?.name ?? "");
  const [category,          setCategory]          = useState<SkillCategory>(skill?.category ?? "spins");
  const [status,            setStatus]            = useState<SkillMilestoneStatus>(skill?.currentStatus ?? "not_started");
  const [notes,             setNotes]             = useState(skill?.notes ?? "");
  const [tagsRaw,           setTagsRaw]           = useState((skill?.tags ?? []).join(", "));
  const [needsSpotting,     setNeedsSpotting]     = useState(skill?.needsSpotting ?? false);
  const [needsConditioning, setNeedsConditioning] = useState(skill?.needsConditioning ?? false);
  const [needsFlexibility,  setNeedsFlexibility]  = useState(skill?.needsFlexibility ?? false);
  const [mentallyBlocked,   setMentallyBlocked]   = useState(skill?.mentallyBlocked ?? false);

  function save() {
    if (!name.trim()) return;
    const now  = todayISODate();
    const tags = tagsRaw.split(",").map((t) => t.trim()).filter(Boolean);
    onSave({
      id:             skill?.id ?? generateSkillId(),
      name:           name.trim(),
      category, notes, tags, active: true,
      currentStatus:  status,
      dateCreated:    skill?.dateCreated ?? now,
      dateFirstLanded: status === 'landed_once' && !skill?.dateFirstLanded ? now : skill?.dateFirstLanded,
      needsSpotting, needsConditioning, needsFlexibility, mentallyBlocked,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)" }}>
      <div className="bg-[#0C0F1A] border border-white/[0.1] rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold">{skill ? "Edit Skill" : "Add Skill"}</h3>
          <button onClick={onClose} className="text-white/30 hover:text-white/60 text-xl leading-none">×</button>
        </div>

        <div>
          <label className="text-[11px] text-white/40 block mb-1.5">Skill / move name</label>
          <input value={name} onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Jasmine, Invert, Outside leg hang…"
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white/80 placeholder-white/20 outline-none focus:border-violet-500/40" />
        </div>

        <div>
          <label className="text-[11px] text-white/40 block mb-1.5">Category</label>
          <div className="flex flex-wrap gap-1.5">
            {SKILL_CATEGORIES.map((cat) => (
              <button key={cat.key} type="button" onClick={() => setCategory(cat.key)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] border transition-all"
                style={category === cat.key
                  ? { background: cat.color + "22", borderColor: cat.color + "55", color: cat.color }
                  : { background: "transparent", borderColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.3)" }
                }>
                {cat.icon} {cat.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[11px] text-white/40 block mb-1.5">Current milestone</label>
          <div className="flex flex-wrap gap-1.5">
            {MILESTONE_STATUSES.map((ms) => (
              <button key={ms.key} type="button" onClick={() => setStatus(ms.key)}
                className="text-[10px] px-2.5 py-1 rounded-full border transition-all"
                style={status === ms.key
                  ? { background: ms.bg, borderColor: ms.color + "55", color: ms.color }
                  : { background: "transparent", borderColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.3)" }
                }>
                {ms.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[11px] text-white/40 block mb-1.5">Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
            placeholder="Cues, fears, focus areas…"
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white/70 placeholder-white/20 outline-none focus:border-violet-500/40 resize-none" />
        </div>

        <div>
          <label className="text-[11px] text-white/40 block mb-1.5">Tags <span className="text-white/20">(comma-separated)</span></label>
          <input value={tagsRaw} onChange={(e) => setTagsRaw(e.target.value)}
            placeholder="e.g. pole, strength, beginner"
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white/70 placeholder-white/20 outline-none focus:border-violet-500/40" />
        </div>

        <div className="grid grid-cols-2 gap-2">
          {[
            ["needsSpotting",     "Needs spotting",    needsSpotting,     setNeedsSpotting],
            ["needsConditioning", "Needs conditioning",needsConditioning, setNeedsConditioning],
            ["needsFlexibility",  "Needs flexibility", needsFlexibility,  setNeedsFlexibility],
            ["mentallyBlocked",   "Mentally blocked",  mentallyBlocked,   setMentallyBlocked],
          ].map(([key, label, val, set]) => (
            <label key={String(key)} className="flex items-center gap-2 cursor-pointer p-2.5 rounded-xl border border-white/[0.07] hover:border-white/[0.12] transition-colors">
              <input type="checkbox" checked={Boolean(val)} onChange={(e) => (set as (v: boolean) => void)(e.target.checked)} className="accent-violet-500" />
              <span className="text-[11px] text-white/45">{String(label)}</span>
            </label>
          ))}
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={save}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-pink-600 text-sm font-semibold hover:opacity-90 transition-opacity">
            {skill ? "Save changes" : "Add skill"}
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-white/[0.1] text-sm text-white/40 hover:text-white/60 transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Skill Detail Modal ─────────────────────────────────────────────────────────

function SkillDetailModal({ skill, logs, onLog, onEdit, onArchive, onClose }: {
  skill: DanceSkill;
  logs: DanceSkillLog[];
  onLog: () => void;
  onEdit: () => void;
  onArchive: () => void;
  onClose: () => void;
}) {
  const catCfg      = getCategoryConfig(skill.category);
  const skillLogs   = getLogsForSkill(logs, skill.id);
  const attempted   = getAttemptedLogs(logs, skill.id);
  const avgConf     = getAvgConfidence(logs, skill.id);
  const trend       = getConfidenceTrend(logs, skill.id).slice(-10);
  const daysSince   = getDaysSinceLastAttempt(logs, skill.id);

  const trendData = trend.map((t) => ({ date: t.date.slice(5), before: t.before, after: t.after ?? t.before }));

  const tooltipStyle = {
    contentStyle: { backgroundColor: "#0C0F1A", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "white", fontSize: "11px" },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)" }}>
      <div className="bg-[#0C0F1A] border border-white/[0.1] rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4 border-b border-white/[0.06]">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-lg">{catCfg.icon}</span>
              <h3 className="text-lg font-semibold">{skill.name}</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ color: catCfg.color, background: catCfg.color + "18" }}>{catCfg.label}</span>
              <StatusBadge status={skill.currentStatus} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onEdit} className="text-[11px] text-white/30 hover:text-white/60 border border-white/[0.08] rounded-lg px-2.5 py-1.5 transition-colors">Edit</button>
            <button onClick={onClose} className="text-white/30 hover:text-white/60 text-xl leading-none ml-1">×</button>
          </div>
        </div>

        <div className="flex flex-col gap-5 p-6">
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <p className="text-2xl font-bold tabular-nums text-violet-400">{attempted.length}</p>
              <p className="text-[10px] text-white/30 mt-0.5">total attempts</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <p className="text-2xl font-bold tabular-nums" style={{ color: catCfg.color }}>{avgConf > 0 ? avgConf.toFixed(1) : "—"}</p>
              <p className="text-[10px] text-white/30 mt-0.5">avg confidence</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <p className="text-2xl font-bold tabular-nums text-amber-400">{daysSince !== null ? `${daysSince}d` : "—"}</p>
              <p className="text-[10px] text-white/30 mt-0.5">since last attempt</p>
            </div>
          </div>

          {/* Confidence trend chart */}
          {trendData.length >= 2 && (
            <div>
              <p className="text-[11px] text-white/30 mb-2">Confidence trend</p>
              <div className="h-[120px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                    <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fill: "rgba(255,255,255,0.2)", fontSize: 8 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 5]} ticks={[1,2,3,4,5]} tick={{ fill: "rgba(255,255,255,0.2)", fontSize: 9 }} axisLine={false} tickLine={false} />
                    <Tooltip {...tooltipStyle} formatter={(v) => [Number(v).toFixed(1)]} />
                    <Line type="monotone" dataKey="before" stroke="rgba(255,255,255,0.25)" strokeWidth={1.5} dot={false} name="Before" />
                    <Line type="monotone" dataKey="after"  stroke={catCfg.color}           strokeWidth={2}   dot={{ fill: catCfg.color, r: 3 }} name="After" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="flex gap-3 mt-1">
                <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 rounded bg-white/25" /><span className="text-[9px] text-white/25">Before</span></div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 rounded" style={{ background: catCfg.color }} /><span className="text-[9px] text-white/25">After</span></div>
              </div>
            </div>
          )}

          {/* Flags */}
          {(skill.needsSpotting || skill.needsConditioning || skill.needsFlexibility || skill.mentallyBlocked) && (
            <div className="flex flex-wrap gap-1.5">
              {skill.needsSpotting     && <span className="text-[10px] text-amber-400/70 bg-amber-500/10 border border-amber-500/15 px-2 py-0.5 rounded-full">needs spotting</span>}
              {skill.needsConditioning && <span className="text-[10px] text-sky-400/70   bg-sky-500/10   border border-sky-500/15   px-2 py-0.5 rounded-full">needs conditioning</span>}
              {skill.needsFlexibility  && <span className="text-[10px] text-pink-400/70  bg-pink-500/10  border border-pink-500/15  px-2 py-0.5 rounded-full">needs flexibility</span>}
              {skill.mentallyBlocked   && <span className="text-[10px] text-rose-400/70  bg-rose-500/10  border border-rose-500/15  px-2 py-0.5 rounded-full">mentally blocked</span>}
            </div>
          )}

          {skill.notes && (
            <p className="text-[12px] text-white/40 italic bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2">"{skill.notes}"</p>
          )}

          {/* Recent log history */}
          {skillLogs.length > 0 && (
            <div>
              <p className="text-[11px] text-white/30 mb-2">Recent sessions</p>
              <div className="flex flex-col gap-2">
                {skillLogs.slice(-5).reverse().map((log) => {
                  const ms = log.outcome ? getStatusConfig(log.outcome) : null;
                  return (
                    <div key={log.id} className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                      <div className="flex flex-col items-center gap-1 min-w-[40px]">
                        <span className="text-[10px] text-white/25 tabular-nums">{log.date.slice(5)}</span>
                        {log.filmed && <span className="text-[9px]">🎬</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {log.attempted ? (
                            <>
                              <span className="text-[11px] text-white/60">
                                Confidence: <span className="text-violet-400 font-semibold">{log.confidenceBefore}</span>
                                {log.confidenceAfter && log.confidenceAfter !== log.confidenceBefore && (
                                  <span> → <span className="text-emerald-400 font-semibold">{log.confidenceAfter}</span></span>
                                )}
                              </span>
                              {log.fearLevel && <span className="text-[10px] text-rose-400/60">fear {log.fearLevel}/5</span>}
                              {ms && <StatusBadge status={ms.key} />}
                            </>
                          ) : (
                            <span className="text-[11px] text-white/30 italic">Not attempted</span>
                          )}
                        </div>
                        {log.notes && <p className="text-[11px] text-white/35 mt-0.5 truncate">{log.notes}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {skillLogs.length === 0 && (
            <div className="text-center py-4">
              <p className="text-[12px] text-white/25 italic">No sessions logged yet.</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button onClick={onLog}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ background: `linear-gradient(to right, ${catCfg.color}cc, #8b5cf6cc)` }}>
              + Log session
            </button>
            <button onClick={onArchive}
              className="px-4 py-2.5 rounded-xl border border-white/[0.1] text-sm text-white/30 hover:text-rose-400/60 hover:border-rose-500/20 transition-colors">
              Archive
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Skills Analytics ──────────────────────────────────────────────────────────

function SkillsAnalytics({ skills, logs }: { skills: DanceSkill[]; logs: DanceSkillLog[] }) {
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);

  const activeSkills = skills.filter((s) => s.active);

  const mostPracticed  = getMostPracticedSkill(activeSkills, logs);
  const highestConf    = getHighestConfidenceSkill(activeSkills, logs);
  const lowestConf     = getLowestConfidenceSkill(activeSkills, logs);
  const mostImproved   = getMostImprovedSkill(activeSkills, logs);
  const readyToLevel   = getSkillsReadyToLevel(activeSkills, logs);

  // Bar chart: attempts per skill
  const attemptData = activeSkills
    .map((s) => ({ name: s.name.length > 12 ? s.name.slice(0, 11) + "…" : s.name, attempts: getAttemptedLogs(logs, s.id).length, color: getCategoryConfig(s.category).color }))
    .filter((d) => d.attempts > 0)
    .sort((a, b) => b.attempts - a.attempts)
    .slice(0, 10);

  // Status distribution
  const statusCounts = MILESTONE_STATUSES.map((ms) => ({
    label: ms.label.replace(" 🌟", "").replace(" ✦", ""),
    count: activeSkills.filter((s) => s.currentStatus === ms.key).length,
    color: ms.color,
  })).filter((d) => d.count > 0);

  // Confidence trend for selected skill
  const selectedSkill = selectedSkillId ? skills.find((s) => s.id === selectedSkillId) : null;
  const trendData     = selectedSkillId
    ? getConfidenceTrend(logs, selectedSkillId).slice(-12).map((t) => ({
        date: t.date.slice(5), before: t.before, after: t.after ?? t.before,
      }))
    : [];

  // Category stats
  const catStats           = getAllCategoryStats(activeSkills, logs).sort((a, b) => b.skillCount - a.skillCount);
  const mostPracticedCat   = getMostPracticedCategory(activeSkills, logs);
  const highestConfCat     = getHighestConfidenceCategory(activeSkills, logs);
  const lowestConfCat      = getLowestConfidenceCategory(activeSkills, logs);
  const mostLandedCat      = getCategoryWithMostLanded(activeSkills);
  const mostInProgressCat  = getCategoryWithMostInProgress(activeSkills);

  const tooltipStyle = {
    contentStyle: { backgroundColor: "#0C0F1A", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "white", fontSize: "11px" },
  };

  if (!activeSkills.length) {
    return (
      <Panel>
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <div className="text-4xl">📊</div>
          <p className="text-white/40">Add skills and log sessions to see analytics.</p>
        </div>
      </Panel>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Skills tracked",   value: String(activeSkills.length),                                         color: "text-violet-400" },
          { label: "Most practiced",   value: mostPracticed?.name  ?? "—",                                         color: "text-emerald-400" },
          { label: "Highest confidence",value: highestConf ? `${highestConf.name} (${getAvgConfidence(logs, highestConf.id).toFixed(1)})` : "—", color: "text-sky-400" },
          { label: "Ready to level up",value: String(readyToLevel.length) + " skills",                              color: "text-amber-400" },
        ].map(({ label, value, color }) => (
          <Panel key={label} className="flex flex-col gap-1">
            <p className="text-[10px] text-white/25 uppercase tracking-widest">{label}</p>
            <p className={`text-[13px] font-semibold truncate ${color}`}>{value}</p>
          </Panel>
        ))}
      </div>

      {/* Insight cards */}
      {(mostImproved || readyToLevel.length > 0) && (
        <div className="grid grid-cols-2 gap-3">
          {mostImproved && (
            <div className="px-4 py-3 rounded-xl bg-emerald-900/15 border border-emerald-500/15 flex items-center gap-3">
              <span className="text-xl">📈</span>
              <div>
                <p className="text-[10px] text-emerald-400/70 font-medium uppercase tracking-wider">Most improved</p>
                <p className="text-sm text-white/70 font-medium">{mostImproved.name}</p>
              </div>
            </div>
          )}
          {lowestConf && (
            <div className="px-4 py-3 rounded-xl bg-rose-900/10 border border-rose-500/10 flex items-center gap-3">
              <span className="text-xl">🌱</span>
              <div>
                <p className="text-[10px] text-rose-400/60 font-medium uppercase tracking-wider">Needs confidence</p>
                <p className="text-sm text-white/70 font-medium">{lowestConf.name}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Attempts per skill */}
      {attemptData.length > 0 && (
        <Panel>
          <SectionTitle title="Attempts per Skill" subtitle="Most practiced moves" />
          <div className="h-[180px] mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={attemptData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 8 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "rgba(255,255,255,0.2)", fontSize: 9 }} axisLine={false} tickLine={false} />
                <Tooltip {...tooltipStyle} formatter={(v) => [String(v), "attempts"]} />
                <Bar dataKey="attempts" radius={[4, 4, 0, 0]}>
                  {attemptData.map((d, i) => <Cell key={i} fill={d.color} fillOpacity={0.8} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      )}

      {/* Status distribution */}
      {statusCounts.length > 0 && (
        <Panel>
          <SectionTitle title="Milestone Distribution" subtitle="Skills by current status" />
          <div className="flex flex-col gap-2 mt-2">
            {statusCounts.map(({ label, count, color }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="text-[11px] text-white/40 w-40 shrink-0">{label}</span>
                <div className="flex-1 h-2 rounded-full bg-white/[0.06]">
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${(count / activeSkills.length) * 100}%`, background: color }} />
                </div>
                <span className="text-[11px] font-semibold tabular-nums w-4" style={{ color }}>{count}</span>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* Category breakdown */}
      {catStats.length > 0 && (
        <Panel>
          <SectionTitle title="Category Breakdown" subtitle="Skills and progress by category" />

          {/* Category insight chips */}
          {(mostPracticedCat || highestConfCat || lowestConfCat || mostLandedCat || mostInProgressCat) && (
            <div className="flex flex-wrap gap-2 mt-3 mb-4">
              {mostPracticedCat && (() => { const c = getCategoryConfig(mostPracticedCat); return (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] border"
                  style={{ color: c.color, borderColor: c.color + "40", background: c.color + "12" }}>
                  {c.icon} <span className="font-medium">Most practiced:</span> {c.label}
                </div>
              ); })()}
              {highestConfCat && (() => { const c = getCategoryConfig(highestConfCat); return (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] border"
                  style={{ color: c.color, borderColor: c.color + "40", background: c.color + "12" }}>
                  {c.icon} <span className="font-medium">Highest confidence:</span> {c.label}
                </div>
              ); })()}
              {lowestConfCat && (() => { const c = getCategoryConfig(lowestConfCat); return (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] border"
                  style={{ color: "#f43f5e", borderColor: "#f43f5e40", background: "#f43f5e12" }}>
                  {c.icon} <span className="font-medium">Needs work:</span> {c.label}
                </div>
              ); })()}
              {mostLandedCat && (() => { const c = getCategoryConfig(mostLandedCat); return (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] border"
                  style={{ color: "#10b981", borderColor: "#10b98140", background: "#10b98112" }}>
                  {c.icon} <span className="font-medium">Most landed:</span> {c.label}
                </div>
              ); })()}
              {mostInProgressCat && (() => { const c = getCategoryConfig(mostInProgressCat); return (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] border"
                  style={{ color: "#f59e0b", borderColor: "#f59e0b40", background: "#f59e0b12" }}>
                  {c.icon} <span className="font-medium">Most in progress:</span> {c.label}
                </div>
              ); })()}
            </div>
          )}

          {/* Per-category rows */}
          <div className="flex flex-col gap-2 mt-1">
            {catStats.map((c) => (
              <div key={c.key} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                <span className="text-base w-6 text-center">{c.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-medium truncate" style={{ color: c.color }}>{c.label}</span>
                    <div className="flex items-center gap-3 shrink-0 ml-2">
                      <span className="text-[9px] text-white/25">{c.skillCount} skills</span>
                      {c.attempts > 0 && <span className="text-[9px] text-white/25">{c.attempts} sessions</span>}
                      {c.landedCount > 0 && (
                        <span className="text-[9px] text-emerald-400/60">{c.landedCount} landed</span>
                      )}
                      {c.inProgressCount > 0 && (
                        <span className="text-[9px] text-amber-400/60">{c.inProgressCount} in progress</span>
                      )}
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/[0.06]">
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: c.avgConfidence > 0 ? `${(c.avgConfidence / 5) * 100}%` : "2%",
                        background: c.color,
                        opacity: c.avgConfidence > 0 ? 0.75 : 0.2,
                      }} />
                  </div>
                </div>
                <span className="text-[10px] tabular-nums w-8 text-right shrink-0"
                  style={{ color: c.avgConfidence > 0 ? c.color : "rgba(255,255,255,0.15)" }}>
                  {c.avgConfidence > 0 ? `${c.avgConfidence.toFixed(1)}` : "—"}
                </span>
              </div>
            ))}
          </div>
          <p className="text-[9px] text-white/20 mt-2 text-right">bar = avg confidence (1–5)</p>
        </Panel>
      )}

      {/* Confidence trend for selected skill */}
      <Panel>
        <div className="flex items-center justify-between mb-3">
          <SectionTitle title="Confidence Trend" subtitle="Select a skill to view" />
          <select
            value={selectedSkillId ?? ""}
            onChange={(e) => setSelectedSkillId(e.target.value || null)}
            className="bg-white/[0.05] border border-white/[0.1] rounded-xl px-3 py-1.5 text-[11px] text-white/60 outline-none focus:border-violet-500/40">
            <option value="">— pick a skill —</option>
            {activeSkills.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        {trendData.length >= 2 ? (
          <div className="h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 4, right: 8, left: -28, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fill: "rgba(255,255,255,0.2)", fontSize: 8 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 5]} ticks={[1,2,3,4,5]} tick={{ fill: "rgba(255,255,255,0.2)", fontSize: 9 }} axisLine={false} tickLine={false} />
                <Tooltip {...tooltipStyle} formatter={(v) => [Number(v).toFixed(1)]} />
                <Line type="monotone" dataKey="before" stroke="rgba(255,255,255,0.3)" strokeWidth={1.5} dot={false} name="Before" />
                <Line type="monotone" dataKey="after"  stroke={selectedSkill ? getCategoryConfig(selectedSkill.category).color : "#8b5cf6"} strokeWidth={2} dot={{ r: 3 }} name="After" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex items-center justify-center py-8">
            <p className="text-[12px] text-white/25 italic">
              {selectedSkillId ? "Log 2+ sessions to see the trend." : "Select a skill above."}
            </p>
          </div>
        )}
      </Panel>
    </div>
  );
}

// ── Filter Dropdown ───────────────────────────────────────────────────────────

type NeedsKey = 'needsSpotting' | 'needsConditioning' | 'needsFlexibility' | 'mentallyBlocked';

const NEEDS_OPTIONS: { key: NeedsKey; label: string }[] = [
  { key: 'needsSpotting',     label: 'Needs spotting'    },
  { key: 'needsConditioning', label: 'Needs conditioning'},
  { key: 'needsFlexibility',  label: 'Needs flexibility' },
  { key: 'mentallyBlocked',   label: 'Mentally blocked'  },
];

function FilterDropdown({
  label,
  children,
  active = false,
}: {
  label: string;
  children: React.ReactNode;
  active?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-medium transition-all select-none ${
          active
            ? "bg-violet-500/15 border-violet-500/40 text-violet-300"
            : "bg-white/[0.04] border-white/[0.08] text-white/50 hover:text-white/70 hover:border-white/15"
        }`}>
        <span className="truncate max-w-[140px]">{label}</span>
        <svg className={`w-3 h-3 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 10 6" fill="none">
          <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+4px)] z-30 min-w-[180px] rounded-xl border border-white/[0.1] bg-[#0C0F1A] shadow-xl shadow-black/50 py-1 overflow-hidden">
          {children}
        </div>
      )}
    </div>
  );
}

function DropdownItem({
  label, selected, color, onClick,
}: {
  label: string; selected: boolean; color?: string; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[11px] text-left transition-colors hover:bg-white/[0.06]"
      style={{ color: selected ? (color ?? "#a78bfa") : "rgba(255,255,255,0.5)" }}>
      <span className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0 transition-all ${
        selected ? "border-transparent" : "border-white/20"
      }`}
        style={selected ? { background: color ?? "#8b5cf6" } : {}}>
        {selected && (
          <svg viewBox="0 0 10 8" fill="none" className="w-2.5 h-2.5">
            <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      {label}
    </button>
  );
}

// ── Main SkillsTab ─────────────────────────────────────────────────────────────

type SkillsView = 'list' | 'analytics';

interface SkillsTabProps {
  skills: DanceSkill[];
  skillLogs: DanceSkillLog[];
  onSaveSkill: (skill: DanceSkill) => void;
  onDeleteSkill: (skillId: string) => void;
  onSaveLog: (log: DanceSkillLog) => void;
}

export default function SkillsTab({ skills, skillLogs, onSaveSkill, onDeleteSkill, onSaveLog }: SkillsTabProps) {
  const [view,           setView]           = useState<SkillsView>('list');
  const [statusFilter,   setStatusFilter]   = useState<SkillMilestoneStatus | 'all'>('all');
  const [catFilter,      setCatFilter]      = useState<SkillCategory | 'all'>('all');
  const [needsFilter,    setNeedsFilter]    = useState<NeedsKey[]>([]);
  const [selectedSkill,  setSelectedSkill]  = useState<DanceSkill | null>(null);
  const [editingSkill,   setEditingSkill]   = useState<DanceSkill | undefined>(undefined);
  const [showAddForm,    setShowAddForm]    = useState(false);
  const [loggingSkill,   setLoggingSkill]   = useState<DanceSkill | null>(null);
  const [showEditForm,   setShowEditForm]   = useState(false);

  const activeSkills = skills.filter((s) => s.active);

  const filtered = useMemo(() =>
    activeSkills.filter((s) => {
      const matchStatus = statusFilter === 'all' || s.currentStatus === statusFilter;
      const matchCat    = catFilter === 'all'    || s.category === catFilter;
      const matchNeeds  = needsFilter.every((k) => Boolean(s[k]));
      return matchStatus && matchCat && matchNeeds;
    }),
    [activeSkills, statusFilter, catFilter, needsFilter]
  );

  function clearFilters() {
    setStatusFilter('all');
    setCatFilter('all');
    setNeedsFilter([]);
  }

  function toggleNeed(k: NeedsKey) {
    setNeedsFilter((prev) => prev.includes(k) ? prev.filter((n) => n !== k) : [...prev, k]);
  }

  const hasActiveFilters = statusFilter !== 'all' || catFilter !== 'all' || needsFilter.length > 0;

  // Labels for dropdown buttons
  const statusLabel = statusFilter === 'all'
    ? "Status"
    : (MILESTONE_STATUSES.find((m) => m.key === statusFilter)?.label.replace(" 🌟","").replace(" ✦","") ?? "Status");

  const catLabel = catFilter === 'all'
    ? "Category"
    : (SKILL_CATEGORIES.find((c) => c.key === catFilter)?.label ?? "Category");

  const needsLabel = needsFilter.length === 0
    ? "Needs"
    : needsFilter.length === 1
      ? (NEEDS_OPTIONS.find((o) => o.key === needsFilter[0])?.label ?? "Needs")
      : `Needs: ${needsFilter.length} selected`;

  function handleSaveSkill(skill: DanceSkill) {
    onSaveSkill(skill);
    setShowAddForm(false);
    setShowEditForm(false);
    setEditingSkill(undefined);
  }

  function handleArchive(skillId: string) {
    const skill = skills.find((s) => s.id === skillId);
    if (!skill) return;
    onSaveSkill({ ...skill, active: false });
    setSelectedSkill(null);
  }

  function handleSaveLog(log: DanceSkillLog) {
    // If outcome changed, update skill status too
    const skill = skills.find((s) => s.id === log.skillId);
    if (skill && log.outcome && log.attempted) {
      const updated = { ...skill, currentStatus: log.outcome };
      if (log.outcome === 'landed_once' && !skill.dateFirstLanded) {
        updated.dateFirstLanded = log.date;
      }
      onSaveSkill(updated);
      // Update selectedSkill if it's the same
      if (selectedSkill?.id === skill.id) setSelectedSkill(updated);
    }
    onSaveLog(log);
    setLoggingSkill(null);
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
        <div>
          <h2 className="text-base font-semibold">Skills & Milestones</h2>
          <p className="text-[11px] text-white/30 mt-0.5">{activeSkills.length} skills tracked</p>
        </div>
        <div className="flex items-center gap-2">
          {/* List / Analytics toggle */}
          <div className="flex p-0.5 rounded-xl bg-white/[0.04] border border-white/[0.06]">
            {(['list', 'analytics'] as SkillsView[]).map((v) => (
              <button key={v} onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all capitalize ${
                  view === v ? "bg-white/[0.09] text-white" : "text-white/35 hover:text-white/55"
                }`}>
                {v === 'list' ? '✦ Skills' : '📊 Analytics'}
              </button>
            ))}
          </div>
          <button onClick={() => { setEditingSkill(undefined); setShowAddForm(true); }}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-pink-600 text-[12px] font-semibold hover:opacity-90 transition-opacity">
            + Add skill
          </button>
        </div>
      </div>

      {view === 'analytics' ? (
        <SkillsAnalytics skills={skills} logs={skillLogs} />
      ) : (
        <>
          {/* Filter bar */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Status dropdown */}
            <FilterDropdown label={`Status${statusFilter !== 'all' ? ': ' + statusLabel : ''}`} active={statusFilter !== 'all'}>
              <DropdownItem
                label="All statuses"
                selected={statusFilter === 'all'}
                onClick={() => setStatusFilter('all')}
              />
              <div className="my-1 border-t border-white/[0.06]" />
              {MILESTONE_STATUSES.map((ms) => (
                <DropdownItem
                  key={ms.key}
                  label={ms.label.replace(" 🌟","").replace(" ✦","")}
                  selected={statusFilter === ms.key}
                  color={ms.color}
                  onClick={() => setStatusFilter(ms.key)}
                />
              ))}
            </FilterDropdown>

            {/* Category dropdown */}
            <FilterDropdown label={`Category${catFilter !== 'all' ? ': ' + catLabel : ''}`} active={catFilter !== 'all'}>
              <DropdownItem
                label="All categories"
                selected={catFilter === 'all'}
                onClick={() => setCatFilter('all')}
              />
              <div className="my-1 border-t border-white/[0.06]" />
              {SKILL_CATEGORIES.map((cat) => (
                <DropdownItem
                  key={cat.key}
                  label={`${cat.icon} ${cat.label}`}
                  selected={catFilter === cat.key}
                  color={cat.color}
                  onClick={() => setCatFilter(cat.key)}
                />
              ))}
            </FilterDropdown>

            {/* Needs / Focus multi-select dropdown */}
            <FilterDropdown label={needsLabel} active={needsFilter.length > 0}>
              {NEEDS_OPTIONS.map((opt) => (
                <DropdownItem
                  key={opt.key}
                  label={opt.label}
                  selected={needsFilter.includes(opt.key)}
                  onClick={() => toggleNeed(opt.key)}
                />
              ))}
            </FilterDropdown>

            {/* Clear + count */}
            <div className="flex items-center gap-2 ml-auto">
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-[10px] text-white/35 hover:text-white/60 transition-colors underline underline-offset-2">
                  Clear filters
                </button>
              )}
              <span className="text-[10px] text-white/25 tabular-nums">
                {filtered.length} skill{filtered.length !== 1 ? "s" : ""} shown
              </span>
            </div>
          </div>

          {/* Empty state */}
          {activeSkills.length === 0 && (
            <Panel>
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <div className="text-4xl">🌸</div>
                <p className="text-white/50 font-medium">Start tracking your moves</p>
                <p className="text-white/25 text-sm max-w-xs">Add pole moves, tricks, and milestones you're working on. Log sessions to track your progress over time.</p>
                <button onClick={() => setShowAddForm(true)}
                  className="mt-2 px-5 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-pink-600 text-sm font-semibold hover:opacity-90 transition-opacity">
                  Add your first skill
                </button>
              </div>
            </Panel>
          )}

          {activeSkills.length > 0 && filtered.length === 0 && (
            <div className="text-center py-8">
              <p className="text-white/30 text-sm">No skills match the current filters.</p>
            </div>
          )}

          {/* Skill cards grid */}
          {filtered.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {filtered.map((skill) => {
                const catCfg   = getCategoryConfig(skill.category);
                const msCfg    = getStatusConfig(skill.currentStatus);
                const avgConf  = getAvgConfidence(skillLogs, skill.id);
                const attempts = getAttemptedLogs(skillLogs, skill.id).length;
                const daysSince = getDaysSinceLastAttempt(skillLogs, skill.id);

                return (
                  <div key={skill.id}
                    onClick={() => setSelectedSkill(skill)}
                    className="flex flex-col gap-3 p-4 rounded-xl bg-white/[0.03] border border-white/[0.07] hover:border-white/15 hover:bg-white/[0.05] cursor-pointer transition-all">
                    {/* Top row */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span>{catCfg.icon}</span>
                        <span className="text-[13px] font-medium text-white/85 leading-snug">{skill.name}</span>
                      </div>
                    </div>

                    {/* Status badge */}
                    <StatusBadge status={skill.currentStatus} />

                    {/* Confidence bar */}
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-[9px] text-white/25">Confidence</span>
                        <span className="text-[9px] tabular-nums" style={{ color: catCfg.color }}>
                          {avgConf > 0 ? `${avgConf.toFixed(1)}/5` : "—"}
                        </span>
                      </div>
                      <div className="h-1 rounded-full bg-white/[0.07]">
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${(avgConf / 5) * 100}%`, background: catCfg.color }} />
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] text-white/20">{attempts} session{attempts !== 1 ? "s" : ""}</span>
                      <span className="text-[9px] text-white/20">
                        {daysSince !== null ? `${daysSince}d ago` : "never attempted"}
                      </span>
                    </div>

                    {/* Flags */}
                    {(skill.mentallyBlocked || skill.needsSpotting) && (
                      <div className="flex gap-1 flex-wrap">
                        {skill.mentallyBlocked && <span className="text-[8px] text-rose-400/60 bg-rose-500/10 px-1.5 py-0.5 rounded">mental block</span>}
                        {skill.needsSpotting   && <span className="text-[8px] text-amber-400/60 bg-amber-500/10 px-1.5 py-0.5 rounded">needs spot</span>}
                      </div>
                    )}

                    {/* Tags */}
                    {skill.tags && skill.tags.length > 0 && (
                      <div className="flex gap-1 flex-wrap">
                        {skill.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="text-[8px] text-white/25 bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.06]">{tag}</span>
                        ))}
                      </div>
                    )}

                    {/* Quick log button */}
                    <button
                      onClick={(e) => { e.stopPropagation(); setLoggingSkill(skill); }}
                      className="w-full py-1.5 rounded-lg text-[10px] font-medium border transition-all hover:opacity-90"
                      style={{ borderColor: msCfg.color + "40", color: msCfg.color, background: msCfg.bg }}>
                      + Log session
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Modals */}
      {(showAddForm || showEditForm) && (
        <SkillFormModal
          skill={editingSkill}
          onSave={handleSaveSkill}
          onClose={() => { setShowAddForm(false); setShowEditForm(false); setEditingSkill(undefined); }}
        />
      )}

      {selectedSkill && !loggingSkill && !showEditForm && (
        <SkillDetailModal
          skill={selectedSkill}
          logs={skillLogs}
          onLog={() => { setLoggingSkill(selectedSkill); }}
          onEdit={() => { setEditingSkill(selectedSkill); setSelectedSkill(null); setShowEditForm(true); }}
          onArchive={() => handleArchive(selectedSkill.id)}
          onClose={() => setSelectedSkill(null)}
        />
      )}

      {loggingSkill && (
        <LogAttemptModal
          skill={loggingSkill}
          onSave={handleSaveLog}
          onClose={() => setLoggingSkill(null)}
        />
      )}
    </div>
  );
}
