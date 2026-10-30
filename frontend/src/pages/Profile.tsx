import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";
import { getMyPriceReports, getShoppingLists } from "../services/api";

export function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [counts, setCounts] = useState<{ lists: number; reports: number } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([getShoppingLists(), getMyPriceReports()])
      .then(([lists, reports]) => setCounts({ lists: lists.length, reports: reports.length }))
      .catch((err) => setError(err instanceof Error ? err.message : "Não foi possível carregar seus dados."));
  }, []);

  if (!user) return null;

  return (
    <section className="form-page">
      <h1>Meu perfil</h1>
      <dl className="info-grid">
        <div><dt>Nome</dt><dd>{user.name}</dd></div>
        <div><dt>E-mail</dt><dd>{user.email}</dd></div>
        <div><dt>Perfil de acesso</dt><dd>{user.is_admin ? "Administradora (master)" : "Comunidade"}</dd></div>
        <div><dt>Listas salvas</dt><dd>{counts ? counts.lists : "…"}</dd></div>
        <div><dt>Contribuições de preço</dt><dd>{counts ? counts.reports : "…"}</dd></div>
      </dl>
      {error && <p className="error-message" role="alert">{error}</p>}
      <div className="button-row">
        <Link className="outline-button" to="/lista">Minhas listas</Link>
        <Link className="outline-button" to="/minhas-contribuicoes">Minhas contribuições</Link>
        {user.is_admin && <Link className="outline-button" to="/mercados">Cadastrar mercados</Link>}
        <button className="primary-button" type="button" onClick={() => { logout(); navigate("/"); }}>Sair</button>
      </div>
    </section>
  );
}
