import { useCallback, useEffect, useState, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getMarkets, getOffers, type Offer, type Market } from "../services/api";
import { useOffers } from "../offers/OffersContext";
import { AlertSettings } from "../components/AlertSettings";
import { OfferCard } from "../components/OfferCard";
import { useRegion } from "../region/RegionContext";
import { Icon } from "../components/Icon";
import {cityMarkets,marketNetwork,networkChoices,selectedMarketIds,offersForMarkets,marketWebsite} from "../lib/marketScope";
import "../styles/offer-filters.css";
import { Empty, ErrorBox, Loading } from "../components/StateViews";

export function Offers({alertsOnly=false}: {alertsOnly?: boolean}) {
  const [params,setParams] = useSearchParams();
  const mine = params.get("minhas")==="1";
  const alerts = useOffers();
  const {city} = useRegion();
  const sequence = useRef(0);
  const chain=params.get("rede") || "";
  const store=params.get("loja") || "";
  const previousCity=useRef(city);
  const [markets,setMarkets]=useState<Market[]>([]);
  useEffect(()=>{
    if(previousCity.current===city)return;
    previousCity.current=city;
    const next=new URLSearchParams(params);next.delete("rede");next.delete("loja");
    setParams(next,{replace:true});
  },[city,params,setParams]);
  function chooseMarket(network:string,unit:string){
    const next=new URLSearchParams(params);
    if(network)next.set("rede",network);else next.delete("rede");
    if(unit)next.set("loja",unit);else next.delete("loja");
    setParams(next);
  }
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    const request = ++sequence.current;
    if(alertsOnly) {alerts.refresh(); return;}
    if(!city && !mine) {setOffers([]);setLoading(false);setError("");return;}
    setLoading(true); setError("");setOffers([]);
    try {
      if(mine){const data=await getOffers({mine:true});if(request===sequence.current)setOffers(data);return;}
      const registered=cityMarkets(await getMarkets(false,true),city);
      if(request!==sequence.current)return;
      setMarkets(registered);
      const ids=selectedMarketIds(registered,chain,store);
      if(!ids.length){setOffers([]);return;}
      const data=await getOffers({city,marketIds:chain||store ? ids : undefined});
      if(request===sequence.current)setOffers(offersForMarkets(data,ids));
    }
    catch(err) {if(request===sequence.current) setError(err instanceof Error ? err.message : "Não foi possível carregar as ofertas.");}
    finally {if(request===sequence.current) setLoading(false);}
  }, [mine, alertsOnly, alerts.refresh, city,chain,store]);
  useEffect(() => {if(!alertsOnly) void load();return()=>{sequence.current+=1;};}, [load, alertsOnly]);
  const registered=cityMarkets(markets,city);
  const chains=networkChoices(registered);
  const stores=registered.filter(m=>!chain||marketNetwork(m.name)===chain);
  const rows=alertsOnly ? alerts.offers : offers;
  const selectedChain=chain || marketNetwork(registered.find(m=>String(m.id)===store)?.name || "");
  const officialWebsite=marketWebsite(selectedChain);
  const chosenName=registered.find(m=>String(m.id)===store)?.name || chain || city;
  const busy = alertsOnly ? alerts.loading : loading;
  const failure = alertsOnly ? alerts.error : error;
  return <section className="offers-page">
    <div className="experience-heading"><h1>{alertsOnly ? "Meus avisos" : mine ? "Minhas promoções" : "Promoções"}</h1>{!alertsOnly&&<Link className="outline-button" to="/contribuir?tipo=oferta" aria-label="Compartilhar uma promoção"><Icon name="plus" size={18}/>Contribuir</Link>}</div>
    {alertsOnly && <AlertSettings/>}
    <nav className="offer-tabs" aria-label={alertsOnly ? "Ações dos avisos" : "Consultar promoções"}>
      {alertsOnly ? <Link to="/ofertas">Ver promoções da cidade</Link> : <><Link className={!mine ? "selected" : ""} aria-current={!mine ? "page" : undefined} to="/ofertas">Da cidade</Link><Link className={mine ? "selected" : ""} aria-current={mine ? "page" : undefined} to="/ofertas?minhas=1">Minhas</Link></>}
      <button className="offers-refresh" type="button" aria-label="Atualizar promoções" title="Atualizar promoções" disabled={busy} onClick={() => void load()}><Icon name="refresh" size={20}/></button>
    </nav>
    {!mine && !alertsOnly && city && <div className="offers-market-filter">
      <div className="offers-market-fields"><label className="field"><span>Mercado</span><select value={chain} disabled={busy} onChange={event=>chooseMarket(event.target.value,"")}><option value="">Todos os mercados</option>{chains.map(name=><option key={name} value={name}>{name}</option>)}</select></label>
      <label className="field"><span>Loja</span><select value={store} disabled={busy} onChange={event=>chooseMarket(chain,event.target.value)}><option value="">Todas as lojas</option>{stores.map(m=><option key={m.id} value={m.id}>{m.name}{city==="*" ? ` · ${m.city}` : ""}</option>)}</select></label></div>
      {!busy&&!failure&&rows.length>0&&<p role="status">{rows.length} {rows.length===1 ? "oferta" : "ofertas"}</p>}
    </div>}

    {!city&&!mine&&!alertsOnly&&<Empty title="Em qual cidade você quer ver promoções?">Escolha a cidade acima para consultar os mercados cadastrados.</Empty>}
    {busy && <Loading text="Procurando ofertas..."/>}{failure && <ErrorBox message={failure} onRetry={() => void load()}/>}
    {!busy&&!failure&&(Boolean(city)||mine||alertsOnly)&&rows.length===0 && <Empty title={alertsOnly ? "Nenhum aviso de oferta por enquanto" : mine ? "Você ainda não compartilhou promoções" : `Nenhuma promoção válida em ${chosenName}`}><p>{alertsOnly ? "Escolha produtos ou mercados nos ajustes acima." : "Escolha outro mercado ou contribua com uma promoção."}</p>{!alertsOnly&&!mine&&officialWebsite&&<a className="outline-button" href={officialWebsite} target="_blank" rel="noopener noreferrer">Consultar site do mercado ↗</a>}{alertsOnly && <Link className="outline-button" to="/produtos">Adicionar produtos</Link>}</Empty>}
    {!failure && !busy && <div className="offers-grid">{rows.map(offer => <OfferCard key={offer.id} offer={offer} onUpdated={updated => {if(alertsOnly) {alerts.refresh();return;} setOffers(current => current.flatMap(group => {
      const members=[group,...(group.related_offers || [])].map(o=>o.id===updated.id ? updated : o).filter(o=>mine || o.state==="active");
      return members.length ? [{...members[0],related_offers:members.slice(1).map(({related_offers:_,...o})=>o)}] : [];
    }));}}/>)}</div>}
    <details className="offers-help"><summary>Sobre as ofertas</summary><p>Ofertas válidas para as lojas indicadas. Descontos de clube ou quantidade não entram automaticamente na comparação.</p></details>
  </section>;
}
