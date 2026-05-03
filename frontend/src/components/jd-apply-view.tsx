"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { useAuth } from "@/components/providers/auth-provider";
import { useResume } from "@/components/providers/resume-provider";
import type { ResumePayload } from "@/lib/types";
import { resumeService } from "@/services/resume-service";
import { jdApplyService, type JdApplyResult, type JdApplyResultItem } from "@/services/jd-apply-service";

type Tab = "jd" | "preview" | "download";

// ─── Safe HTML escape ────────────────────────────────────────────────────────
function esc(s: string | null | undefined): string {
  return (s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ─── Build printable HTML ─────────────────────────────────────────────────────
function buildPrintHtml(resume: ResumePayload, jobTitle: string): string {
  const pi = resume.personal_info ?? {};
  const skills   = (resume.skills  ?? []).map(esc).join(", ");
  const tools    = (resume.tools   ?? []).map(esc).join(", ");
  type ExpEntry  = { role?: string; company?: string; start_date?: string; end_date?: string; description?: string; highlights?: string[] };
  type EduEntry  = { degree?: string; institution?: string; field_of_study?: string; start_date?: string; end_date?: string };
  type ProjEntry = { name?: string; description?: string; technologies?: string[]; highlights?: string[] };
  type CustomSectionEntry = { name?: string; items?: string[] };
  const experience = (resume.experience ?? []) as ExpEntry[];
  const education  = (resume.education  ?? []) as EduEntry[];
  const projects   = (resume.projects   ?? []) as ProjEntry[];
  const customSections = (resume.custom_sections ?? []) as CustomSectionEntry[];

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>${esc(jobTitle)} — Tailored Resume</title>
<style>
  body{font-family:'Segoe UI',Arial,sans-serif;max-width:820px;margin:40px auto;padding:0 32px;color:#1a202c;line-height:1.6}
  h1{font-size:28px;font-weight:700;margin:0}
  .contact{color:#4a5568;font-size:14px;margin:6px 0 18px}
  h2{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#718096;border-bottom:1px solid #e2e8f0;padding-bottom:4px;margin:22px 0 10px}
  .summary{font-size:14px;color:#2d3748;margin-bottom:4px;white-space:pre-line}
  .skill-list{font-size:14px;color:#2d3748}
  .item{margin-bottom:12px}
  .role{font-weight:600;font-size:15px}
  .meta{color:#4a5568;font-size:13px}
  .desc{font-size:13px;color:#4a5568;margin-top:4px;white-space:pre-line}
  ul{margin:4px 0 0 18px;padding:0}
  ul li{font-size:13px;color:#4a5568;margin-bottom:2px}
  .proj-name{font-weight:600;font-size:14px}
  .proj-tech{font-size:12px;color:#718096}
  @media print{body{margin:20px}}
</style>
</head>
<body>
<h1>${esc(pi.full_name)}</h1>
<div class="contact">
  ${[pi.email, pi.phone, pi.location].filter(Boolean).map(esc).join(" · ")}
  ${(pi.links ?? []).length > 0 ? " · " + pi.links.map(esc).join(" · ") : ""}
</div>
${pi.summary ? `<h2>Professional Summary</h2><p class="summary">${esc(pi.summary)}</p>` : ""}
${skills ? `<h2>Skills</h2><p class="skill-list">${skills}</p>` : ""}
${tools  ? `<h2>Tools &amp; Technologies</h2><p class="skill-list">${tools}</p>` : ""}
${experience.length > 0 ? `<h2>Experience</h2>${experience.map(e =>
  `<div class="item">
    <div class="role">${esc(e.role)}</div>
    <div class="meta">${esc(e.company)}${e.start_date ? " · " + esc(e.start_date) : ""}${e.end_date ? " – " + esc(e.end_date) : ""}</div>
    ${e.description ? `<div class="desc">${esc(e.description)}</div>` : ""}
    ${e.highlights?.length ? `<ul>${e.highlights.map(h => `<li>${esc(h)}</li>`).join("")}</ul>` : ""}
  </div>`
).join("")}` : ""}
${education.length > 0 ? `<h2>Education</h2>${education.map(e =>
  `<div class="item">
    <div class="role">${esc(e.degree)}${e.field_of_study ? ", " + esc(e.field_of_study) : ""}</div>
    <div class="meta">${esc(e.institution)}${e.start_date ? " · " + esc(e.start_date) : ""}${e.end_date ? " – " + esc(e.end_date) : ""}</div>
  </div>`
).join("")}` : ""}
${projects.length > 0 ? `<h2>Projects</h2>${projects.map(p =>
  `<div class="item">
    <div class="proj-name">${esc(p.name)}</div>
    ${p.technologies?.length ? `<div class="proj-tech">${p.technologies.map(esc).join(", ")}</div>` : ""}
    ${p.description ? `<div class="desc">${esc(p.description)}</div>` : ""}
    ${p.highlights?.length ? `<ul>${p.highlights.map(h => `<li>${esc(h)}</li>`).join("")}</ul>` : ""}
  </div>`
).join("")}` : ""}
${customSections.length > 0 ? customSections.map(section =>
  `<h2>${esc(section.name)}</h2>
   ${(section.items?.length ?? 0) > 0
      ? `<ul>${(section.items ?? []).map(item => `<li>${esc(item)}</li>`).join("")}</ul>`
      : `<p class="desc"></p>`}`
).join("") : ""}
</body>
</html>`;
}

function openPrintWindow(html: string): void {
  const blob = new Blob([html], { type: "text/html" });
  const url  = URL.createObjectURL(blob);
  const win  = window.open(url, "_blank");
  if (win) {
    win.addEventListener("load", () => { win.print(); URL.revokeObjectURL(url); });
  } else {
    URL.revokeObjectURL(url);
  }
}

// ─── Keyword diff badge ───────────────────────────────────────────────────────

function KeywordBadge({ label, isNew }: { label: string; isNew: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition ${
        isNew
          ? "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300"
          : "bg-slate-100 text-slate-600"
      }`}
    >
      {isNew && <span className="text-emerald-500 font-bold text-[9px]">NEW</span>}
      {label}
    </span>
  );
}

// ─── Result card with diff view ───────────────────────────────────────────────

function ResultCard({ res, onEdit }: { res: JdApplyResultItem; onEdit: (res: JdApplyResultItem) => void }) {
  const r = res.modified_resume;
  const addedSkillsSet  = new Set((res.added_skills  ?? []).map(s => s.toLowerCase()));
  const addedToolsSet   = new Set((res.added_tools   ?? []).map(t => t.toLowerCase()));
  const totalAdded = res.keywords_injected ?? (res.added_skills?.length ?? 0) + (res.added_tools?.length ?? 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-4 rounded-[1.8rem] border border-slate-200/80 bg-white p-6 shadow-[0_8px_32px_rgba(15,23,42,0.06)]"
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700 whitespace-nowrap">
          JD #{res.jd_index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-900 truncate">{res.job_title}</p>
          <p className="text-xs text-slate-400 mt-0.5">{r.personal_info?.full_name ?? "—"}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold text-emerald-700 whitespace-nowrap">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            Saved
          </span>
          {totalAdded > 0 && (
            <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-600">
              +{totalAdded} keywords
            </span>
          )}
        </div>
      </div>

      {/* Summary */}
      {r.personal_info?.summary && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-1">Summary</p>
          <p className="text-xs leading-5 text-slate-600 line-clamp-3">{r.personal_info.summary}</p>
        </div>
      )}

      {/* Skills diff */}
      {r.skills && r.skills.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-2">
            Skills
            {addedSkillsSet.size > 0 && (
              <span className="ml-2 normal-case text-emerald-600 font-semibold">
                (+{addedSkillsSet.size} added)
              </span>
            )}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {r.skills.slice(0, 12).map((s) => (
              <KeywordBadge key={s} label={s} isNew={addedSkillsSet.has(s.toLowerCase())} />
            ))}
            {r.skills.length > 12 && (
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-500">
                +{r.skills.length - 12} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Tools diff */}
      {r.tools && r.tools.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-2">
            Tools
            {addedToolsSet.size > 0 && (
              <span className="ml-2 normal-case text-emerald-600 font-semibold">
                (+{addedToolsSet.size} added)
              </span>
            )}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {r.tools.slice(0, 8).map((t) => (
              <KeywordBadge key={t} label={t} isNew={addedToolsSet.has(t.toLowerCase())} />
            ))}
            {r.tools.length > 8 && (
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-500">
                +{r.tools.length - 8} more
              </span>
            )}
          </div>
        </div>
      )}

      <div className="flex gap-2 mt-auto pt-2 border-t border-slate-100">
        <button
          onClick={() => onEdit(res)}
          className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 transition"
        >
          Edit in Editor →
        </button>
      </div>
    </motion.div>
  );
}

// ─── Download card ────────────────────────────────────────────────────────────

function DownloadCard({ res, onEdit }: { res: JdApplyResultItem; onEdit: (res: JdApplyResultItem) => void }) {
  const totalAdded = res.keywords_injected ?? (res.added_skills?.length ?? 0) + (res.added_tools?.length ?? 0);
  return (
    <div className="flex flex-col gap-4 rounded-[2rem] border border-white/70 bg-white/75 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.06)] backdrop-blur">
      <div className="flex items-center gap-3">
        <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700">
          JD #{res.jd_index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-800 truncate">{res.job_title}</p>
          {totalAdded > 0 && (
            <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">+{totalAdded} keywords injected</p>
          )}
        </div>
        <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold text-emerald-700 whitespace-nowrap">
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          Saved
        </span>
      </div>

      <p className="text-xs leading-5 text-slate-500 line-clamp-3 italic">
        &ldquo;{res.jd_text.slice(0, 200)}&hellip;&rdquo;
      </p>

      {/* Added keywords summary */}
      {((res.added_skills?.length ?? 0) > 0 || (res.added_tools?.length ?? 0) > 0) && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 mb-1.5">Keywords Added</p>
          <div className="flex flex-wrap gap-1">
            {[...(res.added_skills ?? []), ...(res.added_tools ?? [])].slice(0, 8).map(kw => (
              <span key={kw} className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800">{kw}</span>
            ))}
            {totalAdded > 8 && (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] text-emerald-600">+{totalAdded - 8} more</span>
            )}
          </div>
        </div>
      )}

      <div className="flex gap-2 mt-auto">
        <button
          onClick={() => onEdit(res)}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
        >
          Edit in Editor
        </button>
        <button
          onClick={() => openPrintWindow(buildPrintHtml(res.modified_resume, res.job_title))}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 transition shadow-[0_4px_14px_rgba(99,102,241,0.3)]"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Print as PDF
        </button>
      </div>
    </div>
  );
}

// ─── JD input row (textarea + optional file upload) ───────────────────────────

function JdInputRow({
  index,
  value,
  total,
  onChange,
  onRemove,
}: {
  index: number;
  value: string;
  total: number;
  onChange: (val: string) => void;
  onRemove: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setParsing(true);
    setParseError(null);
    try {
      const text = await jdApplyService.parseJd(file);
      onChange(text);
    } catch {
      setParseError("Could not parse file. Try a different PDF or paste the text.");
    } finally {
      setParsing(false);
      e.target.value = "";
    }
  };

  return (
    <motion.div
      key={index}
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="flex flex-col gap-2"
    >
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-slate-700">JD #{index + 1}</label>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={parsing}
            className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition disabled:opacity-50"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            {parsing ? "Parsing…" : "Upload JD PDF"}
          </button>
          <input ref={fileRef} type="file" accept=".pdf,.txt" className="hidden" onChange={handleFileChange} />
          {total > 1 && (
            <button type="button" onClick={onRemove} className="text-xs text-rose-500 hover:text-rose-700 transition">
              Remove
            </button>
          )}
        </div>
      </div>
      {parseError && (
        <p className="text-xs text-rose-600 bg-rose-50 rounded-lg px-3 py-1.5">{parseError}</p>
      )}
      <textarea
        rows={5}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Paste the full job description here, or upload a PDF above…"
        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 resize-none"
        required
      />
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function JDApplyView() {
  const { user, isGuest } = useAuth();
  const { resume, resumeId, setResume } = useResume();
  const [tab, setTab]                           = useState<Tab>("jd");
  const [jds, setJds]                           = useState<string[]>([""]);
  const [result, setResult]                     = useState<JdApplyResult | null>(null);
  const [isLoading, setIsLoading]               = useState(false);
  const [error, setError]                       = useState<string | null>(null);
  const [uploadedId, setUploadedId]             = useState<string | null>(null);
  const [uploadedName, setUploadedName]         = useState<string | null>(null);
  const [uploadedPayload, setUploadedPayload]   = useState<ResumePayload | null>(null);
  const [isUploading, setIsUploading]           = useState(false);
  const [resumeSource, setResumeSource]         = useState<"saved" | "upload">("saved");

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setError(null);
    try {
      const uploaded = await resumeService.upload(file);
      setUploadedName(file.name);
      setResumeSource("upload");
      if (isGuest) {
        setUploadedPayload(uploaded);
      } else {
        setUploadedId(uploaded.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const validJds = jds.map(j => j.trim()).filter(Boolean);
    if (validJds.length === 0) { setError("Paste at least one job description."); return; }

    let activeResumeId: string | undefined;
    let activeResumePayload: ResumePayload | undefined;

    if (resumeSource === "upload") {
      if (isGuest) {
        if (!uploadedPayload) { setError("Upload a resume PDF first."); return; }
        activeResumePayload = uploadedPayload;
      } else {
        if (!uploadedId) { setError("Upload a resume PDF first."); return; }
        activeResumeId = uploadedId;
      }
    } else {
      if (resumeId) {
        activeResumeId = resumeId;
      } else {
        const draft = typeof window !== "undefined" ? localStorage.getItem("resumeBuilderDraft") : null;
        if (draft) {
          try { activeResumePayload = JSON.parse(draft); } catch { /* ignore */ }
        }
        if (!activeResumePayload) {
          setError("No saved resume found. Upload a PDF or save one from the Resume tab.");
          return;
        }
      }
    }

    setIsLoading(true);
    try {
      const data = await jdApplyService.process({
        resume_id: activeResumeId,
        resume: activeResumeId ? undefined : activeResumePayload,
        jds: validJds,
      });
      setResult(data);
      setTab("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Processing failed. Is the backend running?");
    } finally {
      setIsLoading(false);
    }
  };

  const router = useRouter();

  const handleEditResult = async (res: JdApplyResultItem) => {
    try {
      if (!res.saved_resume_id) throw new Error("no saved id");
      const loaded = await resumeService.get(res.saved_resume_id);
      setResume(loaded);
    } catch {
      setResume({
        ...res.modified_resume,
        id: res.saved_resume_id ?? crypto.randomUUID(),
        user_id: user?.id ?? "guest",
        title: res.job_title,
        status: "draft",
        source_type: "jd_apply",
        custom_sections: res.modified_resume.custom_sections ?? [],
        created_at: null,
        updated_at: null,
      });
    }
    router.push("/dashboard?tab=resume&mode=editor");
  };

  const downloadAll = () => {
    result?.results.forEach((res, i) => {
      setTimeout(() => openPrintWindow(buildPrintHtml(res.modified_resume, res.job_title)), i * 900);
    });
  };

  const updateJd = (index: number, value: string) => {
    const n = [...jds]; n[index] = value; setJds(n);
  };
  const removeJd = (index: number) => {
    const n = [...jds]; n.splice(index, 1); setJds(n);
  };

  const tabDefs: { id: Tab; label: string; num: string }[] = [
    { id: "jd",       label: "Job Descriptions", num: "01" },
    { id: "preview",  label: "Tailored Resumes",  num: "02" },
    { id: "download", label: "Download",           num: "03" },
  ];
  const activeJdCount = jds.filter(j => j.trim()).length;

  return (
    <div className="flex flex-col gap-6">
      {/* Tab bar */}
      <div className="flex gap-2 rounded-[2rem] border border-white/70 bg-white/75 p-2 shadow-[0_24px_80px_rgba(15,23,42,0.06)] backdrop-blur">
        {tabDefs.map((t) => {
          const locked = (t.id === "preview" || t.id === "download") && !result;
          return (
            <button
              key={t.id}
              type="button"
              disabled={locked}
              onClick={() => !locked && setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-2 rounded-[1.5rem] px-4 py-3 text-sm font-semibold transition ${
                tab === t.id
                  ? "bg-slate-950 text-white shadow-[0_8px_24px_rgba(15,23,42,0.2)]"
                  : locked
                  ? "text-slate-300 cursor-not-allowed"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <span className="text-xs font-bold text-slate-400">{t.num}</span>
              {t.label}
              {locked && <span className="text-xs text-slate-300">🔒</span>}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">

        {/* Tab 01 — Input */}
        {tab === "jd" && (
          <motion.div
            key="jd"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]"
          >
            {/* Left: resume source + explainer */}
            <div className="flex flex-col gap-5 rounded-[2rem] border border-white/70 bg-white/75 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.06)] backdrop-blur h-fit">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-500">Step 1</p>
                <h3 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Select Resume</h3>
                <p className="mt-1 text-sm text-slate-500">Choose the base resume. All your existing data is preserved.</p>
              </div>

              <div className="flex gap-2">
                {(["saved", "upload"] as const).map((src) => (
                  <button
                    key={src}
                    type="button"
                    onClick={() => setResumeSource(src)}
                    className={`flex-1 rounded-2xl border py-2.5 text-sm font-medium transition ${
                      resumeSource === src
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {src === "saved" ? (resume ? "Saved Resume" : "Draft Resume") : "Upload PDF"}
                  </button>
                ))}
              </div>

              {resumeSource === "saved" ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  {resume ? `✓ Using: "${resume.title}"` : "Using draft from Resume Builder"}
                </div>
              ) : uploadedId ? (
                <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  <span className="truncate max-w-[200px]">✓ {uploadedName}</span>
                  <button
                    type="button"
                    onClick={() => { setUploadedId(null); setUploadedName(null); }}
                    className="text-xs font-semibold text-rose-500 ml-2"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <label className="flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 py-10 text-sm text-slate-500 hover:border-indigo-400 hover:bg-indigo-50/30 transition">
                  <div className="rounded-full bg-indigo-100 p-3">
                    <svg className="h-5 w-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                  </div>
                  <span>{isUploading ? "Uploading…" : "Click to upload PDF"}</span>
                  <input type="file" accept=".pdf" className="hidden" onChange={handleResumeUpload} disabled={isUploading} />
                </label>
              )}

              {/* Explainer */}
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 space-y-2">
                <p className="font-bold text-slate-700 text-[11px] uppercase tracking-wider mb-3">What happens</p>
                {([
                  ["Extracts", "every keyword from YOUR specific JD (unique per JD)"],
                  ["Finds", "what's missing from your resume vs. that JD"],
                  ["Injects", "exact JD keywords into Skills, Tools & Summary only"],
                  ["Keeps", "your name, experience, education, projects — untouched"],
                  ["Saves", "each tailored resume to your library (JD Apply)"],
                ] as [string, string][]).map(([action, desc]) => (
                  <div key={action} className="flex gap-2 text-xs text-slate-500">
                    <span className="font-semibold text-indigo-600 w-16 shrink-0">{action}</span>
                    <span>{desc}</span>
                  </div>
                ))}
              </div>

              {/* Jobalytics tip */}
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-[11px] font-bold text-amber-700 mb-1">🎯 Jobalytics tip</p>
                <p className="text-[11px] text-amber-700 leading-5">
                  Each JD generates a unique resume with its specific keywords appended.
                  The structure stays the same. Use the tailored PDF on the job page and compare the score.
                </p>
              </div>
            </div>

            {/* Right: JD inputs */}
            <div className="flex flex-col gap-5 rounded-[2rem] border border-white/70 bg-white/75 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.06)] backdrop-blur">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-500">Step 2</p>
                <h3 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Job Descriptions</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Paste or upload each JD. One unique tailored resume per JD.
                </p>
              </div>

              {error && (
                <div className="rounded-[1.2rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
              )}

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <AnimatePresence>
                  {jds.map((jd, index) => (
                    <JdInputRow
                      key={index}
                      index={index}
                      value={jd}
                      total={jds.length}
                      onChange={(val) => updateJd(index, val)}
                      onRemove={() => removeJd(index)}
                    />
                  ))}
                </AnimatePresence>

                {jds.length < 10 && (
                  <button
                    type="button"
                    onClick={() => setJds([...jds, ""])}
                    className="w-fit rounded-full border border-indigo-200 bg-indigo-50 px-5 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100 transition"
                  >
                    + Add another JD ({jds.length}/10)
                  </button>
                )}

                <div className="mt-2 pt-4 border-t border-slate-200">
                  <button
                    type="submit"
                    disabled={isLoading || isUploading}
                    className="w-full rounded-full bg-indigo-600 py-4 text-sm font-bold text-white disabled:opacity-50 transition hover:bg-indigo-700 shadow-[0_8px_24px_rgba(99,102,241,0.3)]"
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        Analysing JD &amp; injecting keywords…
                      </span>
                    ) : (
                      `Generate ${activeJdCount || 1} Tailored Resume${(activeJdCount || 1) !== 1 ? "s" : ""} →`
                    )}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}

        {/* Tab 02: Preview with diff */}
        {tab === "preview" && result && (
          <motion.div
            key="preview"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col gap-6"
          >
            <div className="flex items-center justify-between rounded-[2rem] border border-white/70 bg-white/75 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.06)] backdrop-blur">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500">Step 2 of 3</p>
                <h2 className="mt-1 text-2xl font-bold text-slate-900">Tailored Resumes</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {result.results.length} resume{result.results.length !== 1 ? "s" : ""} generated.
                  Green badges = keywords injected from that JD.
                </p>
              </div>
              <button
                onClick={() => setTab("download")}
                className="rounded-full bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 transition"
              >
                Next: Download →
              </button>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {result.results.map((res) => (
                <ResultCard key={res.jd_index} res={res} onEdit={handleEditResult} />
              ))}
            </div>
          </motion.div>
        )}

        {/* Tab 03: Download */}
        {tab === "download" && result && (
          <motion.div
            key="download"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col gap-6"
          >
            <div className="flex items-center justify-between rounded-[2rem] border border-white/70 bg-white/75 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.06)] backdrop-blur">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500">Step 3 of 3</p>
                <h2 className="mt-1 text-2xl font-bold text-slate-900">Download</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Opens print window — use <strong>Save as PDF</strong>. Upload that PDF to Jobalytics on the job page.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => { setResult(null); setTab("jd"); setJds([""]); }}
                  className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Start Over
                </button>
                {result.results.length > 1 && (
                  <button
                    onClick={downloadAll}
                    className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-bold text-white hover:bg-slate-800 transition"
                  >
                    Open All ({result.results.length})
                  </button>
                )}
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {result.results.map((res) => (
                <DownloadCard key={res.jd_index} res={res} onEdit={handleEditResult} />
              ))}
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
