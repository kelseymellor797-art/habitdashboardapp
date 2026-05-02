"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Panel from "@/components/dashboard/Panel";
import SectionTitle from "@/components/dashboard/SectionTitle";
import {
  DANCE_CATEGORIES,
  formatWeekRange,
  getCategoryAvg,
  getWeekAvg,
  loadCheckIns,
  loadDailyStatuses,
  type DanceCheckIn,
  type DanceDailyStatus,
} from "@/lib/danceData";

export default function DanceAnalyticsPage() {
  const [mounted, setMounted] = useState(false);
  const [checkIns, setCheckIns] = useState<DanceCheckIn[]>([]);
  const [dailyStatuses, setDailyStatuses] = useState<DanceDailyStatus[]>([]);

  useEffect(() => {
    setCheckIns(loadCheckIns());
    setDailyStatuses(loadDailyStatuses());
    setMounted(true);
  }, []);

  const sorted = useMemo(() => [...checkIns].sort((a, b) => a.weekOf.localeCompare(b.weekOf)), [checkIns]);
  const latest = sorted[sorted.length - 1] ?? null;
  const recentDaily = dailyStatuses.slice(-7);
  const trainingDays = recentDaily.filter((status) => status.trainedToday).length;
  const avgConfidence = recentDaily.length
    ? Math.round((recentDaily.reduce((sum, status) => sum + status.confidence, 0) / recentDaily.length) * 10) / 10
    : 0;

  const lineData = sorted.slice(-8).map((checkIn) => {
    const row: Record<string, string | number> = { period: formatWeekRange(checkIn.weekOf) };
    DANCE_CATEGORIES.forEach((category) => {
      row[category.key] = getCategoryAvg(checkIn, category.key);
    });
    return row;
  });

  const barData = latest
    ? DANCE_CATEGORIES.map((category) => ({
        name: category.label.split(" ")[0],
        avg: getCategoryAvg(latest, category.key),
        color: category.color,
      }))
    : [];

  if (!mounted) return null;

  return (
    <div className="max-w-5xl space-y-5">
      <div className="border-b border-white/[0.06] pb-3">
        <h1 className="text-2xl font-semibold text-white">Dance Analytics</h1>
        <p className="mt-0.5 text-[12px] text-white/30">
          Trends from dance check-ins and daily training status.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { label: "Check-ins", value: checkIns.length || "0", color: "text-violet-300" },
          { label: "Latest avg", value: latest ? getWeekAvg(latest).toFixed(1) : "-", color: "text-pink-300" },
          { label: "Training days", value: `${trainingDays}/7`, color: "text-emerald-300" },
          { label: "Avg confidence", value: avgConfidence ? `${avgConfidence}/5` : "-", color: "text-sky-300" },
        ].map((stat) => (
          <Panel key={stat.label}>
            <p className="text-[10px] uppercase tracking-widest text-white/25">{stat.label}</p>
            <p className={`mt-1 text-2xl font-bold tabular-nums ${stat.color}`}>{stat.value}</p>
          </Panel>
        ))}
      </div>

      {latest ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel>
            <SectionTitle title="Current Check-In Scores" subtitle={formatWeekRange(latest.weekOf)} />
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 3]} tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "#0B0F1A", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12 }} />
                  <Bar dataKey="avg" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel>
            <SectionTitle title="Recent Trend" subtitle="Last 8 check-ins" />
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineData}>
                  <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
                  <XAxis dataKey="period" hide />
                  <YAxis domain={[0, 3]} tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "#0B0F1A", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12 }} />
                  {DANCE_CATEGORIES.slice(0, 5).map((category) => (
                    <Line key={category.key} type="monotone" dataKey={category.key} stroke={category.color} strokeWidth={2} dot={false} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>
      ) : (
        <Panel className="p-8 text-center">
          <p className="text-sm text-white/35">Complete a dance check-in to start building analytics.</p>
        </Panel>
      )}
    </div>
  );
}
