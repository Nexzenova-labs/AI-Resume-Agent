"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

import { useAuth } from "@/components/providers/auth-provider";
import { useResume } from "@/components/providers/resume-provider";
import { authService } from "@/services/auth-service";

const pipeline = [
  {
    title: "Resume versioning",
    description: "Track tailored variants by role, company, and ATS score movement.",
  },
  {
    title: "JD alignment",
    description: "Spot missing language, weak impact bullets, and skills that need clearer evidence.",
  },
  {
    title: "Interview prep",
    description: "Convert role signals into practical interview drills before each application.",
  },
];

export function DashboardView() {
  const { user } = useAuth();
  const { resume, isLoading } = useResume();
  const [stats, setStats] = useState({ active_resumes: 0, ats_average: 0, interviews_practiced: 0 });

  useEffect(() => {
    if (user) {
      authService.stats().then(res => setStats(res)).catch(() => {});
    }
  }, [user]);

  const summaryCards = [
    { label: "Active resumes", value: String(stats.active_resumes).padStart(2, '0'), tone: "from-cyan-500/20 to-blue-500/10" },
    { label: "ATS average", value: `${stats.ats_average}%`, tone: "from-emerald-500/20 to-teal-500/10" },
    { label: "Interviews practiced", value: String(stats.interviews_practiced).padStart(2, '0'), tone: "from-orange-500/20 to-amber-500/10" },
  ];

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <section className="grid gap-6">
        <div className="grid gap-4 md:grid-cols-3">
          {summaryCards.map((card, index) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 * index, duration: 0.42 }}
              className={`rounded-[1.8rem] border border-white/70 bg-gradient-to-br ${card.tone} p-5 shadow-[0_20px_60px_rgba(15,23,42,0.06)] backdrop-blur`}
            >
              <div className="text-sm text-slate-500">{card.label}</div>
              <div className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-slate-950">
                {card.value}
              </div>
            </motion.div>
          ))}
        </div>

        <div className="rounded-[2rem] border border-white/70 bg-white/75 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.06)] backdrop-blur">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-signal">
                Focus
              </p>
              <h3 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950">
                {user?.full_name
                  ? `${user.full_name}'s workspace`
                  : "Application momentum at a glance"}
              </h3>
            </div>
            <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-500">
              This week
            </div>
          </div>

          <div className="mt-6 grid gap-4">
            {pipeline.map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.12 * index, duration: 0.42 }}
                className="flex items-start gap-4 rounded-[1.4rem] border border-slate-200/80 bg-slate-50/80 p-4"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-sm font-semibold text-white">
                  0{index + 1}
                </div>
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
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300">
              Today
            </p>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-300">
              Live
            </span>
          </div>
          <h3 className="mt-4 text-2xl font-semibold tracking-[-0.04em]">
            {resume
              ? `${resume.title} is ready for iteration.`
              : "Create your first resume to activate the full workflow."}
          </h3>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            {resume
              ? `${resume.skills.length} skills, ${resume.tools.length} tools, and ${resume.projects.length} project entries are synced from the backend.`
              : "Open the Resume Builder, save a resume, and this dashboard will switch to live backend-backed state."}
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
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-signal">
            Next Actions
          </p>
          <div className="mt-4 space-y-4">
            {[
              resume
                ? `Update ${resume.title} with sharper quantified outcomes.`
                : "Create a resume from the builder form and save it to the backend.",
              "Run ATS analysis once a saved resume and JD flow are connected.",
              isLoading
                ? "Resume state is syncing..."
                : "Use the Interview page after authentication to stage mock interview flows.",
            ].map((task, index) => (
              <div
                key={task}
                className="rounded-[1.2rem] border border-slate-200/80 bg-slate-50/80 p-4 text-sm leading-6 text-slate-700"
              >
                <span className="mr-2 font-semibold text-slate-950">0{index + 1}</span>
                {task}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
