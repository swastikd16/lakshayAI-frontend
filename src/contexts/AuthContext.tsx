import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { get, post } from "../lib/apiClient";
import type { AuthSessionDto, AuthSignUpDto, AuthUserDto, SessionState } from "../lib/apiTypes";

type AuthContextValue = SessionState & {
  status: "loading" | "ready";
  error: string | null;
  signIn: (payload: { email: string; password: string }) => Promise<AuthSessionDto>;
  signUp: (payload: AuthSignUpDto) => Promise<AuthSessionDto>;
  signOut: () => Promise<void>;
  clearError: () => void;
};

const STORAGE_KEY = "lakshay-ai.session";

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredSession(): AuthSessionDto | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as AuthSessionDto;
    if (!parsed?.accessToken || !parsed?.user?.id) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function persistSession(session: AuthSessionDto | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (session) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } else {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

function toState(session: AuthSessionDto | null): SessionState {
  return {
    accessToken: session?.accessToken ?? null,
    user: session?.user ?? null
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSessionDto | null>(null);
  const [status, setStatus] = useState<"loading" | "ready">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      const storedSession = readStoredSession();

      if (!storedSession) {
        if (!cancelled) {
          setSession(null);
          setStatus("ready");
        }
        return;
      }

      try {
        const user = await get<AuthUserDto>("/auth/me", storedSession.accessToken);
        if (cancelled) {
          return;
        }

        const nextSession: AuthSessionDto = {
          ...storedSession,
          user
        };
        setSession(nextSession);
        persistSession(nextSession);
        setError(null);
      } catch {
        if (!cancelled) {
          setSession(null);
          persistSession(null);
        }
      } finally {
        if (!cancelled) {
          setStatus("ready");
        }
      }
    }

    restoreSession();
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = async (payload: { email: string; password: string }) => {
    setError(null);
    const nextSession = await post<AuthSessionDto>("/auth/sign-in", payload);
    setSession(nextSession);
    persistSession(nextSession);
    setStatus("ready");
    return nextSession;
  };

  const signUp = async (payload: AuthSignUpDto) => {
    setError(null);
    const nextSession = await post<AuthSessionDto>("/auth/sign-up", payload);
    setSession(nextSession);
    persistSession(nextSession);
    setStatus("ready");
    return nextSession;
  };

  const signOut = async () => {
    try {
      if (session?.accessToken) {
        await post<{ success: boolean }>(
          "/auth/sign-out",
          { accessToken: session.accessToken },
          session.accessToken
        );
      }
    } finally {
      setSession(null);
      persistSession(null);
      setStatus("ready");
    }
  };

  const clearError = () => setError(null);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...toState(session),
      status,
      error,
      signIn,
      signUp,
      signOut,
      clearError
    }),
    [session, status, error]
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
