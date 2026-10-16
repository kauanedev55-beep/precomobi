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

  const complete = comparison.results.filter((result) => result.complete && result.total !== null);
  let saving: { amount: number; best: string; worst: string } | null = null;
  if (complete.length >= 2) {
    const sorted = [...complete].sort((a, b) => Number(a.total) - Number(b.total));
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];
    saving = { amount: Number(worst.total) - Number(best.total), best: best.market_name, worst: worst.market_name };
  }
  const anyMissing = comparison.results.some((result) => !result.complete);

  return (
    <section>
      <p className="breadcrumb"><Link to="/lista">← Lista de compras</Link></p>
      <h1>Comparação: {comparison.list_name}</h1>

      {saving && (
        <div className="notice good">
          Entre os mercados com a lista completa, <strong>{saving.best}</strong> é o mais barato:{" "}
          {saving.amount > 0 ? <>economia de <strong>{formatPrice(saving.amount)}</strong> em relação a {saving.worst}.</> : <>o mesmo total dos demais.</>}
        </div>
      )}
      {complete.length === 0 && <div className="notice">Nenhum mercado tem preço para todos os itens da lista, então não há total completo para comparar. Veja abaixo o que falta.</div>}

      <div className="market-columns">
        {comparison.results.map((result, index) => (
          <article className={`market-card ${index === 0 && result.complete ? "winner" : ""}`} key={result.market_id}>
            <header>
              <div>
                <h3>{result.market_name}</h3>
                <span className={`status-pill ${result.complete ? "" : "partial"}`}>{result.complete ? "Lista completa" : "Compra parcial"}</span>
              </div>
              <div className="market-total">
                <small>{result.found_items} de {result.total_items} itens com preço</small>
                <strong>{result.total !== null ? formatPrice(result.total) : "Total indisponível"}</strong>
              </div>
            </header>
            <Link className="map-link" to={"/mapa?mercado=" + result.market_id}>📍 Ver no mapa e traçar rota</Link>
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
            {!result.complete && <p className="form-hint">Este mercado não tem preço para todos os itens; o total não é somado para não comparar valores incompletos.</p>}
          </article>
        ))}
      </div>

      {anyMissing && <p className="form-hint">Viu algum desses preços? <Link to="/contribuir">Contribua informando o valor</Link> (é preciso estar logado).</p>}
      <p className="form-hint">Vale o preço mais recente de cada produto em cada mercado. <Link to="/mercados">Ver mercados</Link> · <Link to="/mapa">Ver no mapa</Link></p>
    </section>
  );
}
