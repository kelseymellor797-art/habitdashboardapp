"use client";

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

const monthlyData = [
  { month: "Jan", pct: 74 },
  { month: "Feb", pct: 79 },
  { month: "Mar", pct: 91 },
  { month: "Apr", pct: 84 },
  { month: "May", pct: 78 },
  { month: "Jun", pct: 82 },
  { month: "Jul", pct: 76 },
  { month: "Aug", pct: 88 },
  { month: "Sep", pct: 85 },
  { month: "Oct", pct: 71 },
  { month: "Nov", pct: 89 },
  { month: "Dec", pct: 92 },
];

function getBarColor(pct: number): string {
  if (pct > 85) return "#10b981";
  if (pct > 70) return "#0ea5e9";
  return "#f59e0b";
}

export default function AnnualProgressChart() {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={monthlyData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
        <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
        <XAxis
          dataKey="month"
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
          {monthlyData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={getBarColor(entry.pct)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
