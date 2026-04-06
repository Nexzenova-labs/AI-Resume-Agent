import { AppShell } from "@/components/app-shell";
import { AtsAnalyzerView } from "@/components/ats-analyzer-view";

export default function AtsPage() {
  return (
    <AppShell
      title="ATS Analyzer"
      description="Review job description alignment, score resume variants, and surface the right optimization cues."
    >
      <AtsAnalyzerView />
    </AppShell>
  );
}
