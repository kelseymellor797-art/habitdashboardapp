"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const weeklyData = [
  { week: "Wk 1", pct: 82 },
  { week: "Wk 2", pct: 88 },
  { week: "Wk 3", pct: 85 },
  { week: "Wk 4", pct: 71 },
];

export default function WeeklyCompletionChart() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <ResponsiveContainer width="100%" height={180} minWidth={0}>
      <BarChart data={weeklyData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
        <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
        <XAxis
          dataKey="week"
          tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis hide />
        <Tooltip
          contentStyle={{
            backgroundColor: "#0C0F1A",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "8px",
            color: "white",
            fontSize: "11px",
          }}
          formatter={(value) => [`${value}%`, "Completion"]}
          cursor={{ fill: "rgba(255,255,255,0.03)" }}
        />
        <Bar dataKey="pct" radius={[4, 4, 0, 0]}>
          {weeklyData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={index === weeklyData.length - 1 ? "#8b5cf6" : "rgba(139,92,246,0.4)"}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
