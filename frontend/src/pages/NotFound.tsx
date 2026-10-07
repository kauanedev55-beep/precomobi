import { Link } from "react-router-dom";

export function NotFound() {
  return (
    <section className="form-page not-found">
      <span className="big-code">404</span>
      <h1>Página não encontrada</h1>
      <p className="form-hint">O endereço que você tentou abrir não existe no PreçoMobi.</p>
      <div className="button-row">
        <Link className="primary-button" to="/">Voltar ao início</Link>
        <Link className="outline-button" to="/produtos">Buscar produtos</Link>
      </div>
    </section>
  );
}
