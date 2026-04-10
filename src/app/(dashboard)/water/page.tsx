"use client";

import { useState, useEffect } from "react";
import Panel from "@/components/dashboard/Panel";
import SectionTitle from "@/components/dashboard/SectionTitle";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";
import {
  loadWaterEntries, saveWaterEntries, loadWaterGoal, saveWaterGoal,
  getTodayEntries, getTodayTotal, getDateTotal,
  generateWaterId, todayDateString,
  WaterEntry, WaterGoal,
} from "@/lib/waterData";

function formatTime(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
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

function calcStreak(entries: WaterEntry[], goalMl: number): { current: number; best: number } {
  const days = getLastNDays(90);
  const today = todayDateString();

  // Current streak: count backwards from today
  let cur = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    const date = days[i];
    if (date > today) continue;
    const total = getDateTotal(entries, date);
    if (total >= goalMl) {
      cur++;
    } else {
      break;
    }
  }

  // Best streak: scan all days
  let best = 0;
  let streak = 0;
  for (let i = 0; i < days.length; i++) {
    const date = days[i];
    if (date > today) break;
    const total = getDateTotal(entries, date);
    if (total >= goalMl) {
      streak++;
      if (streak > best) best = streak;
    } else {
      streak = 0;
    }
  }

  return { current: cur, best };
}

export default function WaterPage() {
  const [mounted, setMounted] = useState(false);
  const [entries, setEntries] = useState<WaterEntry[]>([]);
  const [goal, setGoal] = useState<WaterGoal>({ dailyGoalMl: 2000 });
  const [showGoalEdit, setShowGoalEdit] = useState(false);
  const [goalInput, setGoalInput] = useState("2000");
  const [showCustom, setShowCustom] = useState(false);
  const [customAmount, setCustomAmount] = useState("");

  useEffect(() => {
    setMounted(true);
    const e = loadWaterEntries();
    const g = loadWaterGoal();
    setEntries(e);
    setGoal(g);
    setGoalInput(String(g.dailyGoalMl));
  }, []);

  if (!mounted) return null;

  const todayEntries = getTodayEntries(entries).sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  const todayTotal = getTodayTotal(entries);
  const pct = Math.min(100, Math.round((todayTotal / goal.dailyGoalMl) * 100));
  const circumference = 2 * Math.PI * 54;
  const dashOffset = circumference - (circumference * pct) / 100;
  const streak = calcStreak(entries, goal.dailyGoalMl);

  const last14 = getLastNDays(14);
  const last7 = getLastNDays(7);
  const chartData = last7.map((date) => ({
    date: new Date(date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short" }),
    intake: getDateTotal(entries, date),
  }));

  function addWater(ml: number) {
    const today = todayDateString();
    const newEntry: WaterEntry = {
      id: generateWaterId(),
      date: today,
      amountMl: ml,
      timestamp: new Date().toISOString(),
    };
    const updated = [...entries, newEntry];
    setEntries(updated);
    saveWaterEntries(updated);
  }

  function deleteEntry(id: string) {
    const updated = entries.filter((e) => e.id !== id);
    setEntries(updated);
    saveWaterEntries(updated);
  }

  function handleCustomAdd() {
    const ml = parseInt(customAmount);
    if (!isNaN(ml) && ml > 0) {
      addWater(ml);
      setCustomAmount("");
      setShowCustom(false);
    }
  }

  function handleSaveGoal() {
    const ml = parseInt(goalInput);
    if (!isNaN(ml) && ml > 0) {
      const newGoal = { dailyGoalMl: ml };
      setGoal(newGoal);
      saveWaterGoal(newGoal);
      setShowGoalEdit(false);
    }
  }

  const today = todayDateString();
  const displayDate = new Date(today + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">💧 Water</h1>
          <p className="text-white/40 text-sm mt-0.5">{displayDate}</p>
        </div>
      </div>

      {/* Progress Ring + Quick Add */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Circular Progress */}
        <Panel className="flex flex-col items-center justify-center py-8">
          <div className="relative w-36 h-36">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
              <defs>
                <linearGradient id="waterGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#06b6d4" />
                  <stop offset="100%" stopColor="#0ea5e9" />
                </linearGradient>
              </defs>
              <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
              <circle
                cx="60" cy="60" r="54" fill="none"
                stroke="url(#waterGrad)" strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                style={{ transition: "stroke-dashoffset 0.5s ease" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-white">{pct}%</span>
              <span className="text-[10px] text-white/40 mt-0.5">of goal</span>
            </div>
          </div>
          <div className="mt-4 text-center">
            <p className="text-lg font-semibold text-white">
              {todayTotal} <span className="text-white/40 text-sm font-normal">/ {goal.dailyGoalMl} ml</span>
            </p>
            {pct >= 100 ? (
              <p className="text-cyan-400 text-sm mt-1 font-medium">🎉 Goal reached!</p>
            ) : (
              <p className="text-white/30 text-xs mt-1">{goal.dailyGoalMl - todayTotal} ml remaining</p>
            )}
          </div>
        </Panel>

        {/* Quick Add */}
        <Panel>
          <SectionTitle title="Quick Add" />
          <div className="grid grid-cols-2 gap-2.5 mb-3">
            {[
              { label: "+150ml", amount: 150, icon: "🥃" },
              { label: "+250ml", amount: 250, icon: "☕" },
              { label: "+350ml", amount: 350, icon: "🥤" },
              { label: "+500ml", amount: 500, icon: "🍶" },
            ].map(({ label, amount, icon }) => (
              <button
                key={amount}
                onClick={() => addWater(amount)}
                className="flex flex-col items-center gap-1 py-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/20 hover:border-cyan-500/40 transition-all text-cyan-300 font-medium text-sm"
              >
                <span className="text-lg">{icon}</span>
                <span>{label}</span>
              </button>
            ))}
          </div>
          <div>
            {!showCustom ? (
              <button
                onClick={() => setShowCustom(true)}
                className="w-full py-2.5 rounded-xl border border-white/10 hover:border-white/20 text-white/50 hover:text-white/70 text-sm transition-all"
              >
                + Custom amount
              </button>
            ) : (
              <div className="flex gap-2">
                <input
                  type="number"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCustomAdd()}
                  placeholder="Amount in ml"
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-cyan-500/50"
                  autoFocus
                />
                <button
                  onClick={handleCustomAdd}
                  className="px-4 py-2 rounded-lg bg-cyan-500/20 text-cyan-300 text-sm font-medium hover:bg-cyan-500/30 transition-all"
                >
                  Add
                </button>
                <button
                  onClick={() => { setShowCustom(false); setCustomAmount(""); }}
                  className="px-3 py-2 rounded-lg text-white/40 text-sm hover:text-white/60 transition-all"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        </Panel>
      </div>

      {/* Streak + Calendar Dots */}
      <Panel>
        <SectionTitle title="Streak" />
        <div className="flex items-center gap-8 mb-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-cyan-400">{streak.current}</p>
            <p className="text-xs text-white/40 mt-0.5">Current streak</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-white/60">{streak.best}</p>
            <p className="text-xs text-white/40 mt-0.5">Best streak</p>
          </div>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {last14.map((date) => {
            const total = getDateTotal(entries, date);
            const met = total >= goal.dailyGoalMl;
            const isToday = date === today;
            const partial = total > 0 && !met;
            return (
              <div key={date} className="flex flex-col items-center gap-1">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-medium transition-all
                    ${met ? "bg-cyan-500/30 border border-cyan-500/50 text-cyan-300" :
                      partial ? "bg-cyan-500/10 border border-cyan-500/20 text-cyan-500/50" :
                      "bg-white/5 border border-white/10 text-white/20"}
                    ${isToday ? "ring-2 ring-cyan-400/50 ring-offset-1 ring-offset-[#0C0F1A]" : ""}`}
                >
                  {new Date(date + "T12:00:00").getDate()}
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      {/* 7-Day Bar Chart */}
      <Panel>
        <SectionTitle title="7-Day History" />
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.5} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="date" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: "#0C0F1A", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: "rgba(255,255,255,0.6)" }}
              itemStyle={{ color: "#06b6d4" }}
              formatter={(v) => [`${v} ml`, "Intake"]}
            />
            <ReferenceLine
              y={goal.dailyGoalMl}
              stroke="rgba(6,182,212,0.5)"
              strokeDasharray="4 4"
              label={{ value: "Goal", fill: "rgba(6,182,212,0.7)", fontSize: 10, position: "right" }}
            />
            <Bar dataKey="intake" fill="url(#barGrad)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Panel>

      {/* Today's Log */}
      <Panel>
        <SectionTitle title="Today's Log" subtitle={`${todayEntries.length} entries`} />
        {todayEntries.length === 0 ? (
          <p className="text-white/30 text-sm text-center py-4">No entries yet today. Add your first glass! 💧</p>
        ) : (
          <div className="space-y-2">
            {todayEntries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-white/[0.03] border border-white/[0.05]"
              >
                <div className="flex items-center gap-3">
                  <span className="text-cyan-400 text-lg">💧</span>
                  <div>
                    <p className="text-white text-sm font-medium">{entry.amountMl} ml</p>
                    <p className="text-white/30 text-xs">{formatTime(entry.timestamp)}</p>
                  </div>
                </div>
                <button
                  onClick={() => deleteEntry(entry.id)}
                  className="text-white/20 hover:text-red-400 transition-colors text-xs px-2 py-1 rounded"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {/* Goal Settings */}
      <Panel>
        <SectionTitle
          title="Daily Goal"
          action={
            <button
              onClick={() => setShowGoalEdit(!showGoalEdit)}
              className="text-[11px] text-white/40 hover:text-white/70 transition-colors"
            >
              {showGoalEdit ? "Cancel" : "Edit"}
            </button>
          }
        />
        {!showGoalEdit ? (
          <div>
            <p className="text-white text-lg font-semibold">
              {goal.dailyGoalMl} <span className="text-white/40 text-sm font-normal">ml / day</span>
            </p>
            <p className="text-white/25 text-xs mt-1">Recommended: 2000–2500 ml daily</p>
          </div>
        ) : (
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="text-xs text-white/40 block mb-1.5">Daily goal (ml)</label>
              <input
                type="number"
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/50"
              />
              <p className="text-white/20 text-xs mt-1">Recommended: 2000–2500 ml daily</p>
            </div>
            <button
              onClick={handleSaveGoal}
              className="px-4 py-2 rounded-lg bg-cyan-500/20 text-cyan-300 text-sm font-medium hover:bg-cyan-500/30 transition-all mb-6"
            >
              Save
            </button>
          </div>
        )}
      </Panel>
    </div>
  );
}
