import Panel from "@/components/dashboard/Panel";
import SectionTitle from "@/components/dashboard/SectionTitle";
import SummaryCard from "@/components/dashboard/SummaryCard";

const summaryCards = [
  {
    label: "Momentum",
    value: "70%",
    accent: "text-violet-400",
    subtext: "Overall habit energy this month",
  },
  {
    label: "Daily Progress",
    value: "75%",
    accent: "text-emerald-400",
    subtext: "Habits completed today",
  },
  {
    label: "Weekly Progress",
    value: "89%",
    accent: "text-sky-400",
    subtext: "Best week so far",
  },
  {
    label: "Monthly Progress",
    value: "70%",
    accent: "text-amber-400",
    subtext: "January 2025 completion rate",
  },
];

const topHabits = [
  { name: "Morning Meditation", streak: 18 },
  { name: "Exercise", streak: 14 },
  { name: "Reading", streak: 11 },
  { name: "Journaling", streak: 9 },
  { name: "Cold Shower", streak: 7 },
];

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Monthly Dashboard</h1>
          <p className="text-sm text-white/40 mt-1">January 2025</p>
        </div>
        <span className="text-xs text-white/20 border border-white/10 rounded-full px-3 py-1">
          Last updated: today
        </span>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        {summaryCards.map((card) => (
          <SummaryCard key={card.label} {...card} />
        ))}
      </div>

      {/* Middle Row: Stats | Chart | Habits */}
      <div className="grid grid-cols-[240px_1fr_240px] gap-4">
        {/* Left: Month Stats */}
        <Panel className="flex flex-col gap-4">
          <SectionTitle title="January Stats" subtitle="Month overview" />
          <div className="flex flex-col gap-3">
            {[
              { label: "Completed", value: "217", color: "text-emerald-400" },
              { label: "Remaining", value: "43", color: "text-rose-400" },
              { label: "Goals Set", value: "8", color: "text-sky-400" },
              { label: "Goals Hit", value: "5", color: "text-amber-400" },
              { label: "Best Streak", value: "18d", color: "text-violet-400" },
              { label: "Days Logged", value: "24", color: "text-white/70" },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex justify-between items-center">
                <span className="text-xs text-white/40">{label}</span>
                <span className={`text-sm font-semibold ${color}`}>{value}</span>
              </div>
            ))}
          </div>
        </Panel>

        {/* Center: Chart Placeholder */}
        <Panel className="flex flex-col">
          <SectionTitle title="Progress Over Time" subtitle="Daily completion rate" />
          <div className="flex-1 min-h-[220px] rounded-xl border border-white/5 bg-[#0d1321] flex items-center justify-center">
            <div className="text-center">
              <div className="text-4xl mb-2">📈</div>
              <p className="text-sm text-white/30">Chart coming soon</p>
              <p className="text-xs text-white/15 mt-1">Recharts or Victory integration next</p>
            </div>
          </div>
        </Panel>

        {/* Right: Top Habits */}
        <Panel className="flex flex-col gap-4">
          <SectionTitle title="Top Habits" subtitle="By current streak" />
          <div className="flex flex-col gap-2">
            {topHabits.map((habit, i) => (
              <div
                key={habit.name}
                className="flex items-center justify-between bg-[#0d1321] rounded-lg px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/20 w-4">{i + 1}</span>
                  <span className="text-xs text-white/70">{habit.name}</span>
                </div>
                <span className="text-xs font-semibold text-amber-400">
                  🔥 {habit.streak}d
                </span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* Bottom: Habit Tracker Grid Placeholder */}
      <Panel className="flex flex-col">
        <SectionTitle
          title="Habit Tracker Grid"
          subtitle="Full monthly grid coming next"
        />
        <div className="min-h-[160px] rounded-xl border border-white/5 bg-[#0d1321] flex items-center justify-center">
          <div className="text-center">
            <div className="text-4xl mb-2">🗂️</div>
            <p className="text-sm text-white/30">Habit Tracker Grid Coming Next</p>
            <p className="text-xs text-white/15 mt-1">
              Daily rows × habit columns with check/cross cells
            </p>
          </div>
        </div>
      </Panel>
    </div>
  );
}