import { useCallback, useEffect, useState, useRef, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { BarcodeScanner } from "../components/BarcodeScanner";
import { ProductArt } from "../components/ProductArt";
import { useRegion } from "../region/RegionContext";
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
  const {city} = useRegion();
  const sequence = useRef(0);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    const request = ++sequence.current;
    setLoading(true);
    setError("");
    try {
      const looksLikeEan = /^\d{8,14}$/.test(q.trim());
      if (looksLikeEan) {
        try {
          const data=await getProductByEan(q.trim(),city || "__none__"); if(request===sequence.current) setProducts(data);
        } catch (err) {
          throw err;
        }
      } else {
        const data=await getProducts(q,city || "__none__"); if(request===sequence.current) setProducts(data);
      }
    } catch (err) {
      if(request===sequence.current) setError(err instanceof Error ? err.message : "Não foi possível carregar os produtos.");
    } finally {
      if(request===sequence.current) setLoading(false);
    }
  }, [q,city]);

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
      <span className="grocery-kicker">O QUE VAI NA SUA SACOLA?</span><h1>Encontre seus produtos</h1>
      <div className="grocery-search-picks" aria-label="Buscas rápidas"><span>Itens do dia a dia</span>{[{name:"Arroz",category:"Grãos"},{name:"Feijão",category:"Grãos"},{name:"Leite",category:"Laticínios"},{name:"Café",category:"Bebidas"}].map(p => <button type="button" key={p.name} onClick={() => {setInput(p.name);setParams({q:p.name});}}><ProductArt name={p.name} category={p.category} size={30}/>{p.name}</button>)}</div>
      <form className="search-bar" onSubmit={submit} role="search">
        <input aria-label="Buscar produto" placeholder="Nome, marca, categoria ou EAN" value={input} onChange={(event) => setInput(event.target.value)} />
        <button className="primary-button" type="submit">Buscar</button>
        <button className="outline-button" type="button" onClick={() => setScanning(true)}>📷 Ler barras ou QR</button>
      </form>
      <p className="form-hint">Busque por nome ou código de barras. Se o nome não estiver no catálogo, consultamos o Open Food Facts (mínimo 3 letras). {city ? "Os preços exibidos respeitam a cidade escolhida." : "Escolha a cidade acima para consultar os preços. Você já pode adicionar produtos à lista."}</p>
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
