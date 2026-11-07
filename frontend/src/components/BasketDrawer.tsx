import {useEffect,useRef,useState} from "react";
import {useNavigate} from "react-router-dom";
import {useCart} from "../cart/CartContext";
import {useRegion} from "../region/RegionContext";
import {useOffers} from "../offers/OffersContext";
import {cartItemsPayload} from "../lib/cartItems";
import {productDisplayName} from "../lib/produceGuides";
import {productSubtitle} from "../lib/format";
import {quantityLabel} from "../lib/quantities";
import {createShoppingList,updateShoppingList} from "../services/api";
import {Icon} from "./Icon";
import {QuantityPicker} from "./QuantityPicker";
import "../styles/basket.css";

function BasketThumbnail({url,name}:{url?:string|null;name:string}) {
  const [failed,setFailed]=useState(false);
  return <span className="basket-thumbnail">{url && !failed ? <img src={url} alt={name} width={64} height={64} loading="lazy" onError={()=>setFailed(true)}/> : <Icon name="basket" size={28}/>}</span>;
}

export function BasketDrawer() {
  const cart=useCart();
  const {city}=useRegion();
  const {refresh}=useOffers();
  const navigate=useNavigate();
  const dialog=useRef<HTMLDialogElement>(null);
  const opener=useRef<HTMLButtonElement>(null);
  const dragStart=useRef<number|null>(null);
  const previous=useRef(cart.items);
  const [open,setOpen]=useState(false);
  const [announcement,setAnnouncement]=useState("");
  const [invalid,setInvalid]=useState<number[]>([]);
  const [name,setName]=useState("Minha compra");
  const [saving,setSaving]=useState(false);
  const [saveError,setSaveError]=useState("");
  const [savedSignature,setSavedSignature]=useState("");
  const [savedId,setSavedId]=useState<number|null>(null);
  const saveLock=useRef(false);
  const signature=JSON.stringify({name:name.trim() || "Minha compra",items:cartItemsPayload(cart.items)});
  const valid=!invalid.some(id=>cart.items.some(item=>item.product.id===id));
  const picked=cart.items.filter(item=>item.isPurchased).length;

  useEffect(()=>{
    const added=cart.items.find(item=>item.quantity>(previous.current.find(old=>old.product.id===item.product.id)?.quantity ?? 0));
    previous.current=cart.items;
    if(added) setAnnouncement(`${productDisplayName(added.product)} adicionado · ${quantityLabel(added.quantity,added.product.sale_unit)} na lista`);
  },[cart.items]);
  useEffect(()=>{
    if(!announcement) return;
    const timer=window.setTimeout(()=>setAnnouncement(""),4000);
    return ()=>window.clearTimeout(timer);
  },[announcement]);
  useEffect(()=>{
    const element=dialog.current;
    if(!element) return;
    if(!open) {if(element.open) element.close();return;}
    if(!element.open) element.showModal();
    const previousOverflow=document.body.style.overflow;
    document.body.style.overflow="hidden";
    return ()=>{document.body.style.overflow=previousOverflow;};
  },[open]);

  function close(){setOpen(false);}
  async function save() {
    if(!valid || !cart.items.length || saveLock.current || savedSignature===signature) return;
    saveLock.current=true;setSaving(true);setSaveError("");
    const snapshot=signature;
    try {
      const payload={name:name.trim() || "Minha compra",items:cartItemsPayload(cart.items)};
      const saved=await (savedId===null ? createShoppingList(payload) : updateShoppingList(savedId,payload));
      setSavedId(saved.id);
      setSavedSignature(snapshot);refresh();
    } catch(error) {
      setSaveError(error instanceof Error ? error.message : "Não foi possível salvar sua lista. Tente novamente.");
    } finally {saveLock.current=false;setSaving(false);}
  }

  return <>
    {cart.items.length>0 && <button ref={opener} className="basket-peek" type="button" aria-haspopup="dialog" aria-controls="shopping-basket" aria-expanded={open} onClick={()=>setOpen(true)}>
      <span className="basket-peek-icon"><Icon name="basket"/></span>
      <span className="basket-peek-copy"><strong>Minha cesta · {cart.items.length} {cart.items.length===1 ? "produto" : "produtos"}</strong><span>{announcement || (picked ? `${picked} já ${picked===1 ? "marcado" : "marcados"} · Toque para conferir` : "Conferir produtos e quantidades")}</span></span>
      <span className="basket-peek-arrow" aria-hidden="true">⌃</span>
    </button>}
    <span className="basket-live" role="status" aria-live="polite">{announcement}</span>
    <dialog ref={dialog} id="shopping-basket" className="basket-drawer" aria-labelledby="basket-title" aria-describedby="basket-description" onClose={()=>{setOpen(false);opener.current?.focus({preventScroll:true});}} onCancel={close} onClick={event=>{
      if(event.target!==event.currentTarget) return;
      const bounds=event.currentTarget.getBoundingClientRect();
      if(event.clientX<bounds.left || event.clientX>bounds.right || event.clientY<bounds.top || event.clientY>bounds.bottom) close();
    }}>
      <button className="basket-handle" type="button" aria-label="Recolher cesta e continuar pesquisando" onClick={close} onPointerDown={event=>{dragStart.current=event.clientY;event.currentTarget.setPointerCapture(event.pointerId);}} onPointerUp={event=>{if(dragStart.current!==null && event.clientY-dragStart.current>40) close();dragStart.current=null;}} onPointerCancel={()=>{dragStart.current=null;}}><span/></button>
      <header className="basket-heading"><div><h2 id="basket-title">Minha cesta</h2><p id="basket-description">{cart.items.length} {cart.items.length===1 ? "produto" : "produtos"}{picked>0 ? ` · ${picked} já ${picked===1 ? "marcado" : "marcados"}` : " · Sua lista, do seu jeito"}</p></div><button autoFocus type="button" className="outline-button" onClick={close}>Continuar buscando <span aria-hidden="true">⌄</span></button></header>
      <div className="basket-scroll">
        {cart.items.length===0 ? <p className="basket-empty">Sua cesta está vazia. Recolha a lista para escolher produtos.</p> : <ul className="basket-items">{cart.items.map(item=>{
          const displayName=productDisplayName(item.product);
          return <li key={item.product.id} className={`basket-item${item.isPurchased ? " is-picked" : ""}`}>
            <div className="basket-item-heading"><BasketThumbnail url={item.product.image_url} name={displayName}/><div><strong>{displayName}</strong><small>{productSubtitle(item.product)}</small><label className="picked-toggle"><input type="checkbox" checked={!!item.isPurchased} onChange={()=>cart.togglePurchased(item.product.id)}/><span>Já peguei<span className="basket-live"> {displayName}</span></span></label></div></div>
            <div className="basket-item-actions"><QuantityPicker value={item.quantity} unit={item.product.sale_unit} name={displayName} onChange={quantity=>cart.setQuantity(item.product.id,quantity)} onValidityChange={isValid=>setInvalid(ids=>isValid ? ids.filter(id=>id!==item.product.id) : [...new Set([...ids,item.product.id])])}/><button type="button" className="text-button danger" aria-label={`Remover ${displayName} da cesta`} onClick={()=>cart.remove(item.product.id)}>Remover</button></div>
          </li>;
        })}</ul>}
      </div>
      <footer className="basket-footer">
        {cart.items.length>0 && <><label className="field basket-name"><span>Nome da lista</span><input value={name} maxLength={160} onChange={event=>setName(event.target.value)}/></label>
        <div className="basket-footer-actions"><button className="outline-button" type="button" disabled={saving || !valid || signature===savedSignature} onClick={()=>void save()}>{saving ? "Salvando…" : signature===savedSignature ? "Lista salva ✓" : "Salvar lista"}</button><button className="primary-button" type="button" disabled={!city || !valid || saving} onClick={()=>{close();navigate("/comparacao/atual",{state:{name:name.trim() || "Minha compra"}});}}>Comparar mercados</button></div>
        {!valid && <p className="error-message" role="alert">Confira o peso ou a quantidade antes de continuar.</p>}
        {saveError && <p className="error-message" role="alert">{saveError}</p>}
        {savedSignature && <p className="basket-save-status" role="status">{savedSignature===signature ? "Lista salva na sua conta. Você pode continuar comprando." : "Você alterou a lista. Salve novamente para guardar as mudanças."}</p>}
        <p className="form-hint">{!city ? "Você pode usar e salvar a lista sem escolher mercado. Se quiser comparar, escolha sua cidade na pesquisa." : "Use só como lista ou compare os mercados quando quiser."}</p></>}
      </footer>
    </dialog>
  </>;
}
