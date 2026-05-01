"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useRouter } from "next/navigation";

import { useResume } from "@/components/providers/resume-provider";
import { resumeService } from "@/services/resume-service";
import type { ExperienceItem, EducationItem, ProjectItem, Resume, ResumePayload } from "@/lib/types";

const DEFAULT_LAYOUT = ["Header", "Summary", "Experience", "Education", "Projects", "Skills"];

// ─── Template config ───────────────────────────────────────────────────────────
type TemplateId = "modern-clean" | "executive" | "minimal";

interface TemplateStyle {
  label: string;
  thumb: string;
  page: string;
  headerBg: string;
  headerText: string;
  headingBar: string;
  headingText: string;
  accentLine: string;
  nameText: string;
  bodyText: string;
  tagBg: string;
  tagText: string;
}

const TEMPLATES: Record<TemplateId, TemplateStyle> = {
  "modern-clean": {
    label: "Modern Clean",
    thumb: "from-blue-500 to-cyan-400",
    page: "bg-white font-sans",
    headerBg: "bg-slate-900",
    headerText: "text-white",
    headingBar: "border-b-2 border-slate-900",
    headingText: "text-slate-900 text-xs font-bold uppercase tracking-[0.2em]",
    accentLine: "border-l-2 border-slate-300",
    nameText: "text-3xl font-bold text-white",
    bodyText: "text-slate-700",
    tagBg: "bg-slate-100 border border-slate-200",
    tagText: "text-slate-700",
  },
  "executive": {
    label: "Executive",
    thumb: "from-indigo-800 to-indigo-600",
    page: "bg-white font-serif",
    headerBg: "bg-gradient-to-r from-indigo-900 to-indigo-700",
    headerText: "text-white",
    headingBar: "border-b border-indigo-800",
    headingText: "text-indigo-900 text-sm font-bold uppercase tracking-widest",
    accentLine: "border-l-2 border-indigo-300",
    nameText: "text-4xl font-bold text-white tracking-wide",
    bodyText: "text-slate-600",
    tagBg: "bg-indigo-50 border border-indigo-100",
    tagText: "text-indigo-800",
  },
  "minimal": {
    label: "Minimal",
    thumb: "from-slate-400 to-slate-600",
    page: "bg-[#fafafa] font-sans",
    headerBg: "bg-transparent border-b-2 border-slate-900",
    headerText: "text-slate-900",
    headingBar: "border-b border-gray-300",
    headingText: "text-xs font-semibold uppercase tracking-[0.3em] text-gray-400",
    accentLine: "border-l border-gray-200",
    nameText: "text-3xl font-light text-slate-900 tracking-wider",
    bodyText: "text-slate-600",
    tagBg: "border border-slate-300",
    tagText: "text-slate-600",
  },
};

// ─── SortableSection pill ───────────────────────────────────────────────────────
function SortableSectionPill({
  id,
  isSelected,
  onClick,
}: {
  id: string;
  isSelected: boolean;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-1 mb-1.5 group touch-none">
      <button
        type="button"
        onClick={onClick}
        className={`flex-1 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-all ${
          isSelected
            ? "bg-slate-900 text-white shadow-md"
            : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300"
        }`}
      >
        {id}
      </button>
      <div
        {...attributes}
        {...listeners}
        className={`cursor-grab active:cursor-grabbing p-2 rounded-lg transition-opacity ${
          isSelected ? "text-slate-400 opacity-80" : "text-slate-300 opacity-0 group-hover:opacity-100"
        }`}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="9" cy="6" r="1" fill="currentColor" />
          <circle cx="9" cy="12" r="1" fill="currentColor" />
          <circle cx="9" cy="18" r="1" fill="currentColor" />
          <circle cx="15" cy="6" r="1" fill="currentColor" />
          <circle cx="15" cy="12" r="1" fill="currentColor" />
          <circle cx="15" cy="18" r="1" fill="currentColor" />
        </svg>
      </div>
    </div>
  );
}

// ─── Text Chip editor ─────────────────────────────────────────────────────────
function ChipInput({
  items,
  onAdd,
  onRemove,
  placeholder,
  dark,
  tStyle,
}: {
  items: string[];
  onAdd: (v: string) => void;
  onRemove: (i: number) => void;
  placeholder?: string;
  dark?: boolean;
  tStyle?: TemplateStyle;
}) {
  const [val, setVal] = useState("");
  const commit = () => {
    if (val.trim()) { onAdd(val.trim()); setVal(""); }
  };
  const chipBg = dark ? "bg-slate-800 text-white border-slate-700" : (tStyle ? `${tStyle.tagBg} ${tStyle.tagText}` : "bg-slate-100 text-slate-700");
  return (
    <div className="flex flex-wrap gap-1.5 rounded-xl border border-slate-200 bg-white p-2 focus-within:border-blue-400 transition">
      {items.map((it, i) => (
        <span key={i} className={`flex items-center gap-1 rounded-full pl-2.5 pr-1 py-0.5 text-xs font-medium border ${chipBg}`}>
          {it}
          <button onClick={() => onRemove(i)} className="w-3.5 h-3.5 flex items-center justify-center opacity-60 hover:opacity-100">✕</button>
        </span>
      ))}
      <input
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); commit(); } }}
        placeholder={placeholder || "Add…"}
        className="flex-1 min-w-[80px] bg-transparent text-xs outline-none px-1 text-slate-700"
      />
    </div>
  );
}

// ─── Inline editable field ────────────────────────────────────────────────────
function InlineEdit({
  value,
  onChange,
  placeholder,
  multiline,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLTextAreaElement & HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);

  if (multiline) {
    return (
      <textarea
        ref={ref as React.RefObject<HTMLTextAreaElement>}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        rows={2}
        onClick={e => e.stopPropagation()}
        className={`w-full bg-transparent resize-none outline-none transition-all ${focused ? "ring-1 ring-blue-400/50 rounded" : ""} ${className || ""}`}
      />
    );
  }
  return (
    <input
      ref={ref as React.RefObject<HTMLInputElement>}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onClick={e => e.stopPropagation()}
      className={`w-full bg-transparent outline-none transition-all ${focused ? "ring-1 ring-blue-400/50 rounded px-1" : ""} ${className || ""}`}
    />
  );
}

// ─── Main editor component ────────────────────────────────────────────────────
export function ResumeEditorView() {
  const { resume, saveResume, isSaving, error } = useResume();
  const router = useRouter();
  const [editable, setEditable] = useState<ResumePayload | null>(null);
  const [selectedSection, setSelectedSection] = useState<string>("Header");
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [layout, setLayout] = useState<string[]>(DEFAULT_LAYOUT);
  const [templateId, setTemplateId] = useState<TemplateId>("modern-clean");
  const [showTemplates, setShowTemplates] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    if (resume) {
      const validTemplates: TemplateId[] = ["modern-clean", "executive", "minimal"];
      const rawTemplate = resume.template as TemplateId;
      const t: TemplateId = validTemplates.includes(rawTemplate) ? rawTemplate : "modern-clean";
      setTemplateId(t);
      const l = resume.layout?.length ? resume.layout : DEFAULT_LAYOUT;
      setLayout(l);
      setEditable({
        title: resume.title,
        status: resume.status,
        template: t,
        layout: l,
        personal_info: { ...resume.personal_info },
        experience: resume.experience.map(e => ({ ...e, highlights: [...e.highlights] })),
        education: resume.education.map(e => ({ ...e, achievements: [...e.achievements] })),
        skills: [...resume.skills],
        tools: [...resume.tools],
        projects: resume.projects.map(p => ({ ...p, technologies: [...p.technologies], highlights: [...p.highlights] })),
        custom_sections: (resume.custom_sections || []).map(c => ({ ...c, items: [...c.items] })),
      });
    }
  }, [resume]);

  const handleSave = async () => {
    if (!editable) return;
    setSaveMsg(null);
    try {
      await saveResume({ 
        ...editable, 
        template: templateId, 
        layout,
        source_type: "edited" 
      });
      setSaveMsg("Saved!");
      setTimeout(() => setSaveMsg(null), 2500);
    } catch { /* error shown via context */ }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setLayout(items => {
        const oi = items.indexOf(active.id as string);
        const ni = items.indexOf(over.id as string);
        return arrayMove(items, oi, ni);
      });
    }
  };

  // ── helpers ──
  const updatePI = (patch: Record<string, string | string[]>) =>
    setEditable(p => p ? { ...p, personal_info: { ...p.personal_info, ...patch } } : p);

  const addExp = () => setEditable(p => p ? { ...p, experience: [...p.experience, { role: "", company: "", highlights: [] }] } : p);
  const updateExp = (i: number, patch: Partial<ExperienceItem>) => setEditable(p => { if (!p) return p; const a = [...p.experience]; a[i] = { ...a[i], ...patch }; return { ...p, experience: a }; });
  const removeExp = (i: number) => setEditable(p => p ? { ...p, experience: p.experience.filter((_, idx) => idx !== i) } : p);

  const addEdu = () => setEditable(p => p ? { ...p, education: [...p.education, { institution: "", degree: "", achievements: [] }] } : p);
  const updateEdu = (i: number, patch: Partial<EducationItem>) => setEditable(p => { if (!p) return p; const a = [...p.education]; a[i] = { ...a[i], ...patch }; return { ...p, education: a }; });
  const removeEdu = (i: number) => setEditable(p => p ? { ...p, education: p.education.filter((_, idx) => idx !== i) } : p);

  const addProj = () => setEditable(p => p ? { ...p, projects: [...p.projects, { name: "", description: "", technologies: [], highlights: [] }] } : p);
  const updateProj = (i: number, patch: Partial<ProjectItem>) => setEditable(p => { if (!p) return p; const a = [...p.projects]; a[i] = { ...a[i], ...patch }; return { ...p, projects: a }; });
  const removeProj = (i: number) => setEditable(p => p ? { ...p, projects: p.projects.filter((_, idx) => idx !== i) } : p);

  if (!editable) {
    const tStyleFallback = TEMPLATES[templateId];
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
        <div className="rounded-3xl border border-slate-200 bg-white p-10 shadow-xl max-w-md w-full">
          <div className="mx-auto mb-5 h-16 w-16 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900">No resume loaded</h2>
          <p className="mt-2 text-sm text-slate-500">Upload or create a resume first to open the editor.</p>
          <button
            onClick={() => router.push("/dashboard?tab=resume&mode=upload")}
            className="mt-6 w-full rounded-2xl bg-slate-900 py-3 text-sm font-bold text-white hover:bg-slate-800 transition"
          >
            Go to Resume →
          </button>
        </div>
      </div>
    );
  }

  const tStyle = TEMPLATES[templateId] ?? TEMPLATES["modern-clean"];

  // ─── Resume canvas renderer ───
  const renderSection = (section: string) => {
    const isActive = selectedSection === section;
    const ringCls = isActive
      ? "ring-2 ring-blue-500/30 bg-blue-50/20"
      : "hover:ring-1 hover:ring-slate-300/60 hover:bg-slate-50/30";

    if (section === "Header") {
      return (
        <div key="Header" className={`cursor-pointer rounded-lg transition-all ${ringCls}`} onClick={() => setSelectedSection("Header")}>
          <div className={`${tStyle.headerBg} px-8 py-8 rounded-lg`}>
            <InlineEdit
              value={editable.personal_info.full_name || ""}
              onChange={v => updatePI({ full_name: v })}
              placeholder="Your Full Name"
              className={`${tStyle.nameText} block`}
            />
            <div className={`mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm ${tStyle.headerText} opacity-80`}>
              <InlineEdit value={editable.personal_info.email || ""} onChange={v => updatePI({ email: v })} placeholder="email@example.com" className="min-w-[160px]" />
              <span className="opacity-40">·</span>
              <InlineEdit value={editable.personal_info.phone || ""} onChange={v => updatePI({ phone: v })} placeholder="+1 234 567 8900" className="min-w-[110px]" />
              <span className="opacity-40">·</span>
              <InlineEdit value={editable.personal_info.location || ""} onChange={v => updatePI({ location: v })} placeholder="City, Country" className="min-w-[100px]" />
            </div>
            {(editable.personal_info.links || []).length > 0 && (
              <div className={`mt-2 flex flex-wrap gap-4 text-xs ${tStyle.headerText} opacity-60`}>
                {editable.personal_info.links.map((l, i) => <span key={i}>{l}</span>)}
              </div>
            )}
          </div>
        </div>
      );
    }

    if (section === "Summary") {
      return (
        <div key="Summary" className={`cursor-pointer rounded-lg px-1 py-2 transition-all ${ringCls}`} onClick={() => setSelectedSection("Summary")}>
          <div className={`${tStyle.headingBar} pb-1.5 mb-3`}>
            <span className={tStyle.headingText}>Professional Summary</span>
          </div>
          <InlineEdit
            value={editable.personal_info.summary || ""}
            onChange={v => updatePI({ summary: v })}
            placeholder="Write a compelling 2–3 sentence summary..."
            multiline
            className={`text-sm leading-relaxed ${tStyle.bodyText}`}
          />
        </div>
      );
    }

    if (section === "Experience") {
      return (
        <div key="Experience" className={`cursor-pointer rounded-lg px-1 py-2 transition-all ${ringCls}`} onClick={() => setSelectedSection("Experience")}>
          <div className={`${tStyle.headingBar} pb-1.5 mb-4`}>
            <span className={tStyle.headingText}>Experience</span>
          </div>
          <div className="space-y-5">
            {editable.experience.map((exp, i) => (
              <div key={i} className={`${tStyle.accentLine} pl-4`}>
                <div className="flex items-start justify-between gap-2">
                  <InlineEdit value={exp.role} onChange={v => updateExp(i, { role: v })} placeholder="Job Title" className={`text-[15px] font-bold ${tStyle.bodyText}`} />
                  <div className={`flex gap-1 text-xs ${tStyle.bodyText} opacity-60 whitespace-nowrap`}>
                    <InlineEdit value={exp.start_date || ""} onChange={v => updateExp(i, { start_date: v })} placeholder="Jan 2022" className="w-16 text-right" />
                    <span>–</span>
                    <InlineEdit value={exp.end_date || ""} onChange={v => updateExp(i, { end_date: v })} placeholder="Present" className="w-16" />
                  </div>
                </div>
                <InlineEdit value={exp.company} onChange={v => updateExp(i, { company: v })} placeholder="Company Name" className={`text-xs font-semibold uppercase tracking-wide mt-0.5 ${tStyle.bodyText} opacity-70`} />
                {exp.highlights.length > 0 && (
                  <ul className="mt-2 space-y-1.5">
                    {exp.highlights.map((h, hi) => (
                      <li key={hi} className={`flex gap-2 text-sm ${tStyle.bodyText} leading-relaxed`}>
                        <span className="mt-[0.4rem] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-slate-400" />
                        {h}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
            {editable.experience.length === 0 && (
              <p className="text-sm text-slate-400 italic">Add experience entries using the inspector panel →</p>
            )}
          </div>
        </div>
      );
    }

    if (section === "Education") {
      return (
        <div key="Education" className={`cursor-pointer rounded-lg px-1 py-2 transition-all ${ringCls}`} onClick={() => setSelectedSection("Education")}>
          <div className={`${tStyle.headingBar} pb-1.5 mb-4`}>
            <span className={tStyle.headingText}>Education</span>
          </div>
          <div className="space-y-4">
            {editable.education.map((edu, i) => (
              <div key={i} className={`${tStyle.accentLine} pl-4`}>
                <div className="flex items-start justify-between gap-2">
                  <InlineEdit value={edu.institution} onChange={v => updateEdu(i, { institution: v })} placeholder="University Name" className={`text-[15px] font-bold ${tStyle.bodyText}`} />
                  <div className={`flex gap-1 text-xs ${tStyle.bodyText} opacity-60 whitespace-nowrap`}>
                    <InlineEdit value={edu.start_date || ""} onChange={v => updateEdu(i, { start_date: v })} placeholder="2018" className="w-12 text-right" />
                    <span>–</span>
                    <InlineEdit value={edu.end_date || ""} onChange={v => updateEdu(i, { end_date: v })} placeholder="2022" className="w-12" />
                  </div>
                </div>
                <InlineEdit value={edu.degree} onChange={v => updateEdu(i, { degree: v })} placeholder="B.Sc. Computer Science" className={`text-sm mt-0.5 ${tStyle.bodyText} opacity-80`} />
                {edu.field_of_study && (
                  <p className={`text-xs mt-0.5 ${tStyle.bodyText} opacity-60`}>{edu.field_of_study}</p>
                )}
              </div>
            ))}
            {editable.education.length === 0 && (
              <p className="text-sm text-slate-400 italic">Add education entries using the inspector panel →</p>
            )}
          </div>
        </div>
      );
    }

    if (section === "Projects") {
      return (
        <div key="Projects" className={`cursor-pointer rounded-lg px-1 py-2 transition-all ${ringCls}`} onClick={() => setSelectedSection("Projects")}>
          <div className={`${tStyle.headingBar} pb-1.5 mb-4`}>
            <span className={tStyle.headingText}>Projects</span>
          </div>
          <div className="space-y-5">
            {editable.projects.map((proj, i) => (
              <div key={i} className={`${tStyle.accentLine} pl-4`}>
                <div className="flex items-start gap-3">
                  <InlineEdit value={proj.name} onChange={v => updateProj(i, { name: v })} placeholder="Project Name" className={`text-[15px] font-bold ${tStyle.bodyText}`} />
                  {proj.technologies.slice(0, 4).map((t, ti) => (
                    <span key={ti} className={`text-[10px] font-bold uppercase rounded px-1.5 py-0.5 ${tStyle.tagBg} ${tStyle.tagText}`}>{t}</span>
                  ))}
                </div>
                <InlineEdit value={proj.description} onChange={v => updateProj(i, { description: v })} placeholder="Brief project description..." multiline className={`text-sm mt-1 ${tStyle.bodyText} opacity-80`} />
                {proj.highlights.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {proj.highlights.map((h, hi) => (
                      <li key={hi} className={`flex gap-2 text-sm ${tStyle.bodyText} leading-relaxed`}>
                        <span className="mt-[0.4rem] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-slate-400" />
                        {h}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
            {editable.projects.length === 0 && (
              <p className="text-sm text-slate-400 italic">Add projects using the inspector panel →</p>
            )}
          </div>
        </div>
      );
    }

    if (section === "Skills") {
      const all = [...(editable.skills || []), ...(editable.tools || [])];
      return (
        <div key="Skills" className={`cursor-pointer rounded-lg px-1 py-2 transition-all ${ringCls}`} onClick={() => setSelectedSection("Skills")}>
          <div className={`${tStyle.headingBar} pb-1.5 mb-3`}>
            <span className={tStyle.headingText}>Skills & Tools</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {all.map((s, i) => (
              <span key={i} className={`px-3 py-1 rounded-full text-xs font-medium border ${tStyle.tagBg} ${tStyle.tagText}`}>{s}</span>
            ))}
            {all.length === 0 && <p className="text-sm text-slate-400 italic">Add skills in the inspector →</p>}
          </div>
        </div>
      );
    }

    return null;
  };

  // ─── Inspector panel content ───
  const renderInspector = () => {
    if (selectedSection === "Header") {
      return (
        <div className="space-y-5">
          <Field label="FULL NAME">
            <input value={editable.personal_info.full_name || ""} onChange={e => updatePI({ full_name: e.target.value })}
              className="inspector-input" placeholder="Jane Doe" />
          </Field>
          <Field label="EMAIL">
            <input value={editable.personal_info.email || ""} onChange={e => updatePI({ email: e.target.value })}
              className="inspector-input" placeholder="jane@example.com" />
          </Field>
          <Field label="PHONE">
            <input value={editable.personal_info.phone || ""} onChange={e => updatePI({ phone: e.target.value })}
              className="inspector-input" placeholder="+1 234 567 8900" />
          </Field>
          <Field label="LOCATION">
            <input value={editable.personal_info.location || ""} onChange={e => updatePI({ location: e.target.value })}
              className="inspector-input" placeholder="San Francisco, CA" />
          </Field>
          <Field label="LINKS (one per line)">
            <textarea rows={3} value={(editable.personal_info.links || []).join("\n")}
              onChange={e => updatePI({ links: e.target.value.split("\n").map(l => l.trim()).filter(Boolean) })}
              className="inspector-input resize-none" placeholder="https://linkedin.com/in/you" />
          </Field>
          <Field label="RESUME TITLE">
            <input value={editable.title} onChange={e => setEditable(p => p ? { ...p, title: e.target.value } : p)}
              className="inspector-input" />
          </Field>
        </div>
      );
    }

    if (selectedSection === "Summary") {
      return (
        <Field label="SUMMARY">
          <textarea rows={6} value={editable.personal_info.summary || ""}
            onChange={e => updatePI({ summary: e.target.value })}
            className="inspector-input resize-none" placeholder="A results-driven engineer with 5 years..." />
        </Field>
      );
    }

    if (selectedSection === "Experience") {
      return (
        <div className="space-y-4">
          {editable.experience.map((exp, i) => (
            <div key={i} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 truncate flex-1">{exp.role || `Entry ${i + 1}`}</span>
                <button onClick={() => removeExp(i)} className="text-xs text-slate-400 hover:text-rose-500 ml-2 transition">Remove</button>
              </div>
              <Field label="ROLE">
                <input value={exp.role} onChange={e => updateExp(i, { role: e.target.value })} className="inspector-input" placeholder="Software Engineer" />
              </Field>
              <Field label="COMPANY">
                <input value={exp.company} onChange={e => updateExp(i, { company: e.target.value })} className="inspector-input" placeholder="Acme Corp" />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="START"><input value={exp.start_date || ""} onChange={e => updateExp(i, { start_date: e.target.value })} className="inspector-input" placeholder="Jan 2022" /></Field>
                <Field label="END"><input value={exp.end_date || ""} onChange={e => updateExp(i, { end_date: e.target.value })} className="inspector-input" placeholder="Present" /></Field>
              </div>
              <Field label="HIGHLIGHTS">
                <BulletList
                  items={exp.highlights}
                  onAdd={t => updateExp(i, { highlights: [...exp.highlights, t] })}
                  onRemove={hi => updateExp(i, { highlights: exp.highlights.filter((_, idx) => idx !== hi) })}
                />
              </Field>
            </div>
          ))}
          <AddBtn onClick={addExp} label="Add Experience" />
        </div>
      );
    }

    if (selectedSection === "Education") {
      return (
        <div className="space-y-4">
          {editable.education.map((edu, i) => (
            <div key={i} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 truncate flex-1">{edu.institution || `Entry ${i + 1}`}</span>
                <button onClick={() => removeEdu(i)} className="text-xs text-slate-400 hover:text-rose-500 ml-2 transition">Remove</button>
              </div>
              <Field label="INSTITUTION">
                <input value={edu.institution} onChange={e => updateEdu(i, { institution: e.target.value })} className="inspector-input" placeholder="MIT" />
              </Field>
              <Field label="DEGREE">
                <input value={edu.degree} onChange={e => updateEdu(i, { degree: e.target.value })} className="inspector-input" placeholder="B.Sc. Computer Science" />
              </Field>
              <Field label="FIELD OF STUDY">
                <input value={edu.field_of_study || ""} onChange={e => updateEdu(i, { field_of_study: e.target.value })} className="inspector-input" placeholder="Machine Learning" />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="START"><input value={edu.start_date || ""} onChange={e => updateEdu(i, { start_date: e.target.value })} className="inspector-input" placeholder="2018" /></Field>
                <Field label="END"><input value={edu.end_date || ""} onChange={e => updateEdu(i, { end_date: e.target.value })} className="inspector-input" placeholder="2022" /></Field>
              </div>
            </div>
          ))}
          <AddBtn onClick={addEdu} label="Add Education" />
        </div>
      );
    }

    if (selectedSection === "Projects") {
      return (
        <div className="space-y-4">
          {editable.projects.map((proj, i) => (
            <div key={i} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 truncate flex-1">{proj.name || `Project ${i + 1}`}</span>
                <button onClick={() => removeProj(i)} className="text-xs text-slate-400 hover:text-rose-500 ml-2 transition">Remove</button>
              </div>
              <Field label="NAME">
                <input value={proj.name} onChange={e => updateProj(i, { name: e.target.value })} className="inspector-input" placeholder="AI Resume Agent" />
              </Field>
              <Field label="DESCRIPTION">
                <textarea rows={2} value={proj.description} onChange={e => updateProj(i, { description: e.target.value })} className="inspector-input resize-none" placeholder="What was this project about?" />
              </Field>
              <Field label="TECHNOLOGIES">
                <ChipInput items={proj.technologies} onAdd={t => updateProj(i, { technologies: [...proj.technologies, t] })} onRemove={ti => updateProj(i, { technologies: proj.technologies.filter((_, idx) => idx !== ti) })} placeholder="React, Node…" tStyle={tStyle} />
              </Field>
              <Field label="HIGHLIGHTS">
                <BulletList items={proj.highlights} onAdd={t => updateProj(i, { highlights: [...proj.highlights, t] })} onRemove={hi => updateProj(i, { highlights: proj.highlights.filter((_, idx) => idx !== hi) })} />
              </Field>
            </div>
          ))}
          <AddBtn onClick={addProj} label="Add Project" />
        </div>
      );
    }

    if (selectedSection === "Skills") {
      return (
        <div className="space-y-5">
          <Field label="CORE SKILLS">
            <ChipInput items={editable.skills} onAdd={s => setEditable(p => p ? { ...p, skills: [...p.skills, s] } : p)} onRemove={i => setEditable(p => p ? { ...p, skills: p.skills.filter((_, idx) => idx !== i) } : p)} placeholder="Python, Leadership…" dark tStyle={tStyle} />
          </Field>
          <Field label="TOOLS & TECHNOLOGIES">
            <ChipInput items={editable.tools} onAdd={t => setEditable(p => p ? { ...p, tools: [...p.tools, t] } : p)} onRemove={i => setEditable(p => p ? { ...p, tools: p.tools.filter((_, idx) => idx !== i) } : p)} placeholder="Docker, AWS…" tStyle={tStyle} />
          </Field>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex h-[calc(100vh-9rem)] gap-4 overflow-hidden">

      {/* ── Left sidebar ── */}
      <motion.aside
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex w-[200px] flex-shrink-0 flex-col rounded-2xl border border-white/70 bg-white/80 p-4 shadow-lg backdrop-blur"
      >
        {/* Template picker toggle */}
        <button
          onClick={() => setShowTemplates(v => !v)}
          className="mb-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-100 transition"
        >
          <span className={`h-3 w-3 rounded-full bg-gradient-to-br ${tStyle.thumb} flex-shrink-0`} />
          {tStyle.label}
          <svg className={`ml-auto transition-transform ${showTemplates ? "rotate-180" : ""}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6"/></svg>
        </button>

        <AnimatePresence>
          {showTemplates && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-4"
            >
              <div className="space-y-1.5">
                {(Object.entries(TEMPLATES) as [TemplateId, TemplateStyle][]).map(([id, t]) => (
                  <button
                    key={id}
                    onClick={() => { setTemplateId(id); setShowTemplates(false); }}
                    className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-semibold transition ${templateId === id ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"}`}
                  >
                    <span className={`h-2.5 w-2.5 rounded-full bg-gradient-to-br ${t.thumb} flex-shrink-0`} />
                    {t.label}
                    {templateId === id && <svg className="ml-auto" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Sections</p>
        <div className="flex-1 overflow-y-auto">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={layout} strategy={verticalListSortingStrategy}>
              {layout.map(name => (
                <SortableSectionPill key={name} id={name} isSelected={selectedSection === name} onClick={() => setSelectedSection(name)} />
              ))}
            </SortableContext>
          </DndContext>
        </div>

        <div className="mt-4 border-t border-slate-100 pt-4 space-y-2">
          {(error || saveMsg) && (
            <p className={`text-center text-[11px] font-semibold rounded-lg py-1.5 ${error ? "text-rose-600 bg-rose-50" : "text-emerald-700 bg-emerald-50"}`}>
              {error || saveMsg}
            </p>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full rounded-xl bg-slate-900 py-3 text-xs font-bold uppercase tracking-wider text-white hover:bg-slate-800 disabled:opacity-50 transition active:scale-95 shadow-md"
          >
            {isSaving ? "Saving…" : "Save Resume"}
          </button>
          <button
            onClick={() => {
              if (!editable || !resume) return;
              // Merge current edits with saved metadata so download reflects live canvas
              const downloadable: Resume = {
                ...resume,
                ...editable,
                template: templateId,
                layout,
              };
              resumeService.downloadAsHtml(downloadable);
            }}
            title="Download as printable HTML"
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition active:scale-95"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Download
          </button>
        </div>
      </motion.aside>

      {/* ── Canvas (resume preview) ── */}
      <motion.main
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-1 overflow-auto rounded-2xl bg-slate-200/50 p-6"
      >
        <div className={`mx-auto max-w-[720px] min-h-[1000px] rounded-lg overflow-hidden shadow-2xl shadow-slate-300 ${tStyle.page}`}>
          <div className="p-0 space-y-0">
            {layout.map(section => (
              <div key={section} className="transition-all duration-200">
                {section === "Header" ? (
                  renderSection(section)
                ) : (
                  <div className="px-8 py-4">
                    {renderSection(section)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </motion.main>

      {/* ── Right inspector ── */}
      <motion.aside
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex w-[260px] flex-shrink-0 flex-col rounded-2xl border border-white/70 bg-white/80 p-4 shadow-lg backdrop-blur overflow-y-auto"
      >
        <div className="flex items-center gap-2 mb-5 pb-3 border-b border-slate-100">
          <div className="h-2 w-2 rounded-full bg-blue-500" />
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
            {selectedSection}
          </p>
        </div>
        {renderInspector()}
      </motion.aside>
    </div>
  );
}

// ─── Small sub-components ─────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">{label}</span>
      {children}
    </div>
  );
}

function BulletList({
  items,
  onAdd,
  onRemove,
}: {
  items: string[];
  onAdd: (t: string) => void;
  onRemove: (i: number) => void;
}) {
  const [val, setVal] = useState("");
  return (
    <div className="space-y-2">
      {items.map((b, i) => (
        <div key={i} className="flex items-start gap-1.5 group">
          <span className="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-slate-400" />
          <span className="flex-1 text-[11px] text-slate-600 leading-relaxed">{b}</span>
          <button onClick={() => onRemove(i)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-400 transition text-base leading-none">&times;</button>
        </div>
      ))}
      <div className="flex gap-1.5 mt-2">
        <input
          value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter") { e.preventDefault(); if (val.trim()) { onAdd(val.trim()); setVal(""); } }
          }}
          placeholder="Add bullet…"
          className="flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-blue-400 transition"
        />
        <button
          onClick={() => { if (val.trim()) { onAdd(val.trim()); setVal(""); } }}
          className="rounded-lg bg-slate-900 px-2.5 py-1.5 text-[10px] font-bold text-white hover:bg-slate-800 transition"
        >
          Add
        </button>
      </div>
    </div>
  );
}

function AddBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-2xl border-2 border-dashed border-slate-300 py-3 text-[11px] font-bold uppercase tracking-widest text-slate-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/30 transition active:scale-[0.98]"
    >
      + {label}
    </button>
  );
}
