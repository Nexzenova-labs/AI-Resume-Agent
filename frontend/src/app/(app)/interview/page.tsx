import { AppShell } from "@/components/app-shell";
import { InterviewCoachView } from "@/components/interview-coach-view";

export default function InterviewPage() {
  return (
    <AppShell
      title="Interview Coach"
      description="Prepare role-specific mock interviews with prompts, difficulty controls, and future voice-ready session flows."
    >
      <InterviewCoachView />
    </AppShell>
  );
}
