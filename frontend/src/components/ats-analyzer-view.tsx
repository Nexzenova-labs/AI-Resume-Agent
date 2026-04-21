"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

import { useAuth } from "@/components/providers/auth-provider";
import { useResume } from "@/components/providers/resume-provider";
import type { AtsAnalysisResult, ResumeQualityResult, ResumePayload } from "@/lib/types";
import { atsService } from "@/services/ats-service";
import { resumeService } from "@/services/resume-service";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function ScoreRing({ score, size = 96 }: { score: number; size?: number }) {
  const r = size / 2 - 8;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - score / 100);
  const color =
    score >= 75 ? "#22c55e" : score >= 50 ? "#f59e0b" : "#ef4444";
  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={8} />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={8}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.8s ease" }}
      />
      <text
        x={size / 2} y={size / 2}
        dominantBaseline="middle" textAnchor="middle"
        className="rotate-90"
        style={{ transform: `rotate(90deg) translate(0px, 0px)`, transformOrigin: `${size / 2}px ${size / 2}px`, fontSize: size * 0.22, fontWeight: 700, fill: "#0f172a" }}
      >
        {score}
      </text>
    </svg>
  );
}

function BarScore({ label, score }: { label: string; score: number }) {
  const color =
    score >= 75 ? "bg-emerald-500" : score >= 50 ? "bg-amber-400" : "bg-rose-400";
  return (
    <div>
      <div className="flex justify-between text-xs font-medium text-slate-600 mb-1">
        <span>{label}</span><span>{score}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-200">
        <div
          className={`h-2 rounded-full ${color} transition-all duration-700`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
type Tab = "quick" | "match";

export function AtsAnalyzerView() {
  const { user } = useAuth();
  const { resume, resumeId } = useResume();
  const [activeTab, setActiveTab] = useState<Tab>("quick");

  return (
    <div className="flex flex-col gap-6">
      {/* Tab switcher */}
      <div className="flex gap-2 rounded-2xl border border-slate-200/80 bg-white/60 p-1 backdrop-blur w-fit">
        {(
          [
            { id: "quick" as Tab, label: "Quick Resume Score", emoji: "⚡" },
            { id: "match" as Tab, label: "JD Match Score", emoji: "🎯" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition ${
              activeTab === tab.id
                ? "bg-slate-950 text-white shadow-md"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {tab.emoji} {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "quick" ? (
          <motion.div
            key="quick"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
          >
            <QuickScoreTab user={user} resume={resume} resumeId={resumeId} />
          </motion.div>
        ) : (
          <motion.div
            key="match"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
          >
            <JdMatchTab user={user} resume={resume} resumeId={resumeId} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab 1 — Quick Resume Score (no JD needed)
// ─────────────────────────────────────────────────────────────────────────────
function QuickScoreTab({
  user,
  resume,
  resumeId,
}: {
  user: ReturnType<typeof useAuth>["user"];
  resume: ReturnType<typeof useResume>["resume"];
  resumeId: string | null;
}) {
  const [uploadedId, setUploadedId] = useState<string | null>(null);
  const [uploadedName, setUploadedName] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isScoring, setIsScoring] = useState(false);
  const [quality, setQuality] = useState<ResumeQualityResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeResumeId = uploadedId || resumeId;
  const activeResumeName = uploadedName || (resume?.title ?? null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!user) { setError("You must be logged in."); return; }
    setIsUploading(true);
    setError(null);
    try {
      const uploaded = await resumeService.upload(file);
      setUploadedId(uploaded.id);
      setUploadedName(file.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleScore = async () => {
    if (!user) { setError("You must be logged in."); return; }

    let payload: { resume_id?: string; resume?: ResumePayload } = {};

    if (activeResumeId) {
      payload = { resume_id: activeResumeId };
    } else {
      // Fall back to draft from localStorage
      const draft =
        typeof window !== "undefined" ? localStorage.getItem("resumeBuilderDraft") : null;
      if (draft) {
        try { payload = { resume: JSON.parse(draft) }; } catch { /* ignore */ }
      }
    }

    if (!payload.resume_id && !payload.resume) {
      setError("Upload a resume or build one in the Resume Builder first.");
      return;
    }

    setIsScoring(true);
    setError(null);
    try {
      const result = await atsService.quality(payload);
      setQuality(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scoring failed. Is the backend running?");
    } finally {
      setIsScoring(false);
    }
  };

  const gradeColor = (grade: string) => {
    const map: Record<string, string> = { A: "text-emerald-600", B: "text-sky-600", C: "text-amber-600", D: "text-orange-600", F: "text-rose-600" };
    return map[grade] ?? "text-slate-600";
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
      {/* Left — Upload / source panel */}
      <div className="flex flex-col gap-4 rounded-[2rem] border border-white/70 bg-white/75 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.06)] backdrop-blur">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-signal">Quick Score</p>
          <h3 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
            Check your resume quality
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Upload a PDF resume or use your saved one — no job description needed.
          </p>
        </div>

        {error && (
          <div className="rounded-[1.2rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {/* Upload zone */}
        <div className="rounded-[1.5rem] border-2 border-dashed border-slate-200 bg-slate-50/60 p-5">
          {uploadedId ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                  Uploaded
                </span>
                <span className="text-sm font-medium text-slate-700">{uploadedName}</span>
              </div>
              <button
                type="button"
                onClick={() => { setUploadedId(null); setUploadedName(null); setQuality(null); }}
                className="text-xs text-slate-400 hover:text-rose-500 transition"
              >
                Remove
              </button>
            </div>
          ) : (
            <label className="flex cursor-pointer flex-col items-center gap-3 py-2 text-center">
              <div className="rounded-full bg-slate-200 p-3">
                <svg className="h-5 w-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700">
                  {isUploading ? "Uploading…" : "Upload PDF resume"}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">Drag & drop or click — PDF only</p>
              </div>
              <input type="file" accept=".pdf" className="hidden" onChange={handleUpload} disabled={isUploading} />
            </label>
          )}
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <div className="flex-1 border-t border-slate-200" />
          or use saved resume
          <div className="flex-1 border-t border-slate-200" />
        </div>

        {/* Saved resume pill */}
        <div className={`rounded-[1.3rem] border px-4 py-3 text-sm ${resume ? "border-slate-200 bg-white text-slate-700" : "border-slate-100 bg-slate-50 text-slate-400"}`}>
          {resume
            ? `Saved: "${resume.title}"`
            : typeof window !== "undefined" && localStorage.getItem("resumeBuilderDraft")
              ? "Draft detected from Resume Builder"
              : "No saved resume — build one in Resume Builder →"}
        </div>

        {/* CTA */}
        <button
          type="button"
          onClick={handleScore}
          disabled={isScoring || isUploading || (!activeResumeId && !resume)}
          className="mt-auto rounded-full bg-slate-950 py-3 text-sm font-semibold text-white disabled:opacity-50 transition hover:bg-slate-800"
        >
          {isScoring ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Scoring…
            </span>
          ) : (
            "Check ATS Score"
          )}
        </button>
      </div>

      {/* Right — Results panel */}
      <div className="flex flex-col gap-5">
        {quality ? (
          <>
            {/* Score header */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-6 rounded-[2rem] border border-white/70 bg-slate-950 p-6 text-white shadow-[0_24px_80px_rgba(15,23,42,0.18)]"
            >
              <ScoreRing score={quality.overall_score} size={100} />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300">Resume Quality</p>
                <p className={`mt-1 text-5xl font-bold tracking-tight ${gradeColor(quality.grade).replace("text-", "text-")}`}>
                  Grade {quality.grade}
                </p>
                <p className="mt-2 text-sm text-slate-300">
                  {quality.overall_score >= 75
                    ? "Strong resume — well structured and keyword-rich."
                    : quality.overall_score >= 50
                      ? "Good foundation. Fill the gaps listed below to improve."
                      : "Needs attention. Follow the tips below to score higher."}
                </p>
              </div>
            </motion.div>

            {/* Score breakdown */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[2rem] border border-white/70 bg-white/75 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.06)] backdrop-blur space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-signal">Breakdown</p>
                <BarScore label="Completeness" score={quality.completeness_score} />
                <BarScore label="Keyword Richness" score={quality.keyword_richness_score} />
                {Object.entries(quality.section_breakdown).map(([name, sq]) => (
                  <BarScore
                    key={name}
                    label={`${name.charAt(0).toUpperCase() + name.slice(1)} (${sq.score}/${sq.max_score})`}
                    score={Math.round((sq.score / sq.max_score) * 100)}
                  />
                ))}
              </div>

              <div className="rounded-[2rem] border border-white/70 bg-white/75 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.06)] backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-signal mb-3">Tips to Improve</p>
                <div className="space-y-2">
                  {quality.tips.map((tip, i) => (
                    <div key={i} className="flex gap-2.5 text-sm text-slate-700">
                      <span className="mt-0.5 flex-shrink-0 text-amber-500">→</span>
                      <span>{tip}</span>
                    </div>
                  ))}
                </div>
                {quality.detected_skills.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <p className="text-xs font-medium text-slate-400 mb-2">Detected skills</p>
                    <div className="flex flex-wrap gap-1.5">
                      {quality.detected_skills.slice(0, 18).map((s) => (
                        <span key={s} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-700">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : isScoring ? (
          <div className="flex min-h-[300px] items-center justify-center rounded-[2rem] border border-white/70 bg-white/75 p-6 backdrop-blur">
            <div className="flex flex-col items-center gap-4">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />
              <p className="text-sm text-slate-500">Scoring your resume…</p>
            </div>
          </div>
        ) : (
          <div className="flex min-h-[300px] items-center justify-center rounded-[2rem] border border-dashed border-slate-200 bg-white/50 p-8 text-center">
            <div>
              <p className="text-4xl">📋</p>
              <p className="mt-3 font-semibold text-slate-700">Your resume score will appear here</p>
              <p className="mt-1 text-sm text-slate-400">Upload a PDF or use your saved resume, then click Check ATS Score</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab 2 — JD Match Score
// ─────────────────────────────────────────────────────────────────────────────
const JD_MATCH_SCORE_LABELS = [
  { key: "keyword_match_score" as const, label: "Keyword Match" },
  { key: "semantic_score" as const, label: "Semantic Similarity" },
  { key: "weighted_section_score" as const, label: "Section Alignment" },
];

function JdMatchTab({
  user,
  resume,
  resumeId,
}: {
  user: ReturnType<typeof useAuth>["user"];
  resume: ReturnType<typeof useResume>["resume"];
  resumeId: string | null;
}) {
  const [jobDescriptionText, setJobDescriptionText] = useState("");
  const [jobLink, setJobLink] = useState("");
  const [analysis, setAnalysis] = useState<AtsAnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedId, setUploadedId] = useState<string | null>(null);
  const [uploadedName, setUploadedName] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [resumeSource, setResumeSource] = useState<"saved" | "upload">("saved");

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!user) { setError("You must be logged in."); return; }
    setIsUploading(true);
    setError(null);
    try {
      const uploaded = await resumeService.upload(file);
      setUploadedId(uploaded.id);
      setUploadedName(file.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleAnalyze = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!user) { setError("You must be logged in."); return; }
    if (!jobDescriptionText.trim() && !jobLink.trim()) {
      setError("Paste a job description or provide a job link.");
      return;
    }

    let activeResumeId: string | undefined;
    let activeResumePayload: ResumePayload | undefined;

    if (resumeSource === "upload") {
      if (!uploadedId) { setError("Upload a resume PDF first."); return; }
      activeResumeId = uploadedId;
    } else {
      if (resumeId) {
        activeResumeId = resumeId;
      } else {
        const draft = typeof window !== "undefined" ? localStorage.getItem("resumeBuilderDraft") : null;
        if (draft) {
          try { activeResumePayload = JSON.parse(draft); } catch { /* */ }
        }
        if (!activeResumePayload) {
          setError("No saved resume found. Go to Resume Builder or switch to Upload.");
          return;
        }
      }
    }

    setIsLoading(true);
    try {
      const result = await atsService.analyze({
        job_description_text: jobDescriptionText.trim() || undefined,
        job_link: jobLink.trim() || undefined,
        resume_id: activeResumeId,
        resume: activeResumeId ? undefined : activeResumePayload,
      });
      setAnalysis(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed. Is the backend running?");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      {/* Input form */}
      <form onSubmit={handleAnalyze} className="flex flex-col gap-5 rounded-[2rem] border border-white/70 bg-white/75 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.06)] backdrop-blur">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-signal">JD Match</p>
          <h3 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
            Match resume to a job
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Paste the job description (or a link) and see how well your resume aligns.
          </p>
        </div>

        {error && (
          <div className="rounded-[1.2rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {/* Resume source */}
        <div className="grid gap-2">
          <label className="text-sm font-medium text-slate-700">Resume</label>
          <div className="flex gap-2">
            {(["saved", "upload"] as const).map((src) => (
              <button
                key={src}
                type="button"
                onClick={() => setResumeSource(src)}
                className={`flex-1 rounded-2xl border py-2.5 text-sm font-medium transition ${resumeSource === src ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
              >
                {src === "saved" ? (resume ? "Saved resume" : "Draft resume") : "Upload PDF"}
              </button>
            ))}
          </div>
          {resumeSource === "saved" ? (
            <p className="text-xs text-slate-400">
              {resume ? `Using: "${resume.title}"` : "Using draft from Resume Builder"}
            </p>
          ) : uploadedId ? (
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <span className="text-xs text-slate-700">{uploadedName}</span>
              <button type="button" onClick={() => { setUploadedId(null); setUploadedName(null); }} className="text-xs text-slate-400 hover:text-rose-500">Remove</button>
            </div>
          ) : (
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-500 hover:border-slate-400 transition">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              {isUploading ? "Uploading…" : "Click to upload PDF"}
              <input type="file" accept=".pdf" className="hidden" onChange={handleUpload} disabled={isUploading} />
            </label>
          )}
        </div>

        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Job description
          <textarea
            rows={9}
            value={jobDescriptionText}
            onChange={(e) => setJobDescriptionText(e.target.value)}
            placeholder="Paste the full job description here…"
            className="rounded-[1.5rem] border border-slate-200 bg-white px-4 py-3 text-sm leading-6 outline-none transition focus:border-slate-400"
          />
        </label>

        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Job link <span className="font-normal text-slate-400">(optional)</span>
          <input
            value={jobLink}
            onChange={(e) => setJobLink(e.target.value)}
            placeholder="https://jobs.example.com/role"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
          />
        </label>

        <button
          type="submit"
          disabled={isLoading || isUploading}
          className="rounded-full bg-slate-950 py-3 text-sm font-semibold text-white disabled:opacity-50 transition hover:bg-slate-800"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Analyzing…
            </span>
          ) : "Run ATS Match"}
        </button>
      </form>

      {/* Results */}
      <div className="flex flex-col gap-5">
        {analysis ? (
          <>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-6 rounded-[2rem] border border-white/70 bg-slate-950 p-6 text-white shadow-[0_24px_80px_rgba(15,23,42,0.18)]"
            >
              <ScoreRing score={analysis.overall_ats_score} size={100} />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300">ATS Match Score</p>
                <p className="mt-1 text-4xl font-bold tracking-tight">{analysis.overall_ats_score}<span className="text-xl text-slate-400">/100</span></p>
                <p className="mt-1 text-sm text-slate-300">
                  {analysis.overall_ats_score >= 75 ? "Strong match — well aligned." : analysis.overall_ats_score >= 50 ? "Moderate match — some gaps." : "Low match — significant gaps."}
                </p>
              </div>
            </motion.div>

            {/* Sub-scores */}
            <div className="grid gap-3 md:grid-cols-3">
              {JD_MATCH_SCORE_LABELS.map(({ key, label }, i) => (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 }}
                  className="rounded-[1.6rem] border border-white/70 bg-white/75 p-4 shadow backdrop-blur"
                >
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">{analysis[key]}</p>
                  <div className="mt-2 h-1.5 rounded-full bg-slate-200">
                    <div className="h-1.5 rounded-full bg-slate-950 transition-all duration-700" style={{ width: `${analysis[key]}%` }} />
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Section scores */}
            <div className="rounded-[2rem] border border-white/70 bg-white/75 p-5 shadow backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-signal mb-3">Section Scores</p>
              <div className="grid gap-3 md:grid-cols-2">
                {Object.entries(analysis.section_scores).map(([section, score]) => (
                  <BarScore key={section} label={section.charAt(0).toUpperCase() + section.slice(1)} score={score} />
                ))}
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              {/* Missing skills */}
              <div className="rounded-[2rem] border border-white/70 bg-white/75 p-5 shadow backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-signal mb-3">Missing Skills</p>
                <div className="flex flex-wrap gap-2">
                  {analysis.ranked_missing_skills.length ? (
                    analysis.ranked_missing_skills.map((s) => (
                      <span key={s} className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700">{s}</span>
                    ))
                  ) : (
                    <span className="text-sm text-slate-500">No major gaps detected.</span>
                  )}
                </div>
              </div>
              {/* Suggestions */}
              <div className="rounded-[2rem] border border-white/70 bg-white/75 p-5 shadow backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-signal mb-3">Suggestions</p>
                <div className="space-y-2">
                  {analysis.improvement_suggestions.map((s) => (
                    <div key={s} className="flex gap-2 text-sm text-slate-700">
                      <span className="text-amber-500 flex-shrink-0">→</span><span>{s}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : isLoading ? (
          <div className="flex min-h-[300px] items-center justify-center rounded-[2rem] border border-white/70 bg-white/75 p-6 backdrop-blur">
            <div className="flex flex-col items-center gap-4">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />
              <p className="text-sm text-slate-500">Comparing resume against the job description…</p>
            </div>
          </div>
        ) : (
          <div className="flex min-h-[300px] items-center justify-center rounded-[2rem] border border-dashed border-slate-200 bg-white/50 p-8 text-center">
            <div>
              <p className="text-4xl">🎯</p>
              <p className="mt-3 font-semibold text-slate-700">Match results will appear here</p>
              <p className="mt-1 text-sm text-slate-400">Paste a job description and click Run ATS Match</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
