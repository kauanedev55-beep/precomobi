import {CommunityPriceCard} from "../components/CommunityPriceCard";
import {saleLabel} from "../lib/quantities";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { CommunityNav } from "../components/CommunityNav";
import { SourceBadge } from "../components/SourceBadge";
import { Empty, ErrorBox, Loading } from "../components/StateViews";
import { formatDateTime, formatPrice } from "../lib/format";
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
      <p>Somente os preços que você compartilhou. É normal encontrar esses mesmos registros na comunidade: lá todos podem consultá-los. Cadastrar um produto sem informar preço ainda não conta como contribuição de preço.</p>
      <CommunityNav />
      <div className="button-row"><Link className="primary-button" to="/contribuir">Informar preço</Link><Link className="outline-button" to="/ofertas?minhas=1">Minhas promoções</Link></div>
      {loading && <Loading />}
      {error && <ErrorBox message={error} onRetry={load} />}
      {!loading && !error && reports.length === 0 && <Empty title="Você ainda não informou nenhum preço"><Link to="/contribuir">Contribuir com o primeiro preço</Link></Empty>}
      {!loading && reports.length > 0 && (
        <><div className="community-mobile-cards">{reports.map(report=><CommunityPriceCard key={report.id} report={report} mine />)}</div><div className="table-wrap community-desktop-table">
          <table>
            <thead><tr><th>Produto</th><th>Mercado</th><th>Preço</th><th>Data</th><th>Origem</th><th>Confirmações</th><th>Observação</th></tr></thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.id}>
                  <td><Link to={`/produtos/${report.product_id}`}>{report.product_name}</Link></td>
                  <td>{report.market_name}</td>
                  <td className="num">{formatPrice(report.price)} / {saleLabel(report.sale_unit)}</td>
                  <td>{formatDateTime(report.reported_at)}</td>
                  <td><SourceBadge sourceType={report.source_type} /></td>
                  <td>{report.confirmations_count} {report.confirmations_count === 1 ? "pessoa confirmou" : "pessoas confirmaram"}</td>
                  <td>{report.notes ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div></>
      )}
    </section>
  );
}
