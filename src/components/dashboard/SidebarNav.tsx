"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = { label: string; href: string; icon: string };
export type AppMode = "all" | "veil" | "eclipse";

const VEIL_NAV_SECTIONS: { heading: string; items: NavItem[] }[] = [
  {
    heading: "Main",
    items: [
      { label: "Dashboard", href: "/veil/dashboard", icon: "▣" },
    ],
  },
  {
    heading: "Planner",
    items: [
      { label: "Habits",         href: "/veil/habits",        icon: "✦" },
      { label: "Routines",       href: "/veil/routines",      icon: "◈" },
      { label: "Categories",     href: "/veil/categories",    icon: "◌" },
      { label: "Daily Check-In", href: "/veil/daily-checkin", icon: "✓" },
      { label: "End-of-Day",     href: "/veil/reflection",    icon: "✎" },
    ],
  },
  {
    heading: "Analytics",
    items: [
      { label: "Weekly",  href: "/veil/weekly",  icon: "▥" },
      { label: "Monthly", href: "/veil/monthly", icon: "▦" },
      { label: "Annual",  href: "/veil/annual",  icon: "▧" },
    ],
  },
  {
    heading: "Other",
    items: [
      { label: "Motivation", href: "/veil/motivation", icon: "✺" },
      { label: "Settings",   href: "/veil/settings",   icon: "⊙" },
    ],
  },
];

const ECLIPSE_NAV_SECTIONS: { heading: string; items: NavItem[] }[] = [
  {
    heading: "Main",
    items: [
      { label: "Dashboard", href: "/eclipse/dashboard", icon: "▣" },
    ],
  },
  {
    heading: "Training",
    items: [
      { label: "Body Check",      href: "/eclipse/body-check",    icon: "◒" },
      { label: "Conditioning",     href: "/eclipse/conditioning", icon: "△" },
      { label: "Skills Library",   href: "/eclipse/skills",       icon: "◇" },
      { label: "Progress",         href: "/eclipse/progress",     icon: "▧" },
    ],
  },
  {
    heading: "Media",
    items: [
      { label: "Media Vault",     href: "/eclipse/media-vault",     icon: "▤" },
      { label: "Dance Analytics", href: "/eclipse/dance-analytics", icon: "↗" },
    ],
  },
  {
    heading: "Other",
    items: [
      { label: "Motivation", href: "/eclipse/motivation", icon: "✺" },
      { label: "Settings",   href: "/eclipse/settings",   icon: "⊙" },
    ],
  },
];

const LEGACY_NAV_SECTIONS: { heading: string; items: NavItem[] }[] = [
  {
    heading: "Apps",
    items: [
      { label: "Veil",    href: "/veil/dashboard",    icon: "V" },
      { label: "Eclipse", href: "/eclipse/dashboard", icon: "E" },
    ],
  },
  ...VEIL_NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.map((item) => ({ ...item, href: item.href.replace("/veil", "") })),
  })),
  ...ECLIPSE_NAV_SECTIONS.slice(1).map((section) => ({
    ...section,
    items: section.items.map((item) => ({ ...item, href: item.href.replace("/eclipse", "").replace("/training", "/dance") })),
  })),
];

function navSectionsForApp(app: AppMode): { heading: string; items: NavItem[] }[] {
  if (app === "veil") return VEIL_NAV_SECTIONS;
  if (app === "eclipse") return ECLIPSE_NAV_SECTIONS;
  return LEGACY_NAV_SECTIONS;
}

function NavLink({ label, href, icon, app }: NavItem & { app: AppMode }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);
  const activeClasses =
    app === "eclipse"
      ? "border-violet-500/20 bg-violet-500/[0.15] font-medium text-white"
      : "border-emerald-500/20 bg-emerald-500/[0.14] font-medium text-white";
  const dotClass = app === "eclipse" ? "bg-violet-400" : "bg-emerald-400";

  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 rounded-lg border px-2.5 py-2 text-[13px] transition-colors ${
        active
          ? activeClasses
          : "border-transparent text-white/40 hover:bg-white/[0.04] hover:text-white/70"
      }`}
    >
      <span className="text-sm leading-none">{icon}</span>
      <span className="flex-1">{label}</span>
      {active && <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotClass}`} />}
    </Link>
  );
}

export default function SidebarNav({ app = "all" }: { app?: AppMode }) {
  const sections = navSectionsForApp(app);

  return (
    <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 py-3">
      {sections.map((section) => (
        <div key={section.heading}>
          <p className="mb-1.5 px-2 text-[9px] font-semibold uppercase tracking-widest text-white/25">
            {section.heading}
          </p>
          <div className="space-y-0.5">
            {section.items.map((item) => (
              <NavLink key={item.href} {...item} app={app} />
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}
