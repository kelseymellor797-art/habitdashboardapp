"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const VIEWS = [
  { label: "Daily",   href: "/daily",   icon: "◎" },
  { label: "Weekly",  href: "/weekly",  icon: "▦" },
  { label: "Monthly", href: "/monthly", icon: "◫" },
  { label: "Annual",  href: "/annual",  icon: "▣" },
];

const MANAGE = [
  { label: "Habits",   href: "/habits",   icon: "✦" },
  { label: "Settings", href: "/settings", icon: "⊙" },
];

function NavItem({ label, href, icon }: { label: string; href: string; icon: string }) {
  const pathname = usePathname();
  const active = pathname === href;

  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm transition-colors ${
        active
          ? "bg-white/[0.07] text-white font-medium"
          : "text-white/35 hover:text-white/60 hover:bg-white/[0.04]"
      }`}
    >
      <span className="text-xs opacity-60">{icon}</span>
      {label}
      {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-400" />}
    </Link>
  );
}

export default function SidebarNav() {
  return (
    <nav className="flex-1 px-3 py-4 space-y-0.5">
      <p className="text-[10px] font-semibold text-white/25 uppercase tracking-widest px-2 mb-2">
        Views
      </p>
      {VIEWS.map((item) => (
        <NavItem key={item.href} {...item} />
      ))}

      <p className="text-[10px] font-semibold text-white/25 uppercase tracking-widest px-2 mb-2 mt-5">
        Manage
      </p>
      {MANAGE.map((item) => (
        <NavItem key={item.href} {...item} />
      ))}
    </nav>
  );
}
