import {useEffect,useRef,useState} from "react";
import {Link} from "react-router-dom";
import {useCart} from "../cart/CartContext";
import {produceGuide,productDisplayName} from "../lib/produceGuides";
import {formatPrice,productSubtitle,formatDate} from "../lib/format";
import type {Product} from "../services/api";
import {ProductPhoto} from "./ProductPhoto";
import {QuantityPicker} from "./QuantityPicker";

export function ProductSearchItem({product,search}:{product:Product;search:string}) {
  const cart=useCart();
  const [quantity,setQuantity]=useState(1);
  const [valid,setValid]=useState(true);
  const [added,setAdded]=useState(false);
  const locked=useRef(false);
  const guide=produceGuide(product);
  const displayName=productDisplayName(product);
  useEffect(()=>{
    if(!added) return;
    const timer=window.setTimeout(()=>{locked.current=false;setAdded(false);},1200);
    return ()=>window.clearTimeout(timer);
  },[added]);
  return <li className="product-result">
    {product.image_url && <ProductPhoto url={product.image_url} name={displayName} hint={guide?.hint} source={product.catalog_source_url}/>}
    <div className="result-description"><Link to={`/produtos/${product.id}`} state={{search}} className="result-name">{displayName}</Link><p>{productSubtitle(product)}</p>{guide && <span className="produce-choice-badge">{guide.badge}</span>}
      {product.min_price!==null && <div className="result-price"><strong>{formatPrice(product.min_price)} <small>{product.sale_unit==="kg" ? "/ kg" : "/ embalagem ou unidade"}</small></strong><span>Menor preço informado · {product.min_price_market}</span>{product.min_price_expires_at && <small>Sem clube · válido até {formatDate(product.min_price_expires_at)}</small>}</div>}
    </div>
    <div className="result-actions inline-add-controls">
      <QuantityPicker compact value={quantity} unit={product.sale_unit} name={displayName} onChange={setQuantity} onValidityChange={setValid}/>
      <button className="primary-button" type="button" disabled={!valid || added} aria-label={added ? `${displayName} adicionado à cesta` : `Adicionar ${displayName} à cesta com a quantidade escolhida`} onClick={()=>{
        if(!valid || locked.current) return;
        locked.current=true;
        cart.add(product,quantity);
        setAdded(true);
      }}>{added ? "Adicionado ✓" : "Adicionar"}</button>
    </div>
  </li>;
}
