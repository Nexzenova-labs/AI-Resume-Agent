import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { ResumeBuilderView } from "@/components/resume-builder-view";

export default function ResumePage() {
  return (
    <AppShell
      title="Resume Builder"
      description="Capture profile data, shape resume content, and prepare structured output for the visual editor."
    >
      <div className="grid gap-6">
        <div className="flex justify-end">
          <Link
            href="/resume/editor"
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
          >
            Open editor workspace
          </Link>
        </div>
        <ResumeBuilderView />
      </div>
    </AppShell>
  );
}

