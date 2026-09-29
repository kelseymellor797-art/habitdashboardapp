"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import HabitGrid from "@/components/dashboard/HabitGrid";
import Panel from "@/components/dashboard/Panel";
import SectionTitle from "@/components/dashboard/SectionTitle";
import { MONTH_CONFIG } from "@/lib/habitData";
import { isDueOnDay, isDueToday } from "@/lib/habitUtils";
import { loadConditioningSessions, type ConditioningSession } from "@/lib/conditioningData";
import { type DanceDailyStatus, loadDailyStatuses } from "@/lib/danceData";
import {
  getTodayCheckIn,
  getMoodCategory,
  getMoodFeelingsLabel,
  loadDailyCheckIns,
  todayDateString,
  type DailyCheckIn,
} from "@/lib/dailyCheckinData";
import { getDailyQuote, loadQuotes } from "@/lib/motivationData";
import { loadMediaEntries, loadWeightEntries, type MediaEntry, type WeightEntry } from "@/lib/progressData";
import { loadRoutineEntries, loadRoutines } from "@/lib/routineData";
import { calcRoutinePct, routineEntryKey } from "@/lib/routineUtils";
import { loadCompletions, loadHabits } from "@/lib/store";

const MOOD_EMOJIS: Record<number, string> = {
  1: "😞", 2: "😕", 3: "😐", 4: "😊", 5: "🤩",
};

const MOOD_CATEGORY_ICON: Record<string, string> = {
  "Depressed / Low": "🌧️",
  "Meh / Neutral": "☁️",
  Good: "🌤️",
  "High / Amazing": "✨",
};

const ENERGY_EMOJIS: Record<number, string> = {
  1: "🪫", 2: "😴", 3: "⚡", 4: "🔥", 5: "💥",
};

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning, Katrina";
  if (h < 17) return "Good afternoon, Katrina";
  return "Good evening, Katrina";
}

function MiniBar({ pct, color = "bg-violet-500" }: { pct: number; color?: string }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
      <div
        className={`h-full rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
      />
    </div>
  );
}

function getWeekDates(today: string): string[] {
  const d = new Date(today + "T12:00:00");
  const dow = d.getDay();
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  return Array.from({ length: 7 }, (_, i) => {
    const dd = new Date(d);
    dd.setDate(d.getDate() + mondayOffset + i);
    return `${dd.getFullYear()}-${String(dd.getMonth() + 1).padStart(2, "0")}-${String(dd.getDate()).padStart(2, "0")}`;
  });
}

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);

  const [habitsTotal, setHabitsTotal] = useState(0);
  const [habitsDone, setHabitsDone] = useState(0);
  const [activeHabits, setActiveHabits] = useState(0);
  const [monthCompletions, setMonthCompletions] = useState(0);

  const [routinesTotal, setRoutinesTotal] = useState(0);
  const [routinesDone, setRoutinesDone] = useState(0);
  const [activeRoutines, setActiveRoutines] = useState(0);

  const [todayCheckIn, setTodayCheckIn] = useState<DailyCheckIn | null>(null);
  const [todayDance, setTodayDance] = useState<DanceDailyStatus | null>(null);
  const [todayConditioning, setTodayConditioning] = useState<ConditioningSession | null>(null);
  const [recentMedia, setRecentMedia] = useState<MediaEntry | null>(null);
  const [latestWeight, setLatestWeight] = useState<WeightEntry | null>(null);

  const [quoteText, setQuoteText] = useState("");
  const [quoteAuthor, setQuoteAuthor] = useState<string | undefined>(undefined);

  const [weekDates, setWeekDates] = useState<string[]>([]);
  const [weekHabits, setWeekHabits] = useState<Set<string>>(new Set());
  const [weekTraining, setWeekTraining] = useState<Set<string>>(new Set());
  const [weekCheckin, setWeekCheckin] = useState<Set<string>>(new Set());
  const [weekConditioning, setWeekConditioning] = useState<Set<string>>(new Set());

  const today = todayDateString();

  useEffect(() => {
    const { todayDay, startDow, year, month } = MONTH_CONFIG;

    const habits = loadHabits().filter((h) => h.active !== false);
    const completions = loadCompletions();
    const dueHabits = habits.filter((h) =>
      isDueToday(h.scheduleType ?? "daily", h.customDays, todayDay, startDow)
    );
    const todayCompletions = new Set(
      completions.filter((c) => c.date === today && c.value === 1).map((c) => c.habitId)
    );
    setHabitsTotal(dueHabits.length);
    setHabitsDone(dueHabits.filter((h) => todayCompletions.has(h.id)).length);
    setActiveHabits(habits.length);
    setMonthCompletions(
      completions.filter((c) =>
        c.value === 1 &&
        c.date.startsWith(`${year}-${String(month).padStart(2, "0")}-`)
      ).length
    );

    const routines = loadRoutines().filter((r) => r.active);
    const routineEntries = loadRoutineEntries();
    const dueRoutines = routines.filter((r) =>
      isDueToday(r.scheduleType ?? "daily", r.customDays, todayDay, startDow)
    );
    setActiveRoutines(routines.length);
    setRoutinesTotal(dueRoutines.length);
    setRoutinesDone(
      dueRoutines.filter((r) =>
        calcRoutinePct(routineEntries[routineEntryKey(r.id, todayDay)], r) === 100
      ).length
    );

    const dailyCheckIns = loadDailyCheckIns();
    setTodayCheckIn(getTodayCheckIn(dailyCheckIns) ?? null);

    const danceStatuses = loadDailyStatuses();
    setTodayDance(danceStatuses.find((s) => s.date === today) ?? null);

    const conditioningSessions = loadConditioningSessions();
    setTodayConditioning(conditioningSessions.find((s) => s.date === today) ?? null);

    const media = [...loadMediaEntries()].sort((a, b) => b.date.localeCompare(a.date));
    setRecentMedia(media[0] ?? null);

    const weights = [...loadWeightEntries()].sort((a, b) => b.date.localeCompare(a.date));
    setLatestWeight(weights[0] ?? null);

    const quote = getDailyQuote(loadQuotes());
    setQuoteText(quote?.text ?? "");
    setQuoteAuthor(quote?.author);

    const dates = getWeekDates(today);
    setWeekDates(dates);
    setWeekHabits(
      new Set(
        dates.filter((date) => {
          const day = Number(date.slice(8));
          if (date.slice(0, 7) !== `${year}-${String(month).padStart(2, "0")}`) {
            return completions.some((c) => c.date === date && c.value === 1);
          }
          const dueForDay = habits.filter((h) =>
            isDueOnDay(h.scheduleType ?? "daily", h.customDays, day, startDow)
          );
          if (!dueForDay.length) return false;
          return dueForDay.every((h) =>
            completions.some((c) => c.date === date && c.habitId === h.id && c.value === 1)
          );
        })
      )
    );
    setWeekTraining(new Set(danceStatuses.filter((s) => s.trainedToday).map((s) => s.date)));
    setWeekCheckin(new Set(dailyCheckIns.map((c) => c.date)));
    setWeekConditioning(new Set(conditioningSessions.map((s) => s.date)));

    setMounted(true);
  }, [today]);

  if (!mounted) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="text-sm text-white/20">Loading...</div>
      </div>
    );
  }

  const habitsPct = habitsTotal > 0 ? Math.round((habitsDone / habitsTotal) * 100) : 0;
  const routinesPct = routinesTotal > 0 ? Math.round((routinesDone / routinesTotal) * 100) : 0;
  const dateLabel = new Date(today + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });

  return (
    <div className="max-w-[1400px] space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-1 text-[11px] uppercase tracking-widest text-white/25">{dateLabel}</p>
          <h1 className="text-[28px] font-bold leading-tight text-white">{getGreeting()}</h1>
          <p className="mt-1 text-sm text-white/35">Daily habits, routines, and dance progress in one place.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { label: "+ Habit", href: "/habits" },
            { label: "+ Routine", href: "/routines" },
            { label: "Daily Check-In", href: "/daily-checkin" },
            { label: "Log Dance", href: "/dance" },
            { label: "Add Clip", href: "/media-vault" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-[13px] font-medium text-white/60 transition-colors hover:border-white/20 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      <Panel className="relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-violet-500 via-pink-500 to-sky-500" />
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-violet-300/70">
              Core Tracker
            </p>
            <h2 className="mt-1 text-xl font-semibold text-white">Habits and routines come first</h2>
            <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-white/38">
              The dance tools now sit on top of the original habit tracker instead of replacing it.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Active habits", value: activeHabits, color: "text-violet-300" },
              { label: "Active routines", value: activeRoutines, color: "text-pink-300" },
              { label: "Today habits", value: `${habitsDone}/${habitsTotal}`, color: "text-emerald-300" },
              { label: "Month logs", value: monthCompletions, color: "text-sky-300" },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl border border-white/[0.06] bg-[#080B12] p-3">
                <p className="text-[10px] uppercase tracking-widest text-white/25">{stat.label}</p>
                <p className={`mt-1 text-2xl font-bold tabular-nums ${stat.color}`}>{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 border-t border-white/[0.06] pt-4">
          {[
            { label: "Today checklist", href: "/daily" },
            { label: "Monthly grid", href: "/monthly" },
            { label: "Weekly analytics", href: "/weekly" },
            { label: "Annual analytics", href: "/annual" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-[12px] font-medium text-white/45 transition-colors hover:border-white/20 hover:text-white/75"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel className="flex flex-col gap-3" hoverable>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white/25">Today&apos;s Habits</p>
              <p className="mt-1 text-2xl font-bold text-white">
                {habitsDone}<span className="text-lg font-normal text-white/25">/{habitsTotal}</span>
              </p>
            </div>
            <Link href="/habits" className="text-[11px] text-violet-300 hover:text-violet-200">Manage</Link>
          </div>
          <MiniBar pct={habitsPct} color={habitsPct === 100 ? "bg-emerald-500" : "bg-violet-500"} />
          <Link href="/daily" className="mt-auto text-[11px] text-violet-400 hover:text-violet-300">
            Open today checklist →
          </Link>
        </Panel>

        <Panel className="flex flex-col gap-3" hoverable>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white/25">Today&apos;s Routines</p>
              <p className="mt-1 text-2xl font-bold text-white">
                {routinesDone}<span className="text-lg font-normal text-white/25">/{routinesTotal}</span>
              </p>
            </div>
            <Link href="/routines" className="text-[11px] text-pink-300 hover:text-pink-200">Manage</Link>
          </div>
          <MiniBar pct={routinesPct} color={routinesPct === 100 ? "bg-emerald-500" : "bg-pink-500"} />
          <p className="mt-auto text-[12px] text-white/35">
            {routinesTotal === 0 ? "No routines due today." : `${routinesPct}% complete today.`}
          </p>
        </Panel>

        <Panel className="flex flex-col gap-3" hoverable>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white/25">Daily Check-In</p>
              <p className="mt-1 text-[15px] font-semibold text-white/80">
                {todayCheckIn ? "Checked in" : "Not checked in yet"}
              </p>
            </div>
            <Link href="/daily-checkin" className="text-[11px] text-violet-300 hover:text-violet-200">
              {todayCheckIn ? "Edit" : "Start"}
            </Link>
          </div>
          {todayCheckIn ? (
            <div className="flex gap-4">
              <span className="text-xl">{MOOD_CATEGORY_ICON[todayCheckIn.moodCategory ?? getMoodCategory(todayCheckIn.moodFeeling, todayCheckIn.mood)] ?? MOOD_EMOJIS[todayCheckIn.mood]}</span>
              <div className="flex-1 space-y-2">
                <div>
                  <div className="mb-1 flex justify-between text-[11px] text-white/35">
                    <span>Mood</span><span>{getMoodFeelingsLabel(todayCheckIn)}</span>
                  </div>
                  <MiniBar pct={(todayCheckIn.mood / 5) * 100} color="bg-pink-500" />
                </div>
                <div>
                  <div className="mb-1 flex justify-between text-[11px] text-white/35">
                    <span>Energy {ENERGY_EMOJIS[todayCheckIn.energy]}</span><span>{todayCheckIn.energy}/5</span>
                  </div>
                  <MiniBar pct={(todayCheckIn.energy / 5) * 100} color="bg-amber-500" />
                </div>
              </div>
            </div>
          ) : (
            <p className="text-[12px] text-white/30">Log mood, energy, confidence, soreness, and tomorrow&apos;s focus.</p>
          )}
        </Panel>

        <Panel className="flex flex-col gap-3" hoverable>
          <p className="text-[10px] uppercase tracking-widest text-white/25">Dance Training</p>
          <p className="text-[15px] font-semibold text-white/80">
            {todayDance ? (todayDance.trainedToday ? "Trained today" : "Rest day logged") : "No training status yet"}
          </p>
          {todayDance && (
            <div className="grid grid-cols-3 gap-2 text-[12px] text-white/50">
              <span>Mood {todayDance.mood}/5</span>
              <span>Conf {todayDance.confidence}/5</span>
              <span>Sore {todayDance.soreness}/5</span>
            </div>
          )}
          <Link href="/dance" className="mt-auto text-[11px] text-violet-400 hover:text-violet-300">
            Open dance training →
          </Link>
        </Panel>

        <Panel className="flex flex-col gap-3" hoverable>
          <p className="text-[10px] uppercase tracking-widest text-white/25">Conditioning</p>
          <p className="text-[15px] font-semibold text-white/80">
            {todayConditioning ? todayConditioning.routineName : "No session today"}
          </p>
          {todayConditioning ? (
            <div className="flex gap-4 text-[12px] text-white/45">
              {todayConditioning.duration && <span>{todayConditioning.duration} min</span>}
              <span>Difficulty {todayConditioning.difficulty}/5</span>
            </div>
          ) : (
            <p className="text-[12px] text-white/30">Log strength, flexibility, or conditioning support work.</p>
          )}
          <Link href="/conditioning" className="mt-auto text-[11px] text-violet-400 hover:text-violet-300">
            Open conditioning →
          </Link>
        </Panel>

        <Panel className="flex flex-col gap-3" hoverable>
          <p className="text-[10px] uppercase tracking-widest text-white/25">Recent Progress / Media</p>
          {recentMedia ? (
            <>
              <p className="text-[15px] font-semibold text-white/80">{recentMedia.title}</p>
              <p className="text-[12px] text-white/35">{recentMedia.date}{recentMedia.skillName ? ` · ${recentMedia.skillName}` : ""}</p>
            </>
          ) : latestWeight ? (
            <>
              <p className="text-[15px] font-semibold text-white/80">Latest progress log</p>
              <p className="text-[12px] text-white/35">{latestWeight.date} · {latestWeight.weightKg.toFixed(1)} kg</p>
            </>
          ) : (
            <p className="text-[12px] text-white/30">Add a clip or progress entry when you have something to compare later.</p>
          )}
          <Link href="/media-vault" className="mt-auto text-[11px] text-violet-400 hover:text-violet-300">
            Open media vault →
          </Link>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_0.8fr]">
        <Panel>
          <SectionTitle title="Weekly Rhythm" subtitle="Habits, check-ins, dance, and conditioning" />
          <div className="mt-4 grid min-w-[360px] grid-cols-7 gap-2 overflow-x-auto">
            {weekDates.map((date, i) => {
              const isToday = date === today;
              const isFuture = date > today;
              return (
                <div key={date} className="flex flex-col items-center gap-1.5">
                  <span className={`text-[10px] font-medium uppercase tracking-wide ${isToday ? "text-violet-300" : "text-white/30"}`}>
                    {DAY_LABELS[i]}
                  </span>
                  {[
                    { title: "Habits complete", hit: weekHabits.has(date), color: "bg-violet-500" },
                    { title: "Daily check-in", hit: weekCheckin.has(date), color: "bg-emerald-500" },
                    { title: "Dance training", hit: weekTraining.has(date), color: "bg-pink-500" },
                    { title: "Conditioning", hit: weekConditioning.has(date), color: "bg-amber-500" },
                  ].map((dot) => (
                    <div
                      key={dot.title}
                      title={dot.title}
                      className={`h-2.5 w-2.5 rounded-full transition-colors ${
                        isFuture ? "bg-white/[0.05]" : dot.hit ? dot.color : "bg-white/[0.1]"
                      }`}
                    />
                  ))}
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-white/[0.06] pt-4">
            {[
              { color: "bg-violet-500", label: "Habits" },
              { color: "bg-emerald-500", label: "Check-in" },
              { color: "bg-pink-500", label: "Dance" },
              { color: "bg-amber-500", label: "Conditioning" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-1.5">
                <div className={`h-2 w-2 rounded-full ${item.color}`} />
                <span className="text-[11px] text-white/35">{item.label}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, #ec4899 0%, transparent 40%)" }} />
          <div className="relative">
            <p className="mb-2 text-[10px] uppercase tracking-widest text-white/25">Motivation</p>
            {quoteText ? (
              <>
                <p className="text-[15px] font-medium italic leading-relaxed text-white/80">&ldquo;{quoteText}&rdquo;</p>
                {quoteAuthor && <p className="mt-2 text-[12px] italic text-white/40">- {quoteAuthor}</p>}
              </>
            ) : (
              <p className="text-[13px] leading-relaxed text-white/40">
                Add an active quote in Motivation to show one here.
              </p>
            )}
            <Link href="/motivation" className="mt-4 inline-flex text-[11px] text-violet-400 hover:text-violet-300">
              Open quotes →
            </Link>
          </div>
        </Panel>
      </div>

      <HabitGrid />
    </div>
  );
}
