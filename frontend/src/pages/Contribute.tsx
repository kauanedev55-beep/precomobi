import { useEffect, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { ErrorBox, Loading } from "../components/StateViews";
import { formatPrice } from "../lib/format";
import { createPriceReport, getMarkets, getProducts, type Market, type PriceReport, type Product } from "../services/api";

function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function Contribute() {
  const [params] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [productId, setProductId] = useState(params.get("produto") ?? "");
  const [marketId, setMarketId] = useState("");
  const [price, setPrice] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<PriceReport | null>(null);

  useEffect(() => {
    Promise.all([getProducts(), getMarkets()])
      .then(([productList, marketList]) => {
        setProducts(productList);
        setMarkets(marketList);
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Não foi possível carregar os dados."))
      .finally(() => setLoading(false));
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setCreated(null);
    const normalized = price.trim().replace(",", ".");
    if (!productId) return setError("Escolha o produto.");
    if (!marketId) return setError("Escolha o mercado.");
    if (!/^\d+(\.\d{1,2})?$/.test(normalized) || Number(normalized) <= 0) return setError("Informe um preço válido, maior que zero (ex.: 24,90).");
    setSaving(true);
    setError("");
    try {
      const isToday = !date || date === todayIso();
      const report = await createPriceReport({
        product_id: Number(productId),
        market_id: Number(marketId),
        price: normalized,
        observed_at: isToday ? undefined : new Date(`${date}T12:00:00`).toISOString(),
        notes: notes.trim() || undefined,
      });
      setCreated(report);
      setPrice("");
      setNotes("");
      setDate("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível registrar o preço.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Loading />;
  if (loadError) return <ErrorBox message={loadError} />;

  return (
    <section className="form-page">
      <h1>Contribuir com preço</h1>
      <p className="form-hint">Informe um preço que você viu no mercado. Ele entra como uma nova observação “Informado pela comunidade” — os preços anteriores continuam no histórico.</p>
      {created && (
        <div className="notice good" role="status">
          Preço de {formatPrice(created.price)} registrado para {created.product_name} em {created.market_name}.{" "}
          <Link to="/minhas-contribuicoes">Ver minhas contribuições</Link> · <Link to={`/produtos/${created.product_id}`}>Ver produto</Link>
        </div>
      )}
      <form className="form-card" onSubmit={submit} noValidate>
        <label className="field"><span>Produto</span>
          <select value={productId} onChange={(event) => setProductId(event.target.value)}>
            <option value="">Selecione...</option>
            {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
          </select>
        </label>
        <label className="field"><span>Mercado</span>
          <select value={marketId} onChange={(event) => setMarketId(event.target.value)}>
            <option value="">Selecione...</option>
            {markets.map((market) => <option key={market.id} value={market.id}>{market.name}</option>)}
          </select>
        </label>
        <label className="field"><span>Preço (R$)</span><input inputMode="decimal" placeholder="24,90" value={price} onChange={(event) => setPrice(event.target.value)} /></label>
        <label className="field"><span>Data da observação (opcional — padrão: agora)</span><input type="date" max={todayIso()} value={date} onChange={(event) => setDate(event.target.value)} /></label>
        <label className="field"><span>Observação (opcional)</span><input maxLength={500} placeholder="Ex.: preço na prateleira" value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
        {error && <p className="error-message" role="alert">{error}</p>}
        <button className="primary-button" type="submit" disabled={saving}>{saving ? "Enviando..." : "Registrar preço"}</button>
      </form>
    </section>
  );
}
