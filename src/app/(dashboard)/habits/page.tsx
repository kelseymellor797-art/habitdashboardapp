import Panel from "@/components/dashboard/Panel";
import SectionTitle from "@/components/dashboard/SectionTitle";

export default function HabitsPage() {
  return (
    <div className="flex flex-col gap-5 max-w-[900px]">
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Habits</h1>
          <p className="text-[12px] text-white/30 mt-0.5 tracking-wide">Manage your tracked habits</p>
        </div>
        <button className="flex items-center gap-2 text-[12px] font-medium text-white bg-violet-600 hover:bg-violet-500 transition-colors rounded-lg px-4 py-2">
          + Add Habit
        </button>
      </div>

      <Panel>
        <SectionTitle title="Active Habits" subtitle="7 habits tracked" />
        {[
          { name: "Morning Meditation", hex: "#8b5cf6", type: "Daily",  goal: 26, streak: 5 },
          { name: "Exercise",           hex: "#10b981", type: "Daily",  goal: 20, streak: 3 },
          { name: "Reading",            hex: "#0ea5e9", type: "Daily",  goal: 20, streak: 2 },
          { name: "Journaling",         hex: "#f59e0b", type: "Daily",  goal: 15, streak: 0 },
          { name: "Cold Shower",        hex: "#06b6d4", type: "Daily",  goal: 15, streak: 1 },
          { name: "Vitamins",           hex: "#f43f5e", type: "Daily",  goal: 28, streak: 2 },
          { name: "Drink Water",        hex: "#22d3ee", type: "Daily",  goal: 30, streak: 5 },
        ].map((habit, idx) => (
          <div
            key={habit.name}
            className={`flex items-center justify-between py-3 ${idx !== 0 ? "border-t border-white/[0.05]" : ""}`}
          >
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: habit.hex }} />
              <div>
                <p className="text-[13px] font-medium text-white/75">{habit.name}</p>
                <p className="text-[10px] text-white/30 mt-0.5">
                  {habit.type} · Goal: {habit.goal}/mo
                  {habit.streak > 0 && <span className="ml-2 text-amber-400">🔥 {habit.streak}d streak</span>}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2.5 py-0.5">
                Active
              </span>
              <button className="text-[11px] text-white/30 hover:text-white/60 bg-white/[0.04] hover:bg-white/[0.07] transition-colors rounded-lg px-3 py-1.5">
                Edit
              </button>
              <button className="text-[11px] text-white/20 hover:text-rose-400 bg-white/[0.04] hover:bg-rose-500/10 transition-colors rounded-lg px-3 py-1.5">
                Delete
              </button>
            </div>
          </div>
        ))}
      </Panel>

      <div className="rounded-xl border border-dashed border-white/[0.1] bg-white/[0.02] p-8 flex flex-col items-center justify-center gap-3 text-center">
        <div className="w-10 h-10 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 text-lg">
          +
        </div>
        <p className="text-[13px] text-white/40">Full habit CRUD with form coming soon</p>
        <p className="text-[11px] text-white/20">Add, edit, delete, reorder, and archive habits</p>
      </div>
    </div>
  );
}
