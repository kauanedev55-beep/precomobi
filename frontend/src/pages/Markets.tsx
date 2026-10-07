import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { Empty, ErrorBox, Loading } from "../components/StateViews";
import { getMarkets, type Market } from "../services/api";

export function Markets() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setMarkets(await getMarkets());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar os mercados.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section>
      <h1>Mercados</h1>
      {loading && <Loading />}
      {error && <ErrorBox message={error} onRetry={load} />}
      {!loading && !error && markets.length === 0 && <Empty title="Nenhum mercado cadastrado" />}
      <ul className="card-list">
        {markets.map((market) => {
          const hasCoords = market.latitude !== null && market.longitude !== null;
          return (
            <li className="list-card" key={market.id}>
              <div>
                <span className="card-title">{market.name}</span>
                <small>{market.address}{market.neighborhood ? ` · ${market.neighborhood}` : ""} · {market.city}/{market.state}</small>
                <small>{hasCoords ? `Localização: ${Number(market.latitude).toFixed(5)}, ${Number(market.longitude).toFixed(5)}` : "Localização (latitude/longitude) ainda não cadastrada"}</small>
              </div>
              <div className="card-actions">
                <Link className="outline-button" to={`/historico?mercado=${market.id}`}>Preços registrados</Link>
                {hasCoords && <Link className="primary-button small" to={`/mapa?mercado=${market.id}`}>Ver no mapa</Link>}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
