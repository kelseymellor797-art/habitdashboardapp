"use client";

import { useEffect, useState } from "react";
import Panel from "@/components/dashboard/Panel";
import SectionTitle from "@/components/dashboard/SectionTitle";
import {
  type DailyCheckIn,
  emptyCheckIn,
  generateCheckInId,
  getCheckInForDate,
  loadDailyCheckIns,
  saveDailyCheckIns,
  todayDateString,
} from "@/lib/dailyCheckinData";

export default function EndOfDayReflectionPage() {
  const [mounted, setMounted] = useState(false);
  const [checkIns, setCheckIns] = useState<DailyCheckIn[]>([]);
  const [selectedDate] = useState(todayDateString());
  const [form, setForm] = useState({
    mentalStateNotes: "",
    wins: "",
    whatFeltHard: "",
    goalsForTomorrow: "",
  });

  useEffect(() => {
    const all = loadDailyCheckIns();
    setCheckIns(all);
    const existing = getCheckInForDate(all, selectedDate);
    if (existing) {
      setForm({
        mentalStateNotes: existing.mentalStateNotes ?? "",
        wins: existing.wins ?? "",
        whatFeltHard: existing.whatFeltHard ?? "",
        goalsForTomorrow: existing.goalsForTomorrow ?? "",
      });
    }
    setMounted(true);
  }, [selectedDate]);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
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
      mentalStateNotes: form.mentalStateNotes || undefined,
      wins: form.wins || undefined,
      whatFeltHard: form.whatFeltHard || undefined,
      goalsForTomorrow: form.goalsForTomorrow || undefined,
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
        <h1 className="text-2xl font-semibold tracking-tight text-white">End-of-Day Reflection</h1>
        <p className="mt-0.5 text-[12px] text-white/30">Close the day out and capture what changed since morning.</p>
      </div>

      <Panel>
        <SectionTitle title="Reflection" subtitle="How did the day end?" />
        <div className="space-y-4">
          {[
            { key: "mentalStateNotes" as const, label: "Mental state", placeholder: "How does your head feel tonight?" },
            { key: "wins" as const, label: "Wins today", placeholder: "What went well? No win is too small." },
            { key: "whatFeltHard" as const, label: "What felt hard", placeholder: "What challenged you today?" },
            { key: "goalsForTomorrow" as const, label: "Tomorrow", placeholder: "One thing you want to focus on tomorrow." },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="mb-1.5 block text-[12px] font-medium text-white/50">{label}</label>
              <textarea
                rows={3}
                value={form[key]}
                onChange={(event) => set(key, event.target.value)}
                placeholder={placeholder}
                className="w-full resize-none rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-3 text-sm text-white/75 placeholder-white/20 outline-none transition-colors focus:border-emerald-500/40 focus:bg-white/[0.05]"
              />
            </div>
          ))}
        </div>
      </Panel>

      <button
        type="button"
        onClick={handleSave}
        className="rounded-2xl bg-emerald-600 py-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-500"
      >
        Save reflection
      </button>
    </div>
  );
}
