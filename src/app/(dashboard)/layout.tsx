import Link from "next/link";
import SidebarNav from "@/components/dashboard/SidebarNav";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#07090F] text-white">
      <aside className="w-60 shrink-0 bg-[#0A0D16] border-r border-white/[0.06] flex flex-col">
        <div className="px-5 py-5 border-b border-white/[0.06]">
          <Link href="/dashboard" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-xs font-bold">H</div>
            <span className="text-sm font-semibold tracking-tight">HabitFlow</span>
          </Link>
        </div>
        <div className="relative flex-1">
          <SidebarNav />
          <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[#0A0D16] to-transparent pointer-events-none" />
        </div>
        <div className="px-4 py-4 border-t border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-[10px] font-semibold">K</div>
            <div className="flex flex-col">
              <span className="text-xs font-medium text-white/70">Katrina</span>
              <span className="text-[10px] text-white/25">Free plan</span>
            </div>
          </div>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-7">{children}</main>
    </div>
  );
}
