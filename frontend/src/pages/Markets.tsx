import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { Empty, ErrorBox, Loading } from "../components/StateViews";
import { fullAddress, googleMapsUrl, hasCoordinates } from "../lib/navigation";
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
      <div className="comparison-heading"><h1>Mercados cadastrados</h1><button className="outline-button" type="button" onClick={() => void load()}>Atualizar mercados</button></div>
      {loading && <Loading />}
      {error && <ErrorBox message={error} onRetry={load} />}
      {!loading && !error && markets.length === 0 && <Empty title="Nenhum mercado encontrado nesta base">Os mercados são carregados do servidor. Cadastros existentes somente no computador precisam ser transferidos para a base publicada.</Empty>}
      <ul className="card-list">
        {markets.map((market) => {
          const hasCoords = hasCoordinates(market);
          return (
            <li className="list-card" key={market.id}>
              <div>
                <span className="card-title">{market.name}</span>
                <small>{fullAddress(market)}</small>
                <small>{hasCoords ? `Localização: ${Number(market.latitude).toFixed(5)}, ${Number(market.longitude).toFixed(5)}` : "Localização (latitude/longitude) ainda não cadastrada"}</small>
              </div>
              <div className="card-actions">
                <Link className="outline-button" to={`/historico?mercado=${market.id}`}>Preços registrados</Link>
                <a className="primary-button small" href={googleMapsUrl(market)} target="_blank" rel="noreferrer">Google Maps ↗</a>
                {hasCoords && <Link className="primary-button small" to={`/mapa?mercado=${market.id}`}>Ver no mapa</Link>}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
