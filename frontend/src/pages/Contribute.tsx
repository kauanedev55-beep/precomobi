import { useEffect, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { BarcodeScanner } from "../components/BarcodeScanner";
import { ErrorBox, Loading } from "../components/StateViews";
import { formatPrice } from "../lib/format";
import { createOffer, createPriceReport, getProductByEan, getMarkets, getProducts, type Market, type PriceReport, type Product, type Offer } from "../services/api";
import { useOffers } from "../offers/OffersContext";
import { Icon } from "../components/Icon";

function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function Contribute() {
  const [scanning, setScanning] = useState(false);
  const [params] = useSearchParams();
  const alerts = useOffers();
  const [kind, setKind] = useState(params.get("tipo")==="oferta" ? "offer" : "price");
  const [expires, setExpires] = useState("");
  const [conditionType, setConditionType] = useState("");
  const [conditions, setConditions] = useState("");
  const [createdOffer, setCreatedOffer] = useState<Offer | null>(null);
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [filteredIds, setFilteredIds] = useState<number[] | null>(null);
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

  async function scanProduct(code: string) {
    setScanning(false); setError("");
    try {
      const [product] = await getProductByEan(code);
      if (!product) throw new Error("Produto não encontrado.");
      setProducts(rows => rows.some(p => p.id === product.id) ? rows : [...rows, product]);
      setProductId(String(product.id)); setFilteredIds(null); setCreated(null);
    } catch (err) { setError(err instanceof Error ? err.message : "Não foi possível consultar o produto."); }
  }

  async function searchProduct() {
    if (!search.trim()) return;
    setSearching(true); setError(""); setProductId("");
    try {
      const rows = await getProducts(search);
      if(!rows.length) {setError("Não encontramos esse produto. Tente outro nome ou leia o código de barras."); return;}
      setProducts(current => [...new Map([...current,...rows].map(p => [p.id,p])).values()]);
      setFilteredIds(rows.map(p => p.id));
      if(rows.length===1) setProductId(String(rows[0].id));
    } catch(err) {setError(err instanceof Error ? err.message : "Não foi possível buscar o produto.");}
    finally {setSearching(false);}
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setCreated(null);
    setCreatedOffer(null);
    const normalized = price.trim().replace(",", ".");
    if (!productId) return setError("Escolha o produto.");
    if (!marketId) return setError("Escolha o mercado.");
    if (!/^\d+(\.\d{1,2})?$/.test(normalized) || Number(normalized) <= 0) return setError("Informe um preço válido, maior que zero (ex.: 24,90).");
    if(kind==="offer" && !expires) return setError("Informe até quando a promoção é válida.");
    if(kind==="offer" && (!conditionType || (conditionType==="other" && conditions.trim().length<5))) return setError("Informe as condições da promoção.");
    setSaving(true);
    setError("");
    try {
      const isToday = !date || date === todayIso();
      if(kind==="offer") {
        const offer = await createOffer({product_id:Number(productId),market_id:Number(marketId),price:normalized,
          observed_at:isToday ? undefined : new Date(`${date}T12:00:00`).toISOString(),
          expires_at:new Date(`${expires}T23:59:59`).toISOString(),
          conditions:conditionType==="all" ? "Preço para qualquer pessoa, sem clube ou quantidade mínima." : conditions.trim()});
        setCreatedOffer(offer); alerts.refresh();
      } else {
      const report = await createPriceReport({
        product_id: Number(productId),
        market_id: Number(marketId),
        price: normalized,
        observed_at: isToday ? undefined : new Date(`${date}T12:00:00`).toISOString(),
        notes: notes.trim() || undefined,
      });
      setCreated(report);
      }
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
      <span className="eyebrow"><Icon name="people" size={18}/>SUA DESCOBERTA AJUDA OUTRA PESSOA</span>
      <h1>Colaborar com um preço</h1>
      <p className="form-hint">Informe um preço que você viu no mercado e diga se é uma promoção. As informações serão públicas; suas listas de compras continuam privadas.</p>
      <fieldset className="contribution-choice"><legend>É uma promoção?</legend><label><input type="radio" name="kind" checked={kind==="price"} onChange={() => {setKind("price");setCreated(null);setCreatedOffer(null);}}/>Não, é um preço comum</label><label><input type="radio" name="kind" checked={kind==="offer"} onChange={() => {setKind("offer");setCreated(null);setCreatedOffer(null);}}/>Sim, é uma promoção</label></fieldset>
      {createdOffer && <div className="notice good" role="status">Promoção de {formatPrice(createdOffer.price)} compartilhada para {createdOffer.product_name}. <Link to="/ofertas?minhas=1">Ver minhas promoções</Link></div>}
      {created && (
        <div className="notice good" role="status">
          Preço de {formatPrice(created.price)} registrado para {created.product_name} em {created.market_name}.{" "}
          <Link to="/minhas-contribuicoes">Ver minhas contribuições</Link> · <Link to={`/produtos/${created.product_id}`}>Ver produto</Link>
        </div>
      )}
      {scanning && <BarcodeScanner onDetected={code => void scanProduct(code)} onClose={() => setScanning(false)} />}
      <button className="outline-button" type="button" onClick={() => setScanning(true)}>Ler código de barras ou QR do produto</button>
      <form className="product-search-inline" onSubmit={e => {e.preventDefault(); void searchProduct();}}><input aria-label="Nome do produto" placeholder="Ou busque pelo nome do produto" value={search} onChange={e => setSearch(e.target.value)}/><button className="outline-button" disabled={searching}>{searching ? "Buscando..." : "Buscar"}</button></form>
      {markets.length === 0 && <p className="notice">Não há mercados nesta base. O preço só pode ser salvo após os cadastros reais estarem disponíveis no servidor.</p>}
      <form className="form-card" onSubmit={submit} noValidate>
        <label className="field"><span>Produto</span>
          <select value={productId} onChange={(event) => setProductId(event.target.value)}>
            <option value="">Selecione...</option>
            {products.filter(p => !filteredIds || filteredIds.includes(p.id)).map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
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
        {kind==="offer" ? <div className="offer-fields"><h2>Detalhes da promoção</h2><label className="field"><span>Válida até</span><input type="date" min={todayIso()} value={expires} onChange={e => setExpires(e.target.value)} required/></label><label className="field"><span>Quem pode aproveitar esse preço?</span><select value={conditionType} onChange={e => setConditionType(e.target.value)} required><option value="">Escolha uma opção</option><option value="all">Qualquer pessoa, sem clube ou quantidade mínima</option><option value="other">Exige clube, quantidade mínima ou outra condição</option></select></label>{conditionType==="other" && <label className="field"><span>Descreva a condição</span><textarea maxLength={500} minLength={5} placeholder="Ex.: exige cadastro no clube da loja e compra de 3 unidades" value={conditions} onChange={e => setConditions(e.target.value)} required/></label>}<p className="form-hint">Informe a validade que você verificou. Após esse prazo, a promoção sai das promoções ativas. Se acabar antes, você pode encerrá-la em Minhas promoções; outras pessoas podem avisar que acabou.</p></div> : <label className="field"><span>Observação pública (opcional)</span><input maxLength={500} placeholder="Ex.: preço na prateleira, válido sem clube" value={notes} onChange={(event) => setNotes(event.target.value)} /></label>}
        {error && <p className="error-message" role="alert">{error}</p>}
        <button className="primary-button" type="submit" disabled={saving || markets.length === 0}>{saving ? "Compartilhando..." : kind==="offer" ? "Compartilhar promoção" : "Registrar preço"}</button>
      </form>
    </section>
  );
}
