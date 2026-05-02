"use client";

import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Panel from "@/components/dashboard/Panel";
import SectionTitle from "@/components/dashboard/SectionTitle";
import {
  generateWeightId,
  loadWeightEntries,
  saveWeightEntries,
  todayDateString,
  type WeightEntry,
} from "@/lib/progressData";

type WeightUnit = "kg" | "lbs";

type WeightForm = {
  date: string;
  weight: string;
  bodyFat: string;
  notes: string;
  waist: string;
  hips: string;
  chest: string;
  thigh: string;
  arm: string;
};

function emptyForm(): WeightForm {
  return {
    date: todayDateString(),
    weight: "",
    bodyFat: "",
    notes: "",
    waist: "",
    hips: "",
    chest: "",
    thigh: "",
    arm: "",
  };
}

function kgToDisplay(kg: number, unit: WeightUnit): number {
  const val = unit === "lbs" ? kg * 2.2046 : kg;
  return Math.round(val * 10) / 10;
}

function displayToKg(val: number, unit: WeightUnit): number {
  return unit === "lbs" ? val / 2.2046 : val;
}

function formatWeight(kg: number, unit: WeightUnit): string {
  return `${kgToDisplay(kg, unit).toFixed(1)} ${unit}`;
}

export default function ProgressPage() {
  const [mounted, setMounted] = useState(false);
  const [entries, setEntries] = useState<WeightEntry[]>([]);
  const [unit, setUnit] = useState<WeightUnit>("kg");
  const [form, setForm] = useState<WeightForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    setEntries(loadWeightEntries());
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const latest = sorted[sorted.length - 1] ?? null;
  const previous = sorted[sorted.length - 2] ?? null;
  const chartData = sorted.slice(-30).map((entry) => ({
    date: entry.date,
    weight: kgToDisplay(entry.weightKg, unit),
  }));

  const inputClass =
    "w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white placeholder-white/20 outline-none focus:border-violet-500/40";

  function persist(next: WeightEntry[]) {
    setEntries(next);
    saveWeightEntries(next);
  }

  function saveEntry() {
    const parsedWeight = Number(form.weight);
    if (!form.date || !parsedWeight || parsedWeight <= 0) return;

    const hasMeasurements = form.waist || form.hips || form.chest || form.thigh || form.arm;
    const now = new Date().toISOString();
    const entry: WeightEntry = {
      id: editingId ?? generateWeightId(),
      date: form.date,
      weightKg: Math.round(displayToKg(parsedWeight, unit) * 1000) / 1000,
      bodyFatPct: form.bodyFat ? Number(form.bodyFat) : undefined,
      measurements: hasMeasurements
        ? {
            waistCm: form.waist ? Number(form.waist) : undefined,
            hipsCm: form.hips ? Number(form.hips) : undefined,
            chestCm: form.chest ? Number(form.chest) : undefined,
            thighCm: form.thigh ? Number(form.thigh) : undefined,
            armCm: form.arm ? Number(form.arm) : undefined,
          }
        : undefined,
      notes: form.notes.trim() || undefined,
      createdAt: editingId ? entries.find((item) => item.id === editingId)?.createdAt ?? now : now,
    };

    persist(editingId ? entries.map((item) => item.id === editingId ? entry : item) : [...entries, entry]);
    setEditingId(null);
    setForm(emptyForm());
  }

  function editEntry(entry: WeightEntry) {
    setEditingId(entry.id);
    setForm({
      date: entry.date,
      weight: String(kgToDisplay(entry.weightKg, unit)),
      bodyFat: entry.bodyFatPct != null ? String(entry.bodyFatPct) : "",
      notes: entry.notes ?? "",
      waist: entry.measurements?.waistCm != null ? String(entry.measurements.waistCm) : "",
      hips: entry.measurements?.hipsCm != null ? String(entry.measurements.hipsCm) : "",
      chest: entry.measurements?.chestCm != null ? String(entry.measurements.chestCm) : "",
      thigh: entry.measurements?.thighCm != null ? String(entry.measurements.thighCm) : "",
      arm: entry.measurements?.armCm != null ? String(entry.measurements.armCm) : "",
    });
  }

  function deleteEntry(id: string) {
    persist(entries.filter((entry) => entry.id !== id));
    if (editingId === id) {
      setEditingId(null);
      setForm(emptyForm());
    }
  }

  const latestChange = latest && previous ? kgToDisplay(latest.weightKg - previous.weightKg, unit) : null;

  return (
    <div className="max-w-5xl space-y-5">
      <div className="border-b border-white/[0.06] pb-3">
        <h1 className="text-2xl font-semibold text-white">Progress</h1>
        <p className="mt-0.5 text-[12px] text-white/30">
          Track weight, measurements, and body notes. Training clips live in Media Vault.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { label: "Latest", value: latest ? formatWeight(latest.weightKg, unit) : "-", color: "text-violet-300" },
          { label: "Change", value: latestChange == null ? "-" : `${latestChange > 0 ? "+" : ""}${latestChange.toFixed(1)} ${unit}`, color: latestChange != null && latestChange < 0 ? "text-emerald-300" : "text-pink-300" },
          { label: "Entries", value: entries.length, color: "text-sky-300" },
          { label: "Unit", value: unit, color: "text-white/80" },
        ].map((stat) => (
          <Panel key={stat.label}>
            <p className="text-[10px] uppercase tracking-widest text-white/25">{stat.label}</p>
            <p className={`mt-1 text-2xl font-bold tabular-nums ${stat.color}`}>{stat.value}</p>
          </Panel>
        ))}
      </div>

      <Panel>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <SectionTitle title={editingId ? "Edit Progress Entry" : "Log Progress"} />
          <div className="flex rounded-xl border border-white/[0.08] bg-white/[0.03] p-1">
            {(["kg", "lbs"] as const).map((nextUnit) => (
              <button
                key={nextUnit}
                type="button"
                onClick={() => setUnit(nextUnit)}
                className={`rounded-lg px-3 py-1.5 text-[12px] ${unit === nextUnit ? "bg-white/[0.09] text-white" : "text-white/35"}`}
              >
                {nextUnit}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <input type="date" className={inputClass} value={form.date} onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))} />
          <input type="number" step="0.1" className={inputClass} placeholder={`Weight (${unit})`} value={form.weight} onChange={(event) => setForm((prev) => ({ ...prev, weight: event.target.value }))} />
          <input type="number" step="0.1" className={inputClass} placeholder="Body fat % optional" value={form.bodyFat} onChange={(event) => setForm((prev) => ({ ...prev, bodyFat: event.target.value }))} />
          {(["waist", "hips", "chest", "thigh", "arm"] as const).map((field) => (
            <input
              key={field}
              type="number"
              step="0.5"
              className={inputClass}
              placeholder={`${field[0].toUpperCase()}${field.slice(1)} cm`}
              value={form[field]}
              onChange={(event) => setForm((prev) => ({ ...prev, [field]: event.target.value }))}
            />
          ))}
          <textarea className={inputClass + " resize-none md:col-span-3"} rows={2} placeholder="Body notes" value={form.notes} onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} />
        </div>
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={saveEntry} disabled={!form.weight || !form.date} className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-40">
            {editingId ? "Save Entry" : "Add Entry"}
          </button>
          {editingId && (
            <button type="button" onClick={() => { setEditingId(null); setForm(emptyForm()); }} className="rounded-xl border border-white/[0.08] px-4 py-2 text-sm text-white/45 hover:text-white">
              Cancel
            </button>
          )}
        </div>
      </Panel>

      {chartData.length >= 2 && (
        <Panel>
          <SectionTitle title="Progress Trend" subtitle={`Last ${chartData.length} entries`} />
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} tickLine={false} axisLine={false} domain={["auto", "auto"]} />
                <Tooltip contentStyle={{ background: "#0B0F1A", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12 }} />
                <Line type="monotone" dataKey="weight" stroke="#8b5cf6" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      )}

      <Panel>
        <SectionTitle title="History" subtitle="Edit or delete progress entries" />
        {sorted.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-white/[0.08] p-6 text-center text-sm text-white/30">
            No progress entries yet.
          </p>
        ) : (
          <div className="mt-4 space-y-2">
            {[...sorted].reverse().map((entry) => (
              <div key={entry.id} className="flex flex-col gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-white">{formatWeight(entry.weightKg, unit)}</p>
                  <p className="text-[12px] text-white/35">{entry.date}{entry.notes ? ` · ${entry.notes}` : ""}</p>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => editEntry(entry)} className="rounded-lg border border-white/[0.08] px-3 py-1.5 text-[12px] text-white/45 hover:text-white">
                    Edit
                  </button>
                  <button type="button" onClick={() => deleteEntry(entry.id)} className="rounded-lg border border-red-500/20 px-3 py-1.5 text-[12px] text-red-300/70 hover:text-red-300">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
