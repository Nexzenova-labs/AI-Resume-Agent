import { apiRequest } from "@/lib/api-client";
import type { ResumePayload } from "@/lib/types";

export type JdApplyPayload = {
  resume_id?: string;
  resume?: ResumePayload;
  jds: string[];
};

export type JdApplyResultItem = {
  jd_index: number;
  jd_text: string;
  job_title: string;
  saved_resume_id: string | null;
  modified_resume: ResumePayload;
  added_skills: string[];
  added_tools: string[];
  keywords_injected: number;
  /** Which AI path ran: "gemini-2.0-flash" | "gemini-2.0-flash-lite" | "openai" | "heuristic" */
  tailoring_method: string;
};

export type JdApplyResult = {
  results: JdApplyResultItem[];
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export const jdApplyService = {
  process(payload: JdApplyPayload) {
    return apiRequest<JdApplyResult>("/api/jd-apply/process", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  /** Upload a JD as PDF or .txt and get back the extracted text. */
  async parseJd(file: File): Promise<string> {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${API_BASE}/api/jd-apply/parse-jd`, {
      method: "POST",
      body: form,
      credentials: "include",
    });
    if (!res.ok) throw new Error("Failed to parse JD file.");
    const data = await res.json() as { text: string };
    return data.text;
  },
};
