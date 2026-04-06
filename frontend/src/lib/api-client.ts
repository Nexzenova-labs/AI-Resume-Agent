const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const AUTH_EXPIRED_EVENT = "auth:expired";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

type RequestOptions = RequestInit & {
  token?: string | null;
  skipAuthRefresh?: boolean;
};

let refreshPromise: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = fetch(`${API_BASE_URL}/api/auth/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    cache: "no-store",
  })
    .then((response) => response.ok)
    .catch(() => false)
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { token, headers, skipAuthRefresh = false, ...rest } = options;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers ?? {}),
    },
    credentials: "include",
    cache: "no-store",
  });

  const shouldAttemptRefresh =
    response.status === 401 &&
    !skipAuthRefresh &&
    !path.startsWith("/api/auth/login") &&
    !path.startsWith("/api/auth/signup") &&
    !path.startsWith("/api/auth/refresh");

  if (shouldAttemptRefresh) {
    const refreshed = await refreshSession();
    if (refreshed) {
      return apiRequest<T>(path, {
        ...options,
        skipAuthRefresh: true,
      });
    }
  }

  const raw = await response.text();
  let data: unknown = null;

  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      data = { message: raw };
    }
  }

  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
    }

    const message =
      (typeof data === "object" && data !== null && "detail" in data
        ? String(data.detail)
        : undefined) ??
      (typeof data === "object" && data !== null && "message" in data
        ? String(data.message)
        : undefined) ??
      "Something went wrong while contacting the backend.";
    throw new ApiError(message, response.status);
  }

  return data as T;
}

export { AUTH_EXPIRED_EVENT };
