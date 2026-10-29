import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { SourceBadge } from "../components/SourceBadge";
import { ErrorBox, Loading } from "../components/StateViews";
import { formatDate, formatPrice } from "../lib/format";
import { compareShoppingList, type Comparison } from "../services/api";

export function ComparisonPage() {
  const { id } = useParams();
  const [comparison, setComparison] = useState<Comparison | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setComparison(await compareShoppingList(Number(id)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível comparar a lista.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <Loading text="Comparando os mercados..." />;
  if (error || !comparison) return <ErrorBox message={error || "Comparação indisponível."} onRetry={load} />;

  const hasDemoPrices = comparison.results.some((market) => market.items.some((item) => item.source_type === "development"));
  const complete = comparison.results.filter((result) => result.complete && result.total !== null);
  let saving: { amount: number; best: string; worst: string } | null = null;
  if (complete.length >= 2) {
    const sorted = [...complete].sort((a, b) => Number(a.total) - Number(b.total));
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];
    saving = { amount: Number(worst.total) - Number(best.total), best: best.market_name, worst: worst.market_name };
  }
  const anyMissing = comparison.results.some((result) => !result.complete);
  const bestId = complete.length ? [...complete].sort((a, b) => Number(a.total) - Number(b.total))[0].market_id : null;

  return (
    <section>
      <p className="breadcrumb"><Link to="/lista">← Lista de compras</Link></p>
      <h1>Comparação: {comparison.list_name}</h1>

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
        {comparison.results.map((result) => (
          <article className={`market-card ${result.market_id === bestId ? "winner" : ""}`} key={result.market_id}>
            <header>
              <div>
                <h3>{result.market_name}</h3>
                {result.market_id === bestId && <span className="best-choice-label">✓ Menor total da lista completa</span>}
                <span className={`status-pill ${result.complete ? "" : "partial"}`}>{result.complete ? "Lista completa" : "Compra parcial"}</span>
              </div>
              <div className="market-total">
                <small>{result.found_items} de {result.total_items} itens com preço</small>
                <strong>{result.total !== null ? formatPrice(result.total) : "Total indisponível"}</strong>
              </div>
            </header>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Produto</th><th>Qtd.</th><th>Preço un.</th><th>Subtotal</th><th>Origem</th></tr></thead>
                <tbody>
                  {result.items.map((item) => (
                    <tr key={item.product_id} className={item.unit_price === null ? "missing-row" : undefined}>
                      <td>{item.product_name}</td>
                      <td className="num">{Number(item.quantity)}</td>
                      <td className="num">{item.unit_price !== null ? formatPrice(item.unit_price) : "Sem preço"}</td>
                      <td className="num">{formatPrice(item.subtotal)}</td>
                      <td>{item.source_type ? <><SourceBadge sourceType={item.source_type} /><small className="block">{formatDate(item.reported_at)}</small></> : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Link className="primary-button market-route-action" to={`/mapa?mercado=${result.market_id}&rota=1`}>⌖ Ver distância e rota →</Link>
            {!result.complete && <p className="form-hint">Este mercado não tem preço para todos os itens; o total não é somado para não comparar valores incompletos.</p>}
          </article>
        ))}
      </div>

      {anyMissing && <p className="form-hint">Viu algum desses preços? <Link to="/contribuir">Contribua informando o valor</Link> (é preciso estar logado).</p>}
      <p className="form-hint">Vale o preço mais recente de cada produto em cada mercado. <Link to="/mercados">Ver mercados</Link> · <Link to="/mapa">Ver no mapa</Link></p>
    </section>
  );
}
