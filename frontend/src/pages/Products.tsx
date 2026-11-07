import { useCallback, useEffect, useState, useRef, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams, useLocation } from "react-router-dom";

import { BarcodeScanner } from "../components/BarcodeScanner";
import {ProductPhoto} from "../components/ProductPhoto";
import {produceGuide,productDisplayName} from "../lib/produceGuides";
import "../styles/product-results.css";
import { useRegion } from "../region/RegionContext";
import { useCart } from "../cart/CartContext";
import { Empty, ErrorBox, Loading } from "../components/StateViews";
import { formatPrice, productSubtitle } from "../lib/format";
import { getProductByEan, getProducts, type Product } from "../services/api";


export function Products() {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const [confirmation,setConfirmation] = useState(() => typeof location.state?.addedMessage === "string" ? location.state.addedMessage : "");
  const q = params.get("q") ?? "";
  const category = params.get("categoria") ?? "";
  const brandsMode = params.get("marcas") === "1";
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
        const data=await getProducts(q,city || "__none__",category || undefined,false,false,!brandsMode); if(request===sequence.current) setProducts(data);
      }
    } catch (err) {
      if(request===sequence.current) setError(err instanceof Error ? err.message : "Não foi possível carregar os produtos.");
    } finally {
      if(request===sequence.current) setLoading(false);
    }
  }, [q,city,category,brandsMode]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {setInput(q);setAdded(null);}, [q]);

  function submit(event: FormEvent) {
    event.preventDefault();
    setConfirmation("");
    setParams({... (input.trim() ? {q:input.trim()} : {}), ...(brandsMode ? {marcas:"1"} : {})});
  }

  async function onBarcodeDetected(ean: string) {
    setScanning(false);
    setScanError("");setMissingCode("");
    try {
      setMissingCode(ean);
      const found = await getProductByEan(ean,city || "__none__");
      if (found.length) {
        navigate(`/produtos/${found[0].id}`,{state:{search:params.toString()}});
      } else {
        setScanError(`Nenhum produto cadastrado com o código ${ean}.`);
      }
    } catch (err) {
      setMissingCode(ean);
      setScanError(err instanceof Error ? err.message : "Não foi possível consultar esse código.");
    }
  }

  const guidedChoices=products.length>0 && products.length<=6 && products.every(p=>produceGuide(p));
  const resultListClass=guidedChoices ? "product-result-list produce-choice-grid" : "product-result-list";
  const createLink = `/produtos/novo?${new URLSearchParams(/^\d{8,14}$/.test(q) ? {ean:q} : {nome:q,categoria:category})}`;
  function productRow(product: Product, hasPrice: boolean) {
    const wasAdded=added===product.id;
    const guide=produceGuide(product);
    const displayName=productDisplayName(product);
    return <li className="product-result" key={product.id}>
      {product.image_url && <ProductPhoto key={product.image_url} url={product.image_url} name={displayName} hint={guide?.hint} source={product.catalog_source_url}/>}
      <div className="result-description"><Link to={`/produtos/${product.id}`} state={{search:params.toString()}} className="result-name">{displayName}</Link><p>{productSubtitle(product)}</p>{guide && <span className="produce-choice-badge">{guide.badge}</span>}
      {hasPrice && <div className="result-price"><strong>{formatPrice(product.min_price)} <small>{product.sale_unit==="kg" ? "/ kg" : "/ embalagem ou unidade"}</small></strong><span>Menor preço informado · {product.min_price_market}</span></div>}</div>
      <div className="result-actions"><button className={hasPrice ? "primary-button" : "outline-button"} type="button" onClick={()=>{if(product.sale_unit==="kg") {navigate(`/produtos/${product.id}`,{state:{search:params.toString()}});return;} cart.add(product);setConfirmation("");setAdded(product.id);}} aria-label={product.sale_unit==="kg" ? `Escolher peso de ${product.name}` : `Adicionar ${product.name} à lista`}>{wasAdded ? "Adicionar mais uma" : product.sale_unit==="kg" ? "Escolher peso" : "Adicionar à lista"}</button></div>
    </li>;
  }
  return (
    <section className="product-search-page">
      <h1>Adicionar produtos</h1>
      <form className="search-bar products-search" onSubmit={submit} role="search">
        <input type="search" aria-label="Buscar produto" placeholder="O que você precisa? Ex.: banana, arroz" value={input} onChange={(event) => setInput(event.target.value)} />
        <button className="primary-button" type="submit">Buscar</button>
      </form>
      <details className="search-options"><summary>Mais opções</summary><div className="search-options-content">
        <button className="outline-button" type="button" onClick={() => setScanning(true)}>Ler código de barras</button>
        <label><input type="checkbox" checked={brandsMode} onChange={e=>setParams({...Object.fromEntries(params),marcas:e.target.checked ? "1" : "0"})}/> Procurar marcas e embalagens específicas</label>
        <Link to={createLink}>Cadastrar produto que não encontrei</Link>
      </div></details>
      {(added !== null || confirmation) && <p className="notice good" role="status">{confirmation || "Adicionado à lista."} <Link to="/lista">Ver minha lista</Link></p>}
      {!city && <p className="notice">Escolha a cidade acima para consultar preços. Você pode montar a lista mesmo sem preço cadastrado.</p>}
      {scanError && <div className="notice" role="alert"><p>{scanError}</p><Link className="outline-button" to={`/produtos/novo?ean=${encodeURIComponent(missingCode)}`}>Cadastrar esse produto</Link></div>}
      {scanning && <BarcodeScanner onDetected={onBarcodeDetected} onClose={() => setScanning(false)} />}

      {!q.trim() && !category && <Empty title="O que você precisa comprar?">Digite o nome do produto acima. Depois, escolha o tipo e a quantidade.</Empty>}
      {(q.trim() || category) && loading && <Loading text="Buscando produtos..." />}
      {error && <><ErrorBox message={error} onRetry={load}/><Link className="outline-button" to={`/produtos/novo?${new URLSearchParams(/^\d{8,14}$/.test(q) ? {ean:q} : {nome:q})}`}>Cadastrar produto</Link></>}
      {(q.trim() || category) && !loading && !error && <div className="search-results" aria-live="polite">
        {products.length > 0 ? <>
          <p className="search-results-count">{products.length} {products.length===1 ? "produto encontrado" : "produtos encontrados"}{q && <> para <strong>“{q}”</strong></>}</p>
          <ul className={resultListClass}>{products.map(p=>productRow(p,p.min_price!==null))}</ul>
          {products.some(p=>p.min_price===null) && <p className="form-hint">Os itens sem preço também podem ser adicionados à lista.</p>}
          <p className="search-alternative">Não encontrou? <Link to={createLink}>Cadastrar produto</Link></p>
        </> : <Empty title="Nenhum produto encontrado"><p>Tente outro nome ou <Link to={createLink}>cadastre esse produto</Link>.</p></Empty>}

      </div>}
    </section>
  );
}
