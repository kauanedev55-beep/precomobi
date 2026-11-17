import { useCallback, useEffect, useState, useRef } from "react";
import { Link, useParams, useLocation, useNavigate } from "react-router-dom";

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
import { compareShoppingList, previewShoppingList, type Comparison } from "../services/api";

export function ComparisonPage({preview=false}: {preview?: boolean}) {
  const { id } = useParams();
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

  if (preview && !draftKey) return <Empty title="Não há uma lista em edição"><Link to="/lista">Montar uma nova lista</Link>. Comparações sem salvar não ficam guardadas depois de recarregar o aplicativo.</Empty>;
  if (!city) return <Empty title="Onde você quer comparar sua lista?">Escolha a cidade no seletor acima para comparar os mercados disponíveis.</Empty>;
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
    <section>
      <p className="breadcrumb"><Link to="/lista">← Lista de compras</Link></p>
      <div className="comparison-heading"><h1>Comparação: {comparison.list_name}</h1><button type="button" className="outline-button" disabled={loading} onClick={() => void load()}>{loading ? "Atualizando..." : "Atualizar preços"}</button></div>
      {preview && <div className="preview-actions"><p>Você está comparando sem salvar. Para usar esta lista em outra compra ou dispositivo, escolha Salvar lista.</p><div className="button-row"><button className="outline-button" type="button" onClick={() => void saveDraft()} disabled={isSaving}>{isSaving ? "Salvando..." : "Salvar lista"}</button><button className="primary-button" type="button" disabled={isSaving} onClick={() => {cart.clear();navigate("/lista",{replace:true});}}>Concluir sem salvar</button></div>{saveError && <p className="error-message" role="alert">{saveError}</p>}</div>}
      {priced.length === 0 && <div className="notice">Nenhum mercado tem preço registrado e vigente para os produtos desta lista. Escolha produtos com preço ou use a lista sem comparação.</div>}
      <p className="form-hint">Comparando {priced.length} mercados com preços {city === "*" ? "nas cidades cadastradas no ES" : `em ${city}`}. Listas completas são ordenadas pelo total. Nas incompletas, mostramos primeiro os mercados com mais itens com preço.</p>
      {Boolean(comparison.excluded_markets_count)&&<p className="form-hint">Mercados sem preço para os itens escolhidos ficaram fora desta comparação. <Link to="/produtos">Ver produtos com preço</Link>.</p>}
      {complete.length === 1 && <p className="notice">Só um mercado tem a lista completa. Não há outro total completo para medir a economia.</p>}

      {hasDemoPrices && (
        <div className="notice" role="status">
          <strong>Modo demonstração:</strong> esta comparação contém preços de exemplo criados para apresentar o funcionamento do PreçoMobi.
          Não são cotações atuais dos supermercados.
        </div>
      )}

      {saving && (
        <div className="notice good">
          Entre os mercados com a lista completa, <strong>{saving.best}</strong> tem o menor total {hasDemoPrices ? "nesta simulação" : "registrado"}:{" "}
          {saving.amount > 0 ? <>economia de <strong>{formatPrice(saving.amount)}</strong> em relação a {saving.worst}.</> : <>o mesmo total dos demais.</>}
        </div>
      )}
      {complete.length === 0 && <div className="notice">Nenhum mercado tem preço para todos os itens da lista, então não há total completo para comparar. Veja abaixo o que falta.</div>}

      <div className="market-columns">
        {displayed.map((result) => (
          <article className={`market-card ${result.market_id === bestId ? "winner" : ""}`} key={result.market_id}>
            <header>
              <div>
                <h3>{result.market_name}</h3>
                <p className="market-address">{fullAddress({ ...result, name: result.market_name })}</p>
                {result.market_id === bestId && <span className="best-choice-label">✓ Menor total completo disponível</span>}
                <span className={`status-pill ${result.complete ? "" : "partial"}`}>{result.complete ? "Lista completa" : "Compra parcial"}</span>
              </div>
              <div className="market-total">
                <small>{result.found_items} de {result.total_items} itens com preço</small>
                <strong>{result.total !== null ? formatPrice(result.total) : "Total indisponível"}</strong>
              </div>
            </header>
            {!result.complete && <p>Subtotal dos {result.found_items} itens com preço conhecido: <strong>{formatPrice(result.available_total)}</strong>. Faltam os preços de {result.total_items - result.found_items} itens.</p>}
            {result.comparable_total !== null && !result.complete && <p className="form-hint">Itens em comum entre mercados: {formatPrice(result.comparable_total)} ({comparison.common_items_count} produtos).</p>}
            <details className="market-item-details"><summary>Ver produtos e preços ({result.found_items} de {result.total_items})</summary><div className="table-wrap">
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
            </div></details>
            <a className="primary-button market-route-action" target="_blank" rel="noreferrer" href={googleMapsUrl({ ...result, name: result.market_name })}>Abrir no Google Maps ↗</a>
            <Link className="outline-button market-route-action" to={`/mapa?mercado=${result.market_id}&rota=1`}>⌖ Ver distância e rota →</Link>
            {!result.complete && <p className="form-hint">Subtotal parcial não representa o custo da lista completa. A economia parcial considera apenas os mesmos produtos nos mercados comparáveis.</p>}
          </article>
        ))}
      </div>

      {decisionMarkets.length >= 2 && <details className="comparison-trip-details"><summary>Considerar deslocamento na escolha</summary><PurchaseDecision markets={decisionMarkets} partial={partialDecision} commonCount={comparison.common_items_count} /></details>}

      {priced.length > 3 && <button className="outline-button" type="button" onClick={() => setShowAll(!showAll)}>{showAll ? "Mostrar apenas os 3 primeiros" : `Ver mais ${priced.length - 3} mercados com preços`}</button>}

      {anyMissing && <p className="form-hint">Viu algum desses preços? <Link to="/contribuir">Contribua informando o valor</Link> (é preciso estar logado).</p>}
      <p className="form-hint">Vale o preço mais recente de cada produto em cada mercado. <Link to="/mercados">Ver mercados</Link> · <Link to="/mapa">Ver no mapa</Link></p>
    </section>
  );
}
