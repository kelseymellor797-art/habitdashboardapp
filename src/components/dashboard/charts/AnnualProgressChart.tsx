"use client";

import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { loadHabits, loadCompletions } from "@/lib/store";

const MONTHS = [
  { label: "Jan", prefix: "2025-01-", days: 31 },
  { label: "Feb", prefix: "2025-02-", days: 28 },
  { label: "Mar", prefix: "2025-03-", days: 31 },
  { label: "Apr", prefix: "2025-04-", days: 30 },
  { label: "May", prefix: "2025-05-", days: 31 },
  { label: "Jun", prefix: "2025-06-", days: 30 },
  { label: "Jul", prefix: "2025-07-", days: 31 },
  { label: "Aug", prefix: "2025-08-", days: 31 },
  { label: "Sep", prefix: "2025-09-", days: 30 },
  { label: "Oct", prefix: "2025-10-", days: 31 },
  { label: "Nov", prefix: "2025-11-", days: 30 },
  { label: "Dec", prefix: "2025-12-", days: 31 },
];

function buildData() {
  const habits = loadHabits();
  const completions = loadCompletions();
  return MONTHS.map(({ label, prefix, days }) => {
    const done = completions.filter((c) => c.date.startsWith(prefix) && c.value === 1).length;
    const possible = days * habits.length;
    return { month: label, pct: possible > 0 ? Math.round((done / possible) * 100) : 0 };
  });
}

function barColor(pct: number) {
  if (pct > 85) return "#10b981";
  if (pct > 50) return "#0ea5e9";
  if (pct > 0) return "#f59e0b";
  return "rgba(255,255,255,0.08)";
}

export default function AnnualProgressChart() {
  const [mounted, setMounted] = useState(false);
  const [data, setData] = useState<{ month: string; pct: number }[]>([]);

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
      <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
        <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
        <XAxis dataKey="month" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis hide />
        <Tooltip
          contentStyle={{ backgroundColor: "#0C0F1A", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "white", fontSize: "11px" }}
          formatter={(v) => [`${v}%`, "Completion"]}
          cursor={{ fill: "rgba(255,255,255,0.03)" }}
        />
        <Bar dataKey="pct" radius={[4,4,0,0]}>
          {data.map((entry, i) => <Cell key={i} fill={barColor(entry.pct)} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
