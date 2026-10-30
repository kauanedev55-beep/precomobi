import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useCart } from "../cart/CartContext";

import { getFeatures } from "../services/api";

const links = [
  { to: "/painel", label: "Visão geral", icon: "⌂" },
  { to: "/lista", label: "Minha lista", icon: "☷" },
  { to: "/produtos", label: "Encontrar produtos", icon: "⌕" },
  { to: "/comunidade", label: "Comunidade", icon: "◷" },
];
export function Layout() {
  const { user, logout, checking, sessionExpired } = useAuth();
  const [demo, setDemo] = useState(false);
  useEffect(() => { getFeatures().then(f => setDemo(f.demo_mode)).catch(() => undefined); }, []);
  const { items } = useCart();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  // Quem ainda não entrou só vê navegação pública, nunca o painel lateral.
  if (checking) return <div className="pm-session-loading">Carregando PreçoMobi...</div>;
  if (!user) return <div className="pm-public"><header className="pm-public-header"><Link className="brand" to="/"><span className="brand-mark">▣</span><span>Preço<span>Mobi</span></span></Link><nav className="pm-public-nav" aria-label="Navegação pública"><Link to="/#como-funciona">Como funciona</Link><Link to="/#beneficios">Benefícios</Link></nav><div className="pm-public-actions"><Link className="outline-button" to="/login">Entrar</Link><Link className="primary-button" to="/cadastro">Criar conta</Link></div></header>{sessionExpired && <div className="notice">Sua sessão expirou. Entre novamente.</div>}<main className="pm-public-main" id="main-content"><Outlet /></main><footer className="pm-public-footer">© PreçoMobi · Compare suas compras com clareza. Dados de teste são identificados no aplicativo.</footer></div>;
  return <div className="app-shell pm-shell pm-private"><header className="topbar pm-topbar"><button className="menu-toggle pm-menu-button" type="button" aria-controls="pm-sidebar" aria-expanded={open} aria-label="Abrir ou fechar menu" onClick={() => setOpen(!open)}>☰</button><Link className="brand" to="/painel" onClick={close}><span className="brand-mark">▣</span><span>Preço<span>Mobi</span></span></Link><div className="pm-top-spacer"/><Link className="pm-header-list" to="/lista" onClick={close}>Minha lista <span>{items.length}</span></Link><Link className="pm-user-pill" to="/perfil">{user.name.split(" ")[0].slice(0,1).toUpperCase()}</Link></header><div className="pm-body">{open && <button className="pm-scrim" type="button" aria-label="Fechar menu" onClick={close}/>}<aside id="pm-sidebar" className={`pm-sidebar ${open ? "is-open" : ""}`} aria-label="Menu do usuário"><p className="sidebar-caption">MENU PRINCIPAL</p><nav className="pm-nav">{links.map(item=><NavLink key={item.to} to={item.to} onClick={close} className={({isActive})=>`side-link${isActive?" active":""}`}><span className="side-icon" aria-hidden="true">{item.icon}</span>{item.label}</NavLink>)}</nav><details className="pm-more-menu"><summary>Mais opções</summary><nav className="pm-nav"><NavLink to="/mercados" onClick={close} className="side-link">Mercados</NavLink><NavLink to="/contribuir" onClick={close} className="side-link">Informar preço</NavLink><NavLink to="/minhas-contribuicoes" onClick={close} className="side-link">Minhas contribuições</NavLink><NavLink to="/perfil" onClick={close} className="side-link">Perfil e configurações</NavLink></nav></details><div className="sidebar-account"><span className="pm-account-name">{user.name}</span><button type="button" className="side-link side-action" onClick={()=>{logout();close();navigate("/")}}>Sair da conta ↗</button></div></aside><div className="pm-content"><main className="page" id="main-content">{demo && <div className="demo-banner" role="status"><strong>Demonstração acadêmica</strong><span>Preços simulados · Região cadastrada: Laranjeiras, Serra/ES. Localizações da base de apresentação, sem verificação nesta versão.</span></div>}<Outlet /></main><footer className="site-footer">PreçoMobi · Os dados de desenvolvimento não representam preços reais.</footer></div></div></div>;
}
