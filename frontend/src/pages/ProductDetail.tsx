import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { useCart } from "../cart/CartContext";
import { ConfirmPriceButton } from "../components/ConfirmPriceButton";
import { ProductArt } from "../components/ProductArt";
import { SourceBadge } from "../components/SourceBadge";
import { ErrorBox, Loading } from "../components/StateViews";
import { formatDate, formatPrice, productSubtitle } from "../lib/format";
import { getProduct, type ProductDetail as ProductDetailData } from "../services/api";

export function ProductDetail() {
  const { id } = useParams();
  const cart = useCart();
  const [product, setProduct] = useState<ProductDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [added, setAdded] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setProduct(await getProduct(Number(id)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar o produto.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <Loading text="Carregando produto..." />;
  if (error || !product) return <ErrorBox message={error || "Produto não encontrado."} onRetry={load} />;

  const withPrice = product.prices.filter((price) => price.price !== null);
  const hasDemoPrices = product.prices.some((price) => price.source_type === "development");
  const cheapest = withPrice.length ? Math.min(...withPrice.map((price) => Number(price.price))) : null;

  return (
    <section>
      <p className="breadcrumb"><Link to="/produtos">← Produtos</Link></p>

      <div className="product-hero">
        <ProductArt category={product.category} imageUrl={product.image_url} name={product.name} size={120} />
        <div>
          <h1>{product.name}</h1>
          <p className="product-meta">{productSubtitle(product)}{product.category ? ` · ${product.category}` : ""}</p>
          {product.min_price !== null ? (
            <p className="hero-price">{formatPrice(product.min_price)}<small>a partir de, em {product.min_price_market}</small></p>
          ) : (
            <p className="hero-price muted">Sem preço informado ainda</p>
          )}
        </div>
      </div>

      <div className="button-row">
        <button className="primary-button" type="button" onClick={() => { cart.add(product); setAdded(true); }}>{added ? "Adicionado à lista ✓" : "Adicionar à lista"}</button>
        <Link className="outline-button" to={`/contribuir?produto=${product.id}`}>Contribuir com preço</Link>
        <Link className="outline-button" to={`/comunidade?produto=${product.id}`}>Preços da comunidade</Link>
        {added && <Link className="text-button" to="/lista">Ir para a lista →</Link>}
      </div>

      <dl className="info-grid">
        <div><dt>Marca</dt><dd>{product.brand ?? "—"}</dd></div>
        <div><dt>Embalagem</dt><dd>{productSubtitle({ brand: null, quantity_value: product.quantity_value, quantity_unit: product.quantity_unit })}</dd></div>
        <div><dt>EAN</dt><dd>{product.ean ?? "—"}</dd></div>
      </dl>

      <h2>Preços por mercado</h2>
      {hasDemoPrices && <div className="notice" role="status"><strong>Preços de demonstração:</strong> valores ilustrativos do projeto acadêmico. Não representam cotações atuais.</div>}
      <details className="pm-price-details">
        <summary>Ver preços, fontes e confirmações dos mercados</summary>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Mercado</th><th>Preço</th><th>Data</th><th>Origem</th><th>Confirmação</th></tr></thead>
          <tbody>
            {product.prices.map((price) => (
              <tr key={price.market_id} className={price.price !== null && Number(price.price) === cheapest ? "best-row" : undefined}>
                <td>{price.market_name}</td>
                <td className="num">{price.price !== null ? formatPrice(price.price) : "Sem preço informado"}{price.price !== null && Number(price.price) === cheapest && withPrice.length > 1 ? " ★" : ""}</td>
                <td>{formatDate(price.reported_at)}</td>
                <td>{price.source_type ? <SourceBadge sourceType={price.source_type} /> : "—"}</td>
                <td>
                  {price.report_id ? (
                    <ConfirmPriceButton
                      reportId={price.report_id}
                      count={price.confirmations_count}
                      confirmedByMe={price.confirmed_by_me}
                      isMine={price.is_mine}
                      onConfirmed={(updated) =>
                        setProduct((current) =>
                          current
                            ? { ...current, prices: current.prices.map((item) => (item.market_id === price.market_id ? { ...item, ...updated } : item)) }
                            : current,
                        )
                      }
                    />
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </details>
      <p className="form-hint">Vale o preço mais recente registrado em cada mercado. ★ = menor preço entre os mercados com preço informado.</p>
    </section>
  );
}
