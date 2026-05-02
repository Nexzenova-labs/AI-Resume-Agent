import type { Resume, ResumePayload } from "@/lib/types";

const GUEST_RESUMES_KEY = "ai-resume-agent-guest-resumes";

function nowIso() {
  return new Date().toISOString();
}

export function createEmptyResumePayload(): ResumePayload {
  return {
    title: "Untitled Resume",
    status: "draft",
    source_type: "edited",
    template: "modern-clean",
    layout: ["Header", "Summary", "Experience", "Education", "Projects", "Skills"],
    personal_info: {
      full_name: "",
      email: "",
      phone: "",
      location: "",
      summary: "",
      links: [],
    },
    experience: [],
    education: [],
    skills: [],
    tools: [],
    projects: [],
    custom_sections: [],
  };
}

function readGuestResumes(): Resume[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(GUEST_RESUMES_KEY);
    return raw ? (JSON.parse(raw) as Resume[]) : [];
  } catch {
    return [];
  }
}

function writeGuestResumes(resumes: Resume[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(GUEST_RESUMES_KEY, JSON.stringify(resumes));
}

export const guestResumeStore = {
  list() {
    return readGuestResumes();
  },

  createDraft() {
    return this.save(createEmptyResumePayload());
  },

  save(payload: ResumePayload, existingId?: string | null) {
    const resumes = readGuestResumes();
    const timestamp = nowIso();
    const index = existingId ? resumes.findIndex((resume) => resume.id === existingId) : -1;

    const resume: Resume = {
      id: existingId ?? `guest-${crypto.randomUUID()}`,
      user_id: "guest",
      title: payload.title || "Untitled Resume",
      status: payload.status ?? "draft",
      source_type: payload.source_type ?? "edited",
      template: payload.template,
      layout: payload.layout,
      personal_info: payload.personal_info,
      experience: payload.experience,
      education: payload.education,
      skills: payload.skills,
      tools: payload.tools,
      projects: payload.projects,
      custom_sections: payload.custom_sections,
      created_at: index >= 0 ? resumes[index].created_at : timestamp,
      updated_at: timestamp,
    };

    if (index >= 0) {
      resumes[index] = resume;
    } else {
      resumes.unshift(resume);
    }

    writeGuestResumes(resumes);
    return resume;
  },

  get(resumeId: string) {
    return readGuestResumes().find((resume) => resume.id === resumeId) ?? null;
  },

  rename(resumeId: string, title: string) {
    const resumes = readGuestResumes();
    const index = resumes.findIndex((resume) => resume.id === resumeId);

    if (index < 0) {
      throw new Error("Resume not found.");
    }

    resumes[index] = {
      ...resumes[index],
      title,
      updated_at: nowIso(),
    };
    writeGuestResumes(resumes);
    return resumes[index];
  },

  delete(resumeId: string) {
    writeGuestResumes(readGuestResumes().filter((resume) => resume.id !== resumeId));
  },
};
