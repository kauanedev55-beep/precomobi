import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";
import { ProductArt } from "../components/ProductArt";

export function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  function search(event: FormEvent) {
    event.preventDefault();
    navigate(query.trim() ? `/produtos?q=${encodeURIComponent(query.trim())}` : "/produtos");
  }

  return (
    <>
      <section className="hero-section">
        <div className="hero-copy">
          <span className="eyebrow">COMPRAR BEM COMEÇA ANTES DE SAIR</span>
          <h1>O preço certo, <br />no mercado certo.</h1>
          <p>Monte sua lista, compare entre os mercados de Serra/ES e veja na hora onde sai mais barato.</p>
          <form className="hero-search" onSubmit={search} role="search">
            <input aria-label="Buscar produto por nome ou código de barras (EAN)" placeholder="Arroz, café, leite..." value={query} onChange={(event) => setQuery(event.target.value)} />
            <button className="primary-button" type="submit">Buscar</button>
          </form>
          <div className="hero-actions">
            <Link className="primary-button" to="/lista">Montar minha lista <span>→</span></Link>
            {user ? (
              <Link className="text-button" to="/perfil">Meu perfil <span>↗</span></Link>
            ) : (
              <Link className="text-button" to="/cadastro">Criar conta <span>↗</span></Link>
            )}
          </div>
        </div>

        <div className="hero-spotlight" aria-hidden="true">
          <div className="spotlight-blob" />
          <ProductArt category="Grãos" name="" size={150} />
          <div className="spotlight-price">
            <span>a partir de</span>
            <strong>R$ 23<sup>,90</sup></strong>
            <small>arroz 5&nbsp;kg em Extrabom Colina de Laranjeiras</small>
          </div>
        </div>
      </section>

      <section className="trust-row" aria-label="Sobre os dados">
        <span className="check-icon">✓</span>
        <span>Preços marcados com “Dados de desenvolvimento” são de teste — ainda não são valores reais coletados nos mercados.</span>
      </section>

      <section className="quick-grid" aria-label="Acesso rápido">
        <Link className="quick-card" to="/produtos"><strong>Produtos</strong><span>Pesquise por nome ou aponte a câmera para o código de barras.</span></Link>
        <Link className="quick-card" to="/lista"><strong>Lista de compras</strong><span>Monte sua lista e compare os mercados.</span></Link>
        <Link className="quick-card" to="/mapa"><strong>Mapa</strong><span>Carone, Extrabom e Supermercados BH, em Laranjeiras.</span></Link>
        <Link className="quick-card" to={user ? "/contribuir" : "/login"}><strong>Contribuir com preço</strong><span>Viu um preço no mercado? Registre e ajude a comunidade.</span></Link>
      </section>
    </>
  );
}
