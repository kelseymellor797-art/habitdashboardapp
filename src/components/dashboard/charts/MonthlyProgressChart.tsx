"use client";

import { useEffect, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { loadHabits, loadCompletions, getMonthCompletionSet } from "@/lib/store";
import { MONTH_CONFIG } from "@/lib/habitData";

function buildData() {
  const habits = loadHabits();
  const completions = loadCompletions();
  const { todayDay } = MONTH_CONFIG;
  return Array.from({ length: todayDay }, (_, i) => {
    const day = i + 1;
    const done = habits.filter((h) => getMonthCompletionSet(completions, h.id).has(day)).length;
    return { day, pct: habits.length > 0 ? Math.round((done / habits.length) * 100) : 0 };
  });
}

export default function MonthlyProgressChart() {
  const [mounted, setMounted] = useState(false);
  const [data, setData] = useState<{ day: number; pct: number }[]>([]);

  useEffect(() => {
    setData(buildData());
    setMounted(true);
    const handler = () => setData(buildData());
    window.addEventListener("habitflow:updated", handler);
    return () => window.removeEventListener("habitflow:updated", handler);
  }, []);

  if (!mounted) return null;

  return (
    <ResponsiveContainer width="100%" height={200} minWidth={0}>
      <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="progressGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
        <XAxis dataKey="day" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis domain={[0, 100]} hide />
        <Tooltip
          contentStyle={{ backgroundColor: "#0C0F1A", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "white", fontSize: "11px" }}
          formatter={(v) => [`${v}%`, "Completion"]}
          cursor={{ stroke: "rgba(139,92,246,0.3)", strokeWidth: 1 }}
        />
        <Area type="monotone" dataKey="pct" stroke="#8b5cf6" strokeWidth={2} fill="url(#progressGrad)" dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
