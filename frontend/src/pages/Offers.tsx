import { useCallback, useEffect, useState, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getOffers, type Offer } from "../services/api";
import { useOffers } from "../offers/OffersContext";
import { OfferCard } from "../components/OfferCard";
import { useRegion, inCity } from "../region/RegionContext";
import { Icon } from "../components/Icon";
import { Empty, ErrorBox, Loading } from "../components/StateViews";

export function Offers({alertsOnly=false}: {alertsOnly?: boolean}) {
  const [params] = useSearchParams();
  const mine = params.get("minhas")==="1";
  const alerts = useOffers();
  const {city} = useRegion();
  const sequence = useRef(0);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    const request = ++sequence.current;
    if(!city && !mine) {setOffers([]);setLoading(false);setError("");return;}
    if(alertsOnly) {alerts.refresh(); return;}
    setLoading(true); setError("");
    try {const data = await getOffers({mine,city: mine ? undefined : city}); if(request===sequence.current) setOffers(data);}
    catch(err) {if(request===sequence.current) setError(err instanceof Error ? err.message : "Não foi possível carregar as ofertas.");}
    finally {if(request===sequence.current) setLoading(false);}
  }, [mine, alertsOnly, alerts.refresh, city]);
  useEffect(() => {if(!alertsOnly) void load();}, [load, alertsOnly]);
  const rows = alertsOnly ? alerts.offers : offers.filter(o => mine || inCity(o.market,city));
  const busy = alertsOnly ? alerts.loading : loading;
  const failure = alertsOnly ? alerts.error : error;
  return <section className="offers-page">
    <div className="experience-heading"><div><span className="eyebrow"><Icon name={alertsOnly ? "bell" : "tag"} size={18}/>{alertsOnly ? "DO SEU INTERESSE" : "JUNTOS, A COMPRA RENDE MAIS"}</span><h1>{alertsOnly ? "Promoções para sua lista" : mine ? "Minhas promoções" : "Promoções da comunidade"}</h1><p>{alertsOnly ? "Encontramos estes produtos nas suas listas salvas ou na lista em edição. Suas listas continuam privadas." : "Promoções compartilhadas por usuários. Cada uma tem validade e condições; outras pessoas podem confirmar ou avisar que acabou."}</p></div><Link className="primary-button" to="/contribuir?tipo=oferta"><Icon name="plus"/>Compartilhar promoção</Link></div>
    <div className="offer-tabs" aria-label="Escolher ofertas"><Link className={!alertsOnly&&!mine ? "selected" : ""} to="/ofertas">Todas as promoções</Link><Link className={alertsOnly ? "selected" : ""} to="/avisos">Para minha lista</Link><Link className={mine ? "selected" : ""} to="/ofertas?minhas=1">Minhas promoções</Link><button className="text-button" onClick={() => void load()}>Atualizar</button></div>
    {mine && <p className="form-hint">Seu histórico de promoções inclui todas as cidades.</p>}
    {busy && <Loading text="Procurando ofertas..."/>}{failure && <ErrorBox message={failure} onRetry={() => void load()}/>}
    {!busy&&!failure&&(Boolean(city)||mine)&&rows.length===0 && <Empty title={alertsOnly ? "Nenhuma promoção para sua lista por enquanto" : mine ? "Você ainda não compartilhou promoções" : "As próximas boas descobertas começam com você"}><p>{alertsOnly ? "Adicione produtos à lista. Quando alguém compartilhar uma promoção deles, ela aparecerá aqui." : "Viu uma promoção no mercado? Compartilhe o preço, as condições e a validade."}</p><Link className="outline-button" to={alertsOnly ? "/produtos" : "/contribuir?tipo=oferta"}>{alertsOnly ? "Adicionar produtos" : "Compartilhar a primeira promoção"}</Link></Empty>}
    {!failure && !busy && <div className="offers-grid">{rows.map(offer => <OfferCard key={offer.id} offer={offer} onUpdated={updated => {setOffers(current => current.map(o => o.id===updated.id ? updated : o).filter(o => mine || o.state==="active"));}}/>)}</div>}
    <p className="offer-disclaimer">Promoções informadas por usuários. Avisos de alteração não substituem o preço original. Condições de clube ou quantidade não são aplicadas automaticamente ao total da lista.</p>
  </section>;
}
