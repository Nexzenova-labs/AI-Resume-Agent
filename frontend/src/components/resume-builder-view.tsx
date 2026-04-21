"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuth } from "@/components/providers/auth-provider";
import { useResume } from "@/components/providers/resume-provider";
import type { ResumePayload } from "@/lib/types";
import { resumeService } from "@/services/resume-service";

const templates = ["Modern Impact", "Executive Grid", "Minimal Studio"];

const quickPrompts = [
  "Summarize my last role in three impact-driven bullets.",
  "Suggest stronger AI/ML keywords for ATS matching.",
  "Recommend skills based on backend engineering experience.",
];

const SUGGESTION_MAP: Record<string, string[]> = {
  git: ["github", "gitlab", "docker", "python", "java", "ci/cd"],
  javascript: ["typescript", "react", "node.js", "next.js", "html", "css"],
  python: ["django", "fastapi", "flask", "pandas", "machine learning", "git"],
  react: ["next.js", "typescript", "tailwind css", "redux", "javascript"],
  java: ["spring boot", "kotlin", "maven", "git", "mysql"],
  docker: ["kubernetes", "aws", "linux", "ci/cd", "git"],
  backend: ["python", "node.js", "java", "postgresql", "docker", "redis"],
  frontend: ["react", "vue", "typescript", "tailwind css", "figma"],
  sql: ["postgresql", "mysql", "mongodb", "redis", "database design"],
  "machine learning": ["python", "pytorch", "tensorflow", "pandas", "scikit-learn"],
};

const DEFAULT_SUGGESTIONS = ["javascript", "python", "react", "node.js", "docker", "git", "aws", "typescript", "sql", "java"];

const emptyResumeForm: ResumePayload = {
  title: "Lead AI Engineer Resume",
  status: "draft",
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

export function ResumeBuilderView() {
  const router = useRouter();
  const { user } = useAuth();
  const { resume, resumeId, isLoading, isSaving, error, saveResume, loadResume } = useResume();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [formState, setFormState] = useState<ResumePayload>(emptyResumeForm);
  const [skillInput, setSkillInput] = useState("");
  const [toolInput, setToolInput] = useState("");
  const [customSectionInputs, setCustomSectionInputs] = useState<Record<number, string>>({});
  const [isUploading, setIsUploading] = useState(false);

  // Restore draft from local storage on mount (BUG-05)
  useEffect(() => {
    if (!resume) {
      const draft = localStorage.getItem("resumeBuilderDraft");
      if (draft) {
        try {
          const parsed = JSON.parse(draft);
          setFormState({ ...emptyResumeForm, ...parsed });
        } catch (e) {
          // ignore parse errors
        }
      }
    }
  }, [resume]);

  // Save to local storage on changes (BUG-05)
  useEffect(() => {
    if (!resume) {
      localStorage.setItem("resumeBuilderDraft", JSON.stringify(formState));
    }
  }, [formState, resume]);

  const getSuggestions = (currentItems: string[]) => {
    if (currentItems.length === 0) return DEFAULT_SUGGESTIONS;
    const lastItem = currentItems[currentItems.length - 1].toLowerCase();
    const suggestions = SUGGESTION_MAP[lastItem] || DEFAULT_SUGGESTIONS;
    return suggestions.filter(s => !currentItems.some(item => item.toLowerCase() === s.toLowerCase())).slice(0, 6);
  };

  useEffect(() => {
    if (!resume) {
      setFormState((current) => ({
        ...current,
        personal_info: {
          ...current.personal_info,
          full_name: user?.full_name ?? "",
          email: user?.email ?? "",
        },
      }));
      return;
    }

    setFormState({
      title: resume.title,
      status: resume.status,
      personal_info: {
        full_name: resume.personal_info.full_name ?? "",
        email: resume.personal_info.email ?? "",
        phone: resume.personal_info.phone ?? "",
        location: resume.personal_info.location ?? "",
        summary: resume.personal_info.summary ?? "",
        links: resume.personal_info.links ?? [],
      },
      experience: resume.experience || [],
      education: resume.education || [],
      skills: resume.skills || [],
      tools: resume.tools || [],
      projects: resume.projects || [],
      custom_sections: resume.custom_sections || [],
    });
  }, [resume, user]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setStatusMessage(null);
    setIsUploading(true);
    try {
      const parsedResume = await resumeService.upload(file);
      await loadResume(parsedResume.id);
      setStatusMessage("Resume uploaded and parsed successfully!");
      // Optionally redirect instantly upon successful upload, or wait for user to hit "Next"
    } catch (err) {
      setStatusMessage("Failed to upload resume.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>, isDraft = false) => {
    event.preventDefault();
    setStatusMessage(null);

    if (!formState.title?.trim()) {
      setStatusMessage("Please enter a resume title before saving.");
      return;
    }

    const payload: ResumePayload = {
      ...formState,
      status: isDraft ? "draft" : "active",
      experience: (formState.experience || []).filter(e => e?.role?.trim() && e?.company?.trim()),
      education: (formState.education || []).filter(e => e?.institution?.trim() && e?.degree?.trim()),
      projects: (formState.projects || []).filter(e => e?.name?.trim() && e?.description?.trim()),
      custom_sections: (formState.custom_sections || []).filter(c => c?.name?.trim() && c?.items?.length > 0),
    };

    try {
      await saveResume(payload);
      if (!isDraft) {
        localStorage.removeItem("resumeBuilderDraft");
        router.push("/resume/editor");
      } else {
        setStatusMessage(
          resumeId ? "Resume updated successfully." : "Draft saved successfully.",
        );
      }
    } catch (err) {
      // error is also set in resume context and shown below, but surface it here too
      setStatusMessage(
        err instanceof Error ? err.message : "Failed to save resume. Check that the backend is running.",
      );
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <form
        onSubmit={(e) => handleSubmit(e, false)}
        className="rounded-[2rem] border border-white/70 bg-white/75 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.06)] backdrop-blur"
      >
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-signal">
            Builder
          </p>
          <h3 className="text-3xl font-semibold tracking-[-0.04em] text-slate-950">
            Guided resume input
          </h3>
          <p className="text-sm text-slate-500">
            {isLoading
              ? "Loading saved resume..."
              : resume
                ? "Editing the active resume synced from the backend."
                : "Create your first resume and the id will be cached locally for future loads."}
          </p>

          {/* Show errors/status at the top so they're always visible */}
          {(error || statusMessage) && (
            <div className={`mt-2 rounded-[1.2rem] border px-4 py-3 text-sm ${
              error
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}>
              {error || statusMessage}
            </div>
          )}

          {!resume && (
            <div className="mt-4">
              <label 
                className="mt-2 inline-block cursor-pointer rounded-full bg-slate-100 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition"
              >
                {isUploading ? "Uploading..." : "Upload existing resume (PDF)"}
                <input 
                  type="file" 
                  accept=".pdf" 
                  className="hidden" 
                  onChange={handleFileUpload} 
                  disabled={isUploading}
                />
              </label>
            </div>
          )}
        </div>

        <div className="mt-6 grid gap-5">
          <div className="grid gap-5 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Resume title
              <input
                value={formState.title || ""}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Full name
              <input
                value={formState.personal_info?.full_name ?? ""}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    personal_info: {
                      ...(current.personal_info),
                      full_name: event.target.value,
                    },
                  }))
                }
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
              />
            </label>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Email
              <input
                value={formState.personal_info?.email ?? ""}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    personal_info: {
                      ...(current.personal_info),
                      email: event.target.value,
                    },
                  }))
                }
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Phone
              <input
                value={formState.personal_info?.phone ?? ""}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    personal_info: {
                      ...(current.personal_info),
                      phone: event.target.value,
                    },
                  }))
                }
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
              />
            </label>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Location
              <input
                value={formState.personal_info?.location ?? ""}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    personal_info: {
                      ...(current.personal_info),
                      location: event.target.value,
                    },
                  }))
                }
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
              />
            </label>
          </div>

          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Professional summary
            <textarea
              rows={5}
              value={formState.personal_info?.summary ?? ""}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  personal_info: {
                    ...(current.personal_info),
                    summary: event.target.value,
                  },
                }))
              }
              className="rounded-[1.5rem] border border-slate-200 bg-white px-4 py-3 text-sm leading-6 outline-none transition focus:border-slate-400"
            />
          </label>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-sm font-medium text-slate-700">Core skills</label>
              <div className="flex flex-col gap-3 rounded-[1.5rem] border border-slate-200 bg-white p-4 transition focus-within:border-slate-400">
                <div className="flex flex-wrap gap-2">
                  {(formState.skills || []).map((skill, i) => (
                    <span key={i} className="flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white">
                      {skill}
                      <button type="button" onClick={() => setFormState(c => ({...c, skills: c.skills.filter((_, idx) => idx !== i)}))} className="ml-1 hover:text-rose-300">&times;</button>
                    </span>
                  ))}
                  <input
                    type="text"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault();
                        if (skillInput.trim()) {
                          setFormState(c => ({ ...c, skills: [...(c.skills || []), skillInput.trim()] }));
                          setSkillInput("");
                        }
                      }
                    }}
                    placeholder="Type and press Enter..."
                    className="flex-1 min-w-[120px] bg-transparent text-sm outline-none"
                  />
                </div>
                {getSuggestions(formState.skills || []).length > 0 && (
                  <div className="mt-2 border-t border-slate-100 pt-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Suggestions</p>
                    <div className="flex flex-wrap gap-2">
                      {getSuggestions(formState.skills || []).map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => setFormState(c => ({ ...c, skills: [...(c.skills || []), suggestion] }))}
                          className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
                        >
                          + {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium text-slate-700">Tools & Technologies</label>
              <div className="flex flex-col gap-3 rounded-[1.5rem] border border-slate-200 bg-white p-4 transition focus-within:border-slate-400">
                <div className="flex flex-wrap gap-2">
                  {(formState.tools || []).map((tool, i) => (
                    <span key={i} className="flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-800 border border-slate-200">
                      {tool}
                      <button type="button" onClick={() => setFormState(c => ({...c, tools: c.tools.filter((_, idx) => idx !== i)}))} className="ml-1 hover:text-rose-500">&times;</button>
                    </span>
                  ))}
                  <input
                    type="text"
                    value={toolInput}
                    onChange={(e) => setToolInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault();
                        if (toolInput.trim()) {
                          setFormState(c => ({ ...c, tools: [...(c.tools || []), toolInput.trim()] }));
                          setToolInput("");
                        }
                      }
                    }}
                    placeholder="Type and press Enter..."
                    className="flex-1 min-w-[120px] bg-transparent text-sm outline-none"
                  />
                </div>
                {getSuggestions(formState.tools || []).length > 0 && (
                  <div className="mt-2 border-t border-slate-100 pt-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Suggestions</p>
                    <div className="flex flex-wrap gap-2">
                      {getSuggestions(formState.tools || []).map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => setFormState(c => ({ ...c, tools: [...(c.tools || []), suggestion] }))}
                          className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
                        >
                          + {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Links (URLs)
              <textarea
                rows={4}
                value={(formState.personal_info?.links || []).join(", ")}
                placeholder={"https://linkedin.com/in/you, https://github.com/you"}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    personal_info: { ...(current.personal_info), links: event.target.value.split(",").map(i => i.trim()).filter(Boolean) }
                  }))
                }
                className="rounded-[1.5rem] border border-slate-200 bg-white px-4 py-3 text-sm leading-6 outline-none transition focus:border-slate-400"
              />
            </label>
          </div>

          <div className="grid gap-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-900">Education</h4>
              <button
                type="button"
                onClick={() => setFormState(c => ({...c, education: [...(c.education || []), { institution: "", degree: "", achievements: [] }]}))}
                className="text-xs font-semibold text-sky-600 hover:text-sky-700 transition"
              >
                + Add education
              </button>
            </div>
            {(formState.education || []).map((edu, idx) => (
              <div key={idx} className="relative grid gap-5 md:grid-cols-2 rounded-2xl border border-slate-200 bg-white/50 p-4">
                <button type="button" onClick={() => setFormState(c => ({...c, education: (c.education || []).filter((_, i) => i !== idx)}))} className="absolute top-2 right-3 text-slate-400 hover:text-rose-500 text-lg leading-none">&times;</button>
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  Institution
                  <input
                    value={edu.institution}
                    onChange={(e) => {
                      const updated = [...(formState.education || [])];
                      updated[idx].institution = e.target.value;
                      setFormState(c => ({ ...c, education: updated }));
                    }}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none transition focus:border-slate-400"
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  Degree
                  <input
                    value={edu.degree}
                    onChange={(e) => {
                      const updated = [...(formState.education || [])];
                      updated[idx].degree = e.target.value;
                      setFormState(c => ({ ...c, education: updated }));
                    }}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none transition focus:border-slate-400"
                  />
                </label>
              </div>
            ))}
          </div>

          <div className="grid gap-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-900">Experience</h4>
              <button
                type="button"
                onClick={() => setFormState(c => ({...c, experience: [...(c.experience || []), { role: "", company: "", highlights: [] }]}))}
                className="text-xs font-semibold text-sky-600 hover:text-sky-700 transition"
              >
                + Add experience
              </button>
            </div>
            {(formState.experience || []).map((exp, idx) => (
              <div key={idx} className="relative grid gap-5 md:grid-cols-2 rounded-2xl border border-slate-200 bg-white/50 p-4">
                <button type="button" onClick={() => setFormState(c => ({...c, experience: (c.experience || []).filter((_, i) => i !== idx)}))} className="absolute top-2 right-3 text-slate-400 hover:text-rose-500 text-lg leading-none">&times;</button>
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  Role
                  <input
                    value={exp.role}
                    onChange={(e) => {
                      const updated = [...(formState.experience || [])];
                      updated[idx].role = e.target.value;
                      setFormState(c => ({ ...c, experience: updated }));
                    }}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none transition focus:border-slate-400"
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  Company
                  <input
                    value={exp.company}
                    onChange={(e) => {
                      const updated = [...(formState.experience || [])];
                      updated[idx].company = e.target.value;
                      setFormState(c => ({ ...c, experience: updated }));
                    }}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none transition focus:border-slate-400"
                  />
                </label>
              </div>
            ))}
          </div>

          <div className="grid gap-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-900">Projects</h4>
              <button
                type="button"
                onClick={() => setFormState(c => ({...c, projects: [...(c.projects || []), { name: "", description: "", technologies: [], highlights: [] }]}))}
                className="text-xs font-semibold text-sky-600 hover:text-sky-700 transition"
              >
                + Add project
              </button>
            </div>
            {(formState.projects || []).map((proj, idx) => (
              <div key={idx} className="relative grid gap-5 md:grid-cols-2 rounded-2xl border border-slate-200 bg-white/50 p-4">
                <button type="button" onClick={() => setFormState(c => ({...c, projects: (c.projects || []).filter((_, i) => i !== idx)}))} className="absolute top-2 right-3 text-slate-400 hover:text-rose-500 text-lg leading-none">&times;</button>
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  Project name
                  <input
                    value={proj.name}
                    onChange={(e) => {
                      const updated = [...(formState.projects || [])];
                      updated[idx].name = e.target.value;
                      setFormState(c => ({ ...c, projects: updated }));
                    }}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none transition focus:border-slate-400"
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  Description
                  <textarea
                    rows={3}
                    value={proj.description}
                    onChange={(e) => {
                      const updated = [...(formState.projects || [])];
                      updated[idx].description = e.target.value;
                      setFormState(c => ({ ...c, projects: updated }));
                    }}
                    className="rounded-[1rem] border border-slate-200 bg-white px-4 py-2 text-sm leading-6 outline-none transition focus:border-slate-400"
                  />
                </label>
              </div>
            ))}
          </div>

          <div className="grid gap-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-900">Custom Sections</h4>
              <button
                type="button"
                onClick={() => setFormState(c => ({...c, custom_sections: [...(c.custom_sections || []), { name: "", items: [] }]}))}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1"
              >
                + Add Custom Section
              </button>
            </div>
            {(formState.custom_sections || []).map((cs, idx) => (
              <div key={idx} className="relative grid gap-4 rounded-2xl border border-slate-200 bg-white/50 p-4">
                <button type="button" onClick={() => {
                  const currentInputs = { ...customSectionInputs };
                  delete currentInputs[idx];
                  setCustomSectionInputs(currentInputs);
                  setFormState(c => ({...c, custom_sections: (c.custom_sections || []).filter((_, i) => i !== idx)}));
                }} className="absolute top-2 right-3 text-slate-400 hover:text-rose-500 text-lg leading-none">&times;</button>
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  Section Name (e.g. Hobbies, Awards)
                  <input
                    value={cs.name}
                    placeholder="E.g. Hobbies"
                    onChange={(e) => {
                      const updated = [...(formState.custom_sections || [])];
                      updated[idx].name = e.target.value;
                      setFormState(c => ({ ...c, custom_sections: updated }));
                    }}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none transition focus:border-slate-400"
                  />
                </label>
                <div className="grid gap-2">
                  <label className="text-sm font-medium text-slate-700">Items inside {cs.name || "this section"}</label>
                  <div className="flex flex-col gap-3 rounded-[1.2rem] border border-slate-200 bg-white p-3 transition focus-within:border-slate-400">
                    <div className="flex flex-wrap gap-2">
                      {(cs.items || []).map((item, itemIdx) => (
                        <span key={itemIdx} className="flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white">
                          {item}
                          <button type="button" onClick={() => {
                            const updated = [...(formState.custom_sections || [])];
                            updated[idx].items = updated[idx].items.filter((_, i) => i !== itemIdx);
                            setFormState(c => ({ ...c, custom_sections: updated }));
                          }} className="ml-1 hover:text-rose-300">&times;</button>
                        </span>
                      ))}
                      <input
                        type="text"
                        value={customSectionInputs[idx] || ""}
                        onChange={(e) => setCustomSectionInputs(prev => ({ ...prev, [idx]: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ',') {
                            e.preventDefault();
                            const val = (customSectionInputs[idx] || "").trim();
                            if (val) {
                              const updated = [...(formState.custom_sections || [])];
                              if (!updated[idx].items) updated[idx].items = [];
                              updated[idx].items.push(val);
                              setFormState(c => ({ ...c, custom_sections: updated }));
                              setCustomSectionInputs(prev => ({ ...prev, [idx]: "" }));
                            }
                          }
                        }}
                        placeholder="Type and press Enter..."
                        className="flex-1 min-w-[120px] bg-transparent text-sm outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {isSaving ? "Saving..." : resumeId ? "Save & Publish" : "Create & Publish"}
            </button>
            <button
              type="button"
              onClick={(e) => handleSubmit(e as unknown as React.FormEvent<HTMLFormElement>, true)}
              disabled={isSaving}
              className="rounded-full bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-60 transition"
            >
              {isSaving ? "Saving..." : "Save as Draft"}
            </button>
            <div className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700">
              {resumeId ? `Status: ${formState.status}` : "New Draft"}
            </div>
          </div>
        </div>
      </form>

      <section className="grid gap-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[2rem] border border-white/70 bg-slate-950 p-6 text-white shadow-[0_24px_80px_rgba(15,23,42,0.18)]"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300">
            Templates
          </p>
          <div className="mt-4 grid gap-3">
            {templates.map((template) => (
              <div
                key={template}
                className="rounded-[1.2rem] border border-white/10 bg-white/5 px-4 py-3 text-sm"
              >
                {template}
              </div>
            ))}
          </div>
        </motion.div>

        <div className="rounded-[2rem] border border-white/70 bg-white/75 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.06)] backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-signal">
            AI prompt shortcuts
          </p>
          <div className="mt-4 space-y-3">
            {quickPrompts.map((prompt) => (
              <div
                key={prompt}
                className="rounded-[1.2rem] border border-slate-200/80 bg-slate-50/80 p-4 text-sm leading-6 text-slate-700"
              >
                {prompt}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
