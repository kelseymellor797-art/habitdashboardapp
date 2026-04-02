import Panel from "@/components/dashboard/Panel";
import SectionTitle from "@/components/dashboard/SectionTitle";
import SummaryCard from "@/components/dashboard/SummaryCard";
import WeeklyCompletionChart from "@/components/dashboard/charts/WeeklyCompletionChart";

const summaryCards = [
  { label: "Weekly Completion", value: "71%", hex: "#8b5cf6", subtext: "Week 4 overall", trend: "↓ 14%" },
  { label: "Daily Average", value: "5/7", hex: "#10b981", subtext: "Habits per day avg", trend: "→ 0%" },
  { label: "Best Streak", value: "18d", hex: "#0ea5e9", subtext: "Morning Meditation", trend: "↑ 3d" },
  { label: "On Track", value: "5/7", hex: "#f59e0b", subtext: "Habits meeting goal", trend: "→ 0%" },
];

type DayRow = {
  label: string;
  date: string;
  done: number;
  total: number;
  future?: boolean;
};

const dayRows: DayRow[] = [
  { label: "Mon", date: "Jan 20", done: 6, total: 7 },
  { label: "Tue", date: "Jan 21", done: 5, total: 7 },
  { label: "Wed", date: "Jan 22", done: 7, total: 7 },
  { label: "Thu", date: "Jan 23", done: 4, total: 7 },
  { label: "Fri", date: "Jan 24", done: 6, total: 7 },
  { label: "Sat", date: "Jan 25", done: 0, total: 7, future: true },
  { label: "Sun", date: "Jan 26", done: 0, total: 7, future: true },
];

type HabitWeekData = {
  id: string;
  name: string;
  hex: string;
  days: number[]; // 0=Mon..6=Sun, 1=done 0=not
};

const weekHabits: HabitWeekData[] = [
  { id: "meditation", name: "Morning Meditation", hex: "#8b5cf6", days: [1,1,1,1,1,0,0] },
  { id: "exercise", name: "Exercise", hex: "#10b981", days: [1,0,1,0,1,0,0] },
  { id: "reading", name: "Reading", hex: "#0ea5e9", days: [0,1,1,0,1,0,0] },
  { id: "journaling", name: "Journaling", hex: "#f59e0b", days: [1,0,0,1,0,0,0] },
  { id: "cold-shower", name: "Cold Shower", hex: "#06b6d4", days: [1,1,0,0,1,0,0] },
  { id: "vitamins", name: "Vitamins", hex: "#f43f5e", days: [1,1,1,1,1,0,0] },
  { id: "water", name: "Drink Water", hex: "#22d3ee", days: [1,1,1,1,1,0,0] },
];

const topHabits = weekHabits
  .map((h) => ({ ...h, count: h.days.slice(0, 5).reduce((a, b) => a + b, 0) }))
  .sort((a, b) => b.count - a.count);

const weeklyHistory = [
  { label: "Week 1", dates: "Jan 1–5", pct: 82, current: false },
  { label: "Week 2", dates: "Jan 6–12", pct: 88, current: false },
  { label: "Week 3", dates: "Jan 13–19", pct: 85, current: false },
  { label: "Week 4", dates: "Jan 20–26", pct: 71, current: true },
];

const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function WeeklyPage() {
  return (
    <div className="flex flex-col gap-5 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Weekly Overview</h1>
          <p className="text-[12px] text-white/30 mt-0.5 tracking-wide">Week 4 · Jan 20–26, 2025</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-white/20 bg-white/[0.04] border border-white/[0.07] rounded-full px-3 py-1">Week 4 of 4</span>
          <span className="text-[11px] font-medium text-violet-400 bg-violet-500/10 border border-violet-500/20 rounded-full px-3 py-1">● Live</span>
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
        {/* Left: This Week */}
        <Panel className="flex flex-col">
          <SectionTitle title="This Week" />
          <div className="flex flex-col divide-y divide-white/[0.05]">
            {dayRows.map((row) => (
              <div key={row.label} className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-2">
                  <span className={`text-[11px] font-medium w-7 ${row.future ? "text-white/20" : "text-white/55"}`}>{row.label}</span>
                  <span className={`text-[10px] ${row.future ? "text-white/15" : "text-white/25"}`}>{row.date}</span>
                </div>
                {row.future ? (
                  <span className="text-[10px] text-white/20">–</span>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[12px] font-semibold tabular-nums ${row.done === row.total ? "text-emerald-400" : row.done >= 5 ? "text-sky-400" : "text-amber-400"}`}>
                      {row.done}/{row.total}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Panel>

        {/* Center: Weekly Chart */}
        <Panel className="flex flex-col">
          <SectionTitle title="Weekly Habit Grid" subtitle="Mon–Sun · Week 4" />
          <div className="mb-4 flex gap-1.5 pl-[88px]">
            {dayLabels.map((d, i) => (
              <div key={d} className={`flex-1 text-center text-[10px] font-medium ${i >= 5 ? "text-white/15" : "text-white/30"}`}>{d}</div>
            ))}
          </div>
          <div className="flex flex-col gap-1.5">
            {weekHabits.map((habit) => (
              <div key={habit.id} className="flex items-center gap-1.5">
                <div className="flex items-center gap-1.5 w-[84px] shrink-0">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: habit.hex }} />
                  <span className="text-[10px] text-white/40 truncate">{habit.name.split(" ")[0]}</span>
                </div>
                <div className="flex gap-1.5 flex-1">
                  {habit.days.map((done, dayIdx) => (
                    <div
                      key={dayIdx}
                      className={`flex-1 h-7 rounded-md ${dayIdx >= 5 ? "bg-white/[0.03] border border-dashed border-white/[0.06]" : done ? "border border-white/10" : "bg-white/[0.04] border border-white/[0.06]"}`}
                      style={done && dayIdx < 5 ? { backgroundColor: habit.hex + "33", borderColor: habit.hex + "66" } : undefined}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 pt-4 border-t border-white/[0.05]">
            <SectionTitle title="Weekly Completion Chart" subtitle="Completion % by week" />
            <WeeklyCompletionChart />
          </div>
        </Panel>

        {/* Right: Top This Week */}
        <Panel className="flex flex-col">
          <SectionTitle title="Top This Week" subtitle="By completions (5 days)" />
          <div className="flex flex-col gap-3">
            {topHabits.map((habit, i) => (
              <div key={habit.id} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-white/20 tabular-nums w-3">{i + 1}</span>
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: habit.hex }} />
                    <span className="text-[10px] text-white/55 truncate max-w-[100px]">{habit.name}</span>
                  </div>
                  <span className="text-[11px] font-semibold text-white/60 tabular-nums">{habit.count}/5</span>
                </div>
                <div className="h-[3px] rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(habit.count / 5) * 100}%`, backgroundColor: habit.hex }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* Weekly History */}
      <Panel className="flex flex-col">
        <SectionTitle title="Weekly History" subtitle="January 2025" />
        <div className="flex flex-col divide-y divide-white/[0.05]">
          {weeklyHistory.map((week) => (
            <div
              key={week.label}
              className={`flex items-center gap-4 py-3 ${week.current ? "rounded-lg px-3 -mx-3 bg-violet-500/[0.04]" : ""}`}
            >
              <div className="w-14 shrink-0">
                <p className={`text-[12px] font-medium ${week.current ? "text-violet-400" : "text-white/55"}`}>{week.label}</p>
                <p className="text-[10px] text-white/25 mt-0.5">{week.dates}</p>
              </div>
              <div className="flex-1 h-2 bg-white/[0.06] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${week.pct}%`,
                    backgroundColor: week.current ? "#8b5cf6" : week.pct >= 85 ? "#10b981" : "#0ea5e9",
                  }}
                />
              </div>
              <div className="flex items-center gap-2 w-20 justify-end">
                <span className={`text-[13px] font-semibold tabular-nums ${week.current ? "text-violet-400" : "text-white/60"}`}>
                  {week.pct}%
                </span>
                {week.current && (
                  <span className="text-[9px] font-medium text-violet-400/70 bg-violet-500/10 border border-violet-500/20 rounded-full px-1.5 py-0.5">now</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
