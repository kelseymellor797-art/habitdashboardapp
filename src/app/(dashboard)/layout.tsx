import Link from "next/link";
import SidebarNav from "@/components/dashboard/SidebarNav";
import AuthGate from "@/components/auth/AuthGate";
import SignOutButton from "@/components/auth/SignOutButton";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <div className="flex min-h-screen bg-[#07090F] text-white">
        <aside className="w-60 shrink-0 bg-[#0A0D16] border-r border-white/[0.06] flex flex-col">
          {/* Brand + User header */}
          <div className="px-5 pt-5 pb-4 border-b border-white/[0.06]">
            <Link href="/dashboard" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity mb-4">
              <div className="w-7 h-7 rounded-lg bg-emerald-400 flex items-center justify-center text-xs font-bold text-[#07100d]">H</div>
              <span className="text-sm font-semibold tracking-normal text-emerald-100">
                HabitFlow
              </span>
            </Link>
            <SignOutButton />
          </div>
          {/* Navigation */}
          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            <SidebarNav />
          </div>
        </aside>
        <main className="flex-1 overflow-auto p-7">{children}</main>
      </div>
    </AuthGate>
  );
}
