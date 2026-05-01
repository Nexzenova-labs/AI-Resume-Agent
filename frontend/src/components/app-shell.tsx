"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import type { ReactNode } from "react";

import { useAuth } from "@/components/providers/auth-provider";
import { useResume } from "@/components/providers/resume-provider";
import { resumeService } from "@/services/resume-service";

type NavItem = {
  href: string;
  label: string;
  short: string;
  accent: string;
};

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", short: "DB", accent: "from-cyan-400 to-blue-500" },
  { href: "/jd-apply", label: "JD Apply", short: "JA", accent: "from-indigo-400 to-violet-500" },
];

function SidebarLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active =
    pathname === item.href ||
    (item.href === "/resume" && pathname.startsWith("/resume"));

  return (
    <Link href={item.href} className="block">
      <motion.div
        whileHover={{ x: 4 }}
        transition={{ duration: 0.22 }}
        className={`group relative overflow-hidden rounded-[1.2rem] border px-3 py-3 ${
          active
            ? "border-slate-900/10 bg-slate-950 text-white shadow-[0_16px_40px_rgba(15,23,42,0.18)]"
            : "border-slate-200/80 bg-white/70 text-slate-700 hover:border-slate-300 hover:bg-white"
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br ${item.accent} text-xs font-semibold tracking-[0.2em] text-white`}
          >
            {item.short}
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold">{item.label}</div>
            <div
              className={`text-xs ${
                active ? "text-slate-300" : "text-slate-500"
              }`}
            >
              {item.href}
            </div>
          </div>
        </div>
        {active ? (
          <motion.div
            layoutId="sidebar-active"
            className="absolute inset-y-3 right-3 w-1 rounded-full bg-white/70"
          />
        ) : null}
      </motion.div>
    </Link>
  );
}

export function AppShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { resume } = useResume();

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.14),transparent_26%),radial-gradient(circle_at_right,rgba(251,146,60,0.12),transparent_22%),linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.03)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(circle_at_center,black,transparent_85%)]" />

      <div className="relative mx-auto grid min-h-screen max-w-[1600px] gap-6 px-4 py-4 md:px-6 lg:grid-cols-[280px_1fr] lg:px-8">
        <motion.aside
          initial={{ opacity: 0, x: -18 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-[2rem] border border-white/60 bg-white/70 p-4 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur"
        >
          <div className="rounded-[1.6rem] bg-slate-950 p-5 text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.34em] text-cyan-300">
              Workspace
            </p>
            <h1 className="mt-4 text-2xl font-semibold tracking-[-0.04em]">
              AI Resume Agent
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Career command center for resumes, ATS scoring, and interview prep.
            </p>
          </div>

          <nav className="mt-4 space-y-3">
            {navItems.map((item) => (
              <SidebarLink key={item.href} item={item} pathname={pathname} />
            ))}
          </nav>

          <div className="mt-6 rounded-[1.5rem] border border-slate-200/80 bg-gradient-to-br from-[#fff7ed] to-white p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.26em] text-orange-500">
              Active Sprint
            </div>
            <div className="mt-3 text-lg font-semibold tracking-[-0.03em] text-slate-950">
              Fullstack integration
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              JWT auth, protected routes, and live resume state are now connected.
            </p>
          </div>
        </motion.aside>

        <div className="flex min-h-[calc(100vh-2rem)] flex-col gap-6">
          <motion.header
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-[2rem] border border-white/60 bg-white/70 px-5 py-4 shadow-[0_24px_80px_rgba(15,23,42,0.06)] backdrop-blur"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-signal">
                  Product Surface
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950">
                  {title}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  {description}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600">
                  {user?.full_name ?? "Workspace"}
                </div>
                <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600">
                  {resume ? resume.title : "No saved resume yet"}
                </div>
                <button
                  type="button"
                  onClick={() => router.push("/dashboard?tab=resume&mode=vault")}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition shadow-sm"
                >
                  📂 View Resumes
                </button>
                {resume && (
                  <button
                    type="button"
                    onClick={() => resumeService.downloadAsHtml(resume)}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition shadow-sm"
                  >
                    ⬇️ Download
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    router.push("/login");
                  }}
                  className="rounded-full border border-slate-200 bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 transition shadow-md"
                >
                  Logout
                </button>
              </div>
            </div>
          </motion.header>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
            className="flex-1"
          >
            {children}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
