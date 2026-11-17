import {useCallback,useEffect,useRef,useState} from "react";
import {Link,useNavigate,useParams} from "react-router-dom";
import {useRegion} from "../region/RegionContext";
import {ShareListButton} from "../components/ShareListButton";
import {QuantityPicker} from "../components/QuantityPicker";
import {productDisplayName} from "../lib/produceGuides";
import {formatDate} from "../lib/format";
import {acceptListInvite,previewListInvite,getFamilyList,changeFamilyList,changeFamilyItem,revokeListInvites,removeListMember,getProducts,type FamilyList,type Product} from "../services/api";
import "../styles/family.css";
const statusLabels={preparation:"Em preparação",shopping:"Em compras",completed:"Concluída"};

export function ListInvitePage(){
 const {token=""}=useParams();const navigate=useNavigate();
 const [invite,setInvite]=useState<{name:string;owner_name:string}|null>(null);const [error,setError]=useState("");const [busy,setBusy]=useState(false);
 useEffect(()=>{let current=true;previewListInvite(token).then(v=>{if(current)setInvite(v);}).catch(e=>{if(current)setError(e.message);});return()=>{current=false;};},[token]);
 async function accept(){if(busy)return;setBusy(true);try{const result=await acceptListInvite(token);navigate(`/listas/${result.list.id}`,{replace:true});}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <section className="form-card"><h1>Uma lista para a família</h1>{invite && <><p><strong>{invite.owner_name}</strong> convidou você para participar de <strong>{invite.name}</strong>.</p><p>Você poderá editar e marcar produtos. Seu nome ficará visível aos participantes.</p><button className="primary-button" disabled={busy} onClick={()=>void accept()}>{busy ? "Entrando…" : "Participar desta lista"}</button></>}{error && <p role="alert" className="error-message">{error}</p>}<p><Link to="/lista">Voltar às minhas listas</Link></p></section>;
}

function ProductAddition({product,onAdd,busy}:{product:Product;onAdd:(id:number,quantity:number)=>void;busy:boolean}){
 const [quantity,setQuantity]=useState(1);const [valid,setValid]=useState(true);
 return <li className="family-add-row"><div><strong>{productDisplayName(product)}</strong><QuantityPicker compact value={quantity} unit={product.sale_unit} name={product.name} onChange={setQuantity} onValidityChange={setValid}/></div><button className="outline-button" disabled={busy||!valid} onClick={()=>onAdd(product.id,quantity)}>Adicionar</button></li>;
}

export function FamilyListPage(){
 const {id}=useParams();const listId=Number(id);const {city}=useRegion();
 const currentId=useRef(listId);currentId.current=listId;
 const [data,setData]=useState<FamilyList|null>(null);const latest=useRef<FamilyList|null>(null);
 const [name,setName]=useState("");const editingName=useRef(false);
 const [error,setError]=useState("");const [syncError,setSyncError]=useState("");const [busy,setBusy]=useState(false);const lock=useRef(false);
 const [query,setQuery]=useState("");const [results,setResults]=useState<Product[]>([]);const [searching,setSearching]=useState(false);
const [pendingCompletion,setPendingCompletion]=useState(false);
 const [invalid,setInvalid]=useState<number[]>([]);
 const apply=useCallback((next:FamilyList)=>{if(next.list.id!==currentId.current)return;if(latest.current && next.list.revision<latest.current.list.revision)return;latest.current=next;setData(next);if(!editingName.current)setName(next.list.name);},[]);
 const load=useCallback(async()=>{const next=await getFamilyList(listId);apply(next);setSyncError("");},[listId,apply]);
 useEffect(()=>{latest.current=null;setData(null);void load().catch(e=>setError(e.message));let fetching=false;const timer=window.setInterval(()=>{if(document.hidden||lock.current||fetching||(document.activeElement instanceof HTMLInputElement && document.activeElement.type!=="checkbox" && document.activeElement.closest('.family-page')))return;fetching=true;void load().catch(e=>setSyncError(e.message)).finally(()=>{fetching=false;});},5000);return()=>window.clearInterval(timer);},[load]);
 async function mutate(operation:()=>Promise<FamilyList>){if(lock.current)return;lock.current=true;setBusy(true);setError("");try{apply(await operation());}catch(e){setError((e as Error).message);await load().catch(()=>undefined);}finally{lock.current=false;setBusy(false);}}
 function itemChange(productId:number,action:"add"|"set"|"remove"|"check",quantity?:number,is_purchased?:boolean){const current=latest.current;if(!current)return;void mutate(()=>changeFamilyItem(listId,{revision:current.list.revision,product_id:productId,action,quantity,is_purchased}));}
 async function search(event:React.FormEvent){event.preventDefault();if(!query.trim())return;setSearching(true);setError("");try{setResults((await getProducts(query,city||"__none__",undefined,false,false,true)).slice(0,12));}catch(e){setError((e as Error).message);}finally{setSearching(false);}}
 async function revoke(){try{await revokeListInvites(listId);}catch(e){setError((e as Error).message);}}
 async function removeMember(userId:number){try{await removeListMember(listId,userId);await load();}catch(e){setError((e as Error).message);}}
 if(!data)return <section><h1>Lista de compras</h1><p role="status">{error||"Abrindo sua lista…"}</p><Link to="/lista">Voltar às listas</Link></section>;
 const list=data.list;const completed=list.status==="completed";const pending=list.items.filter(i=>!i.is_purchased).length;const valid=!invalid.some(id=>list.items.some(i=>i.product_id===id));
 function status(status:"preparation"|"shopping"|"completed",confirmed=false){if(!latest.current)return;if(status==="completed"&&pending&&!confirmed){setPendingCompletion(true);return;}setPendingCompletion(false);const revision=latest.current.list.revision;void mutate(()=>changeFamilyList(listId,{revision,status,complete_with_pending:confirmed}));}
 return <section className="family-page"><Link to="/lista">← Minhas listas</Link><div className="family-title"><div><h1>{list.name}</h1><p><span className="family-status">{statusLabels[list.status]}</span> · {list.items.length} produtos · {list.items.length-pending} já pegos</p></div>{data.is_owner && <ShareListButton prepare={async()=>list} disabled={busy}/>}</div>
 <p className="form-hint">Atualizada em {formatDate(list.updated_at)}</p>
 {error && <p className="notice" role="alert">{error}</p>}{syncError && <p className="notice" role="status">Não foi possível atualizar agora: {syncError} <button className="text-button" onClick={()=>void load().catch(e=>setError(e.message))}>Tentar novamente</button></p>}
 <details className="family-details"><summary>Nome e participantes ({data.participants.length})</summary><form className="family-name" onSubmit={e=>{e.preventDefault();editingName.current=false;void mutate(()=>changeFamilyList(listId,{revision:list.revision,name:name.trim()}));}}><label className="field"><span>Nome da lista</span><input value={name} maxLength={160} onFocus={()=>{editingName.current=true;}} onChange={e=>setName(e.target.value)}/></label><button className="outline-button" disabled={busy||!name.trim()}>Renomear</button></form><ul>{data.participants.map(p=><li key={p.id}>{p.name}{p.owner ? " · responsável" : ""}{data.is_owner&&!p.owner && <button className="text-button danger" disabled={busy} onClick={()=>void removeMember(p.id)}>Remover participante</button>}</li>)}</ul>{data.is_owner && <button className="text-button" onClick={()=>void revoke()}>Encerrar links de convite</button>}</details>
 {!completed && <details className="family-details"><summary>Adicionar produtos</summary><form className="search-bar" role="search" onSubmit={search}><input type="search" aria-label="Buscar produto para esta lista" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Ex.: arroz, banana"/><button className="primary-button" disabled={searching}>{searching ? "Buscando…" : "Buscar"}</button></form><ul className="family-additions">{results.map(p=><ProductAddition key={p.id} product={p} busy={busy} onAdd={(id,q)=>itemChange(id,"add",q)}/>)}</ul></details>}
 <fieldset className="family-fields" disabled={busy||completed}><legend className="basket-live">Produtos da lista</legend><ul className="family-products">{list.items.map(item=><li key={item.id} className={item.is_purchased ? "is-picked" : ""}><label className="family-product"><input type="checkbox" checked={item.is_purchased} disabled={busy||completed} onChange={()=>itemChange(item.product_id,"check",undefined,!item.is_purchased)}/>{item.product.image_url && <img src={item.product.image_url} alt="" width={56} height={56} loading="lazy"/>}<span><strong>{productDisplayName(item.product)}</strong><small>{item.quantity} {item.product.sale_unit==="kg" ? "kg" : "unidades"}</small></span></label>{!completed && <details><summary>Ajustar quantidade ou remover</summary><QuantityPicker value={Number(item.quantity)} unit={item.product.sale_unit} name={item.product.name} onChange={q=>itemChange(item.product_id,"set",q)} onValidityChange={v=>setInvalid(ids=>v ? ids.filter(id=>id!==item.product_id) : [...new Set([...ids,item.product_id])])}/><button className="text-button danger" disabled={busy} onClick={()=>itemChange(item.product_id,"remove")}>Remover produto</button></details>}</li>)}</ul></fieldset>
 {!list.items.length && <p>A lista está vazia. Adicione o primeiro produto acima.</p>}
 <div className="button-row">{completed ? <button className="outline-button" disabled={busy} onClick={()=>status("shopping")}>Reabrir compra</button> : <><button className="primary-button" disabled={busy||!valid||!list.items.length} onClick={()=>status(list.status==="preparation" ? "shopping" : "completed")}>{list.status==="preparation" ? "Começar compras" : "Concluir compra"}</button><Link className="outline-button" to={`/comparacao/${listId}`}>Comparar mercados</Link></>}</div>
 {pendingCompletion && <div className="notice"><p>Faltam {pending} produtos. Deseja concluir mesmo assim? Eles continuarão registrados como pendentes nesta lista.</p><button className="outline-button" onClick={()=>status("completed",true)}>Concluir com pendências</button> <button className="text-button" onClick={()=>setPendingCompletion(false)}>Continuar comprando</button></div>}
 {completed && <p>Compra concluída. Para repetir, use “Editar como nova” em Minhas listas.</p>}
 </section>;
}
