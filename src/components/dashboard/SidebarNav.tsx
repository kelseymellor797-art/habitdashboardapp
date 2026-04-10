"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = { label: string; href: string; icon: string };

const NAV_SECTIONS: { heading: string; items: NavItem[] }[] = [
  {
    heading: "My Day",
    items: [
      { label: "Dashboard",      href: "/dashboard",     icon: "🏠" },
      { label: "Daily Check-In", href: "/daily-checkin", icon: "✅" },
    ],
  },
  {
    heading: "Training",
    items: [
      { label: "Dance Training", href: "/dance",         icon: "💃" },
      { label: "Conditioning",   href: "/conditioning",  icon: "🏋️" },
      { label: "Progress",       href: "/progress",      icon: "📈" },
    ],
  },
  {
    heading: "Wellness",
    items: [
      { label: "Water",          href: "/water",         icon: "💧" },
      { label: "Nutrition",      href: "/nutrition",     icon: "🥗" },
      { label: "Medication",     href: "/medication",    icon: "💊" },
    ],
  },
  {
    heading: "Inspire",
    items: [
      { label: "Motivation",     href: "/motivation",    icon: "✨" },
    ],
  },
];

const MANAGE_ITEMS: NavItem[] = [
  { label: "Habits",    href: "/habits",    icon: "✦" },
  { label: "Routines",  href: "/routines",  icon: "◈" },
  { label: "Settings",  href: "/settings",  icon: "⊙" },
];

function NavLink({ label, href, icon }: NavItem) {
  const pathname = usePathname();
  const active = pathname === href;

  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] transition-colors ${
        active
          ? "bg-violet-500/[0.15] text-white font-medium border border-violet-500/20"
          : "text-white/40 hover:text-white/70 hover:bg-white/[0.04] border border-transparent"
      }`}
    >
      <span className="text-sm leading-none">{icon}</span>
      <span className="flex-1">{label}</span>
      {active && <span className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />}
    </Link>
  );
}

export default function SidebarNav() {
  return (
    <nav className="flex-1 px-3 py-3 flex flex-col gap-5 overflow-y-auto">
      {NAV_SECTIONS.map((section) => (
        <div key={section.heading}>
          <p className="text-[9px] font-semibold text-white/25 uppercase tracking-widest px-2 mb-1.5">
            {section.heading}
          </p>
          <div className="space-y-0.5">
            {section.items.map((item) => (
              <NavLink key={item.href} {...item} />
            ))}
          </div>
        </div>
      ))}

      <div className="mt-auto pt-2 border-t border-white/[0.06]">
        <p className="text-[9px] font-semibold text-white/25 uppercase tracking-widest px-2 mb-1.5">
          Manage
        </p>
        <div className="space-y-0.5">
          {MANAGE_ITEMS.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}
        </div>
      </div>
    </nav>
  );
}
