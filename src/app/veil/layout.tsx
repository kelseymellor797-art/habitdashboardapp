import AppShell from "@/components/app/AppShell";

export default function VeilLayout({ children }: { children: React.ReactNode }) {
  return <AppShell app="veil">{children}</AppShell>;
}
