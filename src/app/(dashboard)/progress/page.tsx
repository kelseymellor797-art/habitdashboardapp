"use client";

import { useState, useEffect } from "react";
import Panel from "@/components/dashboard/Panel";
import SectionTitle from "@/components/dashboard/SectionTitle";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  loadWeightEntries,
  saveWeightEntries,
  loadMediaEntries,
  saveMediaEntries,
  generateWeightId,
  generateMediaId,
  todayDateString,
  type WeightEntry,
  type MediaEntry,
  type MediaTag,
} from "@/lib/progressData";

// ── helpers ──────────────────────────────────────────────────────────────────

function fmtWeight(kg: number, unit: "kg" | "lbs"): string {
  const val = unit === "lbs" ? kg * 2.2046 : kg;
  return `${val.toFixed(1)} ${unit}`;
}

function kgToDisplay(kg: number, unit: "kg" | "lbs"): number {
  const val = unit === "lbs" ? kg * 2.2046 : kg;
  return Math.round(val * 10) / 10;
}

function displayToKg(val: number, unit: "kg" | "lbs"): number {
  return unit === "lbs" ? val / 2.2046 : val;
}

const TAG_LABELS: Record<MediaTag, string> = {
  pole: "Pole",
  heels: "Heels",
  floorwork: "Floorwork",
  freestyle: "Freestyle",
  conditioning: "Conditioning",
  flexibility: "Flexibility",
  combo: "Combo",
  performance_ready: "Performance Ready",
  needs_work: "Needs Work",
  milestone: "Milestone",
};

const TAG_COLORS: Record<MediaTag, string> = {
  pole: "bg-violet-500/20 text-violet-300 border-violet-500/30",
  heels: "bg-pink-500/20 text-pink-300 border-pink-500/30",
  floorwork: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  freestyle: "bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30",
  conditioning: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  flexibility: "bg-teal-500/20 text-teal-300 border-teal-500/30",
  combo: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  performance_ready: "bg-green-500/20 text-green-300 border-green-500/30",
  needs_work: "bg-red-500/20 text-red-300 border-red-500/30",
  milestone: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
};

const ALL_TAGS: MediaTag[] = [
  "pole",
  "heels",
  "floorwork",
  "freestyle",
  "conditioning",
  "flexibility",
  "combo",
  "performance_ready",
  "needs_work",
  "milestone",
];

// ── Recharts tooltip ──────────────────────────────────────────────────────────

interface ChartPayloadItem {
  value: number;
  payload: { date: string };
}

function WeightTooltip({
  active,
  payload,
  unit,
}: {
  active?: boolean;
  payload?: ChartPayloadItem[];
  unit: "kg" | "lbs";
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1a1f35] border border-white/10 rounded-lg px-3 py-2 text-xs text-white shadow-xl">
      <p className="text-white/40 mb-0.5">{payload[0].payload.date}</p>
      <p className="font-semibold text-violet-300">
        {payload[0].value} {unit}
      </p>
    </div>
  );
}

// ── blank form shapes ─────────────────────────────────────────────────────────

interface WeightForm {
  date: string;
  weight: string;
  bodyFat: string;
  notes: string;
  waist: string;
  hips: string;
  chest: string;
  thigh: string;
  arm: string;
}

const blankWeightForm = (): WeightForm => ({
  date: todayDateString(),
  weight: "",
  bodyFat: "",
  notes: "",
  waist: "",
  hips: "",
  chest: "",
  thigh: "",
  arm: "",
});

interface MediaForm {
  title: string;
  date: string;
  url: string;
  skillName: string;
  notes: string;
  confidenceRating: number;
  tags: MediaTag[];
}

const blankMediaForm = (): MediaForm => ({
  title: "",
  date: todayDateString(),
  url: "",
  skillName: "",
  notes: "",
  confidenceRating: 0,
  tags: [],
});

// ── main page ─────────────────────────────────────────────────────────────────

export default function ProgressPage() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"weight" | "media">("weight");

  // Weight
  const [weightEntries, setWeightEntries] = useState<WeightEntry[]>([]);
  const [weightUnit, setWeightUnit] = useState<"kg" | "lbs">("kg");
  const [wForm, setWForm] = useState<WeightForm>(blankWeightForm);
  const [showMeasurements, setShowMeasurements] = useState(false);
  const [editingWeightId, setEditingWeightId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<WeightForm>(blankWeightForm);

  // Media
  const [mediaEntries, setMediaEntries] = useState<MediaEntry[]>([]);
  const [showMediaForm, setShowMediaForm] = useState(false);
  const [mForm, setMForm] = useState<MediaForm>(blankMediaForm);
  const [editingMediaId, setEditingMediaId] = useState<string | null>(null);
  const [mediaTagFilter, setMediaTagFilter] = useState<MediaTag | "all">("all");
  const [mediaDateFilter, setMediaDateFilter] = useState<"week" | "month" | "all">("all");
  const [mediaSearch, setMediaSearch] = useState("");
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    setWeightEntries(loadWeightEntries());
    setMediaEntries(loadMediaEntries());
  }, []);

  if (!mounted) return null;

  // ── weight helpers ──────────────────────────────────────────────────────────

  const sortedWeight = [...weightEntries].sort((a, b) =>
    a.date < b.date ? -1 : 1
  );
  const latestEntry = sortedWeight[sortedWeight.length - 1];
  const prevEntry = sortedWeight[sortedWeight.length - 2];

  function saveWeight() {
    const val = parseFloat(wForm.weight);
    if (!wForm.date || isNaN(val) || val <= 0) return;
    const kg = displayToKg(val, weightUnit);
    const hasM =
      wForm.waist || wForm.hips || wForm.chest || wForm.thigh || wForm.arm;
    const entry: WeightEntry = {
      id: generateWeightId(),
      date: wForm.date,
      weightKg: Math.round(kg * 1000) / 1000,
      ...(wForm.bodyFat ? { bodyFatPct: parseFloat(wForm.bodyFat) } : {}),
      ...(hasM
        ? {
            measurements: {
              ...(wForm.waist ? { waistCm: parseFloat(wForm.waist) } : {}),
              ...(wForm.hips ? { hipsCm: parseFloat(wForm.hips) } : {}),
              ...(wForm.chest ? { chestCm: parseFloat(wForm.chest) } : {}),
              ...(wForm.thigh ? { thighCm: parseFloat(wForm.thigh) } : {}),
              ...(wForm.arm ? { armCm: parseFloat(wForm.arm) } : {}),
            },
          }
        : {}),
      ...(wForm.notes ? { notes: wForm.notes } : {}),
      createdAt: new Date().toISOString(),
    };
    const updated = [...weightEntries, entry];
    setWeightEntries(updated);
    saveWeightEntries(updated);
    setWForm(blankWeightForm());
    setShowMeasurements(false);
  }

  function deleteWeight(id: string) {
    const updated = weightEntries.filter((e) => e.id !== id);
    setWeightEntries(updated);
    saveWeightEntries(updated);
  }

  function startEditWeight(entry: WeightEntry) {
    setEditingWeightId(entry.id);
    setEditForm({
      date: entry.date,
      weight: String(kgToDisplay(entry.weightKg, weightUnit)),
      bodyFat: entry.bodyFatPct != null ? String(entry.bodyFatPct) : "",
      notes: entry.notes ?? "",
      waist: entry.measurements?.waistCm != null ? String(entry.measurements.waistCm) : "",
      hips: entry.measurements?.hipsCm != null ? String(entry.measurements.hipsCm) : "",
      chest: entry.measurements?.chestCm != null ? String(entry.measurements.chestCm) : "",
      thigh: entry.measurements?.thighCm != null ? String(entry.measurements.thighCm) : "",
      arm: entry.measurements?.armCm != null ? String(entry.measurements.armCm) : "",
    });
  }

  function saveEditWeight() {
    if (!editingWeightId) return;
    const val = parseFloat(editForm.weight);
    if (!editForm.date || isNaN(val) || val <= 0) return;
    const kg = displayToKg(val, weightUnit);
    const hasM =
      editForm.waist || editForm.hips || editForm.chest || editForm.thigh || editForm.arm;
    const updated = weightEntries.map((e) => {
      if (e.id !== editingWeightId) return e;
      return {
        ...e,
        date: editForm.date,
        weightKg: Math.round(kg * 1000) / 1000,
        bodyFatPct: editForm.bodyFat ? parseFloat(editForm.bodyFat) : undefined,
        measurements: hasM
          ? {
              ...(editForm.waist ? { waistCm: parseFloat(editForm.waist) } : {}),
              ...(editForm.hips ? { hipsCm: parseFloat(editForm.hips) } : {}),
              ...(editForm.chest ? { chestCm: parseFloat(editForm.chest) } : {}),
              ...(editForm.thigh ? { thighCm: parseFloat(editForm.thigh) } : {}),
              ...(editForm.arm ? { armCm: parseFloat(editForm.arm) } : {}),
            }
          : undefined,
        notes: editForm.notes || undefined,
      };
    });
    setWeightEntries(updated);
    saveWeightEntries(updated);
    setEditingWeightId(null);
  }

  // chart data
  const chartEntries = sortedWeight.slice(-30);
  const chartData = chartEntries.map((e) => ({
    date: e.date,
    displayWeight: kgToDisplay(e.weightKg, weightUnit),
  }));

  // stats
  const thisMonth = todayDateString().slice(0, 7);
  const thisMonthEntries = sortedWeight.filter((e) =>
    e.date.startsWith(thisMonth)
  );
  const monthChange =
    thisMonthEntries.length >= 2
      ? kgToDisplay(
          thisMonthEntries[thisMonthEntries.length - 1].weightKg -
            thisMonthEntries[0].weightKg,
          weightUnit
        )
      : null;
  const totalChange =
    sortedWeight.length >= 2
      ? kgToDisplay(
          sortedWeight[sortedWeight.length - 1].weightKg - sortedWeight[0].weightKg,
          weightUnit
        )
      : null;
  const highestKg = sortedWeight.length
    ? Math.max(...sortedWeight.map((e) => e.weightKg))
    : 0;
  const lowestKg = sortedWeight.length
    ? Math.min(...sortedWeight.map((e) => e.weightKg))
    : 0;

  // ── media helpers ───────────────────────────────────────────────────────────

  function saveMedia() {
    if (!mForm.title.trim()) return;
    const entry: MediaEntry = {
      id: editingMediaId ?? generateMediaId(),
      title: mForm.title.trim(),
      date: mForm.date,
      url: mForm.url.trim(),
      tags: mForm.tags,
      ...(mForm.skillName ? { skillName: mForm.skillName.trim() } : {}),
      ...(mForm.confidenceRating > 0 ? { confidenceRating: mForm.confidenceRating } : {}),
      ...(mForm.notes ? { notes: mForm.notes.trim() } : {}),
      createdAt: editingMediaId
        ? (mediaEntries.find((e) => e.id === editingMediaId)?.createdAt ?? new Date().toISOString())
        : new Date().toISOString(),
    };
    const updated = editingMediaId
      ? mediaEntries.map((e) => (e.id === editingMediaId ? entry : e))
      : [...mediaEntries, entry];
    setMediaEntries(updated);
    saveMediaEntries(updated);
    setMForm(blankMediaForm());
    setShowMediaForm(false);
    setEditingMediaId(null);
  }

  function deleteMedia(id: string) {
    const updated = mediaEntries.filter((e) => e.id !== id);
    setMediaEntries(updated);
    saveMediaEntries(updated);
  }

  function startEditMedia(entry: MediaEntry) {
    setEditingMediaId(entry.id);
    setMForm({
      title: entry.title,
      date: entry.date,
      url: entry.url,
      skillName: entry.skillName ?? "",
      notes: entry.notes ?? "",
      confidenceRating: entry.confidenceRating ?? 0,
      tags: [...entry.tags],
    });
    setShowMediaForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function toggleMediaTag(tag: MediaTag) {
    setMForm((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag],
    }));
  }

  // filter
  const filteredMedia = [...mediaEntries]
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .filter((e) => {
      if (mediaTagFilter !== "all" && !e.tags.includes(mediaTagFilter)) return false;
      if (mediaDateFilter === "week") {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        if (e.date < todayDateString().slice(0, 8) + "00") {
          const entryDate = new Date(e.date + "T12:00:00");
          if (entryDate < weekAgo) return false;
        }
      }
      if (mediaDateFilter === "month") {
        if (!e.date.startsWith(todayDateString().slice(0, 7))) return false;
      }
      if (mediaSearch.trim()) {
        const q = mediaSearch.toLowerCase();
        if (
          !e.title.toLowerCase().includes(q) &&
          !(e.skillName?.toLowerCase().includes(q) ?? false)
        )
          return false;
      }
      return true;
    });

  // ── render helpers ──────────────────────────────────────────────────────────

  const inputCls =
    "w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-colors";
  const labelCls = "block text-[11px] text-white/40 mb-1 uppercase tracking-wider";
  const btnPrimary =
    "px-4 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white text-sm font-medium transition-all";
  const btnGhost =
    "px-3 py-1.5 rounded-lg border border-white/[0.08] text-white/40 hover:text-white/70 hover:border-white/20 text-xs transition-colors";

  return (
    <div className="space-y-7 max-w-5xl">
      {/* Page header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
        <div>
          <h1 className="text-2xl font-semibold text-white">📈 Progress</h1>
          <p className="text-sm text-white/30 mt-0.5">{todayDateString()}</p>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-white/[0.03] border border-white/[0.06] rounded-xl p-1 w-fit">
        {(["weight", "media"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab
                ? "bg-gradient-to-r from-violet-600/80 to-pink-600/80 text-white shadow-sm"
                : "text-white/40 hover:text-white/70"
            }`}
          >
            {tab === "weight" ? "⚖️ Weight" : "🎬 Media Vault"}
          </button>
        ))}
      </div>

      {/* ═══════════════════════ WEIGHT TAB ═══════════════════════ */}
      {activeTab === "weight" && (
        <div className="space-y-6">
          {/* Stats header */}
          {latestEntry && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Panel className="text-center">
                <p className="text-[10px] text-white/30 uppercase tracking-widest mb-1">
                  Current
                </p>
                <p className="text-xl font-bold text-white">
                  {fmtWeight(latestEntry.weightKg, weightUnit)}
                </p>
              </Panel>
              {prevEntry && (
                <Panel className="text-center">
                  <p className="text-[10px] text-white/30 uppercase tracking-widest mb-1">
                    Change
                  </p>
                  <p
                    className={`text-xl font-bold ${
                      latestEntry.weightKg > prevEntry.weightKg
                        ? "text-red-400"
                        : "text-green-400"
                    }`}
                  >
                    {latestEntry.weightKg > prevEntry.weightKg ? "↑" : "↓"}{" "}
                    {Math.abs(
                      kgToDisplay(
                        latestEntry.weightKg - prevEntry.weightKg,
                        weightUnit
                      )
                    ).toFixed(1)}{" "}
                    {weightUnit}
                  </p>
                </Panel>
              )}
              <Panel className="text-center">
                <p className="text-[10px] text-white/30 uppercase tracking-widest mb-1">
                  Last Log
                </p>
                <p className="text-sm font-semibold text-white/70">
                  {latestEntry.date}
                </p>
              </Panel>
              <Panel className="text-center">
                <p className="text-[10px] text-white/30 uppercase tracking-widest mb-1">
                  Entries
                </p>
                <p className="text-xl font-bold text-white/70">
                  {weightEntries.length}
                </p>
              </Panel>
            </div>
          )}

          {/* Quick log form */}
          <Panel>
            <SectionTitle title="Log Weight" />
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className={labelCls}>Date</label>
                  <input
                    type="date"
                    className={inputCls}
                    value={wForm.date}
                    onChange={(e) =>
                      setWForm((p) => ({ ...p, date: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className={labelCls}>Weight</label>
                  <input
                    type="number"
                    step="0.1"
                    className={inputCls}
                    placeholder="e.g. 58.5"
                    value={wForm.weight}
                    onChange={(e) =>
                      setWForm((p) => ({ ...p, weight: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className={labelCls}>Unit</label>
                  <div className="flex gap-1 h-[38px]">
                    {(["kg", "lbs"] as const).map((u) => (
                      <button
                        key={u}
                        onClick={() => setWeightUnit(u)}
                        className={`flex-1 rounded-lg text-sm font-medium border transition-all ${
                          weightUnit === u
                            ? "bg-violet-500/20 border-violet-500/40 text-violet-300"
                            : "border-white/[0.08] text-white/30 hover:text-white/60"
                        }`}
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Body Fat % (optional)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="60"
                    className={inputCls}
                    placeholder="e.g. 22.5"
                    value={wForm.bodyFat}
                    onChange={(e) =>
                      setWForm((p) => ({ ...p, bodyFat: e.target.value }))
                    }
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={() => setShowMeasurements((v) => !v)}
                    className={btnGhost}
                  >
                    {showMeasurements ? "▲" : "▼"} Measurements
                  </button>
                </div>
              </div>

              {showMeasurements && (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-3 bg-white/[0.02] rounded-lg border border-white/[0.06]">
                  {(
                    [
                      ["waist", "Waist (cm)"],
                      ["hips", "Hips (cm)"],
                      ["chest", "Chest (cm)"],
                      ["thigh", "Thigh (cm)"],
                      ["arm", "Arm (cm)"],
                    ] as [keyof WeightForm, string][]
                  ).map(([key, label]) => (
                    <div key={key}>
                      <label className={labelCls}>{label}</label>
                      <input
                        type="number"
                        step="0.5"
                        className={inputCls}
                        placeholder="—"
                        value={wForm[key]}
                        onChange={(e) =>
                          setWForm((p) => ({ ...p, [key]: e.target.value }))
                        }
                      />
                    </div>
                  ))}
                </div>
              )}

              <div>
                <label className={labelCls}>Notes (optional)</label>
                <textarea
                  rows={1}
                  className={inputCls + " resize-none"}
                  placeholder="Any notes..."
                  value={wForm.notes}
                  onChange={(e) =>
                    setWForm((p) => ({ ...p, notes: e.target.value }))
                  }
                />
              </div>

              <button
                onClick={saveWeight}
                disabled={!wForm.weight || !wForm.date}
                className={btnPrimary + " disabled:opacity-40 disabled:cursor-not-allowed"}
              >
                Log weight
              </button>
            </div>
          </Panel>

          {/* Trend chart */}
          {chartData.length >= 2 && (
            <Panel>
              <SectionTitle
                title={`Weight Trend (${weightUnit})`}
                subtitle={`Last ${chartData.length} entries`}
              />
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                    <defs>
                      <linearGradient id="weightLine" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#8b5cf6" />
                        <stop offset="100%" stopColor="#ec4899" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v: string) => v.slice(5)}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      domain={["auto", "auto"]}
                      tickFormatter={(v: number) => `${v}`}
                    />
                    <Tooltip
                      content={(props) => (
                        <WeightTooltip
                          active={props.active}
                          payload={
                            props.payload as unknown as ChartPayloadItem[] | undefined
                          }
                          unit={weightUnit}
                        />
                      )}
                    />
                    <Line
                      type="monotone"
                      dataKey="displayWeight"
                      stroke="url(#weightLine)"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: "#8b5cf6", strokeWidth: 0 }}
                      activeDot={{ r: 5, fill: "#ec4899" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Panel>
          )}

          {/* Stats cards */}
          {sortedWeight.length >= 2 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                {
                  label: "Highest logged",
                  value: fmtWeight(highestKg, weightUnit),
                  color: "text-red-400",
                },
                {
                  label: "Lowest logged",
                  value: fmtWeight(lowestKg, weightUnit),
                  color: "text-green-400",
                },
                {
                  label: "Total change",
                  value:
                    totalChange !== null
                      ? `${totalChange > 0 ? "+" : ""}${totalChange.toFixed(1)} ${weightUnit}`
                      : "—",
                  color: totalChange !== null && totalChange < 0 ? "text-green-400" : "text-red-400",
                },
                {
                  label: "This month",
                  value:
                    monthChange !== null
                      ? `${monthChange > 0 ? "+" : ""}${monthChange.toFixed(1)} ${weightUnit}`
                      : "—",
                  color:
                    monthChange !== null && monthChange < 0
                      ? "text-green-400"
                      : "text-orange-400",
                },
              ].map((s) => (
                <Panel key={s.label} className="text-center">
                  <p className="text-[10px] text-white/30 uppercase tracking-widest mb-1">
                    {s.label}
                  </p>
                  <p className={`text-base font-bold ${s.color}`}>{s.value}</p>
                </Panel>
              ))}
            </div>
          )}

          {/* History */}
          {sortedWeight.length > 0 && (
            <Panel>
              <SectionTitle title="History" subtitle="Last 10 entries" />
              <div className="space-y-2">
                {[...sortedWeight]
                  .reverse()
                  .slice(0, 10)
                  .map((entry) =>
                    editingWeightId === entry.id ? (
                      /* inline edit form */
                      <div
                        key={entry.id}
                        className="p-3 bg-white/[0.04] rounded-lg border border-violet-500/30 space-y-3"
                      >
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          <div>
                            <label className={labelCls}>Date</label>
                            <input
                              type="date"
                              className={inputCls}
                              value={editForm.date}
                              onChange={(e) =>
                                setEditForm((p) => ({ ...p, date: e.target.value }))
                              }
                            />
                          </div>
                          <div>
                            <label className={labelCls}>Weight ({weightUnit})</label>
                            <input
                              type="number"
                              step="0.1"
                              className={inputCls}
                              value={editForm.weight}
                              onChange={(e) =>
                                setEditForm((p) => ({
                                  ...p,
                                  weight: e.target.value,
                                }))
                              }
                            />
                          </div>
                          <div>
                            <label className={labelCls}>Body Fat %</label>
                            <input
                              type="number"
                              step="0.1"
                              className={inputCls}
                              value={editForm.bodyFat}
                              onChange={(e) =>
                                setEditForm((p) => ({
                                  ...p,
                                  bodyFat: e.target.value,
                                }))
                              }
                            />
                          </div>
                        </div>
                        <div>
                          <label className={labelCls}>Notes</label>
                          <input
                            type="text"
                            className={inputCls}
                            value={editForm.notes}
                            onChange={(e) =>
                              setEditForm((p) => ({ ...p, notes: e.target.value }))
                            }
                          />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={saveEditWeight} className={btnPrimary}>
                            Save
                          </button>
                          <button
                            onClick={() => setEditingWeightId(null)}
                            className={btnGhost}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* normal row */
                      <div
                        key={entry.id}
                        className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-white/[0.03] transition-colors group"
                      >
                        <div className="flex items-center gap-4">
                          <span className="text-xs text-white/30 w-24 shrink-0">
                            {entry.date}
                          </span>
                          <span className="text-sm font-semibold text-white">
                            {fmtWeight(entry.weightKg, weightUnit)}
                          </span>
                          {entry.bodyFatPct != null && (
                            <span className="text-xs text-white/30">
                              {entry.bodyFatPct}% bf
                            </span>
                          )}
                          {entry.notes && (
                            <span className="text-xs text-white/20 italic truncate max-w-[200px]">
                              {entry.notes}
                            </span>
                          )}
                        </div>
                        <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => startEditWeight(entry)}
                            className={btnGhost}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteWeight(entry.id)}
                            className="px-3 py-1.5 rounded-lg border border-red-500/20 text-red-400/60 hover:text-red-400 hover:border-red-500/40 text-xs transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )
                  )}
              </div>
            </Panel>
          )}

          {weightEntries.length === 0 && (
            <Panel className="text-center py-12">
              <p className="text-4xl mb-3">⚖️</p>
              <p className="text-white/50 text-sm">
                No weight entries yet. Log your first weight above!
              </p>
            </Panel>
          )}
        </div>
      )}

      {/* ═══════════════════════ MEDIA VAULT TAB ═══════════════════════ */}
      {activeTab === "media" && (
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h2 className="text-lg font-semibold text-white">
              🎬 Progress Media Vault
            </h2>
            <p className="text-sm text-white/30 mt-0.5">
              Save links to your training clips and track your progress over
              time.
            </p>
          </div>

          {/* Add / Edit form */}
          <Panel>
            <div className="flex items-center justify-between mb-4">
              <SectionTitle
                title={editingMediaId ? "Edit Clip" : "Add Clip"}
              />
              {!showMediaForm && (
                <button
                  onClick={() => setShowMediaForm(true)}
                  className={btnPrimary}
                >
                  ＋ Add clip
                </button>
              )}
            </div>

            {showMediaForm && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Title *</label>
                    <input
                      type="text"
                      className={inputCls}
                      placeholder="e.g. Outside leg hang attempt"
                      value={mForm.title}
                      onChange={(e) =>
                        setMForm((p) => ({ ...p, title: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Date</label>
                    <input
                      type="date"
                      className={inputCls}
                      value={mForm.date}
                      onChange={(e) =>
                        setMForm((p) => ({ ...p, date: e.target.value }))
                      }
                    />
                  </div>
                </div>

                <div>
                  <label className={labelCls}>
                    URL / Link (YouTube, Google Drive, Instagram…)
                  </label>
                  <input
                    type="url"
                    className={inputCls}
                    placeholder="https://..."
                    value={mForm.url}
                    onChange={(e) =>
                      setMForm((p) => ({ ...p, url: e.target.value }))
                    }
                  />
                </div>

                <div>
                  <label className={labelCls}>Tags</label>
                  <div className="flex flex-wrap gap-2">
                    {ALL_TAGS.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => toggleMediaTag(tag)}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                          mForm.tags.includes(tag)
                            ? TAG_COLORS[tag]
                            : "border-white/[0.08] text-white/25 hover:text-white/50"
                        }`}
                      >
                        {TAG_LABELS[tag]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>
                      Skill / Move Name (optional)
                    </label>
                    <input
                      type="text"
                      className={inputCls}
                      placeholder="e.g. Outside leg hang"
                      value={mForm.skillName}
                      onChange={(e) =>
                        setMForm((p) => ({ ...p, skillName: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Confidence Rating</label>
                    <div className="flex gap-1 pt-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          onClick={() =>
                            setMForm((p) => ({
                              ...p,
                              confidenceRating:
                                p.confidenceRating === n ? 0 : n,
                            }))
                          }
                          className="text-xl transition-transform hover:scale-110"
                        >
                          {n <= mForm.confidenceRating ? "⭐" : "☆"}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className={labelCls}>
                    Notes — What improved? What still needs work?
                  </label>
                  <textarea
                    rows={3}
                    className={inputCls + " resize-none"}
                    placeholder="Observations about this clip..."
                    value={mForm.notes}
                    onChange={(e) =>
                      setMForm((p) => ({ ...p, notes: e.target.value }))
                    }
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={saveMedia}
                    disabled={!mForm.title.trim()}
                    className={
                      btnPrimary + " disabled:opacity-40 disabled:cursor-not-allowed"
                    }
                  >
                    {editingMediaId ? "Update clip" : "Save clip"}
                  </button>
                  <button
                    onClick={() => {
                      setShowMediaForm(false);
                      setEditingMediaId(null);
                      setMForm(blankMediaForm());
                    }}
                    className={btnGhost}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </Panel>

          {/* Filter bar */}
          <Panel>
            <div className="flex flex-wrap gap-3 items-center">
              <div>
                <label className={labelCls}>Filter by tag</label>
                <select
                  className={inputCls + " w-auto"}
                  value={mediaTagFilter}
                  onChange={(e) =>
                    setMediaTagFilter(e.target.value as MediaTag | "all")
                  }
                >
                  <option value="all">All tags</option>
                  {ALL_TAGS.map((t) => (
                    <option key={t} value={t}>
                      {TAG_LABELS[t]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Date range</label>
                <div className="flex gap-1">
                  {(["all", "month", "week"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setMediaDateFilter(f)}
                      className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${
                        mediaDateFilter === f
                          ? "bg-violet-500/20 border-violet-500/40 text-violet-300"
                          : "border-white/[0.08] text-white/30 hover:text-white/60"
                      }`}
                    >
                      {f === "all" ? "All time" : f === "month" ? "This month" : "This week"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex-1 min-w-[160px]">
                <label className={labelCls}>Search</label>
                <input
                  type="text"
                  className={inputCls}
                  placeholder="Search title or skill..."
                  value={mediaSearch}
                  onChange={(e) => setMediaSearch(e.target.value)}
                />
              </div>
            </div>
          </Panel>

          {/* Media grid */}
          {filteredMedia.length === 0 ? (
            <Panel className="text-center py-16">
              <p className="text-4xl mb-3">🎬</p>
              <p className="text-white/50 text-sm">
                {mediaEntries.length === 0
                  ? "No clips saved yet. Add your first training clip to start tracking your visual progress. 🎬"
                  : "No clips match your filters."}
              </p>
            </Panel>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredMedia.map((entry) => (
                <Panel key={entry.id} hoverable className="flex flex-col gap-3">
                  {/* Title & date */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white text-sm leading-tight truncate">
                        {entry.title}
                      </p>
                      <p className="text-[11px] text-white/30 mt-0.5">
                        {entry.date}
                      </p>
                    </div>
                    {entry.confidenceRating != null &&
                      entry.confidenceRating > 0 && (
                        <span className="text-sm shrink-0">
                          {"⭐".repeat(entry.confidenceRating)}
                          {"☆".repeat(5 - entry.confidenceRating)}
                        </span>
                      )}
                  </div>

                  {/* Tags */}
                  {entry.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {entry.tags.map((tag) => (
                        <span
                          key={tag}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${TAG_COLORS[tag]}`}
                        >
                          {TAG_LABELS[tag]}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Skill name */}
                  {entry.skillName && (
                    <p className="text-xs text-white/40">
                      🎯 {entry.skillName}
                    </p>
                  )}

                  {/* Notes */}
                  {entry.notes && (
                    <div>
                      <p
                        className={`text-xs text-white/40 leading-relaxed ${
                          expandedNoteId === entry.id ? "" : "line-clamp-2"
                        }`}
                      >
                        {entry.notes}
                      </p>
                      {entry.notes.length > 80 && (
                        <button
                          onClick={() =>
                            setExpandedNoteId((prev) =>
                              prev === entry.id ? null : entry.id
                            )
                          }
                          className="text-[11px] text-violet-400/70 hover:text-violet-300 mt-0.5 transition-colors"
                        >
                          {expandedNoteId === entry.id
                            ? "Show less"
                            : "Show more"}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 mt-auto pt-1">
                    {entry.url && (
                      <a
                        href={entry.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 text-center px-3 py-1.5 rounded-lg bg-violet-500/15 border border-violet-500/25 text-violet-300 text-xs font-medium hover:bg-violet-500/25 transition-colors"
                      >
                        ▶ Watch clip
                      </a>
                    )}
                    <button
                      onClick={() => startEditMedia(entry)}
                      className={btnGhost}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteMedia(entry.id)}
                      className="px-3 py-1.5 rounded-lg border border-red-500/20 text-red-400/60 hover:text-red-400 hover:border-red-500/40 text-xs transition-colors"
                    >
                      ✕
                    </button>
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
