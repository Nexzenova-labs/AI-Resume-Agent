import { AppShell } from "@/components/app-shell";
import { JDApplyView } from "@/components/jd-apply-view";

export default function JDApplyPage() {
  return (
    <AppShell
      title="JD Apply"
      description="Upload your resume and provide multiple job descriptions to generate tailored resumes automatically."
    >
      <JDApplyView />
    </AppShell>
  );
}
