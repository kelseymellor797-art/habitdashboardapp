import Panel from "@/components/dashboard/Panel";
import SectionTitle from "@/components/dashboard/SectionTitle";
import SummaryCard from "@/components/dashboard/SummaryCard";
import AnnualProgressChart from "@/components/dashboard/charts/AnnualProgressChart";

const summaryCards = [
  { label: "Momentum", value: "78%", hex: "#8b5cf6", subtext: "Annual habit energy", trend: "↑ 8%" },
  { label: "Monthly Avg", value: "82%", hex: "#0ea5e9", subtext: "Average monthly completion", trend: "↑ 3%" },
  { label: "Q1 Progress", value: "74%", hex: "#10b981", subtext: "Jan–Mar 2024", trend: "↑ 5%" },
  { label: "Total Completion", value: "68%", hex: "#f59e0b", subtext: "All habits across 2024", trend: "→ 0%" },
];

const annualStats = [
  { label: "Total Done", value: "2,847", color: "text-emerald-400" },
  { label: "Remaining", value: "1,153", color: "text-rose-400" },
  { label: "Goals Hit", value: "47/84", color: "text-sky-400" },
  { label: "Best Streak", value: "23d", color: "text-violet-400" },
  { label: "Active Habits", value: "7", color: "text-white/60" },
  { label: "Best Month", value: "Mar 91%", color: "text-amber-400" },
];

const topHabits = [
  { name: "Drink Water", hex: "#22d3ee", pct: 92 },
  { name: "Morning Meditation", hex: "#8b5cf6", pct: 87 },
  { name: "Vitamins", hex: "#f43f5e", pct: 85 },
  { name: "Exercise", hex: "#10b981", pct: 76 },
  { name: "Reading", hex: "#0ea5e9", pct: 73 },
  { name: "Cold Shower", hex: "#06b6d4", pct: 61 },
  { name: "Journaling", hex: "#f59e0b", pct: 58 },
];

const monthCards = [
  { month: "Jan", pct: 74, weeks: [82, 78, 75, 65], done: 156, total: 217 },
  { month: "Feb", pct: 79, weeks: [80, 76, 82, 78], done: 147, total: 196 },
  { month: "Mar", pct: 91, weeks: [88, 92, 94, 90], done: 197, total: 217 },
  { month: "Apr", pct: 84, weeks: [82, 86, 85, 82], done: 176, total: 210 },
  { month: "May", pct: 78, weeks: [80, 75, 79, 78], done: 168, total: 217 },
  { month: "Jun", pct: 82, weeks: [81, 83, 84, 80], done: 171, total: 210 },
  { month: "Jul", pct: 76, weeks: [78, 72, 77, 77], done: 164, total: 217 },
  { month: "Aug", pct: 88, weeks: [86, 90, 88, 88], done: 190, total: 217 },
  { month: "Sep", pct: 85, weeks: [84, 86, 87, 83], done: 178, total: 210 },
  { month: "Oct", pct: 71, weeks: [74, 68, 72, 70], done: 153, total: 217 },
  { month: "Nov", pct: 89, weeks: [88, 90, 91, 87], done: 186, total: 210 },
  { month: "Dec", pct: 92, weeks: [90, 93, 94, 91], done: 199, total: 217 },
];

function getWeekColor(pct: number): string {
  if (pct > 85) return "#10b981";
  if (pct > 70) return "#0ea5e9";
  if (pct > 55) return "#f59e0b";
  return "#f43f5e";
}

export default function AnnualPage() {
  return (
    <div className="flex flex-col gap-5 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Annual Overview</h1>
          <p className="text-[12px] text-white/30 mt-0.5 tracking-wide">2024 Annual Review · Full year · 365 days</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-white/20 bg-white/[0.04] border border-white/[0.07] rounded-full px-3 py-1">12 months tracked</span>
          <span className="text-[11px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1">✓ Complete</span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-3">
        {summaryCards.map((card) => (
          <SummaryCard key={card.label} {...card} />
        ))}
      </div>

      {/* Middle Row */}
      <div className="grid grid-cols-[200px_1fr_200px] gap-3">
        {/* Left: 2024 Stats */}
        <Panel className="flex flex-col">
          <SectionTitle title="2024 Stats" />
          <div className="flex flex-col divide-y divide-white/[0.05]">
            {annualStats.map(({ label, value, color }) => (
              <div key={label} className="flex justify-between items-center py-2.5">
                <span className="text-[11px] text-white/35">{label}</span>
                <span className={`text-[12px] font-semibold tabular-nums ${color}`}>{value}</span>
              </div>
            ))}
          </div>
        </Panel>

        {/* Center: Annual Progress Chart */}
        <Panel className="flex flex-col">
          <SectionTitle title="Yearly Progress" subtitle="Monthly completion rate · 2024" />
          <div className="flex-1 min-h-[200px]">
            <AnnualProgressChart />
          </div>
          <div className="mt-3 flex items-center gap-4 pt-3 border-t border-white/[0.05]">
            {[
              { label: "Excellent (>85%)", color: "#10b981" },
              { label: "Good (>70%)", color: "#0ea5e9" },
              { label: "Fair (≤70%)", color: "#f59e0b" },
            ].map(({ label, color }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: color }} />
                <span className="text-[10px] text-white/30">{label}</span>
              </div>
            ))}
          </div>
        </Panel>

        {/* Right: Top Habits 2024 */}
        <Panel className="flex flex-col">
          <SectionTitle title="Top Habits 2024" subtitle="By annual completion rate" />
          <div className="flex flex-col gap-3">
            {topHabits.map((habit, i) => (
              <div key={habit.name} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-white/20 tabular-nums w-3">{i + 1}</span>
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: habit.hex }} />
                    <span className="text-[10px] text-white/55 truncate max-w-[100px]">{habit.name}</span>
                  </div>
                  <span className="text-[11px] font-semibold tabular-nums" style={{ color: habit.hex }}>{habit.pct}%</span>
                </div>
                <div className="h-[3px] rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${habit.pct}%`, backgroundColor: habit.hex }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* Monthly Breakdown */}
      <Panel className="flex flex-col">
        <SectionTitle title="Monthly Breakdown" subtitle="All 12 months · 2024" />
        <div className="grid grid-cols-4 gap-3">
          {monthCards.map((month) => (
            <div
              key={month.month}
              className="bg-[#080B12] rounded-lg p-3.5 border border-white/[0.06] flex flex-col gap-2.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-semibold text-white/75">{month.month}</span>
                <span
                  className="text-[12px] font-bold tabular-nums"
                  style={{ color: getWeekColor(month.pct) }}
                >
                  {month.pct}%
                </span>
              </div>
              {/* Mini heatmap */}
              <div className="flex gap-1">
                {month.weeks.map((wpct, i) => (
                  <div
                    key={i}
                    className="flex-1 h-3 rounded-sm"
                    style={{ backgroundColor: getWeekColor(wpct) + "66" }}
                    title={`Wk${i + 1}: ${wpct}%`}
                  />
                ))}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-white/20">{month.done}/{month.total} done</span>
                <div className="w-16 h-1 bg-white/[0.06] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${month.pct}%`, backgroundColor: getWeekColor(month.pct) }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
