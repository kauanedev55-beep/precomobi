import {useRef, useState} from "react";
import {catalogCredit} from "../lib/produceGuides";
import "../styles/product-photo.css";

export function ProductPhoto({url,name,hint,source,size=112}: {url:string;name:string;hint?:string;source?:string|null;size?:number}) {
  const [failed,setFailed]=useState(false);
  const dialog=useRef<HTMLDialogElement>(null);
  const opener=useRef<HTMLButtonElement>(null);
  if(failed) return <span className="photo-unavailable">Foto indisponível. Confira o nome na etiqueta.</span>;
  function close(){dialog.current?.close();}
  return <><button type="button" ref={opener} className="product-photo-button" aria-label={`Ampliar foto de ${name}`} onClick={()=>dialog.current?.showModal()} style={{width:size}}>
    <img className="result-photo" src={url} alt={name} width={size} height={size} loading="lazy" onError={()=>setFailed(true)}/><span>Ampliar foto</span>
  </button>
  <dialog ref={dialog} className="product-photo-dialog" aria-label={`Foto ampliada de ${name}`} onClose={()=>opener.current?.focus()} onClick={e=>{if(e.target===e.currentTarget)close();}}>
    <div className="product-photo-content"><div className="product-photo-heading"><h2>{name}</h2><button type="button" className="outline-button" onClick={close} autoFocus>Fechar</button></div>
    <img src={url} alt={name} width={600} height={600} loading="lazy"/>
    {hint && <p>{hint}</p>}<p className="form-hint">Foto de referência. Tamanho e cor podem variar; confira o tipo na etiqueta do mercado.</p>
    {source && <a href={source} target="_blank" rel="noopener noreferrer">Foto e referência: {catalogCredit(source)}</a>}</div>
  </dialog></>;
}
