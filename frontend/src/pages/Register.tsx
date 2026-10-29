import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state ?? {}) as { from?: string };
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const set = (field: keyof typeof form) => (event: { target: { value: string } }) => setForm({ ...form, [field]: event.target.value });

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.name.trim()) return setError("Informe seu nome.");
    if (!EMAIL_PATTERN.test(form.email.trim())) return setError("Informe um e-mail válido.");
    if (form.password.length < 8) return setError("A senha precisa ter pelo menos 8 caracteres.");
    if (form.password !== form.confirm) return setError("A confirmação de senha não confere.");
    setLoading(true);
    setError("");
    try {
      await register(form.name.trim(), form.email.trim(), form.password);
      navigate("/login", { replace: true, state: { reason: "Cadastro criado! Enviamos um link de confirmação para seu e-mail. Confirme antes de entrar." } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível criar a conta.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="form-page">
      <h1>Criar conta</h1>
      <form className="form-card" onSubmit={submit} noValidate>
        <label className="field"><span>Nome</span><input autoComplete="name" value={form.name} onChange={set("name")} /></label>
        <label className="field"><span>E-mail</span><input type="email" autoComplete="email" value={form.email} onChange={set("email")} /></label>
        <label className="field"><span>Senha (mínimo 8 caracteres)</span><input type="password" autoComplete="new-password" value={form.password} onChange={set("password")} /></label>
        <label className="field"><span>Confirmar senha</span><input type="password" autoComplete="new-password" value={form.confirm} onChange={set("confirm")} /></label>
        {error && <p className="error-message" role="alert">{error}</p>}
        <button className="primary-button" type="submit" disabled={loading}>{loading ? "Criando..." : "Criar minha conta"}</button>
        <p className="form-hint">Já tem conta? <Link to="/login" state={state}>Entrar</Link></p>
      </form>
    </section>
  );
}
