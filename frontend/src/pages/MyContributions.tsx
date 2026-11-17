import {CommunityPriceCard} from "../components/CommunityPriceCard";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { CommunityNav } from "../components/CommunityNav";
import "../styles/community.css";
import { Empty, ErrorBox, Loading } from "../components/StateViews";

import { getMyPriceReports, type PriceReport } from "../services/api";

export function MyContributions() {
  const [reports, setReports] = useState<PriceReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setReports(await getMyPriceReports());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar suas contribuições.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section>
      <h1>Minhas contribuições</h1>
      <CommunityNav />
      <div className="button-row"><Link className="primary-button" to="/contribuir">Informar preço</Link><Link className="outline-button" to="/ofertas?minhas=1">Minhas promoções</Link></div>
      {loading && <Loading />}
      {error && <ErrorBox message={error} onRetry={load} />}
      {!loading && !error && reports.length === 0 && <Empty title="Você ainda não informou nenhum preço">Use Informar preço para compartilhar o que encontrou no mercado.</Empty>}
      {!loading && !error && reports.length > 0 && (
        <div className="community-feed">{reports.map(report=><CommunityPriceCard key={report.id} report={report} mine />)}</div>
      )}
    </section>
  );
}
