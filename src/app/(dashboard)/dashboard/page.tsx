"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Panel from "@/components/dashboard/Panel";
import { loadHabits, loadCompletions } from "@/lib/store";
import { type DanceDailyStatus, loadDailyStatuses } from "@/lib/danceData";
import {
  type DailyCheckIn,
  loadDailyCheckIns,
  getTodayCheckIn,
  todayDateString,
} from "@/lib/dailyCheckinData";
import { isDueToday } from "@/lib/habitUtils";
import { MONTH_CONFIG } from "@/lib/habitData";

// ── Constants ──────────────────────────────────────────────────────────────────

const QUOTES = [
  "Slow progress is still progress. 🌱",
  "You are building, not failing. 💪",
  "Consistency counts even before visible results. ✨",
  "Every rep is a deposit in your future body. 🏋️",
  "Trust the process. Trust yourself. 🙏",
  "Strength doesn't arrive — it accumulates. ⚡",
  "Your future self is cheering you on right now. 🎉",
  "Small steps forward are still forward. 🚀",
  "You don't have to be perfect, just consistent. 🌟",
  "Every time you show up, you become stronger. 💃",
  "The work you do in the dark shows up in the light. ✦",
  "Rest is part of training. Recovery is part of progress. 🌙",
];

const MOOD_EMOJIS: Record<number, string> = {
  1: "😞", 2: "😕", 3: "😐", 4: "😊", 5: "🤩",
};
const ENERGY_EMOJIS: Record<number, string> = {
  1: "🪫", 2: "😴", 3: "⚡", 4: "🔥", 5: "💥",
};

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function getDailyQuote(): string {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  return QUOTES[dayOfYear % QUOTES.length];
}

// ── Tiny progress bar ──────────────────────────────────────────────────────────

function MiniBar({ pct, color = "bg-violet-500" }: { pct: number; color?: string }) {
  return (
    <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${Math.min(100, pct)}%` }}
      />
    </div>
  );
}

// ── Water quick-add ────────────────────────────────────────────────────────────

const WATER_KEY = "wellness-water";
const WATER_GOAL = 2000;

type WaterLog = { date: string; amount: number };

function loadWater(): WaterLog[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(WATER_KEY);
    return raw ? (JSON.parse(raw) as WaterLog[]) : [];
  } catch { return []; }
}
function saveWater(logs: WaterLog[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(WATER_KEY, JSON.stringify(logs));
}

// ── Medication ─────────────────────────────────────────────────────────────────

const MED_KEY = "wellness-medication-logs";

type MedEntry = { date: string; name: string; taken: boolean };

function loadMeds(): MedEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(MED_KEY);
    return raw ? (JSON.parse(raw) as MedEntry[]) : [];
  } catch { return []; }
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);

  // Habits
  const [habitsTotal, setHabitsTotal] = useState(0);
  const [habitsDone, setHabitsDone] = useState(0);

  // Dance
  const [todayDance, setTodayDance] = useState<DanceDailyStatus | null>(null);

  // Daily check-in
  const [todayCheckIn, setTodayCheckIn] = useState<DailyCheckIn | null>(null);

  // Water
  const [waterAmount, setWaterAmount] = useState(0);
  const [waterLogs, setWaterLogs] = useState<WaterLog[]>([]);

  // Medication
  const [medTaken, setMedTaken] = useState(0);
  const [medTotal, setMedTotal] = useState(0);

  const today = todayDateString();

  useEffect(() => {
    // Habits
    const habits = loadHabits().filter((h) => h.active !== false);
    const completions = loadCompletions();
    const { todayDay, startDow } = MONTH_CONFIG;
    const dueHabits = habits.filter((h) =>
      isDueToday(h.scheduleType ?? "daily", h.customDays, todayDay, startDow)
    );
    const todayCompletions = new Set(
      completions.filter((c) => c.date === today).map((c) => c.habitId)
    );
    setHabitsTotal(dueHabits.length);
    setHabitsDone(dueHabits.filter((h) => todayCompletions.has(h.id)).length);

    // Dance
    const statuses = loadDailyStatuses();
    const ds = statuses.find((s) => s.date === today) ?? null;
    setTodayDance(ds);

    // Check-in
    const checkIns = loadDailyCheckIns();
    setTodayCheckIn(getTodayCheckIn(checkIns) ?? null);

    // Water
    const wl = loadWater();
    setWaterLogs(wl);
    const todayWater = wl.filter((w) => w.date === today).reduce((s, w) => s + w.amount, 0);
    setWaterAmount(todayWater);

    // Medication
    const meds = loadMeds();
    const todayMeds = meds.filter((m) => m.date === today);
    setMedTotal(todayMeds.length);
    setMedTaken(todayMeds.filter((m) => m.taken).length);

    setMounted(true);
  }, [today]);

  function addWater() {
    const newEntry: WaterLog = { date: today, amount: 250 };
    const updated = [...waterLogs, newEntry];
    saveWater(updated);
    setWaterLogs(updated);
    setWaterAmount((prev) => prev + 250);
  }

  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="text-white/20 text-sm">Loading…</div>
      </div>
    );
  }

  const habitsPct = habitsTotal > 0 ? Math.round((habitsDone / habitsTotal) * 100) : 0;
  const waterPct = Math.round((waterAmount / WATER_GOAL) * 100);

  const dateLabel = new Date(today + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });

  return (
    <div className="space-y-7 max-w-4xl">
      {/* Header */}
      <div>
        <p className="text-[11px] text-white/25 uppercase tracking-widest mb-1">{dateLabel}</p>
        <h1 className="text-[28px] font-bold text-white leading-tight">
          {getGreeting()}, Katrina ☀️
        </h1>
      </div>

      {/* Quote card */}
      <div className="relative overflow-hidden rounded-2xl px-5 py-4 border border-violet-500/20"
        style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.12) 0%, rgba(236,72,153,0.08) 100%)" }}>
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: "radial-gradient(circle at 20% 50%, #8b5cf6 0%, transparent 60%)" }} />
        <p className="text-[11px] text-white/30 uppercase tracking-widest mb-1">Daily motivation ✨</p>
        <p className="text-[15px] font-medium text-white/80 italic">&ldquo;{getDailyQuote()}&rdquo;</p>
      </div>

      {/* Quick shortcuts */}
      <div className="flex flex-wrap gap-2">
        {[
          { icon: "📝", label: "Check-In", href: "/daily-checkin" },
          { icon: "💃", label: "Log Training", href: "/dance" },
          { icon: "💧", label: "Log Water", href: "/water" },
          { icon: "💊", label: "Medications", href: "/medication" },
        ].map(({ icon, label, href }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/[0.12] transition-all text-[13px] text-white/60 hover:text-white/85"
          >
            <span>{icon}</span>
            {label}
          </Link>
        ))}
      </div>

      {/* Snapshot grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">

        {/* Habits today */}
        <Panel className="flex flex-col gap-3" hoverable>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] text-white/25 uppercase tracking-widest mb-0.5">Habits Today</p>
              <p className="text-2xl font-bold text-white">
                {habitsDone}
                <span className="text-white/25 text-lg font-normal">/{habitsTotal}</span>
              </p>
            </div>
            <span className="text-2xl">✅</span>
          </div>
          <MiniBar
            pct={habitsPct}
            color={habitsPct === 100 ? "bg-emerald-500" : "bg-violet-500"}
          />
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-white/35">
              {habitsPct === 100
                ? "All done! 🎉"
                : habitsTotal === 0
                ? "No habits due"
                : `${habitsPct}% complete`}
            </span>
            <Link href="/daily" className="text-[11px] text-violet-400 hover:text-violet-300">
              View all →
            </Link>
          </div>
        </Panel>

        {/* Training */}
        <Panel className="flex flex-col gap-3" hoverable>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] text-white/25 uppercase tracking-widest mb-0.5">Training</p>
              <p className="text-[15px] font-semibold text-white/80 mt-1">
                {todayDance
                  ? (todayDance.trainedToday ? "Trained today 💪" : "Rest day")
                  : "Not logged yet"}
              </p>
            </div>
            <span className="text-2xl">💃</span>
          </div>
          {todayDance && (
            <div className="flex gap-4 mt-1">
              <div className="flex flex-col">
                <span className="text-[10px] text-white/25">Mood</span>
                <span className="text-[13px] text-white/60">{todayDance.mood}/5</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-white/25">Confidence</span>
                <span className="text-[13px] text-white/60">{todayDance.confidence}/5</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-white/25">Soreness</span>
                <span className="text-[13px] text-white/60">{todayDance.soreness}/5</span>
              </div>
            </div>
          )}
          <Link href="/dance" className="text-[11px] text-violet-400 hover:text-violet-300 mt-auto">
            {todayDance ? "View training →" : "Log training →"}
          </Link>
        </Panel>

        {/* Daily check-in */}
        <Panel className="flex flex-col gap-3" hoverable>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] text-white/25 uppercase tracking-widest mb-0.5">Daily Check-In</p>
              <p className="text-[15px] font-semibold text-white/80 mt-1">
                {todayCheckIn ? "Checked in ✓" : "Not yet today"}
              </p>
            </div>
            <span className="text-2xl">📝</span>
          </div>
          {todayCheckIn && (
            <div className="flex gap-4 mt-1">
              <div className="flex items-center gap-1.5">
                <span className="text-base">{MOOD_EMOJIS[todayCheckIn.mood]}</span>
                <div className="flex flex-col">
                  <span className="text-[10px] text-white/25">Mood</span>
                  <span className="text-[12px] text-white/60">{todayCheckIn.mood}/5</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-base">{ENERGY_EMOJIS[todayCheckIn.energy]}</span>
                <div className="flex flex-col">
                  <span className="text-[10px] text-white/25">Energy</span>
                  <span className="text-[12px] text-white/60">{todayCheckIn.energy}/5</span>
                </div>
              </div>
            </div>
          )}
          <Link href="/daily-checkin" className="text-[11px] text-violet-400 hover:text-violet-300 mt-auto">
            {todayCheckIn ? "Edit check-in →" : "Start check-in →"}
          </Link>
        </Panel>

        {/* Water intake */}
        <Panel className="flex flex-col gap-3" hoverable>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] text-white/25 uppercase tracking-widest mb-0.5">Water Intake</p>
              <p className="text-2xl font-bold text-white">
                {waterAmount}
                <span className="text-white/25 text-base font-normal">ml</span>
              </p>
            </div>
            <span className="text-2xl">💧</span>
          </div>
          <MiniBar
            pct={waterPct}
            color={waterPct >= 100 ? "bg-emerald-500" : "bg-sky-500"}
          />
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-white/35">
              Goal: {WATER_GOAL}ml · {waterPct}%
            </span>
            <button
              type="button"
              onClick={addWater}
              className="text-[11px] px-3 py-1 rounded-lg bg-sky-500/20 text-sky-300 border border-sky-500/20 hover:bg-sky-500/30 transition-colors"
            >
              +250ml
            </button>
          </div>
          <Link href="/water" className="text-[11px] text-sky-400 hover:text-sky-300">
            View water log →
          </Link>
        </Panel>

        {/* Medication */}
        <Panel className="flex flex-col gap-3" hoverable>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] text-white/25 uppercase tracking-widest mb-0.5">Medication</p>
              <p className="text-2xl font-bold text-white">
                {medTaken}
                <span className="text-white/25 text-lg font-normal">/{medTotal}</span>
              </p>
            </div>
            <span className="text-2xl">💊</span>
          </div>
          <p className="text-[12px] text-white/35">
            {medTotal === 0
              ? "No medications logged"
              : medTaken === medTotal
              ? "All taken ✓"
              : `${medTotal - medTaken} pending`}
          </p>
          <Link href="/medication" className="text-[11px] text-violet-400 hover:text-violet-300 mt-auto">
            View medications →
          </Link>
        </Panel>

        {/* Mood & Energy */}
        <Panel className="flex flex-col gap-3" hoverable>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] text-white/25 uppercase tracking-widest mb-0.5">Mood & Energy</p>
            </div>
            <span className="text-2xl">🌈</span>
          </div>
          {todayCheckIn ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{MOOD_EMOJIS[todayCheckIn.mood]}</span>
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span className="text-[11px] text-white/30">Mood</span>
                    <span className="text-[11px] text-white/50">{todayCheckIn.mood}/5</span>
                  </div>
                  <MiniBar pct={(todayCheckIn.mood / 5) * 100} color="bg-pink-500" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-2xl">{ENERGY_EMOJIS[todayCheckIn.energy]}</span>
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span className="text-[11px] text-white/30">Energy</span>
                    <span className="text-[11px] text-white/50">{todayCheckIn.energy}/5</span>
                  </div>
                  <MiniBar pct={(todayCheckIn.energy / 5) * 100} color="bg-amber-500" />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center py-3">
              <p className="text-[12px] text-white/25 text-center">
                Complete your daily check-in to see mood & energy.
              </p>
            </div>
          )}
          <Link href="/daily-checkin" className="text-[11px] text-violet-400 hover:text-violet-300 mt-auto">
            {todayCheckIn ? "Edit check-in →" : "Log mood & energy →"}
          </Link>
        </Panel>

      </div>
    </div>
  );
}
