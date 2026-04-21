"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

import { useResume } from "@/components/providers/resume-provider";
import type { ExperienceItem, EducationItem, ProjectItem, ResumePayload } from "@/lib/types";

const SECTION_NAMES = ["Header", "Summary", "Experience", "Education", "Projects", "Skills"] as const;
type SectionName = (typeof SECTION_NAMES)[number];

export function ResumeEditorView() {
  const { resume, saveResume, isSaving, error } = useResume();
  const [editable, setEditable] = useState<ResumePayload | null>(null);
  const [selectedSection, setSelectedSection] = useState<SectionName>("Header");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    if (resume) {
      setEditable({
        title: resume.title,
        status: resume.status,
        personal_info: { ...resume.personal_info },
        experience: resume.experience.map((e) => ({ ...e, highlights: [...e.highlights] })),
        education: resume.education.map((e) => ({ ...e, achievements: [...e.achievements] })),
        skills: [...resume.skills],
        tools: [...resume.tools],
        projects: resume.projects.map((p) => ({ ...p, technologies: [...p.technologies], highlights: [...p.highlights] })),
        custom_sections: (resume.custom_sections || []).map((c) => ({ ...c, items: [...c.items] })),
      });
    }
  }, [resume]);

  const handleSave = async () => {
    if (!editable) return;
    setSaveMessage(null);
    try {
      await saveResume(editable);
      setSaveMessage("Saved successfully.");
      setTimeout(() => setSaveMessage(null), 3000);
    } catch {
      // error shown via context's error state
    }
  };

  // ── Experience helpers ────────────────────────────────────────────────────
  const addExperience = () =>
    setEditable((prev) =>
      prev ? { ...prev, experience: [...prev.experience, { role: "", company: "", highlights: [] }] } : prev,
    );

  const updateExperience = (idx: number, patch: Partial<ExperienceItem>) =>
    setEditable((prev) => {
      if (!prev) return prev;
      const updated = prev.experience.map((e, i) => (i === idx ? { ...e, ...patch } : e));
      return { ...prev, experience: updated };
    });

  const removeExperience = (idx: number) =>
    setEditable((prev) =>
      prev ? { ...prev, experience: prev.experience.filter((_, i) => i !== idx) } : prev,
    );

  const addHighlight = (expIdx: number, text: string) => {
    if (!text.trim()) return;
    updateExperience(expIdx, {
      highlights: [...(editable?.experience[expIdx]?.highlights ?? []), text.trim()],
    });
  };

  const removeHighlight = (expIdx: number, hIdx: number) =>
    updateExperience(expIdx, {
      highlights: editable?.experience[expIdx]?.highlights.filter((_, i) => i !== hIdx) ?? [],
    });

  // ── Education helpers ─────────────────────────────────────────────────────
  const addEducation = () =>
    setEditable((prev) =>
      prev ? { ...prev, education: [...prev.education, { institution: "", degree: "", achievements: [] }] } : prev,
    );

  const updateEducation = (idx: number, patch: Partial<EducationItem>) =>
    setEditable((prev) => {
      if (!prev) return prev;
      const updated = prev.education.map((e, i) => (i === idx ? { ...e, ...patch } : e));
      return { ...prev, education: updated };
    });

  const removeEducation = (idx: number) =>
    setEditable((prev) =>
      prev ? { ...prev, education: prev.education.filter((_, i) => i !== idx) } : prev,
    );

  // ── Project helpers ───────────────────────────────────────────────────────
  const addProject = () =>
    setEditable((prev) =>
      prev ? { ...prev, projects: [...prev.projects, { name: "", description: "", technologies: [], highlights: [] }] } : prev,
    );

  const updateProject = (idx: number, patch: Partial<ProjectItem>) =>
    setEditable((prev) => {
      if (!prev) return prev;
      const updated = prev.projects.map((p, i) => (i === idx ? { ...p, ...patch } : p));
      return { ...prev, projects: updated };
    });

  const removeProject = (idx: number) =>
    setEditable((prev) =>
      prev ? { ...prev, projects: prev.projects.filter((_, i) => i !== idx) } : prev,
    );

  if (!editable) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-[2rem] border border-white/70 bg-white/75 p-8">
        <div className="text-center">
          <p className="text-lg font-semibold text-slate-700">No resume loaded</p>
          <p className="mt-2 text-sm text-slate-400">
            Go to <a href="/resume" className="underline text-slate-600 hover:text-slate-900">Resume Builder</a> to create or load a resume first.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[220px_1fr_280px]">
      {/* ── Left panel: section navigator ── */}
      <section className="rounded-[2rem] border border-white/70 bg-white/75 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.06)] backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-signal">Sections</p>
        <div className="mt-4 space-y-2">
          {SECTION_NAMES.map((name, i) => (
            <motion.button
              key={name}
              type="button"
              initial={{ opacity: 0, x: -14 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => setSelectedSection(name)}
              className={`w-full rounded-[1.2rem] border px-4 py-3 text-left text-sm font-medium transition ${
                selectedSection === name
                  ? "border-slate-950 bg-slate-950 text-white shadow-md shadow-slate-900/20"
                  : "border-slate-200/80 bg-slate-50/80 text-slate-700 hover:bg-slate-100"
              }`}
            >
              {name}
            </motion.button>
          ))}
        </div>

        {/* Save button */}
        <div className="mt-6 border-t border-slate-200/80 pt-5">
          {(error || saveMessage) && (
            <p className={`mb-3 text-xs font-medium ${error ? "text-rose-600" : "text-emerald-600"}`}>
              {error || saveMessage}
            </p>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="w-full rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60 transition"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </section>

      {/* ── Centre panel: live preview ── */}
      <section className="rounded-[2rem] border border-white/70 bg-white/70 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.06)] backdrop-blur">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-signal">Preview</p>
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-500">
            Click a field to edit inline
          </span>
        </div>

        <div className="rounded-[1.8rem] bg-gradient-to-b from-slate-50 to-slate-100 p-4 overflow-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35 }}
            className="mx-auto min-h-[860px] max-w-[760px] rounded-[1rem] border border-slate-200 bg-white p-8 shadow-[0_32px_80px_rgba(15,23,42,0.12)]"
          >
            {/* Header */}
            <div
              className={`mb-6 border-b border-slate-200 pb-6 rounded-[1rem] p-3 cursor-pointer transition ${
                selectedSection === "Header" ? "ring-2 ring-slate-900/20 bg-slate-50" : "hover:bg-slate-50/50"
              }`}
              onClick={() => setSelectedSection("Header")}
            >
              <input
                value={editable.personal_info.full_name || ""}
                onChange={(e) =>
                  setEditable((p) => p ? { ...p, personal_info: { ...p.personal_info, full_name: e.target.value } } : p)
                }
                placeholder="Your Name"
                className="w-full bg-transparent text-3xl font-bold text-slate-950 outline-none"
              />
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                <input
                  value={editable.personal_info.email || ""}
                  onChange={(e) =>
                    setEditable((p) => p ? { ...p, personal_info: { ...p.personal_info, email: e.target.value } } : p)
                  }
                  placeholder="email@example.com"
                  className="bg-transparent outline-none min-w-[160px]"
                />
                <input
                  value={editable.personal_info.phone || ""}
                  onChange={(e) =>
                    setEditable((p) => p ? { ...p, personal_info: { ...p.personal_info, phone: e.target.value } } : p)
                  }
                  placeholder="Phone number"
                  className="bg-transparent outline-none min-w-[120px]"
                />
                <input
                  value={editable.personal_info.location || ""}
                  onChange={(e) =>
                    setEditable((p) => p ? { ...p, personal_info: { ...p.personal_info, location: e.target.value } } : p)
                  }
                  placeholder="Location"
                  className="bg-transparent outline-none min-w-[120px]"
                />
              </div>
              {(editable.personal_info.links || []).length > 0 && (
                <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-400">
                  {editable.personal_info.links.map((link, i) => (
                    <span key={i}>{link}</span>
                  ))}
                </div>
              )}
            </div>

            {/* Summary */}
            <div
              className={`mb-6 rounded-[1rem] p-3 cursor-pointer transition ${
                selectedSection === "Summary" ? "ring-2 ring-slate-900/20 bg-slate-50" : "hover:bg-slate-50/50"
              }`}
              onClick={() => setSelectedSection("Summary")}
            >
              <h2 className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-800">
                Summary
              </h2>
              <textarea
                value={editable.personal_info.summary || ""}
                onChange={(e) =>
                  setEditable((p) => p ? { ...p, personal_info: { ...p.personal_info, summary: e.target.value } } : p)
                }
                placeholder="Professional summary..."
                rows={3}
                className="w-full resize-none bg-transparent text-sm leading-7 text-slate-600 outline-none"
              />
            </div>

            {/* Experience */}
            <div
              className={`mb-6 rounded-[1rem] p-3 cursor-pointer transition ${
                selectedSection === "Experience" ? "ring-2 ring-slate-900/20 bg-slate-50" : "hover:bg-slate-50/50"
              }`}
              onClick={() => setSelectedSection("Experience")}
            >
              <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-slate-800">
                Experience
              </h2>
              <div className="space-y-4">
                {editable.experience.length === 0 && (
                  <p className="text-sm text-slate-400 italic">No experience entries. Add one in the inspector panel →</p>
                )}
                {editable.experience.map((exp, idx) => (
                  <div key={idx} className="border-l-2 border-slate-200 pl-4">
                    <input
                      value={exp.role}
                      onChange={(e) => updateExperience(idx, { role: e.target.value })}
                      placeholder="Job title"
                      className="w-full bg-transparent text-sm font-semibold text-slate-900 outline-none"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <input
                      value={exp.company}
                      onChange={(e) => updateExperience(idx, { company: e.target.value })}
                      placeholder="Company name"
                      className="w-full bg-transparent text-xs text-slate-500 outline-none mt-0.5"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="mt-1 flex gap-3 text-xs text-slate-400">
                      <input
                        value={exp.start_date || ""}
                        onChange={(e) => updateExperience(idx, { start_date: e.target.value })}
                        placeholder="Start date"
                        className="bg-transparent outline-none w-24"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span>–</span>
                      <input
                        value={exp.end_date || ""}
                        onChange={(e) => updateExperience(idx, { end_date: e.target.value })}
                        placeholder="End date"
                        className="bg-transparent outline-none w-24"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    {exp.highlights.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {exp.highlights.map((h, hi) => (
                          <li key={hi} className="flex items-start gap-2 text-sm text-slate-600">
                            <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-slate-400" />
                            <span>{h}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Education */}
            <div
              className={`mb-6 rounded-[1rem] p-3 cursor-pointer transition ${
                selectedSection === "Education" ? "ring-2 ring-slate-900/20 bg-slate-50" : "hover:bg-slate-50/50"
              }`}
              onClick={() => setSelectedSection("Education")}
            >
              <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-slate-800">
                Education
              </h2>
              <div className="space-y-3">
                {editable.education.length === 0 && (
                  <p className="text-sm text-slate-400 italic">No education entries. Add one in the inspector panel →</p>
                )}
                {editable.education.map((edu, idx) => (
                  <div key={idx} className="border-l-2 border-slate-200 pl-4">
                    <input
                      value={edu.institution}
                      onChange={(e) => updateEducation(idx, { institution: e.target.value })}
                      placeholder="Institution"
                      className="w-full bg-transparent text-sm font-semibold text-slate-900 outline-none"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <input
                      value={edu.degree}
                      onChange={(e) => updateEducation(idx, { degree: e.target.value })}
                      placeholder="Degree"
                      className="w-full bg-transparent text-xs text-slate-500 outline-none mt-0.5"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="mt-1 flex gap-3 text-xs text-slate-400">
                      <input
                        value={edu.start_date || ""}
                        onChange={(e) => updateEducation(idx, { start_date: e.target.value })}
                        placeholder="Start year"
                        className="bg-transparent outline-none w-20"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span>–</span>
                      <input
                        value={edu.end_date || ""}
                        onChange={(e) => updateEducation(idx, { end_date: e.target.value })}
                        placeholder="End year"
                        className="bg-transparent outline-none w-20"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Projects */}
            <div
              className={`mb-6 rounded-[1rem] p-3 cursor-pointer transition ${
                selectedSection === "Projects" ? "ring-2 ring-slate-900/20 bg-slate-50" : "hover:bg-slate-50/50"
              }`}
              onClick={() => setSelectedSection("Projects")}
            >
              <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-slate-800">
                Projects
              </h2>
              <div className="space-y-4">
                {editable.projects.length === 0 && (
                  <p className="text-sm text-slate-400 italic">No projects. Add one in the inspector panel →</p>
                )}
                {editable.projects.map((proj, idx) => (
                  <div key={idx} className="border-l-2 border-slate-200 pl-4">
                    <input
                      value={proj.name}
                      onChange={(e) => updateProject(idx, { name: e.target.value })}
                      placeholder="Project name"
                      className="w-full bg-transparent text-sm font-semibold text-slate-900 outline-none"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <textarea
                      value={proj.description}
                      onChange={(e) => updateProject(idx, { description: e.target.value })}
                      placeholder="Description"
                      rows={2}
                      className="mt-1 w-full resize-none bg-transparent text-xs leading-5 text-slate-500 outline-none"
                      onClick={(e) => e.stopPropagation()}
                    />
                    {proj.technologies.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {proj.technologies.map((tech, ti) => (
                          <span key={ti} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                            {tech}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Skills */}
            <div
              className={`rounded-[1rem] p-3 cursor-pointer transition ${
                selectedSection === "Skills" ? "ring-2 ring-slate-900/20 bg-slate-50" : "hover:bg-slate-50/50"
              }`}
              onClick={() => setSelectedSection("Skills")}
            >
              <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-slate-800">
                Skills & Tools
              </h2>
              <div className="flex flex-wrap gap-2">
                {[...(editable.skills || []), ...(editable.tools || [])].map((item, i) => (
                  <span key={i} className="rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white">
                    {item}
                  </span>
                ))}
                {editable.skills.length === 0 && editable.tools.length === 0 && (
                  <span className="text-sm text-slate-400 italic">Add skills in the inspector panel →</span>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Right panel: inspector / section editor ── */}
      <section
        className="rounded-[2rem] border border-white/70 bg-white/75 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.06)] backdrop-blur overflow-y-auto"
        style={{ maxHeight: "90vh" }}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-signal">
          Inspector — {selectedSection}
        </p>

        <div className="mt-4 space-y-4">
          {/* Header inspector */}
          {selectedSection === "Header" && (
            <div className="space-y-3">
              <label className="grid gap-1 text-xs font-medium text-slate-600">
                Links (one per line)
                <textarea
                  rows={3}
                  value={(editable.personal_info.links || []).join("\n")}
                  onChange={(e) =>
                    setEditable((p) =>
                      p
                        ? { ...p, personal_info: { ...p.personal_info, links: e.target.value.split("\n").map((l) => l.trim()).filter(Boolean) } }
                        : p,
                    )
                  }
                  placeholder="https://linkedin.com/in/you"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-slate-400"
                />
              </label>
              <label className="grid gap-1 text-xs font-medium text-slate-600">
                Resume title
                <input
                  value={editable.title}
                  onChange={(e) => setEditable((p) => p ? { ...p, title: e.target.value } : p)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-slate-400"
                />
              </label>
            </div>
          )}

          {/* Summary inspector */}
          {selectedSection === "Summary" && (
            <p className="text-xs text-slate-500">Edit the summary directly in the preview canvas.</p>
          )}

          {/* Experience inspector */}
          {selectedSection === "Experience" && (
            <div className="space-y-4">
              {editable.experience.map((exp, idx) => (
                <div key={idx} className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700">{exp.role || `Entry ${idx + 1}`}</span>
                    <button
                      type="button"
                      onClick={() => removeExperience(idx)}
                      className="text-xs text-slate-400 hover:text-rose-500 transition"
                    >
                      Remove
                    </button>
                  </div>
                  <BulletEditor
                    label="Highlights"
                    bullets={exp.highlights}
                    onAdd={(text) => addHighlight(idx, text)}
                    onRemove={(hi) => removeHighlight(idx, hi)}
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={addExperience}
                className="w-full rounded-[1.2rem] border border-dashed border-slate-300 py-2.5 text-xs font-medium text-slate-500 hover:border-slate-400 hover:text-slate-700 transition"
              >
                + Add experience entry
              </button>
            </div>
          )}

          {/* Education inspector */}
          {selectedSection === "Education" && (
            <div className="space-y-4">
              {editable.education.map((edu, idx) => (
                <div key={idx} className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700">{edu.institution || `Entry ${idx + 1}`}</span>
                    <button type="button" onClick={() => removeEducation(idx)} className="text-xs text-slate-400 hover:text-rose-500 transition">
                      Remove
                    </button>
                  </div>
                  <label className="mt-2 grid gap-1 text-xs font-medium text-slate-600">
                    Field of study
                    <input
                      value={edu.field_of_study || ""}
                      onChange={(e) => updateEducation(idx, { field_of_study: e.target.value })}
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-slate-400"
                    />
                  </label>
                </div>
              ))}
              <button
                type="button"
                onClick={addEducation}
                className="w-full rounded-[1.2rem] border border-dashed border-slate-300 py-2.5 text-xs font-medium text-slate-500 hover:border-slate-400 hover:text-slate-700 transition"
              >
                + Add education entry
              </button>
            </div>
          )}

          {/* Projects inspector */}
          {selectedSection === "Projects" && (
            <div className="space-y-4">
              {editable.projects.map((proj, idx) => (
                <div key={idx} className="rounded-[1.2rem] border border-slate-200 bg-slate-50 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700">{proj.name || `Project ${idx + 1}`}</span>
                    <button type="button" onClick={() => removeProject(idx)} className="text-xs text-slate-400 hover:text-rose-500 transition">
                      Remove
                    </button>
                  </div>
                  <ChipEditor
                    label="Technologies"
                    items={proj.technologies}
                    onAdd={(tech) => updateProject(idx, { technologies: [...proj.technologies, tech] })}
                    onRemove={(ti) => updateProject(idx, { technologies: proj.technologies.filter((_, i) => i !== ti) })}
                    placeholder="e.g. React"
                  />
                  <BulletEditor
                    label="Highlights"
                    bullets={proj.highlights}
                    onAdd={(text) => updateProject(idx, { highlights: [...proj.highlights, text] })}
                    onRemove={(hi) => updateProject(idx, { highlights: proj.highlights.filter((_, i) => i !== hi) })}
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={addProject}
                className="w-full rounded-[1.2rem] border border-dashed border-slate-300 py-2.5 text-xs font-medium text-slate-500 hover:border-slate-400 hover:text-slate-700 transition"
              >
                + Add project
              </button>
            </div>
          )}

          {/* Skills inspector */}
          {selectedSection === "Skills" && (
            <div className="space-y-4">
              <ChipEditor
                label="Core Skills"
                items={editable.skills}
                onAdd={(s) => setEditable((p) => p ? { ...p, skills: [...p.skills, s] } : p)}
                onRemove={(i) => setEditable((p) => p ? { ...p, skills: p.skills.filter((_, idx) => idx !== i) } : p)}
                placeholder="e.g. Python"
                chipStyle="dark"
              />
              <ChipEditor
                label="Tools & Technologies"
                items={editable.tools}
                onAdd={(t) => setEditable((p) => p ? { ...p, tools: [...p.tools, t] } : p)}
                onRemove={(i) => setEditable((p) => p ? { ...p, tools: p.tools.filter((_, idx) => idx !== i) } : p)}
                placeholder="e.g. Docker"
              />
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

// ── Small reusable sub-components ──────────────────────────────────────────

function ChipEditor({
  label,
  items,
  onAdd,
  onRemove,
  placeholder = "Type and press Enter",
  chipStyle = "light",
}: {
  label: string;
  items: string[];
  onAdd: (value: string) => void;
  onRemove: (index: number) => void;
  placeholder?: string;
  chipStyle?: "light" | "dark";
}) {
  const [input, setInput] = useState("");

  const commit = () => {
    if (input.trim()) {
      onAdd(input.trim());
      setInput("");
    }
  };

  return (
    <div className="grid gap-1">
      <span className="text-xs font-medium text-slate-600">{label}</span>
      <div className="rounded-xl border border-slate-200 bg-white p-2">
        <div className="flex flex-wrap gap-1.5">
          {items.map((item, i) => (
            <span
              key={i}
              className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                chipStyle === "dark" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 border border-slate-200"
              }`}
            >
              {item}
              <button type="button" onClick={() => onRemove(i)} className="ml-0.5 opacity-60 hover:opacity-100">
                ×
              </button>
            </span>
          ))}
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                commit();
              }
            }}
            placeholder={placeholder}
            className="flex-1 min-w-[100px] bg-transparent text-xs outline-none"
          />
        </div>
      </div>
    </div>
  );
}

function BulletEditor({
  label,
  bullets,
  onAdd,
  onRemove,
}: {
  label: string;
  bullets: string[];
  onAdd: (text: string) => void;
  onRemove: (index: number) => void;
}) {
  const [input, setInput] = useState("");

  return (
    <div className="grid gap-1">
      <span className="text-xs font-medium text-slate-600">{label}</span>
      <div className="space-y-1">
        {bullets.map((b, i) => (
          <div key={i} className="flex items-start gap-1.5">
            <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-slate-400" />
            <span className="flex-1 text-xs text-slate-600">{b}</span>
            <button type="button" onClick={() => onRemove(i)} className="text-slate-300 hover:text-rose-400 text-xs transition">
              ×
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-1.5 mt-1">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (input.trim()) {
                onAdd(input.trim());
                setInput("");
              }
            }
          }}
          placeholder="Add bullet, press Enter"
          className="flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-slate-400"
        />
        <button
          type="button"
          onClick={() => {
            if (input.trim()) {
              onAdd(input.trim());
              setInput("");
            }
          }}
          className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 transition"
        >
          Add
        </button>
      </div>
    </div>
  );
}
