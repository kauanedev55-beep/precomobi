import {useEffect,useId,useRef,useState} from "react";
import {createPortal} from "react-dom";
import {Link} from "react-router-dom";
import {createListInvite} from "../services/api";
import {prepareListShare,listShareText,type PreparedListShare,type ShareableList} from "../lib/listSharing";
import {Icon} from "./Icon";
import "../styles/list-sharing.css";

type Props={prepare:()=>Promise<ShareableList>;disabled?:boolean;onPrepared?:()=>void;iconOnly?:boolean;label?:string};
export function ShareListButton({prepare,disabled=false,onPrepared,iconOnly=false,label="Compartilhar lista"}:Props){
 const headingId=useId();
 const [open,setOpen]=useState(false);const [busy,setBusy]=useState(false);const [shared,setShared]=useState<PreparedListShare|null>(null);const [error,setError]=useState("");const [copied,setCopied]=useState(false);
 const dialog=useRef<HTMLDialogElement>(null);const opener=useRef<HTMLButtonElement>(null);const generation=useRef(0);const lock=useRef(false);
 useEffect(()=>()=>{generation.current++;},[]);
 useEffect(()=>{const modal=dialog.current;if(!modal)return;if(open&&!modal.open)modal.showModal();else if(!open&&modal.open)modal.close();},[open]);
 function close(){generation.current++;lock.current=false;setOpen(false);setBusy(false);setShared(null);setError("");setCopied(false);opener.current?.focus({preventScroll:true});}
 async function start(){
  if(disabled||lock.current)return;lock.current=true;const request=++generation.current;setOpen(true);setBusy(true);setShared(null);setError("");setCopied(false);
  try{const next=await prepareListShare(prepare,createListInvite,window.location.origin);if(request!==generation.current)return;setShared(next);onPrepared?.();}
  catch(e){if(request===generation.current)setError(e instanceof Error?e.message:"Não foi possível compartilhar.");}
  finally{if(request===generation.current){lock.current=false;setBusy(false);}}
 }
 async function send(){if(!shared)return;try{await navigator.share({title:shared.name,text:`Vamos fazer a lista “${shared.name}” juntos?`,url:shared.url});}catch(e){if(!(e instanceof DOMException&&e.name==="AbortError"))setError("Use o WhatsApp ou copie o link abaixo.");}}
 async function copy(){if(!shared)return;try{await navigator.clipboard.writeText(shared.url);setCopied(true);setError("");}catch{setError("Abra “Ver link e validade” para selecionar e copiar.");}}
 return <><button ref={opener} className={`outline-button share-list-button${iconOnly?" icon-only":""}`} aria-label={label} title={iconOnly?label:undefined} type="button" disabled={disabled||busy} onClick={()=>void start()}><Icon name="share" size={18}/><span className="share-list-label">{busy?"Preparando…":"Compartilhar"}</span></button>{createPortal(<dialog ref={dialog} className="share-list-dialog" aria-labelledby={headingId} onCancel={e=>{e.preventDefault();close();}} onClose={()=>{if(open)close();}} onClick={e=>{if(e.target!==e.currentTarget)return;const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();}}>
 <header><h2 id={headingId}>Compartilhar lista</h2><button className="outline-button" type="button" aria-label="Fechar compartilhamento" onClick={close}>×</button></header>
 {busy&&<p role="status">Preparando sua lista…</p>}
 {error&&<p className="error-message" role="alert">{error}</p>}
 {!busy&&!shared&&error&&<button className="outline-button" type="button" onClick={()=>void start()}>Tentar novamente</button>}
 {shared&&<><strong className="share-list-name">{shared.name}</strong><p className="share-list-permission">{shared.status==="completed"?"Quem aceitar poderá consultar e reabrir a compra. Precisa ter uma conta.":"Quem aceitar poderá editar e marcar os produtos. Precisa ter uma conta."}</p>
 <div className="share-list-actions">{typeof navigator.share==="function"&&<button className="primary-button" type="button" onClick={()=>void send()}>Enviar convite</button>}<a className="outline-button" href={`https://wa.me/?text=${encodeURIComponent(listShareText(shared))}`} target="_blank" rel="noopener noreferrer">WhatsApp ↗</a><button className="outline-button" type="button" onClick={()=>void copy()}>{copied?"Link copiado ✓":"Copiar link"}</button></div>
 <details><summary>Ver link e validade</summary><input aria-label="Link de convite" readOnly value={shared.url} onFocus={e=>e.target.select()}/><p>Válido por 7 dias. Envie apenas a quem você quer convidar.</p></details><Link className="share-list-open" to={`/listas/${shared.id}`} onClick={close}>Abrir lista compartilhada →</Link>
 </>}
 </dialog>,document.body)}</>;
}
