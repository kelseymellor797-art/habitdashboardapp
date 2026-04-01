export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-[#0B0F1A] text-white">
      <aside className="w-64 bg-[#111827] p-4 border-r border-white/10">
        <h2 className="text-xl font-semibold mb-6">Habit App</h2>

        <nav className="space-y-3">
          <div className="text-sm text-white/70">Monthly</div>
          <div className="text-sm text-white/70">Weekly</div>
          <div className="text-sm text-white/70">Annual</div>
        </nav>
      </aside>

      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}