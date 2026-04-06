"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const features = [
  {
    title: "Resume Studio",
    eyebrow: "Create",
    description:
      "Capture experience with guided prompts, skill suggestions, and reusable profile blocks.",
  },
  {
    title: "ATS Match Engine",
    eyebrow: "Optimize",
    description:
      "Compare resume versions against job descriptions, keyword fit, and recruiter-facing clarity.",
  },
  {
    title: "Interview Arena",
    eyebrow: "Practice",
    description:
      "Run AI-led mock interviews with difficulty tuning, response scoring, and coaching loops.",
  },
];

const pipelineSteps = [
  "Import a base resume or start from guided forms.",
  "Tailor content against specific job links and ATS signals.",
  "Practice likely interview questions before you apply.",
];

const stats = [
  { label: "Resume variants", value: "12+" },
  { label: "ATS checkpoints", value: "40" },
  { label: "Interview modes", value: "3" },
];

export function LandingShell() {
  return (
    <main className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-10rem] top-[-6rem] h-80 w-80 rounded-full bg-[radial-gradient(circle,_rgba(249,115,22,0.22),_transparent_70%)] blur-2xl" />
        <div className="absolute right-[-8rem] top-24 h-96 w-96 rounded-full bg-[radial-gradient(circle,_rgba(20,184,166,0.18),_transparent_72%)] blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-[radial-gradient(circle,_rgba(59,130,246,0.14),_transparent_72%)] blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.04)_1px,transparent_1px)] bg-[size:72px_72px] [mask-image:radial-gradient(circle_at_center,black,transparent_82%)]" />
      </div>

      <section className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-8 md:px-10 lg:px-12">
        <motion.header
          className="flex items-center justify-between"
          initial={{ opacity: 0, y: -18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.42em] text-signal">
              AI Resume Agent
            </p>
          </div>
          <div className="hidden rounded-full border border-slate-300/70 bg-white/70 px-4 py-2 text-sm text-slate-600 shadow-sm backdrop-blur md:block">
            Next.js UI layer ready
          </div>
        </motion.header>

        <div className="mt-10 grid flex-1 gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <motion.section
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-3xl"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-300/70 bg-white/75 px-4 py-2 text-sm text-slate-700 shadow-sm backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Build resumes, tailor applications, and rehearse interviews in one flow
            </div>

            <h1 className="mt-6 text-5xl font-semibold leading-[0.95] tracking-[-0.04em] text-slate-950 md:text-7xl">
              Career tooling that feels more like a command center than a form.
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-slate-600 md:text-lg">
              This frontend is now positioned as a polished landing experience for
              the AI Resume Agent platform, with motion, stronger storytelling, and
              space for the resume builder, ATS analysis, and interview workflows to
              grow into dedicated product surfaces.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/signup"
                className="rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition-transform duration-300 hover:-translate-y-0.5"
              >
                Create account
              </Link>
              <Link
                href="/login"
                className="rounded-full border border-slate-300 bg-white/75 px-6 py-3 text-sm font-semibold text-slate-700 backdrop-blur transition-colors duration-300 hover:border-slate-400 hover:bg-white"
              >
                Login
              </Link>
              <a
                href="#workflow"
                className="rounded-full border border-slate-300 bg-white/75 px-6 py-3 text-sm font-semibold text-slate-700 backdrop-blur transition-colors duration-300 hover:border-slate-400 hover:bg-white"
              >
                View product flow
              </a>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 28 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.55,
                    delay: 0.12 * index,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="rounded-[1.5rem] border border-slate-200/80 bg-white/80 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur"
                >
                  <div className="text-3xl font-semibold tracking-[-0.04em] text-slate-950">
                    {stat.value}
                  </div>
                  <div className="mt-2 text-sm text-slate-500">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </motion.section>

          <motion.aside
            initial={{ opacity: 0, scale: 0.97, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="relative"
          >
            <div className="rounded-[2rem] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(241,245,249,0.88))] p-5 shadow-[0_30px_90px_rgba(15,23,42,0.12)] backdrop-blur">
              <div className="rounded-[1.5rem] bg-slate-950 p-5 text-white">
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-slate-400">
                  <span>Live Workflow</span>
                  <span>Guest Mode</span>
                </div>
                <div className="mt-5 rounded-[1.25rem] bg-white/10 p-4">
                  <div className="text-sm text-slate-300">Current objective</div>
                  <div className="mt-2 text-2xl font-semibold tracking-[-0.03em]">
                    Tailor resume for Senior AI Engineer role
                  </div>
                  <div className="mt-4 h-2 rounded-full bg-white/10">
                    <motion.div
                      className="h-2 rounded-full bg-gradient-to-r from-emerald-400 via-cyan-300 to-orange-300"
                      initial={{ width: 0 }}
                      animate={{ width: "78%" }}
                      transition={{ duration: 1.1, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm text-slate-300">
                    <span>ATS match confidence</span>
                    <span>78%</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <div className="rounded-[1.4rem] border border-slate-200 bg-white p-4">
                  <div className="text-sm font-semibold text-slate-900">Signals picked up</div>
                  <ul className="mt-3 space-y-3 text-sm text-slate-600">
                    <li>Python, FastAPI, and agent workflows detected from the JD.</li>
                    <li>Resume impact bullets need more quantified outcomes.</li>
                    <li>Interview mode can generate a targeted practice set next.</li>
                  </ul>
                </div>
                <div className="rounded-[1.4rem] border border-slate-200 bg-[#fff7ed] p-4">
                  <div className="text-sm font-semibold text-slate-900">Next move</div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    Generate a JD-specific resume variant, then branch into ATS feedback
                    and interview preparation without leaving the workspace.
                  </p>
                </div>
              </div>
            </div>
          </motion.aside>
        </div>

        <section
          id="features"
          className="relative mt-10 grid gap-6 border-t border-slate-200/80 py-12 md:grid-cols-3"
        >
          {features.map((feature, index) => (
            <motion.article
              key={feature.title}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{
                duration: 0.55,
                delay: 0.12 * index,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="rounded-[1.7rem] border border-slate-200/80 bg-white/85 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)] backdrop-blur"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-signal">
                {feature.eyebrow}
              </p>
              <h2 className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-slate-950">
                {feature.title}
              </h2>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                {feature.description}
              </p>
            </motion.article>
          ))}
        </section>

        <motion.section
          id="workflow"
          initial={{ opacity: 0, y: 26 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          className="mb-10 rounded-[2rem] border border-slate-200/80 bg-[linear-gradient(135deg,rgba(15,23,42,0.96),rgba(30,41,59,0.92))] p-8 text-white shadow-[0_28px_90px_rgba(15,23,42,0.2)]"
        >
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.34em] text-cyan-300">
                Workflow
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] md:text-4xl">
                A frontend foundation for the product we actually want to build.
              </h2>
            </div>
            <div className="grid gap-4">
              {pipelineSteps.map((step, index) => (
                <div
                  key={step}
                  className="flex items-start gap-4 rounded-[1.3rem] border border-white/10 bg-white/5 p-4"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-semibold text-cyan-200">
                    0{index + 1}
                  </div>
                  <p className="text-sm leading-7 text-slate-200">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.section>
      </section>
    </main>
  );
}
