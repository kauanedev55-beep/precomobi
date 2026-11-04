import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useCart } from "../cart/CartContext";
import { useOffers } from "../offers/OffersContext";
import { Icon } from "../components/Icon";
import { ShoppingPhoto } from "../components/ShoppingPhoto";
import { OfferCard } from "../components/OfferCard";

export function Dashboard() {
  const { user } = useAuth();
  const { items } = useCart();
  const alerts = useOffers();
  return <section className="new-dashboard">
    <div className="welcome-heading"><div><span className="eyebrow">BOM TER VOCÊ POR AQUI</span><h1>Olá, {user?.name.split(" ")[0]}<span className="welcome-dot">.</span></h1><p>Monte sua lista e descubra onde comprar pelos preços disponíveis.</p></div><Link className="outline-button" to="/mercados"><Icon name="pin"/>Ver mercados</Link></div>
    <div className="dashboard-lead">
      <div className="shopping-hero"><span className="hero-pill"><Icon name="list" size={18}/>UM PASSO DE CADA VEZ</span><h2>Da sua lista<br/>à sacola de compras.</h2><p>{items.length ? `Você já tem ${items.length} ${items.length===1 ? "produto" : "produtos"} na lista. Continue de onde parou e compare os mercados.` : "Escolha o que precisa, compare os preços informados e veja qual mercado faz sentido para você."}</p><Link className="primary-button" to="/lista">{items.length ? "Continuar minha lista" : "Montar minha lista"}<Icon name="arrow"/></Link><Link className="hero-secondary" to="/lista#listas-salvas">Ver minhas listas salvas →</Link><div className="dashboard-grocery-art"><ShoppingPhoto/></div></div>
      <Link className="discovery-card" to="/avisos"><span className="discovery-icon"><Icon name="bell" size={30}/></span><span className="eyebrow">DO SEU INTERESSE</span><h2>{alerts.offers.length ? `${alerts.offers.length} ${alerts.offers.length===1 ? "promoção para suas listas" : "promoções para suas listas"}` : "Uma boa descoberta pode estar a caminho."}</h2><p>{alerts.offers.length ? "Veja as condições e a validade das promoções dos produtos que você acompanha." : "Quando a comunidade compartilhar promoções dos seus produtos, você encontra os avisos aqui."}</p><span className="discovery-cta">Ver meus avisos <Icon name="arrow" size={20}/></span></Link>
    </div>
    <div className="dashboard-quick"><Link to="/produtos"><Icon name="search"/><span>Encontrar um produto</span><Icon name="arrow" size={18}/></Link><Link to="/contribuir?tipo=oferta"><Icon name="tag"/><span>Compartilhar uma promoção</span><Icon name="arrow" size={18}/></Link></div>
    <div className="section-heading"><div><span className="eyebrow">CADA PESSOA AJUDA UM POUCO</span><h2>Boas descobertas para sua lista</h2></div><Link className="text-button" to="/ofertas">Ver todas as promoções →</Link></div>
    {alerts.error ? <div className="notice" role="status">Não foi possível atualizar as ofertas agora. <button className="text-button" onClick={alerts.refresh}>Tentar novamente</button></div> : alerts.offers.length ? <div className="offers-grid">{alerts.offers.slice(0,2).map(o => <OfferCard key={o.id} offer={o}/>)}</div> : <div className="community-invite"><span className="invite-icon"><Icon name="people" size={34}/></span><div><h3>Viu um preço que vale compartilhar?</h3><p>Seu registro pode ajudar outra pessoa. Informe o que você encontrou, sem compartilhar sua lista de compras.</p></div><Link className="outline-button" to="/contribuir">Informar um preço</Link></div>}
  </section>;
}
