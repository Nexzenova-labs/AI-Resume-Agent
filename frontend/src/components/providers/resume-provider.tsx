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
import { createEmptyResumePayload, guestResumeStore } from "@/lib/guest-resumes";
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
  createDraftResume: () => Resume;
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
      const guestResume = guestResumeStore.get(nextResumeId);
      if (guestResume) {
        setResume(guestResume);
        setResumeIdState(guestResume.id);
        setStoredResumeId(guestResume.id);
      }
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
      const response = guestResumeStore.save(payload, resumeId);
      setResume(response);
      setResumeIdState(response.id);
      setStoredResumeId(response.id);
      setError(null);
      return response;
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
    const storedResumeId = getStoredResumeId();

    if (!user) {
      if (storedResumeId) {
        const guestResume = guestResumeStore.get(storedResumeId);
        setResume(guestResume);
        setResumeIdState(guestResume?.id ?? null);
      } else {
        setResume(null);
        setResumeIdState(null);
      }
      return;
    }

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
      createDraftResume: () => {
        if (user) {
          const timestamp = new Date().toISOString();
          const draft: Resume = {
            ...createEmptyResumePayload(),
            id: `draft-${crypto.randomUUID()}`,
            user_id: user.id,
            status: "draft",
            source_type: "builder",
            created_at: timestamp,
            updated_at: timestamp,
          };
          setResume(draft);
          setResumeIdState(null);
          clearStoredResumeId();
          return draft;
        }

        const draft = guestResumeStore.createDraft();
        setResume(draft);
        setResumeIdState(draft.id);
        setStoredResumeId(draft.id);
        return draft;
      },
      setResume: (r: Resume) => {
        setResume(r);
        setResumeIdState(r.id);
        setStoredResumeId(r.id);
      },
      clearError: () => setError(null),
    }),
    [error, isLoading, isSaving, resume, resumeId, user],
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
