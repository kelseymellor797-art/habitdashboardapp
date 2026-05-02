"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = { label: string; href: string; icon: string };

const NAV_SECTIONS: { heading: string; items: NavItem[] }[] = [
  {
    heading: "Main",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: "▣" },
    ],
  },
  {
    heading: "Planner",
    items: [
      { label: "Habits",         href: "/habits",        icon: "✦" },
      { label: "Routines",       href: "/routines",      icon: "◈" },
      { label: "Daily Check-In", href: "/daily-checkin", icon: "✓" },
    ],
  },
  {
    heading: "Dance",
    items: [
      { label: "Dance Training",  href: "/dance",           icon: "♪" },
      { label: "Conditioning",    href: "/conditioning",    icon: "△" },
      { label: "Skills",          href: "/skills",          icon: "◇" },
      { label: "Media Vault",     href: "/media-vault",     icon: "▤" },
      { label: "Dance Analytics", href: "/dance-analytics", icon: "↗" },
      { label: "Progress",        href: "/progress",        icon: "▧" },
    ],
  },
  {
    heading: "Other",
    items: [
      { label: "Motivation", href: "/motivation", icon: "✺" },
      { label: "Settings",   href: "/settings",   icon: "⊙" },
    ],
  },
];

function NavLink({ label, href, icon }: NavItem) {
  const pathname = usePathname();
  const active = pathname === href;

  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 rounded-lg border px-2.5 py-2 text-[13px] transition-colors ${
        active
          ? "border-violet-500/20 bg-violet-500/[0.15] font-medium text-white"
          : "border-transparent text-white/40 hover:bg-white/[0.04] hover:text-white/70"
      }`}
    >
      <span className="text-sm leading-none">{icon}</span>
      <span className="flex-1">{label}</span>
      {active && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400" />}
    </Link>
  );
}

export default function SidebarNav() {
  return (
    <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 py-3">
      {NAV_SECTIONS.map((section) => (
        <div key={section.heading}>
          <p className="mb-1.5 px-2 text-[9px] font-semibold uppercase tracking-widest text-white/25">
            {section.heading}
          </p>
          <div className="space-y-0.5">
            {section.items.map((item) => (
              <NavLink key={item.href} {...item} />
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}
