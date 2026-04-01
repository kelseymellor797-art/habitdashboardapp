export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-[#07090F] text-white">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 bg-[#0A0D16] border-r border-white/[0.06] flex flex-col">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-xs font-bold">
              H
            </div>
            <span className="text-sm font-semibold tracking-tight">HabitFlow</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          <p className="text-[10px] font-semibold text-white/25 uppercase tracking-widest px-2 mb-2">
            Views
          </p>
          {[
            { label: "Monthly", icon: "◫", active: true },
            { label: "Weekly", icon: "▦", active: false },
            { label: "Annual", icon: "▣", active: false },
          ].map(({ label, icon, active }) => (
            <div
              key={label}
              className={`flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm cursor-pointer transition-colors ${
                active
                  ? "bg-white/[0.07] text-white font-medium"
                  : "text-white/35 hover:text-white/60 hover:bg-white/[0.04]"
              }`}
            >
              <span className="text-xs opacity-60">{icon}</span>
              {label}
              {active && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-400" />
              )}
            </div>
          ))}

          <p className="text-[10px] font-semibold text-white/25 uppercase tracking-widest px-2 mb-2 mt-5">
            Manage
          </p>
          {[
            { label: "Habits", icon: "✦" },
            { label: "Goals", icon: "◎" },
            { label: "Settings", icon: "⊙" },
          ].map(({ label, icon }) => (
            <div
              key={label}
              className="flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm text-white/35 hover:text-white/60 hover:bg-white/[0.04] cursor-pointer transition-colors"
            >
              <span className="text-xs opacity-60">{icon}</span>
              {label}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-[10px] font-semibold">
              K
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-medium text-white/70">Katrina</span>
              <span className="text-[10px] text-white/25">Free plan</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto p-7">{children}</main>
    </div>
  );
}
