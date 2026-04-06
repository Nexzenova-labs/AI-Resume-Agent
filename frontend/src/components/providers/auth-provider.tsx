"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { clearStoredResumeId } from "@/lib/storage";
import { AUTH_EXPIRED_EVENT, ApiError } from "@/lib/api-client";
import type { User } from "@/lib/types";
import { authService, type AuthPayload } from "@/services/auth-service";

type AuthContextValue = {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (payload: Pick<AuthPayload, "email" | "password">) => Promise<void>;
  signup: (payload: Required<AuthPayload>) => Promise<void>;
  logout: () => void;
  clearError: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const resetAuthState = () => {
    clearStoredResumeId();
    setUser(null);
  };

  useEffect(() => {
    authService
      .me()
      .then((me) => {
        setUser(me);
      })
      .catch(() => {
        resetAuthState();
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    const handleExpiredAuth = () => {
      resetAuthState();
      setError("Your session expired. Please log in again.");
      if (window.location.pathname !== "/login" && window.location.pathname !== "/signup" && window.location.pathname !== "/") {
        window.location.href = "/login?redirect=" + encodeURIComponent(window.location.pathname);
      } else if (window.location.pathname === "/") {
        window.location.href = "/login";
      }
    };

    window.addEventListener(AUTH_EXPIRED_EVENT, handleExpiredAuth);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handleExpiredAuth);
  }, []);

  const handleAuthSuccess = (nextUser: User) => {
    setUser(nextUser);
    setError(null);
  };

  const login = async (payload: Pick<AuthPayload, "email" | "password">) => {
    setIsLoading(true);
    try {
      const response = await authService.login(payload);
      handleAuthSuccess(response.user);
    } catch (authError) {
      if (authError instanceof ApiError && authError.status === 401) {
        resetAuthState();
      }
      setError(
        authError instanceof Error ? authError.message : "Login failed.",
      );
      throw authError;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (payload: Required<AuthPayload>) => {
    setIsLoading(true);
    try {
      const response = await authService.signup(payload);
      handleAuthSuccess(response.user);
    } catch (authError) {
      setError(
        authError instanceof Error ? authError.message : "Signup failed.",
      );
      throw authError;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    void authService.logout().catch(() => undefined);
    resetAuthState();
    setError(null);
  };

  const value = useMemo(
    () => ({
      user,
      isLoading,
      error,
      login,
      signup,
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
