"use client";

import { useEffect, useState } from "react";
import Panel from "@/components/dashboard/Panel";
import SectionTitle from "@/components/dashboard/SectionTitle";
import {
  BODY_AREAS,
  type DailyCheckIn,
  emptyCheckIn,
  generateCheckInId,
  getCheckInForDate,
  loadDailyCheckIns,
  saveDailyCheckIns,
  todayDateString,
} from "@/lib/dailyCheckinData";

const TRAINING_TYPES = [
  { value: "pole", label: "Pole" },
  { value: "heels", label: "Heels" },
  { value: "conditioning", label: "Conditioning" },
  { value: "flexibility", label: "Flexibility" },
  { value: "performance", label: "Performance" },
  { value: "other", label: "Other" },
];

function ScaleButtons({
  value,
  onChange,
  low,
  high,
}: {
  value: number;
  onChange: (value: number) => void;
  low: string;
  high: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`h-10 flex-1 rounded-xl border text-sm font-semibold transition-all ${
              value === n
                ? "border-violet-500/50 bg-violet-500/25 text-violet-100"
                : "border-white/[0.07] text-white/35 hover:border-white/20 hover:text-white/65"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="flex justify-between px-0.5 text-[10px] text-white/25">
        <span>{low}</span>
        <span>{high}</span>
      </div>
    </div>
  );
}

export default function EclipseBodyCheckPage() {
  const [mounted, setMounted] = useState(false);
  const [checkIns, setCheckIns] = useState<DailyCheckIn[]>([]);
  const [selectedDate, setSelectedDate] = useState(todayDateString());
  const [form, setForm] = useState({
    soreness: 3,
    flexibilityFeeling: 3,
    strengthFeeling: 3,
    bodyNotes: "",
    bodyAreas: [] as string[],
    trainedToday: false,
    trainingType: "",
    trainingDuration: "",
  });

  useEffect(() => {
    const all = loadDailyCheckIns();
    setCheckIns(all);
    const existing = getCheckInForDate(all, selectedDate);
    if (existing) {
      setForm({
        soreness: existing.soreness,
        flexibilityFeeling: existing.flexibilityFeeling,
        strengthFeeling: existing.strengthFeeling,
        bodyNotes: existing.bodyNotes ?? "",
        bodyAreas: existing.bodyAreas ?? [],
        trainedToday: existing.trainedToday,
        trainingType: existing.trainingType ?? "",
        trainingDuration: existing.trainingDuration ? String(existing.trainingDuration) : "",
      });
    }
    setMounted(true);
  }, [selectedDate]);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleBodyArea(area: string) {
    setForm((prev) => ({
      ...prev,
      bodyAreas: prev.bodyAreas.includes(area)
        ? prev.bodyAreas.filter((item) => item !== area)
        : [...prev.bodyAreas, area],
    }));
  }

  function handleSave() {
    const existing = getCheckInForDate(checkIns, selectedDate);
    const now = new Date().toISOString();
    const entry: DailyCheckIn = {
      ...emptyCheckIn(),
      ...existing,
      id: existing?.id ?? generateCheckInId(),
      date: selectedDate,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      soreness: form.soreness,
      flexibilityFeeling: form.flexibilityFeeling,
      strengthFeeling: form.strengthFeeling,
      bodyNotes: form.bodyNotes || undefined,
      bodyAreas: form.bodyAreas,
      trainedToday: form.trainedToday,
      trainingType: form.trainedToday && form.trainingType ? form.trainingType : undefined,
      trainingDuration: form.trainedToday && form.trainingDuration ? Number(form.trainingDuration) : undefined,
    };
    const updated = existing
      ? checkIns.map((checkIn) => (checkIn.id === existing.id ? entry : checkIn))
      : [entry, ...checkIns];
    saveDailyCheckIns(updated);
    setCheckIns(updated);
  }

  if (!mounted) return <div className="text-sm text-white/25">Loading...</div>;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="border-b border-white/[0.06] pb-3">
        <h1 className="text-2xl font-semibold tracking-tight text-white">Body Check</h1>
        <p className="mt-0.5 text-[12px] text-white/30">Track how your body feels for dance and training.</p>
      </div>

      <Panel>
        <SectionTitle title="Body Check" subtitle="How does your body feel right now?" />
        <div className="space-y-5">
          {[
            { key: "soreness" as const, label: "Soreness", low: "Very sore", high: "Feeling fresh" },
            { key: "flexibilityFeeling" as const, label: "Flexibility feeling", low: "Super stiff", high: "Super flexible" },
            { key: "strengthFeeling" as const, label: "Strength feeling", low: "Weak today", high: "Feeling strong" },
          ].map(({ key, label, low, high }) => (
            <div key={key}>
              <p className="mb-2 text-[12px] font-medium text-white/60">{label}</p>
              <ScaleButtons value={form[key]} onChange={(value) => set(key, value)} low={low} high={high} />
            </div>
          ))}

          <div>
            <p className="mb-2 text-[12px] font-medium text-white/60">Body area tags</p>
            <div className="flex flex-wrap gap-2">
              {BODY_AREAS.map((area) => (
                <button
                  key={area}
                  type="button"
                  onClick={() => toggleBodyArea(area)}
                  className={`rounded-xl border px-3 py-2 text-[12px] font-medium transition-colors ${
                    form.bodyAreas.includes(area)
                      ? "border-violet-400/40 bg-violet-500/15 text-violet-100"
                      : "border-white/[0.08] bg-white/[0.03] text-white/45 hover:border-white/20 hover:text-white/70"
                  }`}
                >
                  {area}
                </button>
              ))}
            </div>
          </div>

          <textarea
            rows={4}
            value={form.bodyNotes}
            onChange={(event) => set("bodyNotes", event.target.value)}
            placeholder="Any pain, injuries, tightness, or body notes?"
            className="w-full resize-none rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-3 text-sm text-white/75 placeholder-white/20 outline-none transition-colors focus:border-violet-500/40 focus:bg-white/[0.05]"
          />
        </div>
      </Panel>

      <Panel>
        <SectionTitle title="Training Today" />
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => set("trainedToday", !form.trainedToday)}
            className={`relative h-6 w-11 rounded-full transition-colors ${form.trainedToday ? "bg-violet-500" : "bg-white/[0.1]"}`}
          >
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${form.trainedToday ? "translate-x-5" : "translate-x-0.5"}`} />
          </button>
          <span className="ml-3 text-[13px] text-white/70">{form.trainedToday ? "Yes, I trained today" : "No training today"}</span>

          {form.trainedToday && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {TRAINING_TYPES.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => set("trainingType", type.value)}
                    className={`rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-all ${
                      form.trainingType === type.value
                        ? "border-violet-500/50 bg-violet-500/25 text-violet-200"
                        : "border-white/[0.08] text-white/35 hover:border-white/20 hover:text-white/60"
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
              <input
                type="number"
                min="1"
                max="300"
                value={form.trainingDuration}
                onChange={(event) => set("trainingDuration", event.target.value)}
                placeholder="Minutes"
                className="w-32 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white/80 placeholder-white/20 outline-none focus:border-violet-500/50"
              />
            </div>
          )}
        </div>
      </Panel>

      <button
        type="button"
        onClick={handleSave}
        className="rounded-2xl bg-violet-600 py-4 text-sm font-semibold text-white transition-colors hover:bg-violet-500"
      >
        Save body check
      </button>
    </div>
  );
}
