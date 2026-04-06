"use client";

import { motion } from "framer-motion";
import { useState } from "react";

import { useAuth } from "@/components/providers/auth-provider";
import { useResume } from "@/components/providers/resume-provider";
import type { AtsAnalysisResult } from "@/lib/types";
import { atsService } from "@/services/ats-service";

const scoreLabels = [
  { key: "keyword_match_score", label: "Keyword" },
  { key: "semantic_score", label: "Semantic" },
  { key: "weighted_section_score", label: "Weighted Section" },
] as const;

export function AtsAnalyzerView() {
  const { user } = useAuth();
  const { resume, resumeId } = useResume();
  const [jobDescriptionText, setJobDescriptionText] = useState("");
  const [jobLink, setJobLink] = useState("");
  const [analysis, setAnalysis] = useState<AtsAnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    let activeResume = resume;
    if (!activeResume) {
      const draft = localStorage.getItem("resumeBuilderDraft");
      if (draft) {
        try {
          activeResume = JSON.parse(draft);
        } catch {}
      }
    }

    if (!user || (!resumeId && !activeResume)) {
      setError("Save a resume first so ATS can compare it with the job description.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await atsService.analyze(
        {
          job_description_text: jobDescriptionText || undefined,
          job_link: jobLink || undefined,
          resume_id: resumeId ?? undefined,
          resume: resumeId ? undefined : activeResume ?? undefined,
        },
      );
      setAnalysis(result);
    } catch (atsError) {
      setError(
        atsError instanceof Error ? atsError.message : "ATS analysis failed.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <form
        onSubmit={handleAnalyze}
        className="rounded-[2rem] border border-white/70 bg-white/75 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.06)] backdrop-blur"
      >
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-signal">
            ATS Input
          </p>
          <h3 className="text-3xl font-semibold tracking-[-0.04em] text-slate-950">
            Analyze resume against a live role
          </h3>
          <p className="text-sm leading-6 text-slate-500">
            Use pasted JD text, a job link, or both. If a link is provided, the backend
            will auto-scrape and enrich the ATS analysis.
          </p>
        </div>

        <div className="mt-6 grid gap-5">
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Job description text
            <textarea
              rows={12}
              value={jobDescriptionText}
              onChange={(event) => setJobDescriptionText(event.target.value)}
              className="rounded-[1.5rem] border border-slate-200 bg-white px-4 py-3 text-sm leading-6 outline-none transition focus:border-slate-400"
              placeholder="Paste the full job description here..."
            />
          </label>

          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Job link
            <input
              value={jobLink}
              onChange={(event) => setJobLink(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
              placeholder="https://jobs.example.com/role"
            />
          </label>

          <div className="rounded-[1.3rem] border border-slate-200/80 bg-slate-50/80 p-4 text-sm text-slate-600">
            {resume
              ? `Using saved resume: ${resume.title}`
              : typeof window !== "undefined" && localStorage.getItem("resumeBuilderDraft")
                ? "Using unsaved draft resume."
                : "No saved resume loaded yet. Open Resume Builder first."}
          </div>

          {error ? (
            <div className="rounded-[1.2rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isLoading}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {isLoading ? "Analyzing..." : "Run ATS analysis"}
          </button>
        </div>
      </form>

      <div className="grid gap-6">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[2rem] border border-white/70 bg-slate-950 p-6 text-white shadow-[0_24px_80px_rgba(15,23,42,0.18)]"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300">
            ATS Score
          </p>
          <div className="mt-4 flex items-end justify-between gap-4">
            <div>
              <div className="text-6xl font-semibold tracking-[-0.06em]">
                {analysis?.overall_ats_score ?? "--"}
              </div>
              <div className="mt-3 text-sm text-slate-300">
                {analysis
                  ? `Job input status: ${analysis.job_input_status}`
                  : "Run analysis to see the blended ATS score."}
              </div>
            </div>
            {analysis?.scraped_job ? (
              <div className="max-w-xs rounded-[1.2rem] border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
                <div className="font-semibold">{analysis.scraped_job.job_title || "Scraped role"}</div>
                <div className="mt-1 text-slate-300">
                  {analysis.scraped_job.company || analysis.scraped_job.source_type}
                </div>
              </div>
            ) : null}
          </div>
        </motion.section>

        {analysis ? (
          <div className="grid gap-6">
            <section className="grid gap-4 md:grid-cols-3">
              {scoreLabels.map((item, index) => (
                <motion.div
                  key={item.key}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.08 }}
                  className="rounded-[1.6rem] border border-white/70 bg-white/75 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.06)] backdrop-blur"
                >
                  <div className="text-sm text-slate-500">{item.label}</div>
                  <div className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-slate-950">
                    {analysis[item.key]}
                  </div>
                </motion.div>
              ))}
            </section>

            <section className="rounded-[2rem] border border-white/70 bg-white/75 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.06)] backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-signal">
                Section Scores
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {Object.entries(analysis.section_scores).map(([section, score]) => (
                  <div
                    key={section}
                    className="rounded-[1.2rem] border border-slate-200/80 bg-slate-50/80 p-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm font-semibold capitalize text-slate-800">
                        {section}
                      </span>
                      <span className="text-sm font-semibold text-slate-500">{score}</span>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-slate-200">
                      <div
                        className="h-2 rounded-full bg-slate-950"
                        style={{ width: `${score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="grid gap-6 md:grid-cols-2">
              <div className="rounded-[2rem] border border-white/70 bg-white/75 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.06)] backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-signal">
                  Missing Skills
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {analysis.ranked_missing_skills.length ? (
                    analysis.ranked_missing_skills.map((skill) => (
                      <span
                        key={skill}
                        className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700"
                      >
                        {skill}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-slate-500">
                      No major missing skills surfaced.
                    </span>
                  )}
                </div>
              </div>

              <div className="rounded-[2rem] border border-white/70 bg-white/75 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.06)] backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-signal">
                  Suggestions
                </p>
                <div className="mt-4 space-y-3">
                  {analysis.improvement_suggestions.map((suggestion) => (
                    <div
                      key={suggestion}
                      className="rounded-[1.2rem] border border-slate-200/80 bg-slate-50/80 p-4 text-sm leading-6 text-slate-700"
                    >
                      {suggestion}
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        ) : isLoading ? (
          <section className="rounded-[2rem] border border-white/70 bg-white/75 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.06)] backdrop-blur flex items-center justify-center min-h-[300px]">
            <div className="flex flex-col items-center gap-4 animate-pulse">
              <div className="h-10 w-10 rounded-full border-4 border-slate-200 border-t-slate-900 animate-spin" />
              <p className="text-sm font-medium text-slate-500">Analyzing job description against your resume...</p>
            </div>
          </section>
        ) : (
          <section className="rounded-[2rem] border border-white/70 bg-white/75 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.06)] backdrop-blur">
            <p className="text-sm leading-7 text-slate-500">
              ATS results will appear here once you submit a role for analysis.
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
