"use client";

import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { loadHabits, loadCompletions, getMonthCompletionSet } from "@/lib/store";
import { MONTH_CONFIG } from "@/lib/habitData";

const WEEKS = [
  { label: "Wk 1", days: [1,2,3,4,5] },
  { label: "Wk 2", days: [6,7,8,9,10,11,12] },
  { label: "Wk 3", days: [13,14,15,16,17,18,19] },
  { label: "Wk 4", days: [20,21,22,23,24,25,26] },
  { label: "Wk 5", days: [27,28,29,30,31] },
];

function buildData() {
  const habits = loadHabits();
  const completions = loadCompletions();
  const { todayDay } = MONTH_CONFIG;
  return WEEKS.map((week) => {
    const days = week.days.filter((d) => d <= todayDay);
    if (!days.length || !habits.length) return { week: week.label, pct: 0 };
    const done = habits.reduce((sum, h) => {
      const set = getMonthCompletionSet(completions, h.id);
      return sum + days.filter((d) => set.has(d)).length;
    }, 0);
    return { week: week.label, pct: Math.round((done / (days.length * habits.length)) * 100) };
  });
}

export default function WeeklyCompletionChart() {
  const [mounted, setMounted] = useState(false);
  const [data, setData] = useState<{ week: string; pct: number }[]>([]);

  useEffect(() => {
    setData(buildData());
    setMounted(true);
    const handler = () => setData(buildData());
    window.addEventListener("habitflow:updated", handler);
    return () => window.removeEventListener("habitflow:updated", handler);
  }, []);

  if (!mounted) return null;

  return (
    <ResponsiveContainer width="100%" height={180} minWidth={0}>
      <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
        <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
        <XAxis dataKey="week" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis hide />
        <Tooltip
          contentStyle={{ backgroundColor: "#0C0F1A", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "white", fontSize: "11px" }}
          formatter={(v) => [`${v}%`, "Completion"]}
          cursor={{ fill: "rgba(255,255,255,0.03)" }}
        />
        <Bar dataKey="pct" radius={[4,4,0,0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={i === data.length - 1 ? "#8b5cf6" : "rgba(139,92,246,0.4)"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
