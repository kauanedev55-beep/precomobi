import { useCallback, useEffect, useState, useRef } from "react";
import { Link, useParams } from "react-router-dom";

import { useRegion } from "../region/RegionContext";
import { useCart } from "../cart/CartContext";
import { ConfirmPriceButton } from "../components/ConfirmPriceButton";
import { QuantityPicker } from "../components/QuantityPicker";
import { itemSubtotal, saleLabel } from "../lib/quantities";
import {ProductPhoto} from "../components/ProductPhoto";
import {produceGuide,productDisplayName,catalogCredit} from "../lib/produceGuides";
import { ProductArt } from "../components/ProductArt";
import { SourceBadge } from "../components/SourceBadge";
import { ErrorBox, Loading } from "../components/StateViews";
import { formatDate, formatPrice, productSubtitle } from "../lib/format";
import { getProduct, type ProductDetail as ProductDetailData } from "../services/api";

export function ProductDetail() {
  const { id } = useParams();
  const cart = useCart();
  const {city} = useRegion();
  const sequence = useRef(0);
  const [product, setProduct] = useState<ProductDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [added, setAdded] = useState(false);
  const [quantity,setQuantity] = useState(1);
  const [quantityValid,setQuantityValid]=useState(true);

  const load = useCallback(async () => {
    const request = ++sequence.current;
    setLoading(true);
    setError("");
    try {
      const data=await getProduct(Number(id),city || "__none__"); if(request===sequence.current) setProduct(data);
    } catch (err) {
      if(request===sequence.current) setError(err instanceof Error ? err.message : "Não foi possível carregar o produto.");
    } finally {
      if(request===sequence.current) setLoading(false);
    }
  }, [id,city]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {setAdded(false);setQuantity(1);setQuantityValid(true);}, [id]);

  if (loading) return <Loading text="Carregando produto..." />;
  if (error || !product) return <ErrorBox message={error || "Produto não encontrado."} onRetry={load} />;

  const guide=produceGuide(product);
  const displayName=productDisplayName(product);
  const withPrice = product.prices.filter((price) => price.price !== null);
  const hasDemoPrices = product.prices.some((price) => price.source_type === "development");
  const cheapest = withPrice.length ? Math.min(...withPrice.map((price) => Number(price.price))) : null;

  return (
    <section>
      <p className="button-row"><Link className="outline-button back-button" to="/produtos">← Voltar para produtos</Link><Link className="outline-button" to="/lista">Minha lista</Link></p>

      <div className="product-hero">
        {product.image_url ? <ProductPhoto url={product.image_url} name={displayName} hint={guide?.hint} source={product.catalog_source_url} size={160}/> : <ProductArt category={product.category} name={product.name} size={120}/> }
        <div>
          <h1>{displayName}</h1>
          <p className="product-meta">{productSubtitle(product)}{product.category ? ` · ${product.category}` : ""}</p>
          {product.min_price !== null ? (
            <p className="hero-price">{formatPrice(product.min_price)}{product.sale_unit==="kg" ? " / kg" : " por embalagem / unidade"}<small>a partir de, em {product.min_price_market}</small></p>
          ) : (
            <p className="hero-price muted">Sem preço informado ainda</p>
          )}
        </div>
      </div>

      {guide && <div className="product-guide-box"><strong>Como reconhecer</strong><p>{guide.hint}</p><small>Compare com a etiqueta do mercado. A foto é uma referência visual.</small></div>}
      <div className="product-buy-panel"><QuantityPicker onValidityChange={setQuantityValid} value={quantity} unit={product.sale_unit} name={product.name} onChange={v=>{setQuantity(v);setAdded(false);}}/>{product.min_price!==null && <p>Estimativa para essa quantidade: <strong>{formatPrice(itemSubtotal(product.min_price,quantity))}</strong></p>}{product.sale_unit==="kg" && <p className="form-hint">A estimativa usa o peso informado. Ajuste na lista quando souber o peso real da balança.</p>}
      <div className="button-row">
        <button className="primary-button" type="button" disabled={added || !quantityValid} onClick={() => { cart.add(product,quantity); setAdded(true); }}>{added ? "Adicionado à lista ✓" : "Adicionar à lista"}</button>
        <Link className="outline-button" to={`/contribuir?produto=${product.id}`}>Contribuir com preço</Link>
        <Link className="outline-button" to={`/comunidade?produto=${product.id}`}>Preços da comunidade</Link>
        {added && <Link className="text-button" to="/lista">Ir para a lista →</Link>}
      </div>

      </div>
      <dl className="info-grid">
        <div><dt>Marca</dt><dd>{product.brand ?? "—"}</dd></div>
        <div><dt>Embalagem / apresentação</dt><dd>{product.packaging || "Não informada"}</dd></div><div><dt>Conteúdo / referência</dt><dd>{product.quantity_value && product.quantity_unit ? `${Number(product.quantity_value)} ${product.quantity_unit}` : "Não informado"}</dd></div><div><dt>Preço informado por</dt><dd>{saleLabel(product.sale_unit)}</dd></div>
        <div><dt>EAN</dt><dd>{product.ean ?? "—"}</dd></div>
      </dl>

      {product.description && <p>{product.description}</p>}
      {product.catalog_source_url && <p className="form-hint"><a href={product.catalog_source_url} target="_blank" rel="noopener noreferrer">Foto e referência: {catalogCredit(product.catalog_source_url)}</a></p>}
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
                <td className="num">{price.price !== null ? `${formatPrice(price.price)} / ${saleLabel(product.sale_unit)}` : "Sem preço informado"}{price.price !== null && Number(price.price) === cheapest && withPrice.length > 1 ? " ★" : ""}</td>
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
