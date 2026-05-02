"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { UserCircle, LogIn, ArrowRight } from "lucide-react";

const stats = [
  { label: "Resume variants", value: "12+" },
  { label: "ATS checkpoints", value: "40" },
  { label: "Interview modes", value: "3" },
];

export function LandingShell() {
  const router = useRouter();

  const handleGuestEntry = () => {
    // Navigate directly to dashboard, auth-provider will handle guest state
    router.push("/dashboard");
  };

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
          <div className="flex gap-4">
             <Link
                href="/login"
                className="flex items-center gap-2 rounded-full bg-slate-950 px-5 py-2 text-sm font-semibold text-white transition-transform duration-300 hover:-translate-y-0.5"
              >
                <LogIn className="h-4 w-4" />
                Login
              </Link>
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
              Career tooling built for the modern era.
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-slate-600 md:text-lg">
              Unlock your career potential with our AI command center. Skip the forms and start building results immediately.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/login"
                className="flex items-center gap-2 rounded-full bg-slate-950 px-8 py-4 text-base font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200"
              >
                Sign In <ArrowRight className="h-5 w-5" />
              </Link>
              
              <button
                onClick={handleGuestEntry}
                className="flex items-center gap-2 rounded-full border border-slate-300 bg-white/75 px-8 py-4 text-base font-semibold text-slate-700 backdrop-blur transition-all duration-300 hover:border-slate-400 hover:bg-white hover:-translate-y-0.5"
              >
                <UserCircle className="h-5 w-5" />
                Try as Guest
              </button>
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
                  <span>Dashboard Preview</span>
                  <span>Interactive</span>
                </div>
                <div className="mt-5 rounded-[1.25rem] bg-white/10 p-4">
                  <div className="text-sm text-slate-300">ATS Match Score</div>
                  <div className="mt-2 text-3xl font-bold tracking-tight text-emerald-400">
                    84%
                  </div>
                  <div className="mt-4 h-2 rounded-full bg-white/10">
                    <motion.div
                      className="h-2 rounded-full bg-emerald-400"
                      initial={{ width: 0 }}
                      animate={{ width: "84%" }}
                      transition={{ duration: 1.1, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                  <div className="text-xs font-semibold uppercase text-slate-400">Recent Activity</div>
                  <div className="mt-2 text-sm font-medium text-slate-700">Resume tailored for "Lead Frontend"</div>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                  <div className="mt-1 text-sm font-medium text-slate-700">Interview prep set generated</div>
                </div>
              </div>
            </div>
          </motion.aside>
        </div>
      </section>
    </main>
  );
}
