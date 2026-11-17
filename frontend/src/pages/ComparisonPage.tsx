import { useCallback, useEffect, useState, useRef } from "react";
import { Link, useParams, useLocation, useNavigate } from "react-router-dom";

import {ShareListButton} from "../components/ShareListButton";
import {useAuth} from "../auth/AuthContext";
import {Icon} from "../components/Icon";
import "../styles/mobile-clarity.css";
import {cartItemsPayload} from "../lib/cartItems";
import { useCart } from "../cart/CartContext";
import { useOffers } from "../offers/OffersContext";
import { useRegion } from "../region/RegionContext";
import { PurchaseDecision } from "../components/PurchaseDecision";
import { fullAddress, googleMapsUrl } from "../lib/navigation";
import { SourceBadge } from "../components/SourceBadge";
import { Empty, ErrorBox, Loading } from "../components/StateViews";
import { quantityLabel, saleLabel } from "../lib/quantities";
import { formatDate, formatPrice } from "../lib/format";
import { compareShoppingList, previewShoppingList, getFamilyList, type Comparison } from "../services/api";

export function ComparisonPage({preview=false}: {preview?: boolean}) {
  const { id } = useParams();
  const {user}=useAuth();
  const [canShare,setCanShare]=useState(false);
  useEffect(()=>{let active=true;setCanShare(false);if(!preview&&id)void getFamilyList(Number(id)).then(v=>{if(active)setCanShare(v.is_owner);}).catch(()=>undefined);return()=>{active=false;};},[id,preview,user?.id]);
  const cart = useCart();
  const alerts = useOffers();
  const location = useLocation();
  const navigate = useNavigate();
  const draftName = typeof location.state?.name === "string" ? location.state.name : "Minha compra";
  const draftKey = (preview ? cart.items : []).map(i => `${i.product.id}:${i.quantity}`).join(",");
  const isSaving=cart.saving;
  const [saveError,setSaveError] = useState("");
  const {city} = useRegion();
  const sequence = useRef(0);
  const [loadedCity,setLoadedCity] = useState<string | null>(null);
  const [showAll,setShowAll] = useState(false);
  useEffect(() => {setShowAll(false);}, [city,id]);
  const [comparison, setComparison] = useState<Comparison | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const request = ++sequence.current;
    if (preview && !draftKey) {setComparison(null);setLoading(false);setError("");return;}
    if (!city) {setComparison(null);setLoading(false);setError("");return;}
    setLoading(true);
    setError("");
    try {
      const data = preview ? await previewShoppingList({name:draftName,items:cartItemsPayload(cart.items)},city) : await compareShoppingList(Number(id),city);
      if(request === sequence.current) {setComparison(data);setLoadedCity(city);}
    } catch (err) {
      if(request === sequence.current) setError(err instanceof Error ? err.message : "Não foi possível comparar a lista.");
    } finally {
      if(request === sequence.current) setLoading(false);
    }
  }, [id,city,preview,draftName,draftKey]);

  useEffect(() => {
    void load();
    const refresh = () => { if (document.visibilityState === "visible") void load(); };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => { window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refresh); };
  }, [load]);

  async function saveDraft() {
    setSaveError("");
    try {
      const list=await cart.save();
      alerts.refresh();navigate(`/comparacao/${list.id}`,{replace:true});
    } catch(err) {setSaveError(err instanceof Error ? err.message : "Não foi possível salvar.");}
  }

  if (preview && !draftKey) return <Empty title="Não há uma lista em edição"><Link to="/lista">Montar uma nova lista</Link></Empty>;
  if (!city) return <Empty title="Onde você quer comparar sua lista?">Escolha a cidade acima.</Empty>;
  if (!error && (!comparison || loadedCity !== city || comparison.shopping_list_id !== (preview ? null : Number(id)))) return <Loading text="Comparando os mercados..." />;
  if (error || !comparison) return <ErrorBox message={error || "Comparação indisponível."} onRetry={load} />;

  const priced = comparison.results.filter(r => r.found_items > 0);
  const displayed = showAll ? priced : priced.slice(0,3);
  const hasDemoPrices = comparison.results.some((market) => market.items.some((item) => item.source_type === "development"));
  const complete = comparison.results.filter((result) => result.complete && result.total !== null);
  let saving: { amount: number; best: string; worst: string } | null = null;
  if (complete.length >= 2) {
    const sorted = [...complete].sort((a, b) => Number(a.total) - Number(b.total));
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];
    saving = { amount: Number(worst.total) - Number(best.total), best: best.market_name, worst: worst.market_name };
  }
  const shared = comparison.results.filter(r => r.comparable_total !== null);
  const partialDecision = complete.length < 2;
  const decisionMarkets = partialDecision ? shared : complete;
  const anyMissing = comparison.results.some((result) => !result.complete);
  const bestId = complete.length ? [...complete].sort((a, b) => Number(a.total) - Number(b.total))[0].market_id : null;

  return (
    <section className="comparison-page">
      <p className="breadcrumb"><Link to="/lista">← Lista de compras</Link></p>
      <div className="comparison-heading"><h1>Comparar preços</h1><button type="button" className="comparison-refresh outline-button" aria-label="Atualizar preços" title="Atualizar preços" disabled={loading} onClick={() => void load()}><Icon name="refresh" size={20}/></button></div>
      {(preview||canShare)&&<div className="comparison-tools"><ShareListButton prepare={preview?cart.save:async()=>(await getFamilyList(Number(id))).list} disabled={isSaving} onPrepared={alerts.refresh}/><Link className="outline-button" to={preview?"/lista":`/listas/${id}`}>Revisar lista</Link></div>}
      {preview&&<details className="list-save-options"><summary>Salvar lista (opcional)</summary><button className="outline-button" type="button" onClick={()=>void saveDraft()} disabled={isSaving}>{isSaving?"Salvando…":"Salvar na minha conta"}</button>{saveError&&<p className="error-message" role="alert">{saveError}</p>}</details>}
      {priced.length===0&&<div className="notice">Ainda não há preços para estes itens. Sua lista continua disponível.</div>}
      {priced.length>0&&<p className="comparison-count">{priced.length} {priced.length===1?"mercado com preço":"mercados com preços"}</p>}
      {complete.length===1&&<p className="notice">Só uma loja tem a lista completa.</p>}
      {hasDemoPrices && (
        <div className="notice" role="status">
          <strong>Demonstração:</strong> preços de exemplo, sem validade como cotação.
        </div>
      )}

      {saving&&<div className="notice good">{saving.amount>0?<>Economize <strong>{formatPrice(saving.amount)}</strong> em {saving.best}, entre as listas completas.</>:"Os totais completos são iguais."}</div>}

      <div className="market-columns">
        {displayed.map((result) => (
          <article className={`market-card ${result.market_id === bestId ? "winner" : ""}`} key={result.market_id}>
            <header>
              <div>
                <h3>{result.market_name}</h3>
                <p className="market-address">{[result.neighborhood,result.city].filter(Boolean).join(" · ")}</p>
                {result.market_id === bestId && <span className="best-choice-label">✓ Menor total completo</span>}
                <span className={`status-pill ${result.complete ? "" : "partial"}`}>{result.found_items}/{result.total_items} itens com preço</span>
              </div>
              <div className="market-total">
                <small>{result.complete?"Total":"Subtotal · lista incompleta"}</small>
                <strong>{formatPrice(result.total??result.available_total)}</strong>
              </div>
            </header>
            <details className="market-item-details"><summary>Produtos e preços</summary><div className="table-wrap">
              <table role="table" aria-label={`Produtos e preços em ${result.market_name}`}>
                <thead role="rowgroup"><tr role="row"><th scope="col" role="columnheader">Produto</th><th scope="col" role="columnheader">Qtd.</th><th scope="col" role="columnheader">Preço por kg ou embalagem</th><th scope="col" role="columnheader">Subtotal</th><th scope="col" role="columnheader">Origem</th></tr></thead>
                <tbody role="rowgroup">
                  {result.items.map((item) => (
                    <tr role="row" key={item.product_id} className={item.unit_price === null ? "missing-row" : undefined}>
                      <td role="cell" data-label="Produto">{item.product_name}</td>
                      <td role="cell" data-label="Quantidade" className="num">{quantityLabel(item.quantity,item.sale_unit)}</td>
                      <td role="cell" data-label="Preço por kg ou embalagem" className="num">{item.unit_price !== null ? `${formatPrice(item.unit_price)} / ${saleLabel(item.sale_unit)}` : "Sem preço"}</td>
                      <td role="cell" data-label="Subtotal" className="num">{formatPrice(item.subtotal)}</td>
                      <td role="cell" data-label="Origem">{item.source_type ? <><SourceBadge sourceType={item.source_type} /><small className="block">{formatDate(item.reported_at)}{item.expires_at && <> · até {formatDate(item.expires_at)}</>}</small>{item.source_url && <small className="block"><a href={item.source_url} target="_blank" rel="noopener noreferrer">Ver folheto</a></small>}</> : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div><p className="form-hint">{fullAddress({...result,name:result.market_name})}</p>{result.comparable_total!==null&&!result.complete&&<p className="form-hint">{comparison.common_items_count} itens em comum: {formatPrice(result.comparable_total)}.</p>}</details>
            <div className="comparison-route-actions"><a className="primary-button" target="_blank" rel="noreferrer" href={googleMapsUrl({...result,name:result.market_name})}>Ir ao mercado ↗</a><Link className="outline-button" to={`/mapa?mercado=${result.market_id}&rota=1`}>Ver distância</Link></div>

          </article>
        ))}
      </div>

      {decisionMarkets.length >= 2 && <details className="comparison-trip-details"><summary>Compensa ir até lá?</summary><PurchaseDecision markets={decisionMarkets} partial={partialDecision} commonCount={comparison.common_items_count} /></details>}

      {priced.length > 3 && <button className="outline-button" type="button" onClick={() => setShowAll(!showAll)}>{showAll ? "Ver os 3 primeiros" : `Ver mais ${priced.length - 3} mercados`}</button>}

      <details className="comparison-help"><summary>Como funciona a comparação</summary><p>Usamos preços vigentes por loja. Subtotal inclui apenas os itens com preço. A economia compara listas completas ou os mesmos produtos.</p>{anyMissing&&<Link to="/contribuir">Informar um preço</Link>}</details>

    </section>
  );
}
