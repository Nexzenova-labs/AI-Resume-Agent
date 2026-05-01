"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Resume } from "@/lib/types";
import { resumeService } from "@/services/resume-service";
import { useResume } from "@/components/providers/resume-provider";

// ─── types ──────────────────────────────────────────────────────────────────

type Folder = {
  id: "uploaded" | "edited" | "jd_apply";
  label: string;
  icon: React.ReactNode;
  accent: string;
  emptyMsg: string;
};

// ─── folder config ───────────────────────────────────────────────────────────

const FOLDERS: Folder[] = [
  {
    id: "uploaded",
    label: "Uploaded",
    emptyMsg: "No uploaded resumes yet. Use 'Upload Resume' to get started.",
    accent: "from-cyan-400 to-blue-500",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="17 8 12 3 7 8"/>
        <line x1="12" y1="3" x2="12" y2="15"/>
      </svg>
    ),
  },
  {
    id: "edited",
    label: "Edited",
    emptyMsg: "No edited resumes yet. Create a new one or edit an uploaded resume.",
    accent: "from-violet-400 to-purple-600",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
      </svg>
    ),
  },
  {
    id: "jd_apply",
    label: "JD Apply",
    emptyMsg: "No JD Apply resumes yet. Run a JD Apply process to generate tailored resumes.",
    accent: "from-orange-400 to-amber-500",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
    ),
  },
];

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ─── rename cell ─────────────────────────────────────────────────────────────

function RenameCell({
  resume,
  onRenamed,
}: {
  resume: Resume;
  onRenamed: (id: string, title: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(resume.title);
  const [saving, setSaving] = useState(false);

  const commit = async () => {
    const trimmed = value.trim();
    if (!trimmed || trimmed === resume.title) {
      setValue(resume.title);
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      const updated = await resumeService.rename(resume.id, trimmed);
      onRenamed(resume.id, updated.title);
    } catch {
      setValue(resume.title);
    } finally {
      setSaving(false);
      setEditing(false);
    }
  };

  if (editing) {
    return (
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") { setValue(resume.title); setEditing(false); }
        }}
        disabled={saving}
        className="w-full rounded-lg border border-blue-400 bg-white px-2 py-1 text-sm font-semibold text-slate-900 outline-none ring-2 ring-blue-400/20"
      />
    );
  }

  return (
    <div className="flex items-center gap-2 group/name">
      <span className="text-sm font-semibold text-slate-900 truncate max-w-[280px]">
        {resume.title}
      </span>
      <button
        onClick={() => setEditing(true)}
        title="Rename"
        className="opacity-0 group-hover/name:opacity-100 transition text-slate-400 hover:text-slate-700"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      </button>
    </div>
  );
}

// ─── delete confirm ──────────────────────────────────────────────────────────

function DeleteButton({
  resumeId,
  onDeleted,
}: {
  resumeId: string;
  onDeleted: (id: string) => void;
}) {
  const [phase, setPhase] = useState<"idle" | "confirm" | "deleting">("idle");

  const handleDelete = async () => {
    setPhase("deleting");
    try {
      await resumeService.delete(resumeId);
      onDeleted(resumeId);
    } catch {
      setPhase("idle");
    }
  };

  if (phase === "confirm") {
    return (
      <div className="flex items-center gap-1.5">
        <button
          onClick={handleDelete}
          className="rounded-lg bg-rose-500 px-2 py-1 text-xs font-bold text-white hover:bg-rose-600 transition"
        >
          Confirm
        </button>
        <button
          onClick={() => setPhase("idle")}
          className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600 hover:bg-slate-200 transition"
        >
          Cancel
        </button>
      </div>
    );
  }

  if (phase === "deleting") {
    return <span className="text-xs text-rose-400">Deleting…</span>;
  }

  return (
    <button
      onClick={() => setPhase("confirm")}
      title="Delete"
      className="text-slate-400 hover:text-rose-500 transition"
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6"/>
        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
        <path d="M10 11v6M14 11v6"/>
        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
      </svg>
    </button>
  );
}

// ─── resume row ──────────────────────────────────────────────────────────────

function ResumeRow({
  resume,
  onLoad,
  onDeleted,
  onRenamed,
}: {
  resume: Resume;
  onLoad: (r: Resume) => void;
  onDeleted: (id: string) => void;
  onRenamed: (id: string, title: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 8 }}
      className="group flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm hover:border-slate-300 hover:shadow-md transition"
    >
      {/* Icon */}
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 text-slate-500">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
      </div>

      {/* Name + date */}
      <div className="flex-1 min-w-0">
        <RenameCell resume={resume} onRenamed={onRenamed} />
        <p className="text-xs text-slate-400 mt-0.5">
          Updated {fmtDate(resume.updated_at)}
        </p>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
        {/* Open in editor */}
        <button
          onClick={() => onLoad(resume)}
          title="Open in editor"
          className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-700 transition"
        >
          Edit
        </button>

        {/* Download */}
        <button
          onClick={() => resumeService.downloadAsHtml(resume)}
          title="Download as HTML"
          className="text-slate-400 hover:text-slate-700 transition"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
        </button>

        {/* Delete */}
        <DeleteButton resumeId={resume.id} onDeleted={onDeleted} />
      </div>
    </motion.div>
  );
}

// ─── main component ──────────────────────────────────────────────────────────

export function ResumeVaultView({
  onOpenEditor,
}: {
  onOpenEditor?: () => void;
}) {
  const { setResume } = useResume();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFolder, setActiveFolder] = useState<Folder["id"]>("uploaded");
  // source_type values from backend: "uploaded" | "edited" | "jd_apply"

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const all = await resumeService.list();
      setResumes(all);
    } catch {
      setError("Could not load resumes. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleLoad = (r: Resume) => {
    setResume(r);
    onOpenEditor?.();
  };

  const handleDeleted = (id: string) => {
    setResumes((prev) => prev.filter((r) => r.id !== id));
  };

  const handleRenamed = (id: string, title: string) => {
    setResumes((prev) => prev.map((r) => (r.id === id ? { ...r, title } : r)));
  };

  const folder = FOLDERS.find((f) => f.id === activeFolder)!;
  const visible = resumes.filter((r) => {
    const src = r.source_type ?? "uploaded";
    return src === activeFolder;
  });

  return (
    <div className="flex gap-5 h-full">
      {/* ── folder sidebar ── */}
      <div className="flex w-52 flex-shrink-0 flex-col gap-2">
        <p className="px-2 text-xs font-bold uppercase tracking-[0.3em] text-slate-400 mb-1">
          Folders
        </p>
        {FOLDERS.map((f) => {
          const count = resumes.filter((r) => (r.source_type ?? "uploaded") === f.id).length;
          const active = activeFolder === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setActiveFolder(f.id)}
              className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-left transition ${
                active
                  ? "bg-slate-950 text-white shadow-[0_8px_24px_rgba(15,23,42,0.2)]"
                  : "bg-white border border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <span
                className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${f.accent} text-white`}
              >
                {f.icon}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold">{f.label}</div>
              </div>
              <span
                className={`rounded-full px-1.5 py-0.5 text-xs font-bold ${
                  active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}

        <div className="mt-4 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total</p>
          <p className="text-2xl font-semibold text-slate-900">{resumes.length}</p>
          <p className="text-xs text-slate-500">resumes saved</p>
        </div>
      </div>

      {/* ── file list ── */}
      <div className="flex flex-1 flex-col gap-4 overflow-hidden">
        {/* Folder header */}
        <div className="flex items-center gap-3">
          <span className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${folder.accent} text-white`}>
            {folder.icon}
          </span>
          <div>
            <h3 className="text-lg font-bold text-slate-900">{folder.label}</h3>
            <p className="text-xs text-slate-500">{visible.length} resume{visible.length !== 1 ? "s" : ""}</p>
          </div>
          <button
            onClick={loadAll}
            title="Refresh"
            className="ml-auto text-slate-400 hover:text-slate-700 transition"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10"/>
              <polyline points="1 20 1 14 7 14"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-2">
          {loading ? (
            <div className="flex h-40 items-center justify-center text-slate-400 text-sm">
              Loading resumes…
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
              <p className="text-sm font-semibold text-rose-700">{error}</p>
              <button onClick={loadAll} className="mt-3 text-xs text-rose-600 underline">Retry</button>
            </div>
          ) : visible.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/60 text-center px-6">
              <p className="text-sm text-slate-500">{folder.emptyMsg}</p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {visible.map((r) => (
                <ResumeRow
                  key={r.id}
                  resume={r}
                  onLoad={handleLoad}
                  onDeleted={handleDeleted}
                  onRenamed={handleRenamed}
                />
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
}
