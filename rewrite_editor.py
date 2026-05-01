import json

# Output target
OUTPUT_FILE = "/Users/abhinay/Developer/AI-Resume-Agent/frontend/src/components/resume-editor-view.tsx"

new_content = """\'\'\'"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { useResume } from "@/components/providers/resume-provider";
import type { ExperienceItem, EducationItem, ProjectItem, ResumePayload } from "@/lib/types";

const DEFAULT_LAYOUT = ["Header", "Summary", "Experience", "Education", "Projects", "Skills"];
const TEMPLATES = ["modern-impact", "executive-grid", "minimal-studio"] as const;

// Sortable Item Component
function SortableSectionItem({ id, name, isSelected, onClick }: { id: string, name: string, isSelected: boolean, onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} className="relative flex items-stretch cursor-default group mb-2 touch-none">
      <button
        type="button"
        onClick={onClick}
        className={`flex-1 rounded-[1.2rem] border px-4 py-3 text-left text-sm font-medium transition ${
          isSelected
            ? "border-slate-950 bg-slate-950 text-white shadow-md shadow-slate-900/20"
            : "border-slate-200/80 bg-slate-50/80 text-slate-700 hover:bg-slate-100"
        }`}
      >
        {name}
      </button>
      <div
        {...attributes}
        {...listeners}
        className={`absolute right-2 top-1/2 -translate-y-1/2 cursor-grab py-2 pl-3 pr-2 transition-opacity ${isSelected ? "text-white opacity-80" : "text-slate-400 opacity-0 group-hover:opacity-100"}`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></svg>
      </div>
    </div>
  );
}

export function ResumeEditorView() {
  const { resume, saveResume, isSaving, error } = useResume();
  const [editable, setEditable] = useState<ResumePayload | null>(null);
  const [selectedSection, setSelectedSection] = useState<string>("Header");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [layout, setLayout] = useState<string[]>(DEFAULT_LAYOUT);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    if (resume) {
      setEditable({
        title: resume.title,
        status: resume.status,
        template: resume.template || "modern-impact",
        layout: resume.layout?.length ? resume.layout : DEFAULT_LAYOUT,
        personal_info: { ...resume.personal_info },
        experience: resume.experience.map((e) => ({ ...e, highlights: [...e.highlights] })),
        education: resume.education.map((e) => ({ ...e, achievements: [...e.achievements] })),
        skills: [...resume.skills],
        tools: [...resume.tools],
        projects: resume.projects.map((p) => ({ ...p, technologies: [...p.technologies], highlights: [...p.highlights] })),
        custom_sections: (resume.custom_sections || []).map((c) => ({ ...c, items: [...c.items] })),
      });
      setLayout(resume.layout?.length ? resume.layout : DEFAULT_LAYOUT);
    }
  }, [resume]);

  const handleSave = async () => {
    if (!editable) return;
    setSaveMessage(null);
    try {
      await saveResume({ ...editable, layout });
      setSaveMessage("Saved successfully.");
      setTimeout(() => setSaveMessage(null), 3000);
    } catch {
      // error shown via context's error state
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setLayout((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        return arrayMove(items, oldIndex, newIndex);
      });
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

  const templateSettings = {
    "modern-impact": {
      container: "font-sans border border-slate-200 bg-white",
      header: "border-b-2 border-slate-900 pb-6 mb-6",
      name: "text-4xl font-extrabold text-slate-900 tracking-tight",
      heading: "mb-3 text-sm font-bold uppercase tracking-[0.2em] text-slate-900 border-b border-slate-100 pb-1 mb-4",
      jobTitle: "text-base font-bold text-slate-900",
      accent: "text-slate-500 font-medium"
    },
    "executive-grid": {
      container: "font-serif border border-slate-300 bg-white shadow-sm",
      header: "border-b-4 border-blue-900 pb-4 mb-5 text-center",
      name: "text-3xl font-bold text-blue-950 uppercase tracking-widest",
      heading: "mb-2 text-lg font-semibold text-blue-900 border-b-2 border-blue-900/10 pb-1 mt-4 mb-3",
      jobTitle: "text-sm font-bold text-slate-800",
      accent: "text-blue-700 font-medium text-sm"
    },
    "minimal-studio": {
      container: "font-sans bg-white text-slate-800",
      header: "mb-10 text-right",
      name: "text-3xl font-light text-slate-900 tracking-wider",
      heading: "mb-4 text-xs font-medium uppercase tracking-[0.3em] text-slate-400",
      jobTitle: "text-sm font-medium text-slate-900",
      accent: "text-slate-400 text-xs tracking-wide"
    }
  };

  const tStyle = templateSettings[editable.template as keyof typeof templateSettings] || templateSettings["modern-impact"];

  return (
    <div className="grid gap-6 xl:grid-cols-[220px_1fr_280px]">
      {/* ── Left panel: section navigator ── */}
      <section className="rounded-[2rem] border border-white/70 bg-white/75 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.06)] backdrop-blur">
        
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-600 mb-3">Template</p>
        <select 
          value={editable.template || "modern-impact"}
          onChange={(e) => setEditable(p => p ? { ...p, template: e.target.value } : p)}
          className="w-full mb-6 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-400"
        >
          {TEMPLATES.map(t => (
            <option key={t} value={t}>{t.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</option>
          ))}
        </select>

        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-600">Sections</p>
        <div className="mt-4">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={layout} strategy={verticalListSortingStrategy}>
              {layout.map((name) => (
                <SortableSectionItem
                  key={name}
                  id={name}
                  name={name}
                  isSelected={selectedSection === name}
                  onClick={() => setSelectedSection(name)}
                />
              ))}
            </SortableContext>
          </DndContext>
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
            className="w-full rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60 transition shadow-lg shadow-slate-900/20"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </section>

      {/* ── Centre panel: live preview ── */}
      <section className="rounded-[2rem] border border-white/70 bg-white/70 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.06)] backdrop-blur">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-600">Preview</p>
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-500">
            Click a field to edit inline
          </span>
        </div>

        <div className="rounded-[1.8rem] bg-slate-100/50 p-4 overflow-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35 }}
            className={`mx-auto min-h-[860px] max-w-[760px] p-10 transition-colors duration-300 ${tStyle.container}`}
          >
            {layout.map(section => {
              
              if (section === "Header") {
                return (
                  <div key="Header" className={`cursor-pointer transition hover:bg-slate-50/50 rounded-xl p-2 -mx-2 ${tStyle.header} ${selectedSection === "Header" ? "ring-2 ring-blue-500/20 bg-blue-50/30" : ""}`} onClick={() => setSelectedSection("Header")}>
                    <input
                      value={editable.personal_info.full_name || ""}
                      onChange={(e) => setEditable((p) => p ? { ...p, personal_info: { ...p.personal_info, full_name: e.target.value } } : p)}
                      placeholder="Your Name"
                      className={`w-full bg-transparent outline-none ${tStyle.name} ${editable.template === "minimal-studio" ? "text-right" : ""}`}
                    />
                    <div className={`mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500 ${editable.template === "minimal-studio" ? "justify-end" : editable.template === "executive-grid" ? "justify-center" : ""}`}>
                      <input
                        value={editable.personal_info.email || ""}
                        onChange={(e) => setEditable((p) => p ? { ...p, personal_info: { ...p.personal_info, email: e.target.value } } : p)}
                        placeholder="email@example.com"
                        className={`bg-transparent outline-none min-w-[160px] ${editable.template === "minimal-studio" ? "text-right" : editable.template === "executive-grid" ? "text-center" : ""}`}
                      />
                      <input
                        value={editable.personal_info.phone || ""}
                        onChange={(e) => setEditable((p) => p ? { ...p, personal_info: { ...p.personal_info, phone: e.target.value } } : p)}
                        placeholder="Phone number"
                        className={`bg-transparent outline-none min-w-[120px] ${editable.template === "minimal-studio" ? "text-right" : editable.template === "executive-grid" ? "text-center" : ""}`}
                      />
                      <input
                        value={editable.personal_info.location || ""}
                        onChange={(e) => setEditable((p) => p ? { ...p, personal_info: { ...p.personal_info, location: e.target.value } } : p)}
                        placeholder="Location"
                        className={`bg-transparent outline-none min-w-[120px] ${editable.template === "minimal-studio" ? "text-right" : editable.template === "executive-grid" ? "text-center" : ""}`}
                      />
                    </div>
                    {(editable.personal_info.links || []).length > 0 && (
                      <div className={`mt-1 flex flex-wrap gap-3 text-xs text-slate-400 ${editable.template === "minimal-studio" ? "justify-end" : editable.template === "executive-grid" ? "justify-center" : ""}`}>
                        {editable.personal_info.links.map((link, i) => <span key={i}>{link}</span>)}
                      </div>
                    )}
                  </div>
                );
              }

              if (section === "Summary") {
                return (
                  <div key="Summary" className={`mb-6 rounded-xl p-2 -mx-2 cursor-pointer transition ${selectedSection === "Summary" ? "ring-2 ring-blue-500/20 bg-blue-50/30" : "hover:bg-slate-50/50"}`} onClick={() => setSelectedSection("Summary")}>
                    <h2 className={tStyle.heading}>Summary</h2>
                    <textarea
                      value={editable.personal_info.summary || ""}
                      onChange={(e) => setEditable((p) => p ? { ...p, personal_info: { ...p.personal_info, summary: e.target.value } } : p)}
                      placeholder="Professional summary..."
                      rows={3}
                      className="w-full resize-none bg-transparent text-sm leading-relaxed text-slate-700 outline-none"
                    />
                  </div>
                );
              }

              if (section === "Experience") {
                return (
                  <div key="Experience" className={`mb-6 rounded-xl p-2 -mx-2 cursor-pointer transition ${selectedSection === "Experience" ? "ring-2 ring-blue-500/20 bg-blue-50/30" : "hover:bg-slate-50/50"}`} onClick={() => setSelectedSection("Experience")}>
                    <h2 className={tStyle.heading}>Experience</h2>
                    <div className="space-y-5">
                      {editable.experience.length === 0 && (
                        <p className="text-sm text-slate-400 italic">No experience entries. Add one in the inspector panel →</p>
                      )}
                      {editable.experience.map((exp, idx) => (
                        <div key={idx} className={`${editable.template === "minimal-studio" ? "pl-2" : "border-l-2 border-slate-200 pl-4"} relative`}>
                          <div className="flex justify-between items-baseline flex-wrap gap-2">
                            <input
                              value={exp.role}
                              onChange={(e) => updateExperience(idx, { role: e.target.value })}
                              placeholder="Job title"
                              className={`bg-transparent outline-none flex-1 min-w-[200px] ${tStyle.jobTitle}`}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <div className={`flex gap-1 text-xs ${tStyle.accent}`}>
                              <input value={exp.start_date || ""} onChange={(e) => updateExperience(idx, { start_date: e.target.value })} placeholder="Start" className="bg-transparent outline-none w-16 text-right" onClick={(e) => e.stopPropagation()} />
                              <span>–</span>
                              <input value={exp.end_date || ""} onChange={(e) => updateExperience(idx, { end_date: e.target.value })} placeholder="End" className="bg-transparent outline-none w-16" onClick={(e) => e.stopPropagation()} />
                            </div>
                          </div>
                          <input
                            value={exp.company}
                            onChange={(e) => updateExperience(idx, { company: e.target.value })}
                            placeholder="Company name"
                            className={`w-full bg-transparent text-sm outline-none mt-0.5 ${editable.template === "executive-grid" ? "text-slate-600 italic" : "text-slate-500 text-xs uppercase tracking-wider"}`}
                            onClick={(e) => e.stopPropagation()}
                          />
                          {exp.highlights.length > 0 && (
                            <ul className={`mt-2 space-y-1.5 ${editable.template === "minimal-studio" ? "list-none" : "list-none"}`}>
                              {exp.highlights.map((h, hi) => (
                                <li key={hi} className="flex items-start gap-2 text-sm text-slate-600 leading-relaxed">
                                  <span className={`mt-2 h-1 w-1 flex-shrink-0 rounded-full ${editable.template === "minimal-studio" ? "bg-slate-300" : "bg-slate-400"}`} />
                                  <span>{h}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }

              if (section === "Education") {
                return (
                  <div key="Education" className={`mb-6 rounded-xl p-2 -mx-2 cursor-pointer transition ${selectedSection === "Education" ? "ring-2 ring-blue-500/20 bg-blue-50/30" : "hover:bg-slate-50/50"}`} onClick={() => setSelectedSection("Education")}>
                    <h2 className={tStyle.heading}>Education</h2>
                    <div className="space-y-4">
                      {editable.education.length === 0 && (
                        <p className="text-sm text-slate-400 italic">No education entries. Add one in the inspector panel →</p>
                      )}
                      {editable.education.map((edu, idx) => (
                        <div key={idx} className={`${editable.template === "minimal-studio" ? "pl-2" : "border-l-2 border-slate-200 pl-4"}`}>
                          <div className="flex justify-between items-baseline flex-wrap gap-2">
                             <input
                              value={edu.institution}
                              onChange={(e) => updateEducation(idx, { institution: e.target.value })}
                              placeholder="Institution"
                              className={`bg-transparent outline-none flex-1 min-w-[200px] ${tStyle.jobTitle}`}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <div className={`flex gap-1 text-xs ${tStyle.accent}`}>
                              <input value={edu.start_date || ""} onChange={(e) => updateEducation(idx, { start_date: e.target.value })} placeholder="Start" className="bg-transparent outline-none w-12 text-right" onClick={(e) => e.stopPropagation()} />
                              <span>–</span>
                              <input value={edu.end_date || ""} onChange={(e) => updateEducation(idx, { end_date: e.target.value })} placeholder="End" className="bg-transparent outline-none w-12" onClick={(e) => e.stopPropagation()} />
                            </div>
                          </div>
                          <input
                            value={edu.degree}
                            onChange={(e) => updateEducation(idx, { degree: e.target.value })}
                            placeholder="Degree"
                            className={`w-full bg-transparent text-sm outline-none mt-0.5 ${editable.template === "executive-grid" ? "text-slate-600 italic" : "text-slate-500 text-xs"}`}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }

              if (section === "Projects") {
                return (
                  <div key="Projects" className={`mb-6 rounded-xl p-2 -mx-2 cursor-pointer transition ${selectedSection === "Projects" ? "ring-2 ring-blue-500/20 bg-blue-50/30" : "hover:bg-slate-50/50"}`} onClick={() => setSelectedSection("Projects")}>
                    <h2 className={tStyle.heading}>Projects</h2>
                    <div className="space-y-5">
                      {editable.projects.length === 0 && (
                        <p className="text-sm text-slate-400 italic">No projects. Add one in the inspector panel →</p>
                      )}
                      {editable.projects.map((proj, idx) => (
                        <div key={idx} className={`${editable.template === "minimal-studio" ? "pl-2" : "border-l-2 border-slate-200 pl-4"}`}>
                          <div className="flex items-baseline gap-3">
                             <input
                              value={proj.name}
                              onChange={(e) => updateProject(idx, { name: e.target.value })}
                              placeholder="Project name"
                              className={`bg-transparent outline-none ${tStyle.jobTitle}`}
                              onClick={(e) => e.stopPropagation()}
                            />
                            {editable.template !== "minimal-studio" && proj.technologies.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {proj.technologies.slice(0, 3).map((tech, ti) => (
                                  <span key={ti} className="text-[10px] uppercase font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-sm">{tech}</span>
                                ))}
                              </div>
                            )}
                          </div>
                          
                          <textarea
                            value={proj.description}
                            onChange={(e) => updateProject(idx, { description: e.target.value })}
                            placeholder="Description"
                            rows={1}
                            className={`w-full resize-none bg-transparent outline-none mt-1 ${editable.template === "minimal-studio" ? "text-sm text-slate-600" : "text-xs text-slate-500"}`}
                            onClick={(e) => e.stopPropagation()}
                          />

                          {proj.highlights.length > 0 && (
                            <ul className="mt-1 space-y-1">
                              {proj.highlights.map((h, hi) => (
                                <li key={hi} className="flex items-start gap-2 text-sm text-slate-600">
                                  <span className={`mt-2 h-1 w-1 flex-shrink-0 rounded-full ${editable.template === "minimal-studio" ? "bg-slate-300" : "bg-slate-400"}`} />
                                  <span>{h}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }

              if (section === "Skills") {
                return (
                  <div key="Skills" className={`rounded-xl p-2 -mx-2 cursor-pointer transition ${selectedSection === "Skills" ? "ring-2 ring-blue-500/20 bg-blue-50/30" : "hover:bg-slate-50/50"}`} onClick={() => setSelectedSection("Skills")}>
                    <h2 className={tStyle.heading}>Skills & Tools</h2>
                    <div className="flex flex-wrap gap-2">
                      {[...(editable.skills || []), ...(editable.tools || [])].map((item, i) => (
                        <span key={i} className={`px-3 py-1 text-xs font-medium ${editable.template === "minimal-studio" ? "text-slate-600 border border-slate-200 rounded-md" : "rounded-full bg-slate-900 text-white"}`}>
                          {item}
                        </span>
                      ))}
                      {editable.skills.length === 0 && editable.tools.length === 0 && (
                        <span className="text-sm text-slate-400 italic">Add skills in the inspector panel →</span>
                      )}
                    </div>
                  </div>
                );
              }

              return null;
            })}
          </motion.div>
        </div>
      </section>

      {/* ── Right panel: inspector / section editor ── */}
      <section
        className="rounded-[2rem] border border-white/70 bg-white/75 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.06)] backdrop-blur overflow-y-auto"
        style={{ maxHeight: "90vh" }}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-600">
          Inspector — {selectedSection}
        </p>

        <div className="mt-6 space-y-5">
          {/* Header inspector */}
          {selectedSection === "Header" && (
            <div className="space-y-4">
              <label className="grid gap-1.5 text-xs font-medium text-slate-600">
                Links (one per line)
                <textarea
                  rows={3}
                  value={(editable.personal_info.links || []).join("\\n")}
                  onChange={(e) =>
                    setEditable((p) =>
                      p
                        ? { ...p, personal_info: { ...p.personal_info, links: e.target.value.split("\\n").map((l) => l.trim()).filter(Boolean) } }
                        : p,
                    )
                  }
                  placeholder="https://linkedin.com/in/you"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-slate-400"
                />
              </label>
              <label className="grid gap-1.5 text-xs font-medium text-slate-600">
                Resume title (Internal)
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
            <p className="text-sm text-slate-500 bg-slate-50 p-4 rounded-xl border border-slate-100">Edit the summary directly in the preview canvas.</p>
          )}

          {/* Experience inspector */}
          {selectedSection === "Experience" && (
            <div className="space-y-4">
              {editable.experience.map((exp, idx) => (
                <div key={idx} className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="text-xs font-bold text-slate-700">{exp.role || `Entry ${idx + 1}`}</span>
                    <button
                      type="button"
                      onClick={() => removeExperience(idx)}
                      className="text-xs font-medium text-slate-400 hover:text-rose-500 transition"
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
                className="w-full rounded-xl border border-dashed border-slate-300 py-3 text-xs font-medium text-slate-500 hover:border-slate-400 hover:text-slate-700 transition hover:bg-slate-50"
              >
                + Add experience
              </button>
            </div>
          )}

          {/* Education inspector */}
          {selectedSection === "Education" && (
            <div className="space-y-4">
              {editable.education.map((edu, idx) => (
                <div key={idx} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="text-xs font-bold text-slate-700">{edu.institution || `Entry ${idx + 1}`}</span>
                    <button type="button" onClick={() => removeEducation(idx)} className="text-xs font-medium text-slate-400 hover:text-rose-500 transition">
                      Remove
                    </button>
                  </div>
                  <label className="mt-3 grid gap-1 relative text-xs font-medium text-slate-600">
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
                className="w-full rounded-xl border border-dashed border-slate-300 py-3 text-xs font-medium text-slate-500 hover:border-slate-400 hover:text-slate-700 transition hover:bg-slate-50"
              >
                + Add education
              </button>
            </div>
          )}

          {/* Projects inspector */}
          {selectedSection === "Projects" && (
            <div className="space-y-4">
              {editable.projects.map((proj, idx) => (
                <div key={idx} className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="text-xs font-bold text-slate-700">{proj.name || `Project ${idx + 1}`}</span>
                    <button type="button" onClick={() => removeProject(idx)} className="text-xs font-medium text-slate-400 hover:text-rose-500 transition">
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
                className="w-full rounded-xl border border-dashed border-slate-300 py-3 text-xs font-medium text-slate-500 hover:border-slate-400 hover:text-slate-700 transition hover:bg-slate-50"
              >
                + Add project
              </button>
            </div>
          )}

          {/* Skills inspector */}
          {selectedSection === "Skills" && (
            <div className="space-y-6">
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
    <div className="grid gap-1.5">
      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
      <div className="rounded-xl border border-slate-200 bg-white p-2">
        <div className="flex flex-wrap gap-1.5">
          {items.map((item, i) => (
            <span
              key={i}
              className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                chipStyle === "dark" ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-700 border border-slate-200"
              }`}
            >
              {item}
              <button type="button" onClick={() => onRemove(i)} className="ml-1 opacity-60 hover:opacity-100 text-[10px]">
                ✕
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
            className="flex-1 min-w-[120px] bg-transparent text-sm outline-none px-1"
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
    <div className="grid gap-2">
      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
      <div className="space-y-1.5">
        {bullets.map((b, i) => (
          <div key={i} className="flex items-start gap-2 group">
            <span className="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-slate-300" />
            <span className="flex-1 text-xs text-slate-600 leading-relaxed">{b}</span>
            <button type="button" onClick={() => onRemove(i)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500 text-lg leading-none transition px-1">
              ×
            </button>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-2 mt-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (input.trim()) {
                onAdd(input.trim());
                setInput("");
              }
            }
          }}
          placeholder="Add bullet... (Shift+Enter for new line)"
          rows={2}
          className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs outline-none focus:border-slate-400 resize-none"
        />
        <button
          type="button"
          onClick={() => {
            if (input.trim()) {
              onAdd(input.trim());
              setInput("");
            }
          }}
          className="self-end rounded-lg bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-slate-800 transition"
        >
          Add Bullet
        </button>
      </div>
    </div>
  );
}
\'\'\'

with open(OUTPUT_FILE, 'w') as f:
    f.write(new_content)
print("File updated!")
