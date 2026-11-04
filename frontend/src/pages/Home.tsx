import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { GroceryScene } from "../components/GroceryScene";
import { Icon } from "../components/Icon";

export function Home() {
  const {user}=useAuth();
  const start=user ? "/lista" : "/cadastro";
  return <div className="grocery-home">
    <section className="grocery-hero">
      <div className="grocery-hero-copy"><span className="grocery-kicker"><Icon name="basket" size={18}/>DA LISTA À SACOLA</span><h1>Sua compra da semana começa com uma <em>boa lista.</em></h1><p>Escolha os produtos, compare os preços dos mercados da sua cidade e veja onde vale a pena comprar.</p><div className="grocery-hero-actions"><Link className="primary-button" to={start}><Icon name="list"/>Montar minha lista<Icon name="arrow" size={18}/></Link><a className="grocery-how-link" href="#como-funciona">Veja como funciona</a></div><div className="grocery-reassurance"><Icon name="check" size={18}/><span>Gratuito. Simples. Feito para a sua próxima compra.</span></div></div>
      <div className="grocery-hero-art"><span className="grocery-art-note">O básico do dia a dia.<br/><strong>Uma escolha mais consciente.</strong></span><GroceryScene/><div className="grocery-community-note"><span><Icon name="people"/></span><div><strong>Um preço compartilhado ajuda.</strong><p>A comunidade informa. Você compara.</p></div></div></div>
    </section>
    <section id="como-funciona" className="grocery-how"><div className="grocery-section-heading"><div><span className="grocery-kicker">COMPRA ORGANIZADA, DO COMEÇO AO FIM</span><h2>Três passos. Uma compra mais tranquila.</h2></div><p>Menos telas para decidir.<br/>Mais clareza para escolher.</p></div><div className="grocery-step-grid">{[
      {icon:"list",title:"Anote o que precisa",text:"Busque pelo nome ou leia o código de barras. Ajuste as quantidades na sua lista."},
      {icon:"store",title:"Compare na sua cidade",text:"Confira os totais e saiba quais produtos ainda estão sem preço informado."},
      {icon:"pin",title:"Escolha onde comprar",text:"Veja as condições e abra a rota do mercado escolhido no Google Maps."},
    ].map((step,i)=><article key={step.title}><div className={`grocery-step-symbol tone-${i}`}><Icon name={step.icon as "list"|"store"|"pin"} size={29}/></div><small>PASSO {i+1}</small><h3>{step.title}</h3><p>{step.text}</p></article>)}</div></section>
    <section id="beneficios" className="grocery-community"><div className="grocery-community-picture" aria-hidden="true"><Icon name="basket" size={70}/><span>Na sua lista.<br/><b>No seu caminho.</b></span><i><Icon name="tag" size={32}/></i></div><div><span className="grocery-kicker">BOM PARA VOCÊ. BOM PARA QUEM COMPRA PERTO.</span><h2>Achou um preço?<br/>Compartilhe essa descoberta.</h2><p>Informe o mercado, o valor e se é uma promoção. Outras pessoas podem confirmar o preço ou avisar quando a oferta acabar.</p><p className="grocery-small-note">Suas listas são privadas. Os preços que você compartilha ajudam a comunidade.</p><Link className="outline-button" to={user ? "/contribuir" : "/cadastro"}>Quero participar<Icon name="arrow" size={18}/></Link></div></section>
    <section className="grocery-final"><Icon name="basket" size={36}/><div><h2>Vamos organizar sua próxima compra?</h2><p>Tudo começa com o que você precisa levar para casa.</p></div><Link className="primary-button" to={start}>Começar minha lista<Icon name="arrow" size={18}/></Link></section>
  </div>;
}
