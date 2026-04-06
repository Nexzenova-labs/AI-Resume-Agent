import { apiRequest } from "@/lib/api-client";
import type { AtsAnalysisResult, Resume } from "@/lib/types";

type AtsAnalyzePayload = {
  job_description_text?: string;
  job_link?: string;
  resume_id?: string;
  resume?: Resume;
};

export const atsService = {
  analyze(payload: AtsAnalyzePayload) {
    return apiRequest<AtsAnalysisResult>("/api/ats/analyze", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};
