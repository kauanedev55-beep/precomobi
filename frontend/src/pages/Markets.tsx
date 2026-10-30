import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { MarketForm } from "../components/MarketForm";

import { Empty, ErrorBox, Loading } from "../components/StateViews";
import { fullAddress, googleMapsUrl } from "../lib/navigation";
import { getMarkets, type Market } from "../services/api";
import "./markets.css";

export function Markets() {
  const { user } = useAuth();
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState("");
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
    <section className="markets-page">
      <div className="markets-heading">
        <div><span className="pm-kicker">SUA PRÓXIMA COMPRA</span><h1>Mercados</h1><p>Escolha uma unidade e veja como chegar.</p></div>
        <div className="markets-toolbar">
          <button className="outline-button" type="button" disabled={loading} onClick={() => void load()}>{loading ? "Atualizando..." : "Atualizar"}</button>
          {user?.is_admin && !creating && <button className="primary-button" type="button" onClick={() => { setCreating(true); setNotice(""); }}>+ Cadastrar mercado</button>}
        </div>
      </div>
      {user?.is_admin && creating && <MarketForm onCancel={() => setCreating(false)} onCreated={market => { setMarkets(current => [...current, market].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))); setCreating(false); setNotice(`${market.name} cadastrado. Agora já é possível informar preços nesta unidade.`); }} />}
      {notice && <p className="notice good" role="status">{notice}</p>}
      {loading && <Loading />}
      {error && <ErrorBox message={error} onRetry={load} />}
      {!loading && !error && markets.length === 0 && <Empty title="Nenhum mercado cadastrado ainda" />}
      {!loading && !error && markets.length > 0 && <p className="markets-count">{markets.length} {markets.length === 1 ? "unidade cadastrada" : "unidades cadastradas"}</p>}
      <ul className="markets-grid">
        {markets.map((market) => (
          <li className="market-card" key={market.id}>
            <div className="market-card-heading">
              <span className="market-symbol" aria-hidden="true"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M3 10h18l-2-6H5l-2 6ZM5 10v10h14V10M9 20v-6h6v6"/><path d="M3 10a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/></svg></span>
              <div><span className="market-city">{market.city} · {market.state}</span><h2>{market.name}</h2></div>
            </div>
            <p className="market-address">{fullAddress(market)}</p>
            <a className="market-map-link" href={googleMapsUrl(market)} target="_blank" rel="noopener noreferrer" aria-label={`Abrir ${market.name} no Google Maps (nova aba)`}>Abrir no Google Maps <span aria-hidden="true">↗</span></a>
          </li>
        ))}
      </ul>
    </section>
  );
}
