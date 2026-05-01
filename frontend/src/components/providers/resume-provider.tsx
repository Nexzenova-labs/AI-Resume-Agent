"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { clearStoredResumeId, getStoredResumeId, setStoredResumeId } from "@/lib/storage";
import type { Resume, ResumePayload } from "@/lib/types";
import { resumeService } from "@/services/resume-service";
import { useAuth } from "@/components/providers/auth-provider";

type ResumeContextValue = {
  resume: Resume | null;
  resumeId: string | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  loadResume: (resumeId: string) => Promise<void>;
  saveResume: (payload: ResumePayload) => Promise<Resume>;
  setResume: (resume: Resume) => void;
  clearError: () => void;
};

const ResumeContext = createContext<ResumeContextValue | undefined>(undefined);

export function ResumeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [resume, setResume] = useState<Resume | null>(null);
  const [resumeId, setResumeIdState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadResume = async (nextResumeId: string) => {
    if (!user) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await resumeService.get(nextResumeId);
      setResume(response);
      setResumeIdState(response.id);
      setStoredResumeId(response.id);
      setError(null);
    } catch (resumeError) {
      setError(
        resumeError instanceof Error
          ? resumeError.message
          : "Could not load the resume.",
      );
      throw resumeError;
    } finally {
      setIsLoading(false);
    }
  };

  const saveResume = async (payload: ResumePayload) => {
    if (!user) {
      throw new Error("Authentication is required.");
    }

    setIsSaving(true);
    try {
      const response = resumeId
        ? await resumeService.update(resumeId, payload)
        : await resumeService.create(payload);
      setResume(response);
      setResumeIdState(response.id);
      setStoredResumeId(response.id);
      setError(null);
      return response;
    } catch (resumeError) {
      setError(
        resumeError instanceof Error
          ? resumeError.message
          : "Could not save the resume.",
      );
      throw resumeError;
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (!user) {
      setResume(null);
      setResumeIdState(null);
      return;
    }

    const storedResumeId = getStoredResumeId();
    if (!storedResumeId) {
      return;
    }

    loadResume(storedResumeId).catch(() => {
      clearStoredResumeId();
      setResume(null);
      setResumeIdState(null);
    });
  }, [user]);

  const value = useMemo(
    () => ({
      resume,
      resumeId,
      isLoading,
      isSaving,
      error,
      loadResume,
      saveResume,
      setResume: (r: Resume) => {
        setResume(r);
        setResumeIdState(r.id);
        setStoredResumeId(r.id);
      },
      clearError: () => setError(null),
    }),
    [error, isLoading, isSaving, resume, resumeId],
  );

  return (
    <ResumeContext.Provider value={value}>{children}</ResumeContext.Provider>
  );
}

export function useResume() {
  const context = useContext(ResumeContext);

  if (!context) {
    throw new Error("useResume must be used within ResumeProvider.");
  }

  return context;
}
