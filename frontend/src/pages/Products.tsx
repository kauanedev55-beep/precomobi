import { useCallback, useEffect, useState, useRef, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";

import {Icon} from "../components/Icon";
import "../styles/mobile-clarity.css";
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

  useEffect(() => {setInput(q);}, [q]);

  function submit(event: FormEvent) {
    event.preventDefault();
    setParams({... (input.trim() ? {q:input.trim()} : {}), ...(brandsMode ? {marcas:"1"} : {})});
  }

  function onBarcodeDetected(ean: string) {
    setScanning(false);
    setParams({q:ean,...(brandsMode ? {marcas:"1"} : {})});
  }

  const guidedChoices=products.length>0 && products.length<=6 && products.every(p=>produceGuide(p));
  const resultListClass=guidedChoices ? "product-result-list produce-choice-grid" : "product-result-list";
  const createLink = `/produtos/novo?${new URLSearchParams(/^\d{8,14}$/.test(q) ? {ean:q} : {nome:q,categoria:category})}`;
  return (
    <section className="product-search-page">
      <h1>Adicionar produtos</h1>
      <p className="form-hint">Busque e adicione os itens à sua lista.</p>
      <form className="search-bar products-search" onSubmit={submit} role="search">
        <input type="search" aria-label="Buscar produto" placeholder="O que você precisa? Ex.: banana, arroz" value={input} onChange={(event) => setInput(event.target.value)} />
        <button className="primary-button" type="submit">Buscar</button>
      </form>
      <div className="product-search-actions"><button className="outline-button" type="button" onClick={()=>setScanning(true)}><Icon name="scan" size={18}/>Ler código</button><Link className="outline-button" to={createLink}><Icon name="plus" size={18}/>Cadastrar produto</Link></div>
      <details className="search-options product-search-filters"><summary>Filtros da busca</summary><label className="search-filter-option"><input type="checkbox" checked={brandsMode} onChange={e=>setParams({...Object.fromEntries(params),marcas:e.target.checked?"1":"0"})}/>Mostrar marcas e embalagens</label></details>
      {!city && <p className="notice">Escolha a cidade para comparar preços.</p>}
      {scanning && <BarcodeScanner onDetected={onBarcodeDetected} onClose={() => setScanning(false)} />}

      {!q.trim() && !category && <Empty title="O que você precisa comprar?">Digite o nome do produto acima. Depois, escolha o tipo e a quantidade.</Empty>}
      {(q.trim() || category) && loading && <Loading text="Buscando produtos..." />}
      {error && <><ErrorBox message={error} onRetry={load}/><Link className="outline-button" to={`/produtos/novo?${new URLSearchParams(/^\d{8,14}$/.test(q) ? {ean:q} : {nome:q})}`}>Cadastrar produto</Link></>}
      {(q.trim() || category) && !loading && !error && <div className="search-results" aria-live="polite">
        {products.length > 0 ? <>
          <p className="search-results-count">{products.length} {products.length===1 ? "produto encontrado" : "produtos encontrados"}{q && <> para <strong>“{q}”</strong></>}</p>
          <ul className={resultListClass}>{products.map(product=><ProductSearchItem key={product.id} product={product} search={params.toString()}/>)}</ul>
          {products.some(p=>p.min_price===null) && <p className="form-hint">Os itens sem preço também podem ser adicionados à lista.</p>}
        </> : <Empty title="Nenhum produto encontrado"><p>Tente outro nome ou cadastre o item.</p><Link className="outline-button" to={createLink}>Cadastrar produto</Link></Empty>}

      </div>}
    </section>
  );
}
