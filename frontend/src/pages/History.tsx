import {useCallback,useEffect,useRef,useState,type FormEvent} from "react";
import {Link,useSearchParams} from "react-router-dom";
import {CommunityPriceCard} from "../components/CommunityPriceCard";
import {CommunityNav} from "../components/CommunityNav";
import {Empty,ErrorBox,Loading} from "../components/StateViews";
import {useRegion} from "../region/RegionContext";
import {cityMarkets} from "../lib/marketScope";
import {getMarkets,getPriceHistory,type Market,type PriceReport} from "../services/api";
import "../styles/community.css";
const PAGE_SIZE=20;

export function History(){
  const {city}=useRegion();
  const [params,setParams]=useSearchParams();
  const query=params.get("q")||"";
  const market=params.get("mercado")||"";
  const product=params.get("produto")||"";
  const [search,setSearch]=useState(query);
  const [markets,setMarkets]=useState<Market[]>([]);
  const [reports,setReports]=useState<PriceReport[]>([]);
  const [loading,setLoading]=useState(true);
  const [moreLoading,setMoreLoading]=useState(false);
  const [hasMore,setHasMore]=useState(false);
  const [error,setError]=useState("");
  const sequence=useRef(0);
  const previousCity=useRef(city);
  const pageOffset=useRef(0);
  useEffect(()=>setSearch(query),[query]);
  useEffect(()=>{
    if(previousCity.current===city)return;
    previousCity.current=city;
    const next=new URLSearchParams(params);next.delete("mercado");setParams(next,{replace:true});
  },[city,params,setParams]);
  const load=useCallback(async()=>{
    const request=++sequence.current;
    setReports([]);setHasMore(false);setMoreLoading(false);setError("");pageOffset.current=0;
    if(!city){setLoading(false);return;}
    setLoading(true);
    try{
      const stores=await getMarkets();
      if(request!==sequence.current)return;
      setMarkets(stores);
      if(market&&!cityMarkets(stores,city).some(m=>String(m.id)===market)){setReports([]);return;}
      const data=await getPriceHistory({city,q:query,market_id:market?Number(market):undefined,product_id:product?Number(product):undefined,community_only:true,latest:true,limit:PAGE_SIZE+1});
      if(request===sequence.current){setReports(data.slice(0,PAGE_SIZE));setHasMore(data.length>PAGE_SIZE);pageOffset.current=PAGE_SIZE;}
    }catch(err){if(request===sequence.current)setError(err instanceof Error?err.message:"Não foi possível carregar os preços.");}
    finally{if(request===sequence.current)setLoading(false);}
  },[city,market,product,query]);
  useEffect(()=>{void load();return()=>{sequence.current+=1;};},[load]);
  async function loadMore(){
    if(moreLoading)return;
    const request=sequence.current;setMoreLoading(true);setError("");
    try{
      const data=await getPriceHistory({city,q:query,market_id:market?Number(market):undefined,product_id:product?Number(product):undefined,community_only:true,latest:true,limit:PAGE_SIZE+1,offset:pageOffset.current});
      if(request===sequence.current){setReports(rows=>[...new Map([...rows,...data.slice(0,PAGE_SIZE)].map(r=>[r.id,r])).values()]);pageOffset.current+=PAGE_SIZE;setHasMore(data.length>PAGE_SIZE);}
    }catch(err){if(request===sequence.current)setError(err instanceof Error?err.message:"Não foi possível carregar mais preços.");}
    finally{if(request===sequence.current)setMoreLoading(false);}
  }
  function submit(event:FormEvent){event.preventDefault();const next=new URLSearchParams(params);next.delete("produto");if(search.trim())next.set("q",search.trim());else next.delete("q");setParams(next);}
  return <section className="community-page">
    <div className="experience-heading"><div><h1>Comunidade</h1><p>Veja preços que outras pessoas encontraram e compartilhe os seus.</p></div><Link className="primary-button" to="/contribuir">Informar preço</Link></div>
    <CommunityNav/>
    <form className="community-filters" onSubmit={submit} role="search" aria-label="Buscar preços da comunidade">
      <label className="field"><span>Qual produto?</span><input type="search" maxLength={100} value={search} placeholder="Ex.: arroz, leite, sabão" onChange={e=>setSearch(e.target.value)}/></label>
      <button className="primary-button" type="submit">Buscar</button>
      <label className="field community-store"><span>Mercado / loja</span><select value={market} disabled={loading} onChange={e=>{const next=new URLSearchParams(params);if(e.target.value)next.set("mercado",e.target.value);else next.delete("mercado");setParams(next);}}><option value="">Todas as lojas da cidade</option>{cityMarkets(markets,city).map(m=><option key={m.id} value={m.id}>{m.name}{city==="*"?` · ${m.city}`:""}</option>)}</select></label>
    </form>
    {(query||market||product)&&<button className="text-button" onClick={()=>setParams({})}>Limpar filtros</button>}
    <p className="form-hint">O preço mais recente informado por pessoas para cada produto e loja aparece primeiro. Confira a data: o valor pode ter mudado. Folhetos ficam em <Link to="/ofertas">Promoções</Link>.</p>
    {!city&&<Empty title="Escolha sua cidade">Selecione a cidade acima para consultar os preços próximos de você.</Empty>}
    {loading&&<Loading text="Buscando preços da comunidade..."/>}
    {error&&<ErrorBox message={error} onRetry={()=>void(hasMore&&reports.length?loadMore():load())}/>}
    {city&&!loading&&!error&&!reports.length&&<Empty title="Ainda não há preços compartilhados para esta seleção"><p>Encontrou um preço no mercado? Sua contribuição ajuda quem compra por perto.</p><Link className="outline-button" to={`/contribuir?${new URLSearchParams(market?{mercado:market}:{})}`}>Informar o primeiro preço</Link></Empty>}
    {!loading&&<div className="community-feed">{reports.map(report=><CommunityPriceCard key={report.id} report={report} onConfirmed={updated=>setReports(rows=>rows.map(r=>r.id===report.id?{...r,...updated}:r))}/>)}</div>}
    {hasMore&&<button className="outline-button community-load-more" disabled={moreLoading} onClick={()=>void loadMore()}>{moreLoading?"Carregando...":"Ver mais preços"}</button>}
  </section>;
}
