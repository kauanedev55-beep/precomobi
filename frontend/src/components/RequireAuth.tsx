import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";
import { Loading } from "./StateViews";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, checking } = useAuth();
  const location = useLocation();
  if (checking) return <Loading text="Verificando sua sessão..." />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search, reason: "Faça login para acessar esta página." }} />;
  return <>{children}</>;
}
