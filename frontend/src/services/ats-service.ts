import { apiRequest } from "@/lib/api-client";
import type { AtsAnalysisResult, ResumePayload, ResumeQualityResult } from "@/lib/types";

type AtsAnalyzePayload = {
  job_description_text?: string;
  job_link?: string;
  resume_id?: string;
  resume?: ResumePayload;
};

type ResumeQualityPayload = {
  resume_id?: string;
  resume?: ResumePayload;
};

export const atsService = {
  analyze(payload: AtsAnalyzePayload) {
    return apiRequest<AtsAnalysisResult>("/api/ats/analyze", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  quality(payload: ResumeQualityPayload) {
    return apiRequest<ResumeQualityResult>("/api/ats/quality", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};
