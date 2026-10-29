import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { exchangeSupabaseSession, startDemoSession, getMe, setAuthToken, setUnauthorizedHandler, type AuthResult, type AuthUser } from "../services/api";
import { supabaseLogin, supabaseRegister } from "../services/supabase";

const STORAGE_KEY = "precomobi_auth";

type AuthContextValue = {
  user: AuthUser | null;
  /** true enquanto verificamos, no início, se o token guardado ainda vale. */
  checking: boolean;
  sessionExpired: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  demoLogin: () => Promise<void>;
  completeSupabaseLogin: (accessToken: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function loadStored(): AuthResult | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthResult) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(() => {
    const stored = loadStored();
    if (stored) setAuthToken(stored.token); // antes de qualquer chamada dos componentes filhos
    return stored;
  });
  const [user, setUser] = useState<AuthUser | null>(initial?.user ?? null);
  const [checking, setChecking] = useState(Boolean(initial));
  const [sessionExpired, setSessionExpired] = useState(false);

  const clearSession = useCallback(() => {
    setAuthToken(null);
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearSession();
      setSessionExpired(true);
    });
    return () => setUnauthorizedHandler(null);
  }, [clearSession]);

  // ao abrir o site, confirma com o backend que o token guardado ainda é válido
  useEffect(() => {
    if (!initial) return;
    getMe()
      .then((me) => setUser(me))
      .catch(() => {
        clearSession();
        setSessionExpired(true);
      })
      .finally(() => setChecking(false));
  }, [initial, clearSession]);

  const startSession = useCallback((result: AuthResult) => {
    setAuthToken(result.token);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
    setUser(result.user);
    setSessionExpired(false);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      checking,
      sessionExpired,
      login: async (email, password) => { const tokens = await supabaseLogin(email, password); startSession(await exchangeSupabaseSession(tokens.access_token)); },
      demoLogin: async () => startSession(await startDemoSession()),
      register: async (name, email, password) => { await supabaseRegister(name, email, password); },
      completeSupabaseLogin: async (accessToken) => startSession(await exchangeSupabaseSession(accessToken)),
      logout: () => {
        clearSession();
        setSessionExpired(false);
      },
    }),
    [user, checking, sessionExpired, startSession, clearSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth precisa estar dentro de <AuthProvider>");
  return context;
}
