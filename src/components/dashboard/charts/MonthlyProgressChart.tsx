"use client";

import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { HABITS, MONTH_CONFIG } from "@/lib/habitData";

type ChartPoint = {
  day: string;
  completionRate: number;
  completions: number;
  target: number;
};

const chartData: ChartPoint[] = Array.from({ length: MONTH_CONFIG.todayDay }, (_, index) => {
  const day = index + 1;
  const completions = HABITS.reduce((count, habit) => {
    return count + (habit.initialCompletions.includes(day) ? 1 : 0);
  }, 0);

  return {
    day: `${day}`,
    completionRate: Math.round((completions / HABITS.length) * 100),
    completions,
    target: HABITS.length,
  };
});

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; payload: ChartPoint }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  const point = payload[0].payload;

  return (
    <div className="rounded-xl border border-white/10 bg-[#0F1320]/95 px-3 py-2 shadow-2xl backdrop-blur">
      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/35">Day {label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{point.completionRate}% complete</p>
      <p className="text-[11px] text-white/45">
        {point.completions} of {point.target} habits finished
      </p>
    </div>
  );
}

export default function MonthlyProgressChart() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
      <AreaChart
        data={chartData}
        margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
      >
        <defs>
          <linearGradient id="progressFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.38} />
            <stop offset="65%" stopColor="#8b5cf6" stopOpacity={0.12} />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
        <XAxis
          dataKey="day"
          axisLine={false}
          tickLine={false}
          interval={3}
          tick={{ fill: "rgba(255,255,255,0.28)", fontSize: 10 }}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tickCount={5}
          domain={[0, 100]}
          tickFormatter={(value: number) => `${value}%`}
          tick={{ fill: "rgba(255,255,255,0.28)", fontSize: 10 }}
        />
        <Tooltip
          cursor={{ stroke: "rgba(139,92,246,0.35)", strokeWidth: 1 }}
          content={<ChartTooltip />}
        />
        <Area
          type="monotone"
          dataKey="completionRate"
          stroke="#8b5cf6"
          strokeWidth={2}
          fill="url(#progressFill)"
          activeDot={{ r: 4, fill: "#8b5cf6", stroke: "#0C0F1A", strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
