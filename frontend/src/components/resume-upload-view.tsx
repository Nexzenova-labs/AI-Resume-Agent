"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { resumeService } from "@/services/resume-service";
import { useResume } from "@/components/providers/resume-provider";

type Step = "choose" | "upload" | "uploading" | "success";

export function ResumeUploadView({ onEdit, onAts }: { onEdit?: () => void; onAts?: () => void } = {}) {
  const router = useRouter();
  const { createDraftResume, setResume } = useResume();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("choose");
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (file: File) => {
    const allowed = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!allowed.includes(file.type)) {
      setError("Only PDF or DOC/DOCX files are supported.");
      return;
    }
    setError(null);
    setSelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setStep("uploading");
    setError(null);
    try {
      const resume = await resumeService.upload(selectedFile);
      setResume(resume);
      setStep("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed. Please try again.");
      setStep("upload");
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-12rem)] items-center justify-center">
      <AnimatePresence mode="wait">

        {/* ── STEP 1: Choose action ── */}
        {step === "choose" && (
          <motion.div
            key="choose"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-2xl"
          >
            <div className="text-center mb-12">
              <p className="text-xs font-bold uppercase tracking-[0.35em] text-cyan-500 mb-4">Resume</p>
              <h1 className="text-5xl font-semibold tracking-[-0.04em] text-slate-950">
                Your career starts here
              </h1>
              <p className="mt-4 text-lg text-slate-500 leading-relaxed">
                Upload your existing resume or start fresh. <br/>We&apos;ll handle the rest.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              {/* Upload Resume */}
              <motion.button
                whileHover={{ y: -4, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.22 }}
                onClick={() => setStep("upload")}
                className="group relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-8 text-left shadow-[0_24px_60px_rgba(15,23,42,0.07)] transition hover:border-slate-300 hover:shadow-[0_32px_80px_rgba(15,23,42,0.12)]"
              >
                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 shadow-lg shadow-blue-500/25">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Upload Resume</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  Upload your PDF or DOC and we&apos;ll parse all your info automatically.
                </p>
                <div className="mt-6 flex items-center gap-2 text-xs font-semibold text-cyan-600">
                  <span>Get started</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                </div>
                <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-cyan-50/0 to-blue-50/0 transition duration-300 group-hover:from-cyan-50/50 group-hover:to-blue-50/30" />
              </motion.button>

              {/* Create New */}
              <motion.button
                whileHover={{ y: -4, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.22 }}
                onClick={() => {
                  createDraftResume();
                  onEdit ? onEdit() : router.push("/resume/editor");
                }}
                className="group relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-8 text-left shadow-[0_24px_60px_rgba(15,23,42,0.07)] transition hover:border-slate-300 hover:shadow-[0_32px_80px_rgba(15,23,42,0.12)]"
              >
                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 shadow-lg shadow-teal-500/25">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14M5 12h14"/>
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Create New Resume</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  Start from scratch with guided sections and professional templates.
                </p>
                <div className="mt-6 flex items-center gap-2 text-xs font-semibold text-emerald-600">
                  <span>Start building</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                </div>
                <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-emerald-50/0 to-teal-50/0 transition duration-300 group-hover:from-emerald-50/50 group-hover:to-teal-50/30" />
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* ── STEP 2: Upload area ── */}
        {step === "upload" && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-xl"
          >
            <button
              onClick={() => { setStep("choose"); setSelectedFile(null); setError(null); }}
              className="mb-8 flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
              Back
            </button>

            <div className="text-center mb-8">
              <p className="text-xs font-bold uppercase tracking-[0.35em] text-cyan-500 mb-3">Step 01</p>
              <h1 className="text-4xl font-semibold tracking-[-0.04em] text-slate-950">Upload your resume</h1>
              <p className="mt-3 text-slate-500">PDF, DOC, or DOCX — we&apos;ll extract everything.</p>
            </div>

            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative cursor-pointer rounded-[2rem] border-2 border-dashed p-12 text-center transition-all duration-300 ${
                dragOver
                  ? "border-cyan-400 bg-cyan-50 scale-[1.01]"
                  : selectedFile
                  ? "border-emerald-400 bg-emerald-50/50"
                  : "border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50/50"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
              />

              {selectedFile ? (
                <div>
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500 shadow-lg shadow-emerald-500/30">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  <p className="text-lg font-bold text-slate-900">{selectedFile.name}</p>
                  <p className="mt-1 text-sm text-slate-500">{(selectedFile.size / 1024).toFixed(1)} KB · Click to change</p>
                </div>
              ) : (
                <div>
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-100 to-blue-100">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0891b2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="17 8 12 3 7 8"/>
                      <line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                  </div>
                  <p className="text-lg font-semibold text-slate-800">Drag & drop your resume</p>
                  <p className="mt-1 text-sm text-slate-500">or click to browse files</p>
                  <p className="mt-4 text-xs text-slate-400">Supports PDF, DOC, DOCX</p>
                </div>
              )}
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 text-sm font-medium text-rose-600 text-center"
              >
                {error}
              </motion.p>
            )}

            <button
              onClick={handleUpload}
              disabled={!selectedFile}
              className="mt-6 w-full rounded-2xl bg-slate-900 py-4 text-base font-bold text-white shadow-xl shadow-slate-900/20 transition hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
            >
              Upload & Continue →
            </button>
          </motion.div>
        )}

        {/* ── STEP 3: Uploading ── */}
        {step === "uploading" && (
          <motion.div
            key="uploading"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="text-center"
          >
            <div className="mx-auto mb-8 relative h-24 w-24">
              <div className="absolute inset-0 rounded-full border-4 border-slate-100" />
              <div className="absolute inset-0 rounded-full border-4 border-t-cyan-500 animate-spin" />
              <div className="absolute inset-4 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center shadow-lg">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Uploading & parsing...</h2>
            <p className="mt-3 text-slate-500">Extracting your experience, skills, and more.</p>
          </motion.div>
        )}

        {/* ── STEP 4: Success — what next? ── */}
        {step === "success" && (
          <motion.div
            key="success"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-2xl"
          >
            <div className="text-center mb-10">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 16, delay: 0.1 }}
                className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 shadow-xl shadow-teal-500/30"
              >
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </motion.div>
              <p className="text-xs font-bold uppercase tracking-[0.35em] text-emerald-500 mb-3">Resume Uploaded!</p>
              <h1 className="text-4xl font-semibold tracking-[-0.04em] text-slate-950">What would you like to do?</h1>
              <p className="mt-3 text-slate-500">Your resume is saved. Choose your next step.</p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              {/* Edit Resume */}
              <motion.button
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                whileHover={{ y: -4, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onEdit ? onEdit() : router.push("/resume/editor")}
                className="group relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-8 text-left shadow-[0_24px_60px_rgba(15,23,42,0.07)] transition hover:border-slate-300 hover:shadow-[0_32px_80px_rgba(15,23,42,0.12)]"
              >
                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-400 to-purple-600 shadow-lg shadow-purple-500/25">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Edit Resume</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  Open the visual editor. Choose templates, move sections, and refine every detail.
                </p>
                <div className="mt-6 flex items-center gap-2 text-xs font-semibold text-violet-600">
                  <span>Open editor</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                </div>
                <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-violet-50/0 to-purple-50/0 transition duration-300 group-hover:from-violet-50/50 group-hover:to-purple-50/30" />
              </motion.button>

              {/* ATS Score */}
              <motion.button
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                whileHover={{ y: -4, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onAts ? onAts() : router.push("/ats")}
                className="group relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-8 text-left shadow-[0_24px_60px_rgba(15,23,42,0.07)] transition hover:border-slate-300 hover:shadow-[0_32px_80px_rgba(15,23,42,0.12)]"
              >
                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400 to-amber-500 shadow-lg shadow-orange-500/25">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Check ATS Score</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  Paste a job description and see how your resume matches up with ATS algorithms.
                </p>
                <div className="mt-6 flex items-center gap-2 text-xs font-semibold text-orange-600">
                  <span>Analyze now</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                </div>
                <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-orange-50/0 to-amber-50/0 transition duration-300 group-hover:from-orange-50/50 group-hover:to-amber-50/30" />
              </motion.button>
            </div>

            <p className="mt-6 text-center text-sm text-slate-400">
              Your resume is also saved to your <button onClick={() => router.push("/dashboard")} className="text-slate-600 underline underline-offset-2 hover:text-slate-900 transition">Dashboard</button>.
            </p>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
