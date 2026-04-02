import HabitGrid from "@/components/dashboard/HabitGrid";
import Panel from "@/components/dashboard/Panel";
import SectionTitle from "@/components/dashboard/SectionTitle";
import SummaryCard from "@/components/dashboard/SummaryCard";
import MonthlyProgressChart from "@/components/dashboard/charts/MonthlyProgressChart";

const summaryCards = [
  { label: "Momentum", value: "70%", hex: "#8b5cf6", subtext: "Overall habit energy this month", trend: "↑ 4%" },
  { label: "Daily Progress", value: "75%", hex: "#10b981", subtext: "Habits completed today", trend: "↑ 2%" },
  { label: "Weekly Progress", value: "89%", hex: "#0ea5e9", subtext: "Best week so far", trend: "↑ 11%" },
  { label: "Monthly Progress", value: "70%", hex: "#f59e0b", subtext: "January 2025 completion rate", trend: "→ 0%" },
];

const monthStats = [
  { label: "Completed", value: "217", color: "text-emerald-400" },
  { label: "Remaining", value: "43", color: "text-rose-400" },
  { label: "Goals Set", value: "8", color: "text-sky-400" },
  { label: "Goals Hit", value: "5", color: "text-amber-400" },
  { label: "Best Streak", value: "18d", color: "text-violet-400" },
  { label: "Days Logged", value: "24", color: "text-white/60" },
];

const topHabits = [
  { name: "Morning Meditation", streak: 18, pct: 95 },
  { name: "Exercise", streak: 14, pct: 78 },
  { name: "Reading", streak: 11, pct: 65 },
  { name: "Journaling", streak: 9, pct: 52 },
  { name: "Cold Shower", streak: 7, pct: 40 },
];

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-5 max-w-[1400px]">
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Monthly Dashboard</h1>
          <p className="text-[12px] text-white/30 mt-0.5 tracking-wide">January 2025</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-white/20 bg-white/[0.04] border border-white/[0.07] rounded-full px-3 py-1">24 / 31 days logged</span>
          <span className="text-[11px] font-medium text-violet-400 bg-violet-500/10 border border-violet-500/20 rounded-full px-3 py-1">● Live</span>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {summaryCards.map((card) => <SummaryCard key={card.label} {...card} />)}
      </div>
      <HabitGrid />
      <div className="grid grid-cols-[220px_1fr_220px] gap-3">
        <Panel className="flex flex-col">
          <SectionTitle title="January Stats" />
          <div className="flex flex-col divide-y divide-white/[0.05]">
            {monthStats.map(({ label, value, color }) => (
              <div key={label} className="flex justify-between items-center py-2.5">
                <span className="text-[11px] text-white/35">{label}</span>
                <span className={`text-[13px] font-semibold tabular-nums ${color}`}>{value}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel className="flex flex-col">
          <SectionTitle title="Progress Over Time" subtitle="Daily completion rate — January 2025" />
          <div className="flex-1 min-h-[200px]">
            <MonthlyProgressChart />
          </div>
        </Panel>
        <Panel className="flex flex-col">
          <SectionTitle title="Top Habits" subtitle="By streak length" />
          <div className="flex flex-col gap-3">
            {topHabits.map((habit, i) => (
              <div key={habit.name} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-white/20 tabular-nums w-3">{i + 1}</span>
                    <span className="text-[11px] text-white/60 truncate max-w-[120px]">{habit.name}</span>
                  </div>
                  <span className="text-[11px] font-semibold text-amber-400 tabular-nums">🔥 {habit.streak}d</span>
                </div>
                <div className="h-[3px] rounded-full bg-white/[0.06]">
                  <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400" style={{ width: `${habit.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
