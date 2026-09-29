import AppShell from "@/components/app/AppShell";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <AppShell app="all">{children}</AppShell>;
}
