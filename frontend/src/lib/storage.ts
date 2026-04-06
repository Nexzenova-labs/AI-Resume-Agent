const RESUME_ID_KEY = "ai-resume-agent-resume-id";

export function getStoredResumeId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(RESUME_ID_KEY);
}

export function setStoredResumeId(resumeId: string): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(RESUME_ID_KEY, resumeId);
}

export function clearStoredResumeId(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(RESUME_ID_KEY);
}
