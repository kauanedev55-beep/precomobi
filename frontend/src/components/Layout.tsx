import { useEffect, useState, useRef } from "react";
import { Link, NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useCart } from "../cart/CartContext";
import { useOffers } from "../offers/OffersContext";
import { getFeatures } from "../services/api";
import { CitySelector } from "./CitySelector";
import {DraftRecovery} from "./DraftRecovery";
import { BasketDrawer } from "./BasketDrawer";
import { Icon } from "./Icon";
import { InstallLink } from "./InstallLink";
import { usePwa } from "../pwa/PwaContext";

const links = [
  { to: "/lista", label: "Minha lista", icon: "list" },
  { to: "/produtos", label: "Produtos", icon: "search" },
  { to: "/ofertas", label: "Promoções", icon: "tag" },
  { to: "/comunidade", label: "Comunidade", icon: "people" },
] as const;
const bottom = links;

export function Layout() {
  const { user, logout, checking, sessionExpired } = useAuth();
  const { installed, message: installMessage } = usePwa();
  const { items } = useCart();
  const { offers } = useOffers();
  const [demo, setDemo] = useState(false);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const headerRef=useRef<HTMLElement>(null);
  const bottomRef=useRef<HTMLElement>(null);
  const [keyboardOpen,setKeyboardOpen]=useState(false);
  useEffect(()=>{
    if(!user || checking)return;
    const root=document.documentElement;
    let active=true;
    const measure=()=>{
      if(!active)return;
      root.style.setProperty("--pm-header-height",`${headerRef.current?.getBoundingClientRect().height || 68}px`);
      root.style.setProperty("--pm-bottom-nav-height",`${bottomRef.current?.getBoundingClientRect().height || 0}px`);
      const viewport=window.visualViewport;
      root.style.setProperty("--pm-visual-height",`${viewport?.height || window.innerHeight}px`);
      const element=document.activeElement;
      const editing=element instanceof HTMLTextAreaElement || (element instanceof HTMLInputElement && !["checkbox","radio","button","submit"].includes(element.type));
      setKeyboardOpen(Boolean(editing && viewport && viewport.scale<1.1 && window.innerHeight-viewport.height>120));
    };
    const observer=typeof ResizeObserver!=="undefined" ? new ResizeObserver(measure) : null;
    if(headerRef.current)observer?.observe(headerRef.current);
    if(bottomRef.current)observer?.observe(bottomRef.current);
    measure();
    window.addEventListener("resize",measure);
    window.visualViewport?.addEventListener("resize",measure);
    document.addEventListener("focusin",measure);document.addEventListener("focusout",measure);
    void document.fonts?.ready.then(measure);
    return()=>{active=false;observer?.disconnect();window.removeEventListener("resize",measure);window.visualViewport?.removeEventListener("resize",measure);document.removeEventListener("focusin",measure);document.removeEventListener("focusout",measure);};
  },[user?.id,checking]);
  const shopping = pathname === "/produtos" || /^\/produtos\/\d+$/.test(pathname);
  const selected = (to: string) => to === "/lista" ? pathname === "/lista" || pathname.startsWith("/listas/") || pathname.startsWith("/comparacao/")
    : to === "/ofertas" ? pathname === "/ofertas" || pathname === "/avisos"
    : to === "/comunidade" ? ["/comunidade", "/contribuir", "/minhas-contribuicoes"].includes(pathname)
    : pathname === "/produtos" || pathname.startsWith("/produtos/");
  const close = () => setOpen(false);
  useEffect(() => {setOpen(false);}, [pathname]);
  useEffect(() => {getFeatures().then(f => setDemo(f.demo_mode)).catch(() => undefined);}, []);
  useEffect(() => {
    if (!open) return;
    const escape = (e: KeyboardEvent) => {if(e.key==="Escape") setOpen(false);};
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [open]);
  if(checking) return <div className="pm-session-loading" role="status">Preparando seu PreçoMobi...</div>;
  const brand = <><span className="brand-mark"><Icon name="basket"/></span><span>Preço<span>Mobi</span></span></>;
  if(!user) return <div className="pm-public">
    <a className="skip-link" href="#main-content">Pular para o conteúdo</a>
    <header className="pm-public-header"><Link className="brand" to="/">{brand}</Link><nav className="pm-public-nav" aria-label="Navegação pública"><Link to="/#como-funciona">Como funciona</Link><Link to="/#beneficios">Benefícios</Link>{!installed && <InstallLink to="/instalar">Instalar PreçoMobi</InstallLink>}</nav><div className="pm-public-actions">{!installed && <InstallLink className="outline-button mobile-install-action" to="/instalar">Instalar</InstallLink>}<Link className="outline-button" to="/login">Entrar</Link><Link className="primary-button" to="/cadastro">Criar conta</Link></div></header>
    {installMessage && pathname !== "/instalar" && <div className="notice" role="status">{installMessage} <Link to="/instalar">Ver instalação</Link></div>}
    {sessionExpired && <div className="notice" role="status">Sua sessão expirou. Entre novamente.</div>}
    <main className="pm-public-main" id="main-content" tabIndex={-1}><Outlet/></main>
    <footer className="pm-public-footer">PreçoMobi · Sua lista, boas descobertas e escolhas mais conscientes.{!installed && <InstallLink className="install-link" to="/instalar">Instalar PreçoMobi no celular</InstallLink>}</footer>
  </div>;
  return <div className={`app-shell pm-shell pm-private experience-shell${keyboardOpen ? " keyboard-open" : ""}${shopping && items.length ? " has-basket-peek" : ""}`}>
    <a className="skip-link" href="#main-content">Pular para o conteúdo</a>
    <header ref={headerRef} className="topbar pm-topbar">
      <button className="menu-toggle pm-menu-button" type="button" aria-controls="pm-sidebar" aria-expanded={open} aria-label="Abrir ou fechar menu" onClick={() => setOpen(!open)}>☰</button>
      <Link className="brand" to="/" onClick={close}>{brand}</Link><div className="pm-top-spacer"/>
      <Link className="header-alerts" to="/avisos" onClick={close} aria-label={`Avisos: ${offers.length} ofertas do seu interesse`}><Icon name="bell"/><span>Avisos</span>{offers.length>0 && <b>{offers.length}</b>}</Link>
      <Link className="pm-header-list" to="/lista" onClick={close}>Minha lista <span>{items.length}</span></Link>
      <Link className="pm-user-pill" to="/perfil" aria-label="Meu perfil" onClick={close}>{user.name.slice(0,1).toUpperCase()}</Link>
    </header>
    {installMessage && pathname !== "/instalar" && <div className="notice" role="status">{installMessage} <Link to="/instalar">Ver instalação</Link></div>}
    <div className="pm-body">
      {open && <button className="pm-scrim" type="button" aria-label="Fechar menu" onClick={close}/>}
      <aside id="pm-sidebar" className={`pm-sidebar ${open ? "is-open" : ""}`} aria-label="Menu do usuário">
        <p className="sidebar-caption">SEU DIA A DIA</p>
        <nav className="pm-nav">{links.map(item => <Link key={item.to} to={item.to} onClick={close} aria-current={selected(item.to) ? "page" : undefined} className={`side-link${selected(item.to) ? " active" : ""}`}><Icon name={item.icon}/>{item.label}</Link>)}</nav>
        {!installed && <InstallLink className="side-link sidebar-install-action" to="/instalar" onClick={close}>Instalar PreçoMobi</InstallLink>}
        <details className="pm-more-menu"><summary>Mais opções</summary><nav className="pm-nav"><NavLink className="side-link" to="/mercados" onClick={close}>Mercados</NavLink><NavLink className="side-link" to="/perfil" onClick={close}>Meu perfil{user.is_admin ? " · master" : ""}</NavLink></nav></details>
        <div className="sidebar-account"><span className="pm-account-name">{user.name}</span><button className="side-link side-action" onClick={() => {logout();close();navigate("/");}}>Sair da conta ↗</button></div>
      </aside>
      <div className="pm-content">{!["/perfil", "/produtos/novo", "/minhas-contribuicoes"].includes(pathname) && <CitySelector/>}<main className="page" id="main-content" tabIndex={-1}>{demo && <div className="demo-banner" role="status"><strong>Demonstração acadêmica</strong><span>Preços simulados, identificados como demonstração.</span></div>}<Outlet/></main><footer className="site-footer">Feito para ajudar na sua próxima compra. Confira os preços e as condições na loja.{!installed && <InstallLink className="install-link" to="/instalar">Instalar PreçoMobi no celular</InstallLink>}</footer></div>
    </div>
    <DraftRecovery/>
    {shopping && <BasketDrawer/>}
    <nav ref={bottomRef} className="mobile-bottom-nav" aria-label="Navegação rápida">{bottom.map(item => <Link key={item.to} to={item.to} onClick={close} aria-current={selected(item.to) ? "page" : undefined} className={selected(item.to) ? "active" : ""}><Icon name={item.icon}/><span>{item.label}</span></Link>)}</nav>
  </div>;
}
