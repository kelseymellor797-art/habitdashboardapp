import AppShell from "@/components/app/AppShell";

export default function EclipseLayout({ children }: { children: React.ReactNode }) {
  return <AppShell app="eclipse">{children}</AppShell>;
}
