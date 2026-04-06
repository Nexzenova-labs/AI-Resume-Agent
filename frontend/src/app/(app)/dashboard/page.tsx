import { AppShell } from "@/components/app-shell";
import { DashboardView } from "@/components/dashboard-view";

export default function DashboardPage() {
  return (
    <AppShell
      title="Dashboard"
      description="Track resume momentum, ATS performance, and interview readiness from one clean control surface."
    >
      <DashboardView />
    </AppShell>
  );
}

