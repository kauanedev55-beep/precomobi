import {saleLabel} from "../lib/quantities";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../cart/CartContext";
import { useOffers } from "../offers/OffersContext";
import { checkOffer, endOffer, getProduct, type Offer } from "../services/api";
import { googleMapsUrl } from "../lib/navigation";
import { formatDateTime, formatPrice } from "../lib/format";
import { ProductArt } from "./ProductArt";
import { Icon } from "./Icon";

export function OfferCard({offer, onUpdated}: {offer: Offer; onUpdated?: (offer: Offer) => void}) {
  const cart = useCart();
  const alerts = useOffers();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [changing, setChanging] = useState(false);
  const [newPrice, setNewPrice] = useState("");
  const [message, setMessage] = useState("");
  const inList = cart.items.some(i => i.product.id === offer.product_id);
  const warning = offer.changed_reports + offer.ended_reports > 0;
  async function act(action: "confirmed" | "changed" | "ended" | "close" | "add") {
    setError(""); setMessage("");
    const value = newPrice.trim().replace(",", ".");
    if(action==="changed" && (!/^\d+(\.\d{1,2})?$/.test(value) || Number(value)<=0)) {setError("Informe o novo preço que você viu."); return;}
    setPending(true);
    try {
      if(action==="add") {cart.add(await getProduct(offer.product_id)); setMessage("Produto adicionado à sua lista.");}
      else {const updated = action==="close" ? await endOffer(offer.id) : await checkOffer(offer.id, action, action==="changed" ? value : undefined); onUpdated?.(updated); alerts.refresh(); setChanging(false); setMessage(action==="close" ? "Promoção encerrada." : "Obrigado! Seu aviso foi registrado.");}
    } catch (err) {setError(err instanceof Error ? err.message : "Não foi possível registrar.");}
    finally {setPending(false);}
  }
  return <article className={`offer-card ${warning ? "offer-needs-review" : ""}`}>
    <div className="offer-card-top"><span className={`offer-status ${offer.state!=="active" ? "offer-inactive" : ""}`}><Icon name="tag" size={16}/>{offer.state==="active" ? (offer.source_url ? "Oferta · catálogo oficial" : "Promoção · informada por usuário") : offer.state==="expired" ? "Validade encerrada" : "Promoção encerrada"}</span>{inList && <span className="offer-list-tag">Na sua lista</span>}</div>
    <div className="offer-product"><ProductArt category={null} imageUrl={offer.image_url} name={offer.product_name} size={64}/><div><Link to={`/produtos/${offer.product_id}`} className="offer-product-name">{offer.product_name}</Link><span className="offer-market"><Icon name="pin" size={16}/>{offer.market.name}</span></div></div>
    <strong className="offer-price">{formatPrice(offer.price)} <small>/ {saleLabel(offer.sale_unit)}</small></strong>
    <p className="offer-conditions">{offer.conditions}</p>
    <p className="offer-validity">Válida até <strong>{formatDateTime(offer.expires_at)}</strong></p>
    <p className="offer-observed">Vista em {formatDateTime(offer.observed_at)} · {offer.source_label || (offer.is_mine ? "Você compartilhou" : "Informada por outro usuário")}</p>
    {offer.source_url && <p><a href={offer.source_url} target="_blank" rel="noopener noreferrer">Conferir folheto e condições na fonte</a></p>}
    <div className="offer-trust"><Icon name="people" size={18}/><span>{offer.confirmations ? `${offer.confirmations} ${offer.confirmations===1 ? "pessoa encontrou" : "pessoas encontraram"} esse preço` : "Ainda sem confirmação de outras pessoas"}</span></div>
    {warning && <p className="offer-warning" role="status">Atenção: {offer.changed_reports} {offer.changed_reports===1 ? "aviso de preço alterado" : "avisos de preço alterado"} e {offer.ended_reports} {offer.ended_reports===1 ? "aviso de oferta encerrada" : "avisos de oferta encerrada"}. Confira na loja antes de ir.</p>}
    {offer.state==="active" && <>
      <div className="offer-main-actions"><button className="primary-button" disabled={pending || inList} onClick={() => void act("add")}><Icon name={inList ? "check" : "plus"} size={18}/>{inList ? "Já está na lista" : "Adicionar à lista"}</button><a className="outline-button" href={googleMapsUrl(offer.market)} target="_blank" rel="noopener noreferrer">Ver rota ↗</a></div>
      {offer.is_mine ? <button className="text-button" disabled={pending} onClick={() => void act("close")}>Encerrar minha promoção</button> : <div className="offer-feedback"><span>Você foi ao mercado e conferiu?</span><div><button disabled={pending || offer.my_check==="confirmed"} onClick={() => void act("confirmed")}>{offer.my_check==="confirmed" ? "✓ Você confirmou" : "Encontrei esse preço"}</button><button disabled={pending} onClick={() => setChanging(!changing)}>O preço mudou</button><button disabled={pending || offer.my_check==="ended"} onClick={() => void act("ended")}>{offer.my_check==="ended" ? "✓ Você avisou que acabou" : "A promoção acabou"}</button></div></div>}
      {changing && <form className="offer-change-form" onSubmit={e => {e.preventDefault(); void act("changed");}}><label className="field"><span>Novo preço que você viu (R$)</span><input autoFocus inputMode="decimal" value={newPrice} onChange={e => setNewPrice(e.target.value)} required/></label><button className="outline-button" disabled={pending}>Enviar aviso</button></form>}
    </>}
    {message && <p className="notice good" role="status">{message}</p>}{error && <p className="error-message" role="alert">{error}</p>}
  </article>;
}
