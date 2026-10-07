import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";
import { useCart } from "../cart/CartContext";

export function Layout() {
  const { user, logout, sessionExpired } = useAuth();
  const { items } = useCart();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  const link = ({ isActive }: { isActive: boolean }) => (isActive ? "active" : undefined);

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="brand" to="/" onClick={close}>
          <span className="brand-mark">$</span>
          <span>Preço<span>Mobi</span></span>
        </Link>
        <button className="menu-toggle" type="button" aria-expanded={open} aria-label="Abrir menu" onClick={() => setOpen(!open)}>
          ☰
        </button>
        <nav className={`topnav ${open ? "open" : ""}`} onClick={close}>
          <NavLink to="/" end className={link}>Início</NavLink>
          <NavLink to="/produtos" className={link}>Produtos</NavLink>
          <NavLink to="/lista" className={link}>Lista{items.length > 0 && <span className="count-pill">{items.length}</span>}</NavLink>
          <NavLink to="/mercados" className={link}>Mercados</NavLink>
          <NavLink to="/mapa" className={link}>Mapa</NavLink>
          <NavLink to="/historico" className={link}>Histórico</NavLink>
          {user && <NavLink to="/contribuir" className={link}>Contribuir</NavLink>}
          {user && <NavLink to="/minhas-contribuicoes" className={link}>Minhas contribuições</NavLink>}
          <span className="nav-account">
            {user ? (
              <>
                <NavLink to="/perfil" className={link}>Olá, {user.name.split(" ")[0]}</NavLink>
                <button className="text-button" type="button" onClick={() => { logout(); navigate("/"); }}>Sair</button>
              </>
            ) : (
              <>
                <NavLink to="/cadastro" className={link}>Criar conta</NavLink>
                <Link className="login-button" to="/login">Entrar</Link>
              </>
            )}
          </span>
        </nav>
      </header>

      {sessionExpired && !user && (
        <div className="notice" role="alert">
          Sua sessão expirou. <Link to="/login">Entre novamente</Link> para continuar.
        </div>
      )}

      <main className="page">
        <Outlet />
      </main>

      <footer className="site-footer">
        <span>PreçoMobi — projeto acadêmico. Preços marcados como “Dados de desenvolvimento” são de teste, não preços reais de supermercados.</span>
      </footer>
    </div>
  );
}
