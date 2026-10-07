import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { ConfirmPriceButton } from "../components/ConfirmPriceButton";
import { SourceBadge } from "../components/SourceBadge";
import { Empty, ErrorBox, Loading } from "../components/StateViews";
import { formatDate, formatDateTime, formatPrice, parseApiDate } from "../lib/format";
import { getMarkets, getPriceHistory, getProducts, type Market, type PriceReport, type Product } from "../services/api";

function PriceChart({ reports }: { reports: PriceReport[] }) {
  const points = [...reports].sort((a, b) => parseApiDate(a.reported_at).getTime() - parseApiDate(b.reported_at).getTime());
  const prices = points.map((point) => Number(point.price));
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const width = 600;
  const height = 160;
  const pad = 24;
  const x = (index: number) => pad + (index * (width - pad * 2)) / Math.max(points.length - 1, 1);
  const y = (value: number) => (max === min ? height / 2 : height - pad - ((value - min) * (height - pad * 2)) / (max - min));
  return (
    <figure className="chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Evolução do preço ao longo do tempo">
        <polyline fill="none" stroke="currentColor" strokeWidth="2" points={points.map((point, index) => `${x(index)},${y(Number(point.price))}`).join(" ")} />
        {points.map((point, index) => (
          <g key={point.id}>
            <circle cx={x(index)} cy={y(Number(point.price))} r="4" fill={point.source_type === "community" ? "#dd8f2c" : "currentColor"} />
            <text x={x(index)} y={y(Number(point.price)) - 8} textAnchor="middle" fontSize="11">{formatPrice(point.price)}</text>
          </g>
        ))}
      </svg>
      <figcaption>De {formatDate(points[0].reported_at)} a {formatDate(points[points.length - 1].reported_at)} · ponto laranja = informado pela comunidade</figcaption>
    </figure>
  );
}

export function History() {
  const [params, setParams] = useSearchParams();
  const productId = params.get("produto") ?? "";
  const marketId = params.get("mercado") ?? "";
  const [products, setProducts] = useState<Product[]>([]);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [reports, setReports] = useState<PriceReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([getProducts(), getMarkets()])
      .then(([productList, marketList]) => {
        setProducts(productList);
        setMarkets(marketList);
      })
      .catch(() => undefined); // os filtros são opcionais; o erro principal aparece na busca do histórico
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setReports(await getPriceHistory({ product_id: productId ? Number(productId) : undefined, market_id: marketId ? Number(marketId) : undefined }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar o histórico.");
    } finally {
      setLoading(false);
    }
  }, [productId, marketId]);

  useEffect(() => {
    void load();
  }, [load]);

  const setFilter = (key: "produto" | "mercado") => (event: { target: { value: string } }) => {
    const next = new URLSearchParams(params);
    if (event.target.value) next.set(key, event.target.value);
    else next.delete(key);
    setParams(next);
  };

  const canChart = Boolean(productId && marketId) && reports.length >= 2;

  return (
    <section>
      <h1>Histórico de preços</h1>
      <div className="filters">
        <label className="field"><span>Produto</span>
          <select value={productId} onChange={setFilter("produto")}>
            <option value="">Todos</option>
            {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
          </select>
        </label>
        <label className="field"><span>Mercado</span>
          <select value={marketId} onChange={setFilter("mercado")}>
            <option value="">Todos</option>
            {markets.map((market) => <option key={market.id} value={market.id}>{market.name}</option>)}
          </select>
        </label>
      </div>

      {loading && <Loading text="Carregando histórico..." />}
      {error && <ErrorBox message={error} onRetry={load} />}
      {!loading && !error && reports.length === 0 && <Empty title="Nenhum registro de preço para esse filtro" />}
      {!loading && !error && productId && marketId && reports.length === 1 && <p className="form-hint">Só há um registro para este produto neste mercado; o gráfico aparece quando houver pelo menos dois.</p>}
      {!loading && !error && !(productId && marketId) && reports.length > 0 && <p className="form-hint">Escolha um produto e um mercado para ver o gráfico de evolução.</p>}
      {canChart && <PriceChart reports={reports} />}
      {!loading && reports.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Data</th><th>Produto</th><th>Mercado</th><th>Preço</th><th>Origem</th><th>Confirmação</th></tr></thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.id}>
                  <td>{formatDateTime(report.reported_at)}</td>
                  <td>{report.product_name}</td>
                  <td>{report.market_name}</td>
                  <td className="num">{formatPrice(report.price)}</td>
                  <td><SourceBadge sourceType={report.source_type} /></td>
                  <td>
                    <ConfirmPriceButton
                      reportId={report.id}
                      count={report.confirmations_count}
                      confirmedByMe={report.confirmed_by_me}
                      onConfirmed={(updated) =>
                        setReports((current) => current.map((item) => (item.id === report.id ? { ...item, ...updated } : item)))
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
