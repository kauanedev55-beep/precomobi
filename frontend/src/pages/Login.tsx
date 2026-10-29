import "./login.css";
import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { getFeatures } from "../services/api";
import { useAuth } from "../auth/AuthContext";
import { supabaseResend, supabaseRecover } from "../services/supabase";

export function Login() {
  const { login, demoLogin } = useAuth();
  const [demo, setDemo] = useState(false);
  useEffect(() => { getFeatures().then(f => setDemo(f.demo_mode)).catch(() => undefined); }, []);
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state ?? {}) as { from?: string; reason?: string };
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim() || !password) {
      setError("Informe seu e-mail e sua senha.");
      return;
    }
    setError("");
    setMessage("");
    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate(state.from ?? "/painel", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível entrar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  async function sendEmail(kind: "recover" | "resend") {
    if (!email.trim()) {
      setMessage("Informe seu e-mail no campo acima para continuar.");
      return;
    }
    setMessage("");
    try {
      if (kind === "recover") {
        await supabaseRecover(email.trim());
        setMessage("Se houver uma conta vinculada a esse e-mail, você receberá instruções para recuperar sua senha.");
      } else {
        await supabaseResend(email.trim());
        setMessage("Se existir um cadastro pendente, enviaremos outro link de confirmação.");
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Não foi possível enviar o e-mail agora.");
    }
  }

  return (
    <section className="pm-login" aria-labelledby="pm-login-title">
      <div className="pm-login-form-side">
        <div className="pm-login-heading">
          <span className="pm-login-eyebrow">SUA CONTA PREÇOMOBI</span>
          <h1 id="pm-login-title">Bem-vindo de volta!</h1>
          <p>Entre e continue economizando nas suas compras.</p>
        </div>

        <form className="pm-login-form" onSubmit={submit} noValidate>
          {state.reason && <div className="notice" role="status">{state.reason}</div>}
          <label className="pm-login-field" htmlFor="pm-email">E-mail</label>
          <div className="pm-login-input-wrap">
            <span aria-hidden="true" className="pm-login-input-icon">✉</span>
            <input id="pm-email" type="email" autoComplete="email" placeholder="seu@email.com" required value={email} onChange={(event) => setEmail(event.target.value)} />
          </div>
          <label className="pm-login-field" htmlFor="pm-password">Senha</label>
          <div className="pm-login-input-wrap">
            <span aria-hidden="true" className="pm-login-input-icon">♙</span>
            <input id="pm-password" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Sua senha" required value={password} onChange={(event) => setPassword(event.target.value)} />
            <button className="pm-login-reveal" type="button" aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"} aria-pressed={showPassword} onClick={() => setShowPassword((v) => !v)}>{showPassword ? "Ocultar" : "Mostrar"}</button>
          </div>
          <div className="pm-login-options">
            <span className="pm-login-remember">Acesso seguro</span>
            <button className="pm-login-link" type="button" onClick={() => void sendEmail("recover")}>Esqueci minha senha</button>
          </div>
          {error && <p className="pm-login-alert" role="alert">{error}</p>}
          {message && <p className="pm-login-message" role="status">{message}</p>}
          <button type="submit" className="pm-login-submit" disabled={loading}>{loading ? "Entrando..." : "Entrar"}</button>
          <p className="pm-login-signup">Ainda não tem uma conta? <Link to="/cadastro" state={state}>Criar conta</Link></p>
          <button className="pm-login-resend" type="button" onClick={() => void sendEmail("resend")}>Não recebeu o e-mail de confirmação?</button>
          {demo && <button className="outline-button" type="button" disabled={loading} onClick={async () => {
            setLoading(true); setError("");
            try { await demoLogin(); navigate("/painel"); }
            catch (err) { setError(err instanceof Error ? err.message : "Demonstração indisponível."); }
            finally { setLoading(false); }
          }}>Explorar demonstração</button>}
        </form>
      </div>
      <aside className="pm-login-art" aria-label="Compras mais inteligentes com o PreçoMobi">
        <div className="pm-login-art-shade" />
        <div className="pm-login-art-content">
          <span className="pm-login-art-kicker">ECONOMIZE TEMPO E DINHEIRO</span>
          <h2>Compras mais inteligentes para o seu dia a dia.</h2>
          <ul>
            <li><span aria-hidden="true">✓</span> Compare preços entre mercados</li>
            <li><span aria-hidden="true">✓</span> Encontre o melhor caminho</li>
            <li><span aria-hidden="true">✓</span> Compre com mais praticidade</li>
          </ul>
        </div>
      </aside>
    </section>
  );
}
