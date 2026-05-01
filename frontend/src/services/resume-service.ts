import { apiRequest } from "@/lib/api-client";
import type { Resume, ResumePayload } from "@/lib/types";

export const resumeService = {
  /** List all resumes for the current user */
  list() {
    return apiRequest<Resume[]>("/api/resume", { method: "GET" });
  },

  create(payload: ResumePayload) {
    return apiRequest<Resume>("/api/resume", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  get(resumeId: string) {
    return apiRequest<Resume>(`/api/resume/${resumeId}`, { method: "GET" });
  },

  update(resumeId: string, payload: Partial<ResumePayload>) {
    return apiRequest<Resume>(`/api/resume/${resumeId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  /** Rename a resume (title only) — uses the existing PUT endpoint with a partial payload */
  rename(resumeId: string, title: string) {
    return apiRequest<Resume>(`/api/resume/${resumeId}`, {
      method: "PUT",
      body: JSON.stringify({ title }),
    });
  },

  /** Delete a resume permanently */
  delete(resumeId: string) {
    return apiRequest<void>(`/api/resume/${resumeId}`, { method: "DELETE" });
  },

  upload(file: File) {
    const formData = new FormData();
    formData.append("file", file);

    // Cannot use apiRequest here because it forces Content-Type: application/json
    const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
    return fetch(`${baseUrl}/api/resume/upload`, {
      method: "POST",
      body: formData,
      credentials: "include",
    }).then(async (res) => {
      if (!res.ok) throw new Error("Upload failed.");
      return res.json() as Promise<Resume>;
    });
  },

  /**
   * Client-side download: generates a minimal printable HTML page from the
   * resume data and opens it in a new tab so the user can Save-as-PDF via browser print.
   */
  downloadAsHtml(resume: Resume) {
    const pi = resume.personal_info;
    const sections: string[] = [];

    sections.push(`<h1>${pi.full_name ?? "Resume"}</h1>`);
    sections.push(
      `<p>${[pi.email, pi.phone, pi.location].filter(Boolean).join(" · ")}</p>`,
    );
    if (pi.summary)
      sections.push(`<h2>Summary</h2><p>${pi.summary}</p>`);

    if (resume.experience.length) {
      sections.push("<h2>Experience</h2>");
      resume.experience.forEach((e) => {
        sections.push(`<h3>${e.role} — ${e.company}</h3>`);
        sections.push(`<p>${e.start_date ?? ""} – ${e.end_date ?? "Present"}</p>`);
        if (e.highlights.length)
          sections.push(`<ul>${e.highlights.map((h) => `<li>${h}</li>`).join("")}</ul>`);
      });
    }

    if (resume.education.length) {
      sections.push("<h2>Education</h2>");
      resume.education.forEach((edu) => {
        sections.push(`<h3>${edu.degree}${edu.field_of_study ? `, ${edu.field_of_study}` : ""} — ${edu.institution}</h3>`);
        sections.push(`<p>${edu.start_date ?? ""} – ${edu.end_date ?? ""}</p>`);
      });
    }

    if (resume.skills.length)
      sections.push(`<h2>Skills</h2><p>${resume.skills.join(", ")}</p>`);

    if (resume.tools.length)
      sections.push(`<h2>Tools</h2><p>${resume.tools.join(", ")}</p>`);

    if (resume.projects.length) {
      sections.push("<h2>Projects</h2>");
      resume.projects.forEach((p) => {
        sections.push(`<h3>${p.name}</h3><p>${p.description}</p>`);
        if (p.technologies.length)
          sections.push(`<p><em>${p.technologies.join(", ")}</em></p>`);
      });
    }

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>${resume.title}</title>
<style>
  body{font-family:Georgia,serif;max-width:780px;margin:40px auto;padding:0 24px;color:#111;line-height:1.6}
  h1{font-size:2rem;margin-bottom:4px}
  h2{font-size:1.1rem;text-transform:uppercase;letter-spacing:.08em;border-bottom:1px solid #ddd;margin-top:28px;padding-bottom:4px}
  h3{font-size:1rem;margin-bottom:2px}
  p,li{font-size:.9rem;margin:4px 0}
  ul{padding-left:18px}
  @media print{body{margin:0}}
</style>
</head>
<body>${sections.join("\n")}</body>
</html>`;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${resume.title.replace(/[^a-z0-9]/gi, "_")}.html`;
    a.click();
    URL.revokeObjectURL(url);
  },
};
