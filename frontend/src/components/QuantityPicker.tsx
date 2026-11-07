import {useEffect, useState} from "react";
import {parseQuantity, type SaleUnit} from "../lib/quantities";

export function QuantityPicker({value, unit, name, onChange, onValidityChange, compact=false}: {value:number;unit:SaleUnit;name:string;onChange:(value:number)=>void;onValidityChange?:(valid:boolean)=>void;compact?:boolean}) {
  const [text,setText]=useState(String(value).replace(".",","));
  const [error,setError]=useState("");
  useEffect(() => {setText(String(value).replace(".",","));setError("");},[value]);
  function commit() {
    const parsed=parseQuantity(text,unit);
    if(parsed===null) {onValidityChange?.(false);setError(unit==="kg" ? "Informe o peso em kg, como 0,750 (750 g)." : "Informe uma quantidade inteira, como 2.");return;}
    setError("");onValidityChange?.(true);onChange(parsed);
  }
  function step(direction:number) {const amount=unit==="kg" ? 0.1 : 1;const next=Math.max(unit==="kg" ? 0.001 : 1, Math.round((value+direction*amount)*1000)/1000);setText(String(next).replace(".",","));setError("");onValidityChange?.(true);onChange(next);}
  return <div className="quantity-control"><span>{unit==="kg" ? (compact ? "Peso (kg)" : "Peso que vou levar (kg)") : (compact ? "Quantidade" : "Quantidade de embalagens / unidades")}</span><div className="quantity-buttons"><button type="button" aria-label={`Diminuir quantidade de ${name}`} onClick={()=>step(-1)}>−</button><input aria-label={`${unit==="kg" ? "Peso em kg" : "Quantidade"} de ${name}`} inputMode={unit==="kg" ? "decimal" : "numeric"} value={text} maxLength={12} aria-invalid={!!error} onChange={e=>{setText(e.target.value);setError("");onValidityChange?.(parseQuantity(e.target.value,unit)!==null);}} onKeyDown={event=>{if(event.key==="Enter"){event.preventDefault();commit();}}} onBlur={commit}/><button type="button" aria-label={`Aumentar quantidade de ${name}`} onClick={()=>step(1)}>+</button><strong>{unit==="kg" ? "kg" : "un."}</strong></div>{unit==="kg" && <small>{compact ? "500 g = 0,500 kg" : "500 g = 0,500 kg · 750 g = 0,750 kg"}</small>}{error && <small className="error-message" role="alert">{error}</small>}</div>;
}
