"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";

import { useAuth } from "@/components/providers/auth-provider";
import { useResume } from "@/components/providers/resume-provider";
import type {
  InterviewAnswerEvaluation,
  InterviewDifficulty,
  InterviewQuestion,
  InterviewQuestionCount,
  InterviewResult,
} from "@/lib/types";
import { interviewService } from "@/services/interview-service";

const difficultyOptions: InterviewDifficulty[] = ["easy", "medium", "hard"];
const questionCountOptions: InterviewQuestionCount[] = [10, 20, 30, 40, 50];

export function InterviewCoachView() {
  const { user } = useAuth();
  const { resume, resumeId } = useResume();

  const [difficulty, setDifficulty] = useState<InterviewDifficulty>("medium");
  const [questionCount, setQuestionCount] = useState<InterviewQuestionCount>(10);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<InterviewQuestion | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [textAnswer, setTextAnswer] = useState("");
  const [feedback, setFeedback] = useState<InterviewAnswerEvaluation | null>(null);
  const [result, setResult] = useState<InterviewResult | null>(null);
  const [progress, setProgress] = useState({ answered: 0, remaining: 0, total: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeAnswer = useMemo(() => {
    if (!currentQuestion) {
      return "";
    }
    return currentQuestion.question_type === "mcq" ? selectedAnswer : textAnswer;
  }, [currentQuestion, selectedAnswer, textAnswer]);

  const handleStart = async () => {
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
      setError("Save a resume first so interview questions can be generated from it.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setFeedback(null);
    setResult(null);

    try {
      const response = await interviewService.start(
        {
          difficulty,
          question_count: questionCount,
          resume_id: resumeId ?? undefined,
          resume: resumeId ? undefined : activeResume ?? undefined,
        },
      );
      setSessionId(response.session_id);
      setCurrentQuestion(response.current_question);
      setProgress(response.progress);
      setSelectedAnswer("");
      setTextAnswer("");
    } catch (interviewError) {
      setError(
        interviewError instanceof Error
          ? interviewError.message
          : "Could not start interview.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!user || !sessionId || !currentQuestion || !activeAnswer.trim()) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await interviewService.answer(sessionId, activeAnswer);
      setFeedback(response.evaluation);
      setProgress(response.progress);
      setSelectedAnswer("");
      setTextAnswer("");

      if (response.is_complete) {
        const interviewResult = await interviewService.result(sessionId);
        setResult(interviewResult);
        setCurrentQuestion(null);
      } else {
        setCurrentQuestion(response.next_question ?? null);
      }
    } catch (interviewError) {
      setError(
        interviewError instanceof Error
          ? interviewError.message
          : "Could not submit interview answer.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <section className="rounded-[2rem] border border-white/70 bg-white/75 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.06)] backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-signal">
          Interview Setup
        </p>
        <h3 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950">
          Start a mock interview session
        </h3>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          Questions are generated from your saved resume and evaluated one at a time.
        </p>

        <div className="mt-6 grid gap-5">
          <div className="grid gap-3 md:grid-cols-3">
            {difficultyOptions.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setDifficulty(item)}
                className={`rounded-[1.2rem] border px-4 py-3 text-sm font-semibold capitalize ${
                  difficulty === item
                    ? "border-slate-950 bg-slate-950 text-white"
                    : "border-slate-200 bg-white text-slate-700"
                }`}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-5">
            {questionCountOptions.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setQuestionCount(item)}
                className={`rounded-[1.2rem] border px-4 py-3 text-sm font-semibold ${
                  questionCount === item
                    ? "border-slate-950 bg-slate-950 text-white"
                    : "border-slate-200 bg-white text-slate-700"
                }`}
              >
                {item}
              </button>
            ))}
          </div>

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
            type="button"
            onClick={handleStart}
            disabled={isLoading}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {isLoading && !sessionId ? "Starting..." : "Start interview"}
          </button>
        </div>
      </section>

      <div className="grid gap-6">
        <AnimatePresence mode="wait">
          {result ? (
            <motion.section
              key="result"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -18 }}
              className="grid gap-6"
            >
              <div className="rounded-[2rem] border border-white/70 bg-slate-950 p-6 text-white shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300">
                  Final Score
                </p>
                <div className="mt-4 text-6xl font-semibold tracking-[-0.06em]">
                  {result.total_score}
                </div>
                <div className="mt-3 text-sm text-slate-300">
                  {result.answered_questions} of {result.question_count} answered
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-[2rem] border border-white/70 bg-white/75 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.06)] backdrop-blur">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-signal">
                    Strengths
                  </p>
                  <div className="mt-4 space-y-3">
                    {result.strengths.map((item) => (
                      <div
                        key={item}
                        className="rounded-[1.2rem] border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-800"
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[2rem] border border-white/70 bg-white/75 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.06)] backdrop-blur">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-signal">
                    Weak Areas
                  </p>
                  <div className="mt-4 space-y-3">
                    {result.weak_areas.map((item) => (
                      <div
                        key={item}
                        className="rounded-[1.2rem] border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-700"
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.section>
          ) : currentQuestion ? (
            <motion.section
              key={currentQuestion.id}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -18 }}
              className="grid gap-6"
            >
              <div className="rounded-[2rem] border border-white/70 bg-slate-950 p-6 text-white shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300">
                    Live Interview
                  </p>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-300">
                    {progress.answered + 1}/{progress.total}
                  </span>
                </div>
                <h3 className="mt-4 text-2xl font-semibold tracking-[-0.04em]">
                  {currentQuestion.prompt}
                </h3>
                <p className="mt-3 text-sm text-slate-300">
                  {currentQuestion.section} · {currentQuestion.question_type} · {currentQuestion.difficulty}
                </p>
              </div>

              <div className="rounded-[2rem] border border-white/70 bg-white/75 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.06)] backdrop-blur">
                {currentQuestion.question_type === "mcq" ? (
                  <div className="grid gap-3">
                    {currentQuestion.options.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setSelectedAnswer(option)}
                        className={`rounded-[1.2rem] border px-4 py-4 text-left text-sm leading-6 ${
                          selectedAnswer === option
                            ? "border-slate-950 bg-slate-950 text-white"
                            : "border-slate-200 bg-white text-slate-700"
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                ) : (
                  <textarea
                    rows={8}
                    value={textAnswer}
                    onChange={(event) => setTextAnswer(event.target.value)}
                    className="w-full rounded-[1.5rem] border border-slate-200 bg-white px-4 py-3 text-sm leading-6 outline-none transition focus:border-slate-400"
                    placeholder="Write your answer here..."
                  />
                )}

                <div className="mt-5 flex items-center justify-between gap-4">
                  <div className="text-sm text-slate-500">
                    Answered {progress.answered} · Remaining {progress.remaining}
                  </div>
                  <button
                    type="button"
                    onClick={handleSubmitAnswer}
                    disabled={isLoading || !activeAnswer.trim()}
                    className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {isLoading ? "Submitting..." : "Submit answer"}
                  </button>
                </div>
              </div>

              {feedback ? (
                <div className="rounded-[2rem] border border-white/70 bg-white/75 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.06)] backdrop-blur">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-signal">
                      Instant Feedback
                    </p>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        feedback.is_correct
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-rose-100 text-rose-700"
                      }`}
                    >
                      {feedback.is_correct ? "Correct" : "Needs work"}
                    </span>
                  </div>
                  <p className="mt-4 text-sm leading-7 text-slate-700">
                    {feedback.explanation}
                  </p>
                  <div className="mt-4 rounded-[1.2rem] border border-slate-200/80 bg-slate-50/80 p-4 text-sm leading-6 text-slate-700">
                    {feedback.improvement_suggestion}
                  </div>
                </div>
              ) : null}
            </motion.section>
          ) : isLoading && !sessionId ? (
            <motion.section
              key="loading"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-[2rem] border border-white/70 bg-white/75 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.06)] backdrop-blur flex items-center justify-center min-h-[300px]"
            >
              <div className="flex flex-col items-center gap-4 animate-pulse">
                <div className="h-10 w-10 rounded-full border-4 border-slate-200 border-t-slate-900 animate-spin" />
                <p className="text-sm font-medium text-slate-500">Generating interview questions from your resume...</p>
              </div>
            </motion.section>
          ) : (
            <motion.section
              key="empty"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-[2rem] border border-white/70 bg-white/75 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.06)] backdrop-blur"
            >
              <p className="text-sm leading-7 text-slate-500">
                Start an interview to begin the one-question-at-a-time coaching flow.
              </p>
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
