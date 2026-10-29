import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { supabaseUpdatePassword } from "../services/supabase";

export function ResetPassword() {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const token = params.get("access_token") || "";
  const valid = params.get("type") === "recovery";
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 8) return setMessage("Use uma senha com pelo menos 8 caracteres.");
    try {
      await supabaseUpdatePassword(token, password);
      history.replaceState(null, "", "/redefinir-senha");
      setDone(true);
      setMessage("Senha atualizada. Agora você pode entrar.");
    } catch (err) { setMessage(err instanceof Error ? err.message : "Não foi possível atualizar a senha."); }
  }
  return <section className="form-page"><h1>Redefinir senha</h1><div className="form-card">{!done && valid && token ? <form onSubmit={submit}><label className="field"><span>Nova senha</span><input type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)}/></label><button className="primary-button" type="submit">Salvar nova senha</button></form> : !done ? <p>Link inválido ou expirado. Solicite outro no login.</p> : null}{message && <p role="status">{message}</p>}<Link to="/login">Voltar ao login</Link></div></section>;
}
