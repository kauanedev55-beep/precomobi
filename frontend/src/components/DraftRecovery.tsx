import {useEffect,useRef} from "react";
import {useCart} from "../cart/CartContext";
import "../styles/family.css";
export function DraftRecovery(){
 const cart=useCart();const dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{if(!cart.pendingDraft)return;if(!dialog.current?.open)dialog.current?.showModal();const previous=document.body.style.overflow;document.body.style.overflow="hidden";return()=>{document.body.style.overflow=previous;};},[cart.pendingDraft]);
 if(!cart.pendingDraft)return cart.storageError ? <p className="notice" role="status">{cart.storageError}</p> : null;
 return <dialog ref={dialog} className="draft-recovery" aria-labelledby="draft-title" onCancel={e=>{e.preventDefault();cart.resumeDraft();}}><div className="form-card"><h2 id="draft-title">Sua lista está aqui</h2><p><strong>{cart.pendingDraft.name}</strong> tem {cart.pendingDraft.items.length} produtos. Quer continuar de onde parou?</p><div className="button-row"><button autoFocus className="primary-button" onClick={cart.resumeDraft}>Continuar minha lista</button><button className="outline-button" onClick={cart.startFresh}>Criar outra lista</button></div><p className="form-hint">Ao criar outra, a anterior fica em Rascunhos anteriores neste aparelho.</p></div></dialog>;
}
