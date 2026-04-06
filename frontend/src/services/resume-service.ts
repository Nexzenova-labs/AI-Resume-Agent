import { apiRequest } from "@/lib/api-client";
import type { Resume, ResumePayload } from "@/lib/types";

export const resumeService = {
  create(payload: ResumePayload) {
    return apiRequest<Resume>("/api/resume", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  get(resumeId: string) {
    return apiRequest<Resume>(`/api/resume/${resumeId}`, {
      method: "GET",
    });
  },
  update(resumeId: string, payload: Partial<ResumePayload>) {
    return apiRequest<Resume>(`/api/resume/${resumeId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },
  upload(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    
    // We cannot use apiRequest here because it forces Content-Type: application/json
    const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
    return fetch(`${baseUrl}/api/resume/upload`, {
      method: "POST",
      body: formData,
      credentials: "include",
    }).then(async (res) => {
      if (!res.ok) {
        throw new Error("Upload failed.");
      }
      return res.json() as Promise<Resume>;
    });
  },
};
