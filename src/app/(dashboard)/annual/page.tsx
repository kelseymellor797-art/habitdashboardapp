import Panel from "@/components/dashboard/Panel";
import SectionTitle from "@/components/dashboard/SectionTitle";
import SummaryCard from "@/components/dashboard/SummaryCard";

const summaryCards = [
  { label: "Annual Momentum", value: "82%", hex: "#8b5cf6", subtext: "2024 overall habit energy",  trend: "↑ 8%" },
  { label: "Monthly Avg",     value: "82%", hex: "#0ea5e9", subtext: "Average monthly completion", trend: "↑ 3%" },
  { label: "Best Quarter",    value: "Q4",  hex: "#10b981", subtext: "92% avg · Oct–Dec 2024",    trend: "↑ 7%" },
  { label: "Total Done",      value: "2847",hex: "#f59e0b", subtext: "Habit completions in 2024",  trend: "↑ 12%" },
];

const annualStats = [
  { label: "Total Completed", value: "2,847", color: "text-emerald-400" },
  { label: "Total Remaining", value: "1,153", color: "text-rose-400" },
  { label: "Goals Set",       value: "84",    color: "text-sky-400" },
  { label: "Goals Hit",       value: "71",    color: "text-amber-400" },
  { label: "Best Streak",     value: "23d",   color: "text-violet-400" },
  { label: "Active Habits",   value: "7",     color: "text-white/60" },
  { label: "Best Month",      value: "Dec 92%", color: "text-emerald-400" },
  { label: "Days Logged",     value: "365",   color: "text-white/60" },
];

const months = [
  { label: "Jan", pct: 74 }, { label: "Feb", pct: 79 }, { label: "Mar", pct: 91 },
  { label: "Apr", pct: 84 }, { label: "May", pct: 78 }, { label: "Jun", pct: 82 },
  { label: "Jul", pct: 76 }, { label: "Aug", pct: 88 }, { label: "Sep", pct: 85 },
  { label: "Oct", pct: 71 }, { label: "Nov", pct: 89 }, { label: "Dec", pct: 92 },
];

const topHabits = [
  { name: "Drink Water",        hex: "#22d3ee", pct: 92 },
  { name: "Morning Meditation", hex: "#8b5cf6", pct: 87 },
  { name: "Vitamins",           hex: "#f43f5e", pct: 85 },
  { name: "Exercise",           hex: "#10b981", pct: 76 },
  { name: "Reading",            hex: "#0ea5e9", pct: 73 },
  { name: "Cold Shower",        hex: "#06b6d4", pct: 61 },
  { name: "Journaling",         hex: "#f59e0b", pct: 58 },
];

function barColor(pct: number) {
  if (pct >= 88) return "#10b981";
  if (pct >= 78) return "#0ea5e9";
  if (pct >= 68) return "#8b5cf6";
  return "#f59e0b";
}

const quarters = [
  { label: "Q1", months: ["Jan","Feb","Mar"], pct: Math.round((74+79+91)/3) },
  { label: "Q2", months: ["Apr","May","Jun"], pct: Math.round((84+78+82)/3) },
  { label: "Q3", months: ["Jul","Aug","Sep"], pct: Math.round((76+88+85)/3) },
  { label: "Q4", months: ["Oct","Nov","Dec"], pct: Math.round((71+89+92)/3) },
];

export default function AnnualPage() {
  return (
    <div className="flex flex-col gap-5 max-w-[1400px]">

      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Annual Overview</h1>
          <p className="text-[12px] text-white/30 mt-0.5 tracking-wide">2024 Annual Review · Full year</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-white/20 bg-white/[0.04] border border-white/[0.07] rounded-full px-3 py-1">
            365 / 366 days logged
          </span>
          <span className="text-[11px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1">
            ✓ Complete
          </span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-3">
        {summaryCards.map((c) => <SummaryCard key={c.label} {...c} />)}
      </div>

      {/* Middle Row */}
      <div className="grid grid-cols-[200px_1fr_200px] gap-3">

        {/* Left: Annual stats */}
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

        {/* Center: Monthly bar chart */}
        <Panel className="flex flex-col">
          <SectionTitle title="Monthly Breakdown" subtitle="Completion rate per month · 2024" />
          <div className="flex flex-col gap-2 flex-1 justify-center">
            {months.map(({ label, pct }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="text-[10px] text-white/35 w-6 shrink-0">{label}</span>
                <div className="flex-1 h-[6px] rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: barColor(pct) }}
                  />
                </div>
                <span className="text-[10px] tabular-nums text-white/40 w-7 text-right">{pct}%</span>
              </div>
            ))}
          </div>
        </Panel>

        {/* Right: Top habits */}
        <Panel className="flex flex-col">
          <SectionTitle title="Top Habits" subtitle="Annual completion rate" />
          <div className="flex flex-col gap-3">
            {topHabits.map((habit, i) => (
              <div key={habit.name} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-white/20 w-3 tabular-nums">{i + 1}</span>
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: habit.hex }} />
                    <span className="text-[11px] text-white/55 truncate max-w-[100px]">{habit.name}</span>
                  </div>
                  <span className="text-[11px] font-semibold tabular-nums" style={{ color: habit.hex }}>{habit.pct}%</span>
                </div>
                <div className="h-[3px] rounded-full bg-white/[0.06]">
                  <div className="h-full rounded-full" style={{ width: `${habit.pct}%`, backgroundColor: habit.hex }} />
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* Quarterly Breakdown */}
      <Panel>
        <SectionTitle title="Quarterly Breakdown" subtitle="Q1–Q4 · 2024" />
        <div className="grid grid-cols-4 gap-3">
          {quarters.map(({ label, months: qMonths, pct }) => (
            <div key={label} className="bg-[#080B12] border border-white/[0.05] rounded-lg p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-white/60">{label}</span>
                <span className="text-[11px] font-bold tabular-nums" style={{ color: barColor(pct) }}>{pct}%</span>
              </div>
              <div className="h-[4px] rounded-full bg-white/[0.06]">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: barColor(pct) }} />
              </div>
              <div className="flex gap-1">
                {qMonths.map((m) => {
                  const monthPct = months.find((mo) => mo.label === m)?.pct ?? 0;
                  return (
                    <div key={m} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full h-[28px] rounded-sm bg-white/[0.04] relative overflow-hidden">
                        <div
                          className="absolute bottom-0 left-0 right-0 rounded-sm"
                          style={{ height: `${monthPct}%`, backgroundColor: `${barColor(monthPct)}33` }}
                        />
                      </div>
                      <span className="text-[9px] text-white/25">{m}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Panel>

    </div>
  );
}
