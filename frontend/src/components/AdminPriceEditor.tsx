import "../styles/community.css";
import {useEffect,useRef,useState,type FormEvent} from "react";
import {getMarkets,getProducts,type Market,type Product,type PriceImportBatch} from "../services/api";
import {saleLabel} from "../lib/quantities";
import {productSubtitle} from "../lib/format";

function today(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;}
export function AdminPriceEditor({busy,onPreview}:{busy:boolean;onPreview:(batch:PriceImportBatch)=>Promise<void>}){
 const [markets,setMarkets]=useState<Market[]>([]);
 const [city,setCity]=useState("Serra");
 const [market,setMarket]=useState("");
 const [search,setSearch]=useState("");
 const [products,setProducts]=useState<Product[]>([]);
 const [product,setProduct]=useState<Product|null>(null);
 const [regular,setRegular]=useState("");
 const [promotion,setPromotion]=useState(false);
 const [hasClub,setHasClub]=useState(false);
 const [clubPrice,setClubPrice]=useState("");
 const [clubName,setClubName]=useState("");
 const [start,setStart]=useState(today());
 const [end,setEnd]=useState("");
 const [source,setSource]=useState("");
 const [conditions,setConditions]=useState("");
 const [error,setError]=useState("");
 const [searching,setSearching]=useState(false);
 const [marketLoading,setMarketLoading]=useState(true);
 const seq=useRef(0);
 useEffect(()=>{void getMarkets().then(setMarkets).catch(()=>setError("Não foi possível carregar as lojas. Reabra esta tela para tentar novamente.")).finally(()=>setMarketLoading(false));},[]);
 async function find(){if(!search.trim())return;const request=++seq.current;setSearching(true);setError("");setProduct(null);setProducts([]);try{const rows=await getProducts(search,undefined,undefined,false);if(request===seq.current){setProducts(rows);if(!rows.length)setError("Produto não encontrado. Cadastre o produto antes de informar o preço.");}}catch(e){if(request===seq.current)setError((e as Error).message);}finally{if(request===seq.current)setSearching(false);}}
 async function submit(event:FormEvent){
  event.preventDefault();setError("");
  if(!product||!markets.some(m=>String(m.id)===market&&m.city===city))return setError("Escolha o produto e a loja.");
  const money=(v:string)=>v.trim().replace(",",".");
  if(!/^\d+(\.\d{1,2})?$/.test(money(regular))||Number(money(regular))<=0)return setError("Informe o preço sem clube, como 12,90.");
  if(promotion&&hasClub&&(!/^\d+(\.\d{1,2})?$/.test(money(clubPrice))||!clubName.trim()))return setError("Informe o preço de clube e o nome do clube.");
  if(!start||!end||!source.trim()||conditions.trim().length<3)return setError("Preencha a validade, a fonte e as condições do preço.");
  await onPreview({entries:[{product_id:product.id,market_ids:[Number(market)],sale_unit:product.sale_unit,regular_price:money(regular),club_price:promotion&&hasClub?money(clubPrice):null,club_name:promotion&&hasClub?clubName.trim():null,valid_from:new Date(`${start}T00:00:00-03:00`).toISOString(),valid_until:new Date(`${end}T23:59:59-03:00`).toISOString(),source_url:source.trim(),conditions:conditions.trim(),channel:promotion?"physical_flyer":"physical_price",publish_offer:promotion}],reviewed:false});
 }
 return <form className="form-card" onSubmit={submit}><h2>Atualizar preço de um produto</h2><p>Preço comum entra na comparação da lista. Marque promoção somente quando houver uma oferta anunciada. Confira o preço e a validade para a loja escolhida.</p><fieldset disabled={busy||marketLoading} className="admin-price-fields">
 <div className="product-search-inline"><label className="field"><span>Buscar produto</span><input type="search" maxLength={100} value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();void find();}}} placeholder="Nome, marca ou embalagem"/></label><button className="outline-button" type="button" disabled={searching} onClick={()=>void find()}>{searching?"Buscando…":"Buscar"}</button></div>
 <label className="field"><span>Produto e apresentação</span><select required value={product?.id??""} onChange={e=>setProduct(products.find(p=>p.id===Number(e.target.value))??null)}><option value="">Escolha o produto encontrado</option>{products.map(p=><option key={p.id} value={p.id}>{p.name} · {productSubtitle(p)}</option>)}</select></label>
 <label className="field"><span>Cidade</span><select value={city} onChange={e=>{setCity(e.target.value);setMarket("");}}>{[...new Set([city,...markets.filter(m=>m.state==="ES").map(m=>m.city)])].sort().map(c=><option key={c}>{c}</option>)}</select></label>
 <label className="field"><span>Loja participante do folheto</span><select required value={market} onChange={e=>setMarket(e.target.value)}><option value="">Escolha a loja</option>{markets.filter(m=>m.city===city&&m.state==="ES").map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
 <label className="field"><span>Preço sem clube (R$){product?` / ${saleLabel(product.sale_unit)}`:""}</span><input required inputMode="decimal" placeholder="12,90" value={regular} onChange={e=>setRegular(e.target.value)}/></label>
 <label className="picked-toggle"><input type="checkbox" checked={promotion} onChange={e=>{setPromotion(e.target.checked);if(!e.target.checked)setHasClub(false);}}/><span>É uma promoção: publicar também em Promoções</span></label>
 {promotion&&<label className="picked-toggle"><input type="checkbox" checked={hasClub} onChange={e=>setHasClub(e.target.checked)}/><span>Também há desconto de clube</span></label>}
 {promotion&&hasClub&&<><label className="field"><span>Nome do clube</span><input required maxLength={80} value={clubName} onChange={e=>setClubName(e.target.value)}/></label><label className="field"><span>Preço com clube (R$)</span><input required inputMode="decimal" value={clubPrice} onChange={e=>setClubPrice(e.target.value)}/></label></>}
 <label className="field"><span>Válido a partir de</span><input type="date" required max={today()} value={start} onChange={e=>setStart(e.target.value)}/></label>
 <label className="field"><span>Válido até</span><input type="date" required min={start} value={end} onChange={e=>setEnd(e.target.value)}/></label>
 <label className="field"><span>Link da fonte oficial do preço</span><input type="url" required maxLength={500} placeholder="https://…" value={source} onChange={e=>setSource(e.target.value)}/></label>
 <label className="field"><span>Condições e abrangência</span><textarea required minLength={3} maxLength={300} placeholder="Ex.: preço da embalagem de 500 g, válido nesta loja enquanto durarem os estoques." value={conditions} onChange={e=>setConditions(e.target.value)}/></label>
 {error&&<p className="error-message" role="alert">{error}</p>}<button type="submit" className="primary-button" disabled={busy}>{busy?"Conferindo…":"Conferir antes de publicar"}</button>
 </fieldset></form>;
}
