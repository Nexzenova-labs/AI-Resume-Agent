import { AppShell } from "@/components/app-shell";
import { ResumeEditorView } from "@/components/resume-editor-view";

export default function ResumeEditorPage() {
  return (
    <AppShell
      title="Resume Editor"
      description="A workspace-ready canvas with layer and inspector panels, prepared for drag-and-drop editing."
    >
      <ResumeEditorView />
    </AppShell>
  );
}

