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
  const category = params.get("categoria") ?? "";
  const [input, setInput] = useState(q);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [added, setAdded] = useState<number | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState("");
  const [missingCode, setMissingCode] = useState("");
  const cart = useCart();
  const {city} = useRegion();
  const sequence = useRef(0);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    const request = ++sequence.current;
    if (!q.trim() && !category) {setProducts([]);setLoading(false);setError("");return;}
    setProducts([]);
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
        const data=await getProducts(q,city || "__none__",category || undefined); if(request===sequence.current) setProducts(data);
      }
    } catch (err) {
      if(request===sequence.current) setError(err instanceof Error ? err.message : "Não foi possível carregar os produtos.");
    } finally {
      if(request===sequence.current) setLoading(false);
    }
  }, [q,city,category]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {setInput(q);setAdded(null);}, [q]);

  function submit(event: FormEvent) {
    event.preventDefault();
    setParams(input.trim() ? { q: input.trim() } : {});
  }

  async function onBarcodeDetected(ean: string) {
    setScanning(false);
    setScanError("");setMissingCode("");
    try {
      setMissingCode(ean);
      const found = await getProductByEan(ean);
      if (found.length) {
        navigate(`/produtos/${found[0].id}`);
      } else {
        setScanError(`Nenhum produto cadastrado com o código ${ean}.`);
      }
    } catch (err) {
      setMissingCode(ean);
      setScanError(err instanceof Error ? err.message : "Não foi possível consultar esse código.");
    }
  }

  return (
    <section>
      <span className="grocery-kicker">O QUE VAI NA SUA SACOLA?</span><h1>Encontre seus produtos</h1>
      <p>Busque produtos para adicionar à lista. Aqui você também pode cadastrar o que ainda não encontrou.</p>
      {added !== null && <p className="notice good" role="status">Produto adicionado. <Link to="/lista">Ver minha lista</Link></p>}
      <div className="button-row"><Link className="outline-button" to="/produtos/novo">+ Cadastrar produto que não encontrei</Link><Link className="outline-button" to="/lista">← Voltar para minha lista</Link></div>
      <div className="produce-categories" aria-label="Hortifruti">{["Frutas","Verduras","Legumes"].map(c=><button type="button" key={c} aria-pressed={category===c} onClick={()=>{setInput("");setParams({categoria:c});}}>{c}</button>)}</div>
      <div className="grocery-search-picks" aria-label="Buscas rápidas"><span>Itens do dia a dia</span>{[{name:"Arroz",category:"Grãos"},{name:"Feijão",category:"Grãos"},{name:"Leite",category:"Laticínios"},{name:"Café",category:"Bebidas"}].map(p => <button type="button" key={p.name} onClick={() => {setInput(p.name);setParams({q:p.name});}}><ProductArt name={p.name} category={p.category} size={30}/>{p.name}</button>)}</div>
      <form className="search-bar products-search" onSubmit={submit} role="search">
        <input aria-label="Buscar produto" placeholder="Nome, marca, categoria ou EAN" value={input} onChange={(event) => setInput(event.target.value)} />
        <button className="primary-button" type="submit">Buscar</button>
        <button className="outline-button" type="button" onClick={() => setScanning(true)}>📷 Ler código de barras / QR</button>
      </form>
      <div className="product-search-status">{(q.trim() || category) && <><p>Resultados para <strong>“{q || category}”</strong></p><button className="text-button" type="button" onClick={() => {setInput("");setParams({});setScanError("");setProducts([]);}}>Limpar busca</button></>}</div>
      <p className="form-hint">Busque um produto pelo nome ou código de barras. Encontrar um produto não significa que ele já tenha preço informado nos mercados. {city ? "Os preços exibidos respeitam a cidade escolhida." : "Escolha a cidade acima para consultar os preços. Você já pode adicionar produtos à lista."}</p>
      {scanError && <div className="notice" role="alert"><p>{scanError}</p><Link className="outline-button" to={`/produtos/novo?ean=${encodeURIComponent(missingCode)}`}>Cadastrar esse produto</Link></div>}
      {scanning && <BarcodeScanner onDetected={onBarcodeDetected} onClose={() => setScanning(false)} />}

      {!q.trim() && !category && <Empty title="O que você precisa comprar?">Digite um nome e toque em Buscar, escolha um item do dia a dia ou leia o código de barras.</Empty>}
      {(q.trim() || category) && loading && <Loading text="Buscando produtos..." />}
      {error && <><ErrorBox message={error} onRetry={load}/><Link className="outline-button" to={`/produtos/novo?${new URLSearchParams(/^\d{8,14}$/.test(q) ? {ean:q} : {nome:q})}`}>Cadastrar sem depender da busca externa</Link></>}
      {(q.trim() || category) && !loading && !error && products.length === 0 && (
        <Empty title="Nenhum produto encontrado"><p>{q ? `Nada encontrado para “${q}”.` : `Ainda não há produtos em ${category}.`}</p><Link className="primary-button" to={`/produtos/novo?${new URLSearchParams(/^\d{8,14}$/.test(q) ? {ean:q} : {nome:q,categoria:category})}`}>Cadastrar meu produto</Link></Empty>
      )}
      {(q.trim() || category) && !loading && !error && products.length > 0 && (
        <ul className="product-grid">
          {products.map((product) => (
            <li className="product-tile" key={product.id}>
              <Link className="product-tile-link" to={`/produtos/${product.id}`}>
                <ProductArt category={product.category} imageUrl={product.image_url} name={product.name} size={96} />
                <strong>{product.name}</strong>
                <small>{productSubtitle(product)}</small>
                <span className="tile-price">{product.min_price !== null ? `${formatPrice(product.min_price)}${product.sale_unit==="kg" ? " / kg" : ""}` : "Preço ainda não informado"}</span>
                {product.min_price_market && <small className="tile-market">em {product.min_price_market}</small>}
              </Link>
              <button className="tile-add" type="button" aria-label={product.sale_unit==="kg" ? `Escolher peso de ${product.name}` : `Adicionar ${product.name} à lista`} onClick={() => { if(product.sale_unit==="kg") {navigate(`/produtos/${product.id}`);return;} cart.add(product); setAdded(product.id); }}>
                {added === product.id ? "✓" : "+"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
