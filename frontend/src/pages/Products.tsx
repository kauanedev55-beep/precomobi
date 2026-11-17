import { useCallback, useEffect, useState, useRef, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { BarcodeScanner } from "../components/BarcodeScanner";
import {ProductSearchItem} from "../components/ProductSearchItem";
import {produceGuide} from "../lib/produceGuides";
import "../styles/product-results.css";
import { useRegion } from "../region/RegionContext";
import { Empty, ErrorBox, Loading } from "../components/StateViews";
import { getProductByEan, getProducts, type Product } from "../services/api";


export function Products() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const category = params.get("categoria") ?? "";
  const pricedMode=params.get("modo")!=="lista";
  const brandsMode = params.get("marcas") === "1";
  const [input, setInput] = useState(q);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(false);
  const {city} = useRegion();
  const sequence = useRef(0);

  const load = useCallback(async () => {
    const request = ++sequence.current;
    if (!q.trim() && !category && !pricedMode) {setProducts([]);setLoading(false);setError("");return;}
    setProducts([]);
    setLoading(true);
    setError("");
    try {
      const looksLikeEan = /^\d{8,14}$/.test(q.trim());
      if (looksLikeEan) {
        try {
          const data=await getProductByEan(q.trim(),city || "__none__"); if(request===sequence.current) setProducts(pricedMode ? data.filter(p=>p.min_price!==null) : data);
        } catch (err) {
          throw err;
        }
      } else {
        const data=await getProducts(q,city || "__none__",category || undefined,false,false,!brandsMode,pricedMode); if(request===sequence.current) setProducts(data);
      }
    } catch (err) {
      if(request===sequence.current) setError(err instanceof Error ? err.message : "Não foi possível carregar os produtos.");
    } finally {
      if(request===sequence.current) setLoading(false);
    }
  }, [q,city,category,brandsMode,pricedMode]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {setInput(q);}, [q]);

  function submit(event: FormEvent) {
    event.preventDefault();
    setParams({... (input.trim() ? {q:input.trim()} : {}), ...(brandsMode ? {marcas:"1"} : {}),...(!pricedMode ? {modo:"lista"} : {})});
  }

  function onBarcodeDetected(ean: string) {
    setScanning(false);
    setParams({q:ean,...(brandsMode ? {marcas:"1"} : {}),...(!pricedMode ? {modo:"lista"} : {})});
  }

  const guidedChoices=products.length>0 && products.length<=6 && products.every(p=>produceGuide(p));
  const resultListClass=guidedChoices ? "product-result-list produce-choice-grid" : "product-result-list";
  const createLink = `/produtos/novo?${new URLSearchParams(/^\d{8,14}$/.test(q) ? {ean:q} : {nome:q,categoria:category})}`;
  return (
    <section className="product-search-page">
      <h1>Adicionar produtos</h1>
      <form className="search-bar products-search" onSubmit={submit} role="search">
        <input type="search" aria-label="Buscar produto" placeholder="O que você precisa? Ex.: banana, arroz" value={input} onChange={(event) => setInput(event.target.value)} />
        <button className="primary-button" type="submit">Buscar</button>
      </form>
      <label className="priced-products-toggle"><input type="checkbox" checked={pricedMode} onChange={e=>setParams({...Object.fromEntries(params),modo:e.target.checked?"comparar":"lista"})}/> Mostrar somente produtos com preço na cidade</label>
      {pricedMode&&city&&<p className="form-hint">Preços registrados em {city==="*"?"cidades cadastradas":city}, com validade quando informada. Desmarque para montar uma lista livre.</p>}
      <details className="search-options"><summary>Mais opções</summary><div className="search-options-content">
        <button className="outline-button" type="button" onClick={() => setScanning(true)}>Ler código de barras</button>
        <label><input type="checkbox" checked={brandsMode} onChange={e=>setParams({...Object.fromEntries(params),marcas:e.target.checked ? "1" : "0"})}/> Procurar marcas e embalagens específicas</label>
        <Link to={createLink}>Cadastrar produto que não encontrei</Link>
      </div></details>
      {!city && <p className="notice">Escolha a cidade acima para consultar preços. Você pode montar a lista mesmo sem preço cadastrado.</p>}
      {scanning && <BarcodeScanner onDetected={onBarcodeDetected} onClose={() => setScanning(false)} />}

      {!q.trim() && !category && !pricedMode && <Empty title="O que você precisa comprar?">Digite o nome do produto acima. Depois, escolha o tipo e a quantidade.</Empty>}
      {(q.trim() || category || pricedMode) && loading && <Loading text="Buscando produtos..." />}
      {error && <><ErrorBox message={error} onRetry={load}/><Link className="outline-button" to={`/produtos/novo?${new URLSearchParams(/^\d{8,14}$/.test(q) ? {ean:q} : {nome:q})}`}>Cadastrar produto</Link></>}
      {(q.trim() || category || pricedMode) && !loading && !error && <div className="search-results" aria-live="polite">
        {products.length > 0 ? <>
          <p className="search-results-count">{products.length} {products.length===1 ? "produto encontrado" : "produtos encontrados"}{q && <> para <strong>“{q}”</strong></>}</p>
          <ul className={resultListClass}>{products.map(product=><ProductSearchItem key={product.id} product={product} search={params.toString()}/>)}</ul>
          {products.some(p=>p.min_price===null) && <p className="form-hint">Os itens sem preço também podem ser adicionados à lista.</p>}
          <p className="search-alternative">Não encontrou? <Link to={createLink}>Cadastrar produto</Link></p>
        </> : <Empty title={pricedMode?"Nenhum produto com preço nesta busca":"Nenhum produto encontrado"}><p>{pricedMode?"Escolha sua cidade, tente outro nome ou desmarque o filtro para montar a lista sem comparação de preço.":<>Tente outro nome ou <Link to={createLink}>cadastre esse produto</Link>.</>}</p></Empty>}

      </div>}
    </section>
  );
}
