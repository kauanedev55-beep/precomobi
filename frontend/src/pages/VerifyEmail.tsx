import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function VerifyEmail() {
  const navigate = useNavigate();
  const { completeSupabaseLogin } = useAuth();
  const once = useRef(false);
  const [state, setState] = useState<"loading" | "confirmed" | "invalid">("loading");
  useEffect(() => {
    if (once.current) return;
    once.current = true;
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const search = new URLSearchParams(window.location.search);
    const token = hash.get("access_token");
    const error = hash.get("error") || search.get("error");
    window.history.replaceState(null, "", window.location.pathname);
    if (error) { setState("invalid"); return; }
    if (!token) {
      // A confirmação pode já ter ocorrido no Supabase antes do redirecionamento.
      // Sem token, não é seguro afirmar que a sessão foi criada.
      setState("confirmed"); return;
    }
    completeSupabaseLogin(token).then(() => navigate("/painel", { replace: true }))
      .catch(() => setState("confirmed"));
  }, [completeSupabaseLogin, navigate]);
  return <section className="pm-verification"><div className="pm-verification-icon" aria-hidden="true">{state === "loading" ? "…" : state === "invalid" ? "!" : "✓"}</div><span className="pm-kicker">SUA CONTA PREÇOMOBI</span><h1>{state === "loading" ? "Preparando seu acesso" : state === "invalid" ? "Não foi possível validar o link" : "Vamos entrar na sua conta?"}</h1><p role="status">{state === "loading" ? "Estamos concluindo a confirmação e abrindo seu espaço." : state === "invalid" ? "O link pode ter expirado. Entre na sua conta ou solicite um novo e-mail de confirmação." : "Se você já confirmou seu e-mail, o cadastro está pronto. Entre para continuar. Se o acesso não funcionar, verifique sua conexão com o servidor."}</p><Link className="primary-button" to="/login">Ir para o login →</Link></section>;
}
