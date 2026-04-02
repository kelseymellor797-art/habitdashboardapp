import Panel from "@/components/dashboard/Panel";
import SectionTitle from "@/components/dashboard/SectionTitle";
import SummaryCard from "@/components/dashboard/SummaryCard";

const summaryCards = [
  { label: "Weekly Completion", value: "71%", hex: "#8b5cf6", subtext: "Week 4 · Jan 20–26", trend: "↓ 14%" },
  { label: "Daily Average",     value: "5/7",  hex: "#10b981", subtext: "Habits completed per day", trend: "→" },
  { label: "Best Streak",       value: "18d",  hex: "#0ea5e9", subtext: "Morning Meditation", trend: "↑ 3d" },
  { label: "On Track",          value: "5/7",  hex: "#f59e0b", subtext: "Habits hitting weekly goal", trend: "→" },
];

const weekDays = [
  { label: "Mon", date: "Jan 20", done: 6, total: 7 },
  { label: "Tue", date: "Jan 21", done: 5, total: 7 },
  { label: "Wed", date: "Jan 22", done: 7, total: 7 },
  { label: "Thu", date: "Jan 23", done: 4, total: 7 },
  { label: "Fri", date: "Jan 24", done: 6, total: 7 },
  { label: "Sat", date: "Jan 25", done: 0, total: 7, future: true },
  { label: "Sun", date: "Jan 26", done: 0, total: 7, future: true },
];

const weekHabits = [
  { name: "Morning Meditation", hex: "#8b5cf6",  days: [1,1,1,1,1,0,0] },
  { name: "Exercise",           hex: "#10b981",  days: [1,0,1,0,1,0,0] },
  { name: "Reading",            hex: "#0ea5e9",  days: [0,1,1,0,1,0,0] },
  { name: "Journaling",         hex: "#f59e0b",  days: [1,0,0,1,0,0,0] },
  { name: "Cold Shower",        hex: "#06b6d4",  days: [1,1,0,0,1,0,0] },
  { name: "Vitamins",           hex: "#f43f5e",  days: [1,1,1,1,1,0,0] },
  { name: "Drink Water",        hex: "#22d3ee",  days: [1,1,1,1,1,0,0] },
];

const topHabits = weekHabits
  .map((h) => ({ ...h, count: h.days.reduce((a, b) => a + b, 0) }))
  .sort((a, b) => b.count - a.count);

const weekHistory = [
  { label: "Week 1", range: "Jan 1–5",   pct: 82 },
  { label: "Week 2", range: "Jan 6–12",  pct: 88 },
  { label: "Week 3", range: "Jan 13–19", pct: 85 },
  { label: "Week 4", range: "Jan 20–26", pct: 71, current: true },
];

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
          <span className="text-[11px] text-white/20 bg-white/[0.04] border border-white/[0.07] rounded-full px-3 py-1">
            5 / 7 days logged
          </span>
          <span className="text-[11px] font-medium text-violet-400 bg-violet-500/10 border border-violet-500/20 rounded-full px-3 py-1">
            ● Live
          </span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-3">
        {summaryCards.map((c) => <SummaryCard key={c.label} {...c} />)}
      </div>

      {/* Middle Row */}
      <div className="grid grid-cols-[200px_1fr_200px] gap-3">

        {/* Left: Day-by-day breakdown */}
        <Panel className="flex flex-col">
          <SectionTitle title="This Week" subtitle="Daily completions" />
          <div className="flex flex-col divide-y divide-white/[0.05]">
            {weekDays.map(({ label, date, done, total, future }) => {
              const pct = future ? 0 : Math.round((done / total) * 100);
              return (
                <div key={label} className="flex items-center justify-between py-2.5 gap-3">
                  <div>
                    <span className={`text-[11px] font-medium ${future ? "text-white/20" : "text-white/60"}`}>{label}</span>
                    <span className="text-[10px] text-white/20 ml-1.5">{date}</span>
                  </div>
                  {future ? (
                    <span className="text-[10px] text-white/15">–</span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-[3px] rounded-full bg-white/[0.06]">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${pct}%`, backgroundColor: pct === 100 ? "#10b981" : "#8b5cf6" }}
                        />
                      </div>
                      <span className="text-[11px] tabular-nums text-white/40">{done}/{total}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Panel>

        {/* Center: Weekly Habit Grid */}
        <Panel className="flex flex-col">
          <SectionTitle title="Habit Grid" subtitle="Mon–Sun · Week 4" />
          <div className="overflow-x-auto">
            <table className="border-collapse w-full">
              <thead>
                <tr>
                  <th className="text-left pb-2 pr-4 w-36" />
                  {weekDays.map((d) => (
                    <th key={d.label} className="text-center pb-2">
                      <div className="text-[9px] text-white/20 leading-none mb-1">{d.label}</div>
                      <div className={`text-[10px] font-medium tabular-nums w-6 h-6 flex items-center justify-center mx-auto rounded-full ${
                        d.label === "Fri" ? "bg-violet-500/25 text-violet-300" : d.future ? "text-white/15" : "text-white/35"
                      }`}>
                        {d.date.split(" ")[1]}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {weekHabits.map((habit, idx) => (
                  <tr key={habit.name} className={`group ${idx !== 0 ? "border-t border-white/[0.04]" : ""}`}>
                    <td className="pr-4 py-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: habit.hex }} />
                        <span className="text-[11px] text-white/45 truncate max-w-[120px]">{habit.name}</span>
                      </div>
                    </td>
                    {habit.days.map((done, i) => {
                      const isFuture = weekDays[i].future;
                      return (
                        <td key={i} className="py-1.5 text-center">
                          <div
                            className="w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-bold mx-auto border"
                            style={
                              isFuture
                                ? { backgroundColor: "transparent", borderColor: "rgba(255,255,255,0.04)", color: "transparent" }
                                : done
                                ? { backgroundColor: `${habit.hex}22`, borderColor: `${habit.hex}55`, color: habit.hex }
                                : { backgroundColor: "rgba(255,255,255,0.025)", borderColor: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.2)" }
                            }
                          >
                            {isFuture ? "" : done ? "✓" : "–"}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        {/* Right: Top habits this week */}
        <Panel className="flex flex-col">
          <SectionTitle title="Top This Week" subtitle="By completions" />
          <div className="flex flex-col gap-3">
            {topHabits.map((habit, i) => (
              <div key={habit.name} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-white/20 w-3 tabular-nums">{i + 1}</span>
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: habit.hex }} />
                    <span className="text-[11px] text-white/55 truncate max-w-[100px]">{habit.name}</span>
                  </div>
                  <span className="text-[11px] font-semibold tabular-nums" style={{ color: habit.hex }}>
                    {habit.count}/5
                  </span>
                </div>
                <div className="h-[3px] rounded-full bg-white/[0.06]">
                  <div className="h-full rounded-full" style={{ width: `${(habit.count / 5) * 100}%`, backgroundColor: habit.hex }} />
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* Weekly History */}
      <Panel>
        <SectionTitle title="Weekly History" subtitle="January 2025" />
        <div className="flex flex-col gap-3">
          {weekHistory.map(({ label, range, pct, current }) => (
            <div key={label} className={`flex items-center gap-4 p-3 rounded-lg ${current ? "bg-violet-500/[0.06] border border-violet-500/20" : "bg-white/[0.02] border border-white/[0.05]"}`}>
              <div className="w-16 shrink-0">
                <div className={`text-[11px] font-medium ${current ? "text-violet-300" : "text-white/50"}`}>{label}</div>
                <div className="text-[10px] text-white/25 mt-0.5">{range}</div>
              </div>
              <div className="flex-1 h-[5px] rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, backgroundColor: current ? "#8b5cf6" : pct >= 85 ? "#10b981" : "#0ea5e9" }}
                />
              </div>
              <div className={`text-[13px] font-semibold tabular-nums w-10 text-right ${current ? "text-violet-300" : "text-white/50"}`}>
                {pct}%
              </div>
              {current && <span className="text-[10px] text-violet-400 bg-violet-500/10 rounded-full px-2 py-0.5">Current</span>}
            </div>
          ))}
        </div>
      </Panel>

    </div>
  );
}
