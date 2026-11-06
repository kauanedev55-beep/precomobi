import { useCallback, useEffect, useState, useRef, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { BarcodeScanner } from "../components/BarcodeScanner";
import {ProductPhoto} from "../components/ProductPhoto";
import {produceGuide,productDisplayName,catalogCredit} from "../lib/produceGuides";
import { ProductArt } from "../components/ProductArt";
import "../styles/product-results.css";
import { useRegion } from "../region/RegionContext";
import { useCart } from "../cart/CartContext";
import { Empty, ErrorBox, Loading } from "../components/StateViews";
import { formatPrice, productSubtitle } from "../lib/format";
import { getProductByEan, getProducts, type Product } from "../services/api";


export function Products() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const category = params.get("categoria") ?? "";
  const expandedSearch = params.get("ampliar") === "1";
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
        const data=await getProducts(q,city || "__none__",category || undefined,expandedSearch,!brandsMode); if(request===sequence.current) setProducts(data);
      }
    } catch (err) {
      if(request===sequence.current) setError(err instanceof Error ? err.message : "Não foi possível carregar os produtos.");
    } finally {
      if(request===sequence.current) setLoading(false);
    }
  }, [q,city,category,expandedSearch,brandsMode]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {setInput(q);setAdded(null);}, [q]);

  function submit(event: FormEvent) {
    event.preventDefault();
    setParams({... (input.trim() ? {q:input.trim()} : {}), ...(brandsMode ? {marcas:"1"} : {})});
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

  const guidedChoices=products.length>0 && products.length<=6 && products.every(p=>produceGuide(p));
  const resultListClass=guidedChoices ? "product-result-list produce-choice-grid" : "product-result-list";
  const priced = products.filter(p => p.min_price !== null);
  const unpriced = products.filter(p => p.min_price === null);
  const createLink = `/produtos/novo?${new URLSearchParams(/^\d{8,14}$/.test(q) ? {ean:q} : {nome:q,categoria:category})}`;
  function productRow(product: Product, hasPrice: boolean) {
    const wasAdded=added===product.id;
    const guide=produceGuide(product);
    const displayName=productDisplayName(product);
    return <li className="product-result" key={product.id}>
      {product.image_url && <ProductPhoto key={product.image_url} url={product.image_url} name={displayName} hint={guide?.hint} source={product.catalog_source_url}/>}
      <div className="result-description"><Link to={`/produtos/${product.id}`} className="result-name">{displayName}</Link><p>{productSubtitle(product)}</p>{guide && <><span className="produce-choice-badge">{guide.badge}</span><p className="produce-choice-hint">{guide.hint}</p></>}{!product.quantity_value && product.sale_unit!=="kg" && <small>Conteúdo da embalagem não informado</small>}
      {product.catalog_source_url && <a className="result-source" href={product.catalog_source_url} target="_blank" rel="noopener noreferrer">Foto e referência: {catalogCredit(product.catalog_source_url)}</a>}
      {hasPrice && <div className="result-price"><strong>{formatPrice(product.min_price)} <small>{product.sale_unit==="kg" ? "/ kg" : "/ embalagem ou unidade"}</small></strong><span>Menor preço informado · {product.min_price_market}</span></div>}</div>
      <div className="result-actions"><button className={hasPrice ? "primary-button" : "outline-button"} type="button" onClick={()=>{if(product.sale_unit==="kg") {navigate(`/produtos/${product.id}`);return;} cart.add(product);setAdded(product.id);}} aria-label={product.sale_unit==="kg" ? `Escolher peso de ${product.name}` : `Adicionar ${product.name} à lista`}>{wasAdded ? "Adicionar mais uma" : product.sale_unit==="kg" ? "Escolher peso" : "Adicionar à lista"}</button>{!hasPrice && <Link to={`/contribuir?produto=${product.id}`} className="text-button">Informar preço</Link>}</div>
    </li>;
  }
  return (
    <section className="product-search-page">
      <span className="grocery-kicker">O QUE VAI NA SUA SACOLA?</span><h1>Adicionar produtos</h1>
      <p>Escolha o alimento e a quantidade. Marcas e embalagens específicas ficam em uma busca separada.</p>
      <nav className="offer-tabs" aria-label="Tipo de produto"><button type="button" className={!brandsMode ? "outline-button" : "text-button"} aria-pressed={!brandsMode} onClick={()=>setParams({...Object.fromEntries(params),marcas:"0",ampliar:"0"})}>Produtos do dia a dia</button><button type="button" className={brandsMode ? "outline-button" : "text-button"} aria-pressed={brandsMode} onClick={()=>setParams({...Object.fromEntries(params),marcas:"1",ampliar:"0"})}>Marcas e embalagens</button></nav>
      {added !== null && <p className="notice good" role="status">Produto adicionado. <Link to="/lista">Ver minha lista</Link></p>}
      <Link className="outline-button back-button" to="/lista">← Minha lista</Link>
      <div className="produce-categories" aria-label="Hortifruti">{["Frutas","Verduras","Legumes"].map(c=><button type="button" key={c} aria-pressed={category===c} onClick={()=>{setInput("");setParams({categoria:c});}}>{c}</button>)}</div>
      <div className="grocery-search-picks" aria-label="Buscas rápidas"><span>Itens do dia a dia</span>{[{name:"Arroz",category:"Grãos"},{name:"Feijão",category:"Grãos"},{name:"Leite",category:"Laticínios"},{name:"Café",category:"Bebidas"}].map(p => <button type="button" key={p.name} onClick={() => {setInput(p.name);setParams({q:p.name});}}><ProductArt name={p.name} category={p.category} size={30}/>{p.name}</button>)}</div>
      <form className="search-bar products-search" onSubmit={submit} role="search">
        <input aria-label="Buscar produto" placeholder={brandsMode ? "Nome, marca ou código de barras" : "Ex.: batatas, feijão, banana"} value={input} onChange={(event) => setInput(event.target.value)} />
        <button className="primary-button" type="submit">Buscar</button>
        <button className="outline-button" type="button" onClick={() => setScanning(true)}>📷 Ler código de barras / QR</button>
      </form>
      <div className="product-search-status">{(q.trim() || category) && <><p>Resultados para <strong>“{q || category}”</strong></p><button className="text-button" type="button" onClick={() => {setInput("");setParams({});setScanError("");setProducts([]);}}>Limpar busca</button></>}</div>
      {!city && <p className="notice">Escolha a cidade acima para consultar preços. Você pode montar a lista mesmo sem preço cadastrado.</p>}
      {scanError && <div className="notice" role="alert"><p>{scanError}</p><Link className="outline-button" to={`/produtos/novo?ean=${encodeURIComponent(missingCode)}`}>Cadastrar esse produto</Link></div>}
      {scanning && <BarcodeScanner onDetected={onBarcodeDetected} onClose={() => setScanning(false)} />}

      {!q.trim() && !category && <Empty title="O que você precisa comprar?">Digite um nome e toque em Buscar, escolha um item do dia a dia ou leia o código de barras.</Empty>}
      {(q.trim() || category) && loading && <Loading text="Buscando produtos..." />}
      {error && <><ErrorBox message={error} onRetry={load}/><Link className="outline-button" to={`/produtos/novo?${new URLSearchParams(/^\d{8,14}$/.test(q) ? {ean:q} : {nome:q})}`}>Cadastrar sem depender da busca externa</Link></>}
      {(q.trim() || category) && !loading && !error && <div className="search-results" aria-live="polite">
        {guidedChoices && <p className="produce-photo-note">Compare as fotos e o nome do tipo antes de adicionar. Toque em uma foto para ampliar. Cor e tamanho podem variar.</p>}
        {priced.length > 0 ? <><h2>Com preço {city && city!=="*" ? `em ${city}` : "nos mercados selecionados"} <span className="result-count">{priced.length}</span></h2><ul className={resultListClass}>{priced.map(p=>productRow(p,true))}</ul></> : <div className="search-price-empty"><h2>{products.length ? brandsMode ? "Encontramos produtos, mas ainda faltam os preços" : "Monte sua lista com os produtos abaixo" : "Ainda não encontramos esse produto"}</h2><p>{products.length ? `Ainda não há preço informado para esses produtos${city && city!=="*" ? ` em ${city}` : " na região escolhida"}. Você pode adicioná-los à lista e informar um preço quando estiver no mercado.` : "Confira o nome, leia o código de barras ou cadastre o produto que você compra."}</p></div>}
        {unpriced.length > 0 && (!brandsMode ? <><h2>Escolha o tipo de produto</h2><p className="form-hint">Adicione o que você precisa. Os preços serão mostrados quando forem informados para esse produto nos mercados.</p><ul className={resultListClass}>{unpriced.map(p=>productRow(p,false))}</ul></> : <details className="unpriced-results" open={priced.length===0} key={`${q}:${category}:${expandedSearch}:${brandsMode}`}><summary>Ver {unpriced.length} produtos sem preço</summary><p>Confira a marca e a embalagem antes de adicionar.</p><ul className={resultListClass}>{unpriced.map(p=>productRow(p,false))}</ul></details>)}
        <div className="search-next-step"><div><strong>Não encontrou o produto certo?</strong><p>Cadastre a marca, a embalagem e o tamanho que você usa. Frutas e verduras também podem ser vendidas por quilo.</p></div><Link className="outline-button" to={createLink}>Cadastrar produto</Link></div>
        {brandsMode && !products.length && q.trim().length>=3 && !category && !expandedSearch && <button className="text-button" type="button" onClick={()=>setParams({q,ampliar:"1",marcas:"1"})}>Ampliar busca de produtos</button>}
      </div>}
    </section>
  );
}
