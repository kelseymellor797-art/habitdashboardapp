import Link from "next/link";
import SidebarNav from "@/components/dashboard/SidebarNav";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#07090F] text-white">
      <aside className="w-60 shrink-0 bg-[#0A0D16] border-r border-white/[0.06] flex flex-col">
        {/* Brand + User header */}
        <div className="px-5 pt-5 pb-4 border-b border-white/[0.06]">
          <Link href="/dashboard" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity mb-4">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-xs font-bold">✦</div>
            <span className="text-sm font-semibold tracking-tight bg-gradient-to-r from-violet-300 to-pink-300 bg-clip-text text-transparent">
              Wellness
            </span>
          </Link>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-[11px] font-bold text-white shadow-lg">
              K
            </div>
            <div className="flex flex-col">
              <span className="text-[13px] font-semibold text-white">Katrina ✨</span>
              <span className="text-[10px] text-white/30">Personal dashboard</span>
            </div>
          </div>
        </div>
        {/* Navigation */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          <SidebarNav />
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-7">{children}</main>
    </div>
  );
}
