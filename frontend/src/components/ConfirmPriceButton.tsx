import { useState } from "react";

import { useAuth } from "../auth/AuthContext";
import { confirmPriceReport } from "../services/api";

/**
 * Botão de "confirmar preço": um segundo usuário avisa que o preço informado
 * ainda está valendo. Não troca o preço — só soma confiabilidade ao que já
 * existe (uma linha na tabela price_confirmations, sem apagar nada).
 */
export function ConfirmPriceButton({
  reportId,
  count,
  confirmedByMe,
  onConfirmed,
}: {
  reportId: number;
  count: number;
  confirmedByMe: boolean;
  onConfirmed: (updated: { confirmations_count: number; confirmed_by_me: boolean }) => void;
}) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!user) {
    return <small className="confirm-count">{count > 0 ? `${count} confirmação(ões)` : "Ninguém confirmou ainda"}</small>;
  }

  async function confirm() {
    setLoading(true);
    setError("");
    try {
      const updated = await confirmPriceReport(reportId);
      onConfirmed({ confirmations_count: updated.confirmations_count, confirmed_by_me: updated.confirmed_by_me });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível confirmar.");
    } finally {
      setLoading(false);
    }
  }

  if (confirmedByMe) {
    return <small className="confirm-count confirmed">Você confirmou{count > 1 ? ` · +${count - 1} pessoa(s)` : ""}</small>;
  }

  return (
    <span className="confirm-wrap">
      <button className="confirm-button" type="button" onClick={confirm} disabled={loading} title="Confirmar que esse preço ainda está valendo">
        {loading ? "..." : "👍 Confirmar"}
      </button>
      {count > 0 && <small className="confirm-count">{count}</small>}
      {error && <small className="error-message">{error}</small>}
    </span>
  );
}
