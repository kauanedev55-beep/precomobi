import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getOffers, type Offer } from "../services/api";
import { useOffers } from "../offers/OffersContext";
import { OfferCard } from "../components/OfferCard";
import { Icon } from "../components/Icon";
import { Empty, ErrorBox, Loading } from "../components/StateViews";

export function Offers({alertsOnly=false}: {alertsOnly?: boolean}) {
  const [params] = useSearchParams();
  const mine = params.get("minhas")==="1";
  const alerts = useOffers();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    if(alertsOnly) {alerts.refresh(); return;}
    setLoading(true); setError("");
    try {setOffers(await getOffers({mine}));}
    catch(err) {setError(err instanceof Error ? err.message : "Não foi possível carregar as ofertas.");}
    finally {setLoading(false);}
  }, [mine, alertsOnly, alerts.refresh]);
  useEffect(() => {if(!alertsOnly) void load();}, [load, alertsOnly]);
  const rows = alertsOnly ? alerts.offers : offers;
  const busy = alertsOnly ? alerts.loading : loading;
  const failure = alertsOnly ? alerts.error : error;
  return <section className="offers-page">
    <div className="experience-heading"><div><span className="eyebrow"><Icon name={alertsOnly ? "bell" : "tag"} size={18}/>{alertsOnly ? "DO SEU INTERESSE" : "JUNTOS, A COMPRA RENDE MAIS"}</span><h1>{alertsOnly ? "Ofertas para sua lista" : mine ? "Minhas ofertas" : "Ofertas da comunidade"}</h1><p>{alertsOnly ? "Encontramos estes produtos nas suas listas salvas ou na lista em edição. Suas listas continuam privadas." : "Alguém viu, compartilhou e ajudou. Confira as condições e a validade antes de sair."}</p></div><Link className="primary-button" to="/contribuir?tipo=oferta"><Icon name="plus"/>Compartilhar oferta</Link></div>
    <div className="offer-tabs" aria-label="Escolher ofertas"><Link className={!alertsOnly&&!mine ? "selected" : ""} to="/ofertas">Todas as ofertas</Link><Link className={alertsOnly ? "selected" : ""} to="/avisos">Para minha lista</Link><Link className={mine ? "selected" : ""} to="/ofertas?minhas=1">Minhas ofertas</Link><button className="text-button" onClick={() => void load()}>Atualizar</button></div>
    {busy && <Loading text="Procurando ofertas..."/>}{failure && <ErrorBox message={failure} onRetry={() => void load()}/>}
    {!busy&&!failure&&rows.length===0 && <Empty title={alertsOnly ? "Nenhuma oferta para sua lista por enquanto" : mine ? "Você ainda não compartilhou ofertas" : "As próximas boas descobertas começam com você"}><p>{alertsOnly ? "Adicione produtos à lista. Quando alguém compartilhar uma oferta deles, ela aparecerá aqui." : "Viu uma oferta no mercado? Compartilhe o preço, as condições e a validade."}</p><Link className="outline-button" to={alertsOnly ? "/produtos" : "/contribuir?tipo=oferta"}>{alertsOnly ? "Adicionar produtos" : "Compartilhar a primeira oferta"}</Link></Empty>}
    {!failure && <div className="offers-grid">{rows.map(offer => <OfferCard key={offer.id} offer={offer} onUpdated={updated => {setOffers(current => current.map(o => o.id===updated.id ? updated : o).filter(o => mine || o.state==="active"));}}/>)}</div>}
    <p className="offer-disclaimer">Ofertas informadas pela comunidade. Avisos de alteração não substituem o preço original. Condições de clube ou quantidade não são aplicadas automaticamente ao total da lista.</p>
  </section>;
}
