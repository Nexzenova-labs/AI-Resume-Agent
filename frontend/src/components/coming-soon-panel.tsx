"use client";

import { motion } from "framer-motion";

export function ComingSoonPanel({
  title,
  summary,
  points,
}: {
  title: string;
  summary: string;
  points: string[];
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-[2rem] border border-white/70 bg-slate-950 p-6 text-white shadow-[0_24px_80px_rgba(15,23,42,0.18)]"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300">
          In Progress
        </p>
        <h3 className="mt-4 text-3xl font-semibold tracking-[-0.04em]">{title}</h3>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">{summary}</p>
      </motion.section>

      <section className="rounded-[2rem] border border-white/70 bg-white/75 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.06)] backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-signal">
          Planned Surface
        </p>
        <div className="mt-4 space-y-3">
          {points.map((point, index) => (
            <div
              key={point}
              className="rounded-[1.2rem] border border-slate-200/80 bg-slate-50/80 p-4 text-sm leading-6 text-slate-700"
            >
              <span className="mr-2 font-semibold text-slate-950">0{index + 1}</span>
              {point}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

