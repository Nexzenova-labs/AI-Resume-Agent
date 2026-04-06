"use client";

import type { ReactNode } from "react";

import { AuthProvider } from "@/components/providers/auth-provider";
import { ResumeProvider } from "@/components/providers/resume-provider";

export function AppProvider({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ResumeProvider>{children}</ResumeProvider>
    </AuthProvider>
  );
}

