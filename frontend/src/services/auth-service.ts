import { apiRequest } from "@/lib/api-client";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@/lib/types";

export type AuthPayload = {
  email: string;
  password: string;
  full_name?: string;
};

export const authService = {
  async me() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not logged in");
    
    // We still fetch the user from our backend to get application-specific data
    return apiRequest<User>("/api/user/me", {
      method: "GET",
    });
  },
  async logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
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
