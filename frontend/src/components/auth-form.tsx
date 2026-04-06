"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { useState } from "react";

import { useAuth } from "@/components/providers/auth-provider";

type AuthMode = "login" | "signup";

export function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, signup, isLoading, error, clearError } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const isSignup = mode === "signup";

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    clearError();

    try {
      if (isSignup) {
        await signup({
          email,
          password,
          full_name: fullName,
        });
      } else {
        await login({ email, password });
      }
      router.push(searchParams.get("redirect") ?? "/dashboard");
    } catch {
      return;
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.14),transparent_28%),radial-gradient(circle_at_right,rgba(251,146,60,0.12),transparent_24%),linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] px-6 py-10">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl items-center gap-10 lg:grid-cols-[1fr_420px]">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.34em] text-signal">
            AI Resume Agent
          </p>
          <h1 className="mt-5 text-5xl font-semibold tracking-[-0.05em] text-slate-950 md:text-6xl">
            {isSignup
              ? "Create your workspace and start tailoring resumes."
              : "Welcome back to your career command center."}
          </h1>
          <p className="mt-5 text-base leading-8 text-slate-600">
            Authentication is connected to the FastAPI backend with secure cookie sessions,
            protected routes, and shared app state ready for deeper product flows.
          </p>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-[0_30px_90px_rgba(15,23,42,0.1)] backdrop-blur"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-signal">
              {isSignup ? "Sign Up" : "Login"}
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950">
              {isSignup ? "Create account" : "Sign in"}
            </h2>
          </div>

          <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
            {isSignup ? (
              <label htmlFor="full_name" className="grid gap-2 text-sm font-medium text-slate-700">
                Full name
                <input
                  id="full_name"
                  name="full_name"
                  autoComplete="name"
                  required
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-slate-400"
                  placeholder="Jane Doe"
                />
              </label>
            ) : null}

            <label htmlFor="email" className="grid gap-2 text-sm font-medium text-slate-700">
              Email
              <input
                id="email"
                name="email"
                autoComplete="email"
                required
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-slate-400"
                placeholder="jane@example.com"
              />
            </label>

            <label htmlFor="password" className="grid gap-2 text-sm font-medium text-slate-700">
              Password
              <input
                id="password"
                name="password"
                autoComplete={isSignup ? "new-password" : "current-password"}
                required
                minLength={8}
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-slate-400"
                placeholder="At least 8 characters"
              />
            </label>

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
              {isLoading
                ? "Working..."
                : isSignup
                  ? "Create account"
                  : "Login"}
            </button>
          </form>

          <div className="mt-5 text-sm text-slate-600">
            {isSignup ? "Already have an account?" : "Need an account?"}{" "}
            <Link
              href={isSignup ? "/login" : "/signup"}
              className="font-semibold text-slate-950"
            >
              {isSignup ? "Login" : "Sign up"}
            </Link>
          </div>
        </motion.section>
      </div>
    </main>
  );
}
