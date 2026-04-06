import { apiRequest } from "@/lib/api-client";
import type { AuthResponse, User } from "@/lib/types";

export type AuthPayload = {
  email: string;
  password: string;
  full_name?: string;
};

export const authService = {
  signup(payload: Required<AuthPayload>) {
    return apiRequest<AuthResponse>("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  login(payload: Pick<AuthPayload, "email" | "password">) {
    return apiRequest<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  me() {
    return apiRequest<User>("/api/user/me", {
      method: "GET",
    });
  },
  logout() {
    return apiRequest<void>("/api/auth/logout", {
      method: "POST",
    });
  },
  stats() {
    return apiRequest<{
      active_resumes: number;
      ats_average: number;
      interviews_practiced: number;
    }>("/api/user/stats", {
      method: "GET",
    });
  },
};
