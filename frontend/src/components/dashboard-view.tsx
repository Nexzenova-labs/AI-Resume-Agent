"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { useAuth } from "@/components/providers/auth-provider";
import { useResume } from "@/components/providers/resume-provider";
import { authService } from "@/services/auth-service";
import { AtsAnalyzerView } from "@/components/ats-analyzer-view";
import { InterviewCoachView } from "@/components/interview-coach-view";
import { ResumeUploadView } from "@/components/resume-upload-view";
import { ResumeEditorView } from "@/components/resume-editor-view";
import { ResumeVaultView } from "@/components/resume-vault-view";

type DashTab = "overview" | "resume" | "ats" | "interview";
type ResumeMode = "vault" | "upload" | "editor";

const tabs: { id: DashTab; label: string; accent: string }[] = [
  { id: "overview",  label: "Overview",  accent: "from-cyan-400 to-blue-500" },
  { id: "resume",    label: "Resume",    accent: "from-emerald-400 to-teal-500" },
  { id: "ats",       label: "ATS Score", accent: "from-orange-400 to-amber-500" },
  { id: "interview", label: "Interview", accent: "from-fuchsia-400 to-rose-500" },
];

const pipeline = [
  { title: "Resume versioning", description: "Track tailored variants by role, company, and ATS score movement." },
  { title: "JD alignment", description: "Spot missing language, weak impact bullets, and skills that need clearer evidence." },
  { title: "Interview prep", description: "Convert role signals into practical interview drills before each application." },
];

// ─── Resume sub-nav ──────────────────────────────────────────────────────────

function ResumeSubNav({
  mode,
  onMode,
}: {
  mode: ResumeMode;
  onMode: (m: ResumeMode) => void;
}) {
  const subTabs: { id: ResumeMode; label: string }[] = [
    { id: "vault",  label: "📂  My Resumes" },
    { id: "upload", label: "➕  Upload / Create" },
    { id: "editor", label: "✏️  Editor" },
  ];
  return (
    <div className="flex gap-1.5 rounded-2xl border border-slate-200/80 bg-slate-50 p-1.5 mb-5">
      {subTabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onMode(t.id)}
          className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition ${
            mode === t.id
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ─── Overview tab ────────────────────────────────────────────────────────────

function OverviewTab({ onOpenVault }: { onOpenVault: () => void }) {
  const { user } = useAuth();
  const { resume, isLoading } = useResume();
  const [stats, setStats] = useState({ active_resumes: 0, ats_average: 0, interviews_practiced: 0 });

  useEffect(() => {
    if (user) {
      authService.stats().then(res => setStats(res)).catch(() => {});
    }
  }, [user]);

  const summaryCards = [
    { label: "Active resumes",       value: String(stats.active_resumes).padStart(2, "0"),      tone: "from-cyan-500/20 to-blue-500/10" },
    { label: "ATS average",          value: `${stats.ats_average}%`,                             tone: "from-emerald-500/20 to-teal-500/10" },
    { label: "Interviews practiced", value: String(stats.interviews_practiced).padStart(2, "0"), tone: "from-orange-500/20 to-amber-500/10" },
  ];

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <section className="grid gap-6">
        <div className="grid gap-4 md:grid-cols-3">
          {summaryCards.map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 * i, duration: 0.42 }}
              className={`rounded-[1.8rem] border border-white/70 bg-gradient-to-br ${card.tone} p-5 shadow-[0_20px_60px_rgba(15,23,42,0.06)] backdrop-blur`}
            >
              <div className="text-sm text-slate-500">{card.label}</div>
              <div className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-slate-950">{card.value}</div>
            </motion.div>
          ))}
        </div>

        <div className="rounded-[2rem] border border-white/70 bg-white/75 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.06)] backdrop-blur">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-signal">Focus</p>
              <h3 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950">
                {user?.full_name ? `${user.full_name}'s workspace` : "Application momentum at a glance"}
              </h3>
            </div>
            <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-500">This week</div>
          </div>
          <div className="mt-6 grid gap-4">
            {pipeline.map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.12 * i, duration: 0.42 }}
                className="flex items-start gap-4 rounded-[1.4rem] border border-slate-200/80 bg-slate-50/80 p-4"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-sm font-semibold text-white">0{i + 1}</div>
                <div>
                  <div className="text-lg font-semibold text-slate-950">{item.title}</div>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{item.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6">
        <div className="rounded-[2rem] border border-white/70 bg-slate-950 p-6 text-white shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300">Today</p>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-300">Live</span>
          </div>
          <h3 className="mt-4 text-2xl font-semibold tracking-[-0.04em]">
            {resume ? `${resume.title} is ready for iteration.` : "Create your first resume to activate the full workflow."}
          </h3>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            {resume
              ? `${resume.skills.length} skills, ${resume.tools.length} tools, and ${resume.projects.length} project entries are synced.`
              : "Open the Resume tab, save a resume, and this dashboard switches to live state."}
          </p>
          <div className="mt-6 h-3 rounded-full bg-white/10">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: resume ? "78%" : "22%" }}
              transition={{ duration: 1, delay: 0.25 }}
              className="h-3 rounded-full bg-gradient-to-r from-cyan-300 via-emerald-300 to-orange-300"
            />
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/70 bg-white/75 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.06)] backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-signal">Next Actions</p>
          <div className="mt-4 space-y-4">
            {[
              resume ? `Update ${resume.title} with sharper quantified outcomes.` : "Create a resume from the Resume tab and save it.",
              "Run ATS analysis from the ATS Score tab once a saved resume is ready.",
              isLoading ? "Resume state is syncing..." : "Use the Interview tab to run mock interview sessions.",
            ].map((task, i) => (
              <div key={task} className="rounded-[1.2rem] border border-slate-200/80 bg-slate-50/80 p-4 text-sm leading-6 text-slate-700">
                <span className="mr-2 font-semibold text-slate-950">0{i + 1}</span>{task}
              </div>
            ))}
          </div>
          <button
            onClick={onOpenVault}
            className="mt-5 w-full rounded-2xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            📂 View All Resumes →
          </button>
        </div>
      </section>
    </div>
  );
}

import { useSearchParams } from "next/navigation";

// ─── DashboardView ───────────────────────────────────────────────────────────

export function DashboardView() {
  const searchParams = useSearchParams();
  const paramTab = searchParams.get("tab") as DashTab | null;
  const paramMode = searchParams.get("mode") as ResumeMode | null;

  const [activeTab, setActiveTab] = useState<DashTab>(paramTab ?? "overview");
  const [resumeMode, setResumeMode] = useState<ResumeMode>(paramMode ?? "vault");

  useEffect(() => {
    if (paramTab) setActiveTab(paramTab);
    if (paramMode) setResumeMode(paramMode);
  }, [paramTab, paramMode]);

  const openVault = () => {
    setActiveTab("resume");
    setResumeMode("vault");
  };

  return (
    <div className="flex flex-col gap-6">
      {/* ── Main Tab Bar ── */}
      <div className="flex gap-2 overflow-x-auto rounded-[2rem] border border-white/70 bg-white/75 p-2 shadow-[0_24px_80px_rgba(15,23,42,0.06)] backdrop-blur">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setActiveTab(t.id);
              if (t.id === "resume") setResumeMode("vault");
            }}
            className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 rounded-[1.5rem] px-4 py-3 text-sm font-semibold whitespace-nowrap transition ${
              activeTab === t.id
                ? "bg-slate-950 text-white shadow-[0_8px_24px_rgba(15,23,42,0.2)]"
                : "text-slate-500 hover:bg-slate-100"
            }`}
          >
            <span className={`inline-block h-2 w-2 rounded-full bg-gradient-to-br ${t.accent}`} />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab Content ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab === "resume" ? `resume-${resumeMode}` : activeTab}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.28 }}
        >
          {activeTab === "overview" && <OverviewTab onOpenVault={openVault} />}

          {activeTab === "resume" && (
            <>
              <ResumeSubNav mode={resumeMode} onMode={setResumeMode} />
              {resumeMode === "vault"  && <ResumeVaultView onOpenEditor={() => setResumeMode("editor")} />}
              {resumeMode === "upload" && (
                <ResumeUploadView
                  onEdit={() => setResumeMode("editor")}
                  onAts={() => setActiveTab("ats")}
                />
              )}
              {resumeMode === "editor" && <ResumeEditorView />}
            </>
          )}

          {activeTab === "ats"       && <AtsAnalyzerView />}
          {activeTab === "interview" && <InterviewCoachView />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
