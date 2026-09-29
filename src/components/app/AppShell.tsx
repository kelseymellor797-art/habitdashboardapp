import Link from "next/link";
import type { ReactNode } from "react";
import AuthGate from "@/components/auth/AuthGate";
import SignOutButton from "@/components/auth/SignOutButton";
import SidebarNav, { type AppMode } from "@/components/dashboard/SidebarNav";

const APP_BRANDS: Record<AppMode, { name: string; href: string; mark: string; accent: string; text: string }> = {
  all: {
    name: "HabitFlow",
    href: "/dashboard",
    mark: "H",
    accent: "bg-emerald-400",
    text: "text-emerald-100",
  },
  veil: {
    name: "Veil",
    href: "/veil/dashboard",
    mark: "V",
    accent: "bg-emerald-300",
    text: "text-emerald-100",
  },
  eclipse: {
    name: "Eclipse",
    href: "/eclipse/dashboard",
    mark: "E",
    accent: "bg-violet-400",
    text: "text-violet-100",
  },
};

export default function AppShell({ app, children }: { app: AppMode; children: ReactNode }) {
  const brand = APP_BRANDS[app];

  return (
    <AuthGate>
      <div className="flex min-h-screen bg-[#07090F] text-white">
        <aside className="flex w-60 shrink-0 flex-col border-r border-white/[0.06] bg-[#0A0D16]">
          <div className="border-b border-white/[0.06] px-5 pb-4 pt-5">
            <Link href={brand.href} className="mb-4 flex items-center gap-2.5 transition-opacity hover:opacity-80">
              <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${brand.accent} text-xs font-bold text-[#07100d]`}>
                {brand.mark}
              </div>
              <span className={`text-sm font-semibold tracking-normal ${brand.text}`}>{brand.name}</span>
            </Link>
            <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl border border-white/[0.06] bg-white/[0.035] p-1">
              <Link
                href="/veil/dashboard"
                className={`rounded-lg px-2 py-1.5 text-center text-[11px] font-medium transition-colors ${
                  app === "veil" ? "bg-emerald-400/[0.16] text-emerald-50" : "text-white/35 hover:bg-white/[0.04] hover:text-white/65"
                }`}
              >
                Veil
              </Link>
              <Link
                href="/eclipse/dashboard"
                className={`rounded-lg px-2 py-1.5 text-center text-[11px] font-medium transition-colors ${
                  app === "eclipse" ? "bg-violet-400/[0.16] text-violet-50" : "text-white/35 hover:bg-white/[0.04] hover:text-white/65"
                }`}
              >
                Eclipse
              </Link>
            </div>
            <SignOutButton />
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <SidebarNav app={app} />
          </div>
        </aside>
        <main className="flex-1 overflow-auto p-7">{children}</main>
      </div>
    </AuthGate>
  );
}
