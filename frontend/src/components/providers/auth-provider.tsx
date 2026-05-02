"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { clearStoredResumeId } from "@/lib/storage";
import { AUTH_EXPIRED_EVENT } from "@/lib/api-client";
import type { User } from "@/lib/types";
import { authService } from "@/services/auth-service";

type AuthContextValue = {
  user: User | null;
  isGuest: boolean;
  isLoading: boolean;
  error: string | null;
  logout: () => void;
  clearError: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const resetAuthState = () => {
    clearStoredResumeId();
    setUser(null);
  };

  const fetchUser = async () => {
    try {
      const me = await authService.me();
      setUser(me);
    } catch {
      resetAuthState();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchUser();

    // Listen for Supabase auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        fetchUser();
      } else if (event === 'SIGNED_OUT') {
        resetAuthState();
        router.push('/login');
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, router]);

  useEffect(() => {
    const handleExpiredAuth = () => {
      resetAuthState();
      setError("Your session expired. Please log in again.");
      router.push('/login');
    };

    window.addEventListener(AUTH_EXPIRED_EVENT, handleExpiredAuth);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handleExpiredAuth);
  }, [router]);

  const logout = async () => {
    await authService.logout();
    resetAuthState();
    setError(null);
  };

  const value = useMemo(
    () => ({
      user,
      isGuest: !isLoading && !user,
      isLoading,
      error,
      logout,
      clearError: () => setError(null),
    }),
    [error, isLoading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }

  return context;
}
