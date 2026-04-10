"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Panel from "@/components/dashboard/Panel";
import SectionTitle from "@/components/dashboard/SectionTitle";
import { loadHabits, loadCompletions } from "@/lib/store";
import { type DanceDailyStatus, loadDailyStatuses } from "@/lib/danceData";
import {
  type DailyCheckIn,
  loadDailyCheckIns,
  getTodayCheckIn,
  todayDateString,
} from "@/lib/dailyCheckinData";
import {
  loadWaterEntries,
  saveWaterEntries,
  loadWaterGoal,
  generateWaterId,
  getTodayTotal,
  getDateTotal,
  type WaterEntry,
} from "@/lib/waterData";
import {
  loadMedications,
  loadMedicationLogs,
  getTodayLogs,
} from "@/lib/medicationData";
import {
  loadConditioningSessions,
  type ConditioningSession,
} from "@/lib/conditioningData";
import { isDueToday } from "@/lib/habitUtils";
import { MONTH_CONFIG } from "@/lib/habitData";
import { getDailyQuote, loadQuotes } from "@/lib/motivationData";

// ── Constants ──────────────────────────────────────────────────────────────────

const MOOD_EMOJIS: Record<number, string> = {
  1: "😞", 2: "😕", 3: "😐", 4: "😊", 5: "🤩",
};
const ENERGY_EMOJIS: Record<number, string> = {
  1: "🪫", 2: "😴", 3: "⚡", 4: "🔥", 5: "💥",
};

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning, Katrina ☀️";
  if (h < 17) return "Good afternoon, Katrina 🌸";
  return "Good evening, Katrina 🌙";
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

// ── Weekly snapshot helpers ────────────────────────────────────────────────────

function getWeekDates(today: string): string[] {
  const d = new Date(today + "T12:00:00");
  const dow = d.getDay(); // Sun=0
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  return Array.from({ length: 7 }, (_, i) => {
    const dd = new Date(d);
    dd.setDate(d.getDate() + mondayOffset + i);
    return `${dd.getFullYear()}-${String(dd.getMonth() + 1).padStart(2, "0")}-${String(dd.getDate()).padStart(2, "0")}`;
  });
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

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
  const [waterGoal, setWaterGoal] = useState(2000);
  const [waterEntries, setWaterEntries] = useState<WaterEntry[]>([]);

  // Medication
  const [medTaken, setMedTaken] = useState(0);
  const [medTotal, setMedTotal] = useState(0);

  // Conditioning
  const [todayConditioning, setTodayConditioning] = useState<ConditioningSession | null>(null);

  // Daily quote
  const [quoteText, setQuoteText] = useState("");
  const [quoteAuthor, setQuoteAuthor] = useState<string | undefined>(undefined);

  // Weekly snapshot data: indexed by date string
  const [weekDates, setWeekDates] = useState<string[]>([]);
  const [weekTraining, setWeekTraining] = useState<Set<string>>(new Set());
  const [weekCheckin, setWeekCheckin] = useState<Set<string>>(new Set());
  const [weekWater, setWeekWater] = useState<Set<string>>(new Set());
  const [weekConditioning, setWeekConditioning] = useState<Set<string>>(new Set());

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

    // Water (real data)
    const entries = loadWaterEntries();
    const goal = loadWaterGoal();
    setWaterEntries(entries);
    setWaterGoal(goal.dailyGoalMl);
    setWaterAmount(getTodayTotal(entries));

    // Medication (real data)
    const medications = loadMedications().filter((m) => m.active);
    const logs = loadMedicationLogs();
    const todayLogs = getTodayLogs(logs);
    // Total expected = sum of scheduledTimes across active meds
    const expectedTotal = medications.reduce((sum, m) => sum + m.scheduledTimes.length, 0);
    setMedTotal(expectedTotal > 0 ? expectedTotal : todayLogs.length);
    setMedTaken(todayLogs.filter((l) => l.taken).length);

    // Conditioning
    const sessions = loadConditioningSessions();
    const todaySess = sessions.find((s) => s.date === today) ?? null;
    setTodayConditioning(todaySess);

    // Daily quote
    const quotes = loadQuotes();
    const dq = getDailyQuote(quotes);
    setQuoteText(dq.text);
    setQuoteAuthor(dq.author);

    // Weekly snapshot
    const dates = getWeekDates(today);
    setWeekDates(dates);

    const trainingDates = new Set(
      statuses.filter((s) => s.trainedToday).map((s) => s.date)
    );
    setWeekTraining(trainingDates);

    const checkinDates = new Set(checkIns.map((c) => c.date));
    setWeekCheckin(checkinDates);

    const waterGoalMl = goal.dailyGoalMl;
    const waterGoalDates = new Set(
      dates.filter((d) => getDateTotal(entries, d) >= waterGoalMl)
    );
    setWeekWater(waterGoalDates);

    const conditioningDates = new Set(sessions.map((s) => s.date));
    setWeekConditioning(conditioningDates);

    setMounted(true);
  }, [today]);

  function addWater() {
    const newEntry: WaterEntry = {
      id: generateWaterId(),
      date: today,
      amountMl: 250,
      timestamp: new Date().toISOString(),
    };
    const updated = [...waterEntries, newEntry];
    saveWaterEntries(updated);
    setWaterEntries(updated);
    setWaterAmount((prev) => prev + 250);

    // Update weekly water dots
    const newTotal = getDateTotal(updated, today);
    if (newTotal >= waterGoal) {
      setWeekWater((prev) => new Set([...prev, today]));
    }
  }

  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="text-white/20 text-sm">Loading…</div>
      </div>
    );
  }

  const habitsPct = habitsTotal > 0 ? Math.round((habitsDone / habitsTotal) * 100) : 0;
  const waterPct = Math.round((waterAmount / waterGoal) * 100);

  const dateLabel = new Date(today + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });

  return (
    <div className="space-y-7 max-w-4xl">
      {/* Header */}
      <div>
        <p className="text-[11px] text-white/25 uppercase tracking-widest mb-1">{dateLabel}</p>
        <h1 className="text-[28px] font-bold text-white leading-tight">
          {getGreeting()}
        </h1>
      </div>

      {/* Quote card */}
      <div className="relative overflow-hidden rounded-2xl px-5 py-4 border border-violet-500/20"
        style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.12) 0%, rgba(236,72,153,0.08) 100%)" }}>
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: "radial-gradient(circle at 20% 50%, #8b5cf6 0%, transparent 60%)" }} />
        <div className="relative z-10">
          <p className="text-[11px] text-white/30 uppercase tracking-widest mb-1">Daily motivation ✨</p>
          <p className="text-[15px] font-medium text-white/80 italic">&ldquo;{quoteText}&rdquo;</p>
          {quoteAuthor && <p className="text-[12px] text-white/40 mt-1 italic">— {quoteAuthor}</p>}
        </div>
        <Link href="/motivation" className="absolute bottom-3 right-4 text-[11px] text-violet-400 hover:text-violet-300">
          More quotes →
        </Link>
      </div>

      {/* Quick shortcuts */}
      <div className="flex flex-wrap gap-2">
        {[
          { icon: "📝", label: "Check-In", href: "/daily-checkin" },
          { icon: "💃", label: "Log Training", href: "/dance" },
          { icon: "💧", label: "Log Water", href: "/water" },
          { icon: "💊", label: "Medications", href: "/medication" },
          { icon: "✨", label: "Motivation", href: "/motivation" },
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
          {todayCheckIn ? (
            <div className="flex gap-4 mt-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xl">{MOOD_EMOJIS[todayCheckIn.mood]}</span>
                <div className="flex flex-col">
                  <span className="text-[10px] text-white/25">Mood</span>
                  <span className="text-[12px] text-white/60">{todayCheckIn.mood}/5</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl">{ENERGY_EMOJIS[todayCheckIn.energy]}</span>
                <div className="flex flex-col">
                  <span className="text-[10px] text-white/25">Energy</span>
                  <span className="text-[12px] text-white/60">{todayCheckIn.energy}/5</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-[12px] text-white/25">Log how you&apos;re feeling today</p>
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
              Goal: {waterGoal}ml · {Math.min(waterPct, 100)}%
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
                <span className="text-white/25 text-lg font-normal"> of {medTotal}</span>
              </p>
            </div>
            <span className="text-2xl">💊</span>
          </div>
          <p className="text-[12px] text-white/35">
            {medTotal === 0
              ? "No medications set up"
              : medTaken === medTotal
              ? "All taken today ✓"
              : `${medTotal - medTaken} still pending`}
          </p>
          <Link href="/medication" className="text-[11px] text-violet-400 hover:text-violet-300 mt-auto">
            View medications →
          </Link>
        </Panel>

        {/* Conditioning */}
        <Panel className="flex flex-col gap-3" hoverable>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] text-white/25 uppercase tracking-widest mb-0.5">Conditioning</p>
              <p className="text-[15px] font-semibold text-white/80 mt-1">
                {todayConditioning
                  ? `${todayConditioning.routineName} ✓`
                  : "No session today"}
              </p>
            </div>
            <span className="text-2xl">🏋️</span>
          </div>
          {todayConditioning && (
            <div className="flex gap-4 mt-1">
              {todayConditioning.duration && (
                <div className="flex flex-col">
                  <span className="text-[10px] text-white/25">Duration</span>
                  <span className="text-[13px] text-white/60">{todayConditioning.duration}min</span>
                </div>
              )}
              <div className="flex flex-col">
                <span className="text-[10px] text-white/25">Difficulty</span>
                <span className="text-[13px] text-white/60">{todayConditioning.difficulty}/5</span>
              </div>
            </div>
          )}
          <Link href="/conditioning" className="text-[11px] text-violet-400 hover:text-violet-300 mt-auto">
            {todayConditioning ? "View conditioning →" : "Log a session →"}
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

      {/* Weekly Snapshot */}
      <div className="space-y-4">
        <SectionTitle title="Weekly Snapshot" />
        <Panel>
          <div className="overflow-x-auto">
            <div className="grid grid-cols-7 gap-2 min-w-[360px]">
              {weekDates.map((date, i) => {
                const isToday = date === today;
                const isFuture = date > today;
                const hasTraining = weekTraining.has(date);
                const hasCheckin = weekCheckin.has(date);
                const hasWater = weekWater.has(date);
                const hasConditioning = weekConditioning.has(date);
                return (
                  <div key={date} className="flex flex-col items-center gap-1.5">
                    <span className={`text-[10px] font-medium uppercase tracking-wide ${
                      isToday ? "text-violet-300" : "text-white/30"
                    }`}>
                      {DAY_LABELS[i]}
                    </span>
                    {/* Training dot */}
                    <div
                      title="Training"
                      className={`w-2.5 h-2.5 rounded-full transition-colors ${
                        isFuture ? "bg-white/[0.05]" : hasTraining ? "bg-pink-500" : "bg-white/[0.1]"
                      }`}
                    />
                    {/* Check-in dot */}
                    <div
                      title="Check-in"
                      className={`w-2.5 h-2.5 rounded-full transition-colors ${
                        isFuture ? "bg-white/[0.05]" : hasCheckin ? "bg-emerald-500" : "bg-white/[0.1]"
                      }`}
                    />
                    {/* Water goal dot */}
                    <div
                      title="Water goal"
                      className={`w-2.5 h-2.5 rounded-full transition-colors ${
                        isFuture ? "bg-white/[0.05]" : hasWater ? "bg-sky-500" : "bg-white/[0.1]"
                      }`}
                    />
                    {/* Conditioning dot */}
                    <div
                      title="Conditioning"
                      className={`w-2.5 h-2.5 rounded-full transition-colors ${
                        isFuture ? "bg-white/[0.05]" : hasConditioning ? "bg-amber-500" : "bg-white/[0.1]"
                      }`}
                    />
                  </div>
                );
              })}
            </div>
          </div>
          {/* Legend */}
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-4 pt-4 border-t border-white/[0.06]">
            {[
              { color: "bg-pink-500", label: "💃 Training" },
              { color: "bg-emerald-500", label: "✅ Check-in" },
              { color: "bg-sky-500", label: "💧 Water goal" },
              { color: "bg-amber-500", label: "🏋️ Conditioning" },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${color}`} />
                <span className="text-[11px] text-white/35">{label}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
