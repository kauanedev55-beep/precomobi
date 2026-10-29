import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { BarcodeScanner } from "../components/BarcodeScanner";
import { ProductArt } from "../components/ProductArt";
import { useCart } from "../cart/CartContext";
import { Empty, ErrorBox, Loading } from "../components/StateViews";
import { formatPrice, productSubtitle } from "../lib/format";
import { getProductByEan, getProducts, type Product } from "../services/api";

export function Products() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const [input, setInput] = useState(q);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [added, setAdded] = useState<number | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState("");
  const cart = useCart();
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const looksLikeEan = /^\d{8,14}$/.test(q.trim());
      if (looksLikeEan) {
        try {
          setProducts(await getProductByEan(q.trim()));
        } catch (err) {
          throw err;
        }
      } else {
        setProducts(await getProducts(q));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar os produtos.");
    } finally {
      setLoading(false);
    }
  }, [q]);

  useEffect(() => {
    void load();
  }, [load]);

  function submit(event: FormEvent) {
    event.preventDefault();
    setParams(input.trim() ? { q: input.trim() } : {});
  }

  async function onBarcodeDetected(ean: string) {
    setScanning(false);
    setScanError("");
    try {
      const found = await getProductByEan(ean);
      if (found.length) {
        navigate(`/produtos/${found[0].id}`);
      } else {
        setScanError(`Nenhum produto cadastrado com o código ${ean}.`);
      }
    } catch (err) {
      setScanError(err instanceof Error ? err.message : "Não foi possível consultar esse código.");
    }
  }

  return (
    <section>
      <h1>Produtos</h1>
      <form className="search-bar" onSubmit={submit} role="search">
        <input aria-label="Buscar produto" placeholder="Nome, marca, categoria ou EAN" value={input} onChange={(event) => setInput(event.target.value)} />
        <button className="primary-button" type="submit">Buscar</button>
        <button className="outline-button" type="button" onClick={() => setScanning(true)}>📷 Câmera (experimental)</button>
      </form>
      <p className="form-hint">Busque por nome na base cadastrada ou digite o EAN completo para consultar também o Open Food Facts.</p>
      {scanError && <p className="error-message" role="alert">{scanError}</p>}
      {scanning && <BarcodeScanner onDetected={onBarcodeDetected} onClose={() => setScanning(false)} />}

      {loading && <Loading text="Buscando produtos..." />}
      {error && <ErrorBox message={error} onRetry={load} />}
      {!loading && !error && products.length === 0 && (
        <Empty title="Nenhum produto encontrado">{q ? `Nada encontrado para “${q}”. Tente outro nome ou o código EAN completo.` : "Ainda não há produtos cadastrados."}</Empty>
      )}
      {!loading && !error && products.length > 0 && (
        <ul className="product-grid">
          {products.map((product) => (
            <li className="product-tile" key={product.id}>
              <Link className="product-tile-link" to={`/produtos/${product.id}`}>
                <ProductArt category={product.category} imageUrl={product.image_url} name={product.name} size={96} />
                <strong>{product.name}</strong>
                <small>{productSubtitle(product)}</small>
                <span className="tile-price">{product.min_price !== null ? formatPrice(product.min_price) : "Sem preço"}</span>
                {product.min_price_market && <small className="tile-market">em {product.min_price_market}</small>}
              </Link>
              <button className="tile-add" type="button" aria-label={`Adicionar ${product.name} à lista`} onClick={() => { cart.add(product); setAdded(product.id); }}>
                {added === product.id ? "✓" : "+"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
