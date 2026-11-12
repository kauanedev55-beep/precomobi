import { Link, useLocation } from "react-router-dom";
import { usePwa } from "../pwa/PwaContext";

export function AccessChoice() {
  const { installed } = usePwa();
  const location = useLocation();
  const state = (location.state ?? {}) as { registered?: boolean; from?: string };
  const loginState = { from: state.from, reason: state.registered ? "Cadastro criado! Confirme o link enviado ao seu e-mail antes de entrar." : undefined };
  return <section className="install-page access-choice" aria-labelledby="access-choice-title">
    <img className="install-icon" src="/icons/precomobi-192.png" width="64" height="64" alt="" />
    {state.registered && <p className="notice good" role="status">Conta criada! Confirme seu e-mail para entrar.</p>}
    <h1 id="access-choice-title">{installed ? "Vamos entrar?" : "Como você quer continuar?"}</h1>
    <p>{installed ? "Entre com seu e-mail e sua senha." : "Sua conta é a mesma no site e no aplicativo."}</p>
    <div className="access-choice-options">
      <Link className="primary-button" to="/login" state={loginState}><strong>{installed ? "Entrar" : "Continuar pelo site"}</strong>{!installed && <span>Não precisa instalar</span>}</Link>
      {!installed && <Link className="outline-button" to="/instalar" state={state}><strong>Instalar no celular</strong><span>Ícone na tela inicial</span></Link>}
    </div>
    {!installed && <p className="form-hint">Você também pode instalar depois, pelo menu.</p>}
  </section>;
}
