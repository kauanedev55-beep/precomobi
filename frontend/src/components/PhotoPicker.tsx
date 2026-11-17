import {useEffect,useRef,useState} from "react";
import {preparePhoto} from "../lib/photo";
import "../styles/product-photo-upload.css";

export function PhotoPicker({value,onChange,onBusyChange,disabled=false}:{value:string|null|undefined;onChange:(value:string|null)=>void;onBusyChange?:(busy:boolean)=>void;disabled?:boolean}){
 const camera=useRef<HTMLInputElement>(null);const gallery=useRef<HTMLInputElement>(null);const sequence=useRef(0);
 const [busy,setBusy]=useState(false);const [error,setError]=useState("");
 useEffect(()=>()=>{sequence.current+=1;},[]);
 async function select(file:File|undefined){
  if(!file)return;const request=++sequence.current;setBusy(true);onBusyChange?.(true);setError("");
  try{const image=await preparePhoto(file);if(request===sequence.current)onChange(image);}
  catch(e){if(request===sequence.current)setError(e instanceof Error?e.message:"Não foi possível preparar a foto.");}
  finally{if(request===sequence.current){setBusy(false);onBusyChange?.(false);}}
 }
 return <div className="product-photo-picker"><span className="photo-field-label">Foto do produto <small>(opcional)</small></span>
 {value&&<img className="photo-upload-preview" src={value} width={144} height={144} alt="Foto escolhida do produto"/>}
 <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={e=>{const file=e.target.files?.[0];e.target.value="";void select(file);}}/>
 <input ref={gallery} type="file" accept="image/*" hidden onChange={e=>{const file=e.target.files?.[0];e.target.value="";void select(file);}}/>
 <div className="photo-picker-actions"><button type="button" className="outline-button" disabled={disabled||busy} onClick={()=>camera.current?.click()}>Tirar foto</button><button type="button" className="outline-button" disabled={disabled||busy} onClick={()=>gallery.current?.click()}>Escolher foto</button></div>
 {busy&&<p role="status">Preparando foto…</p>}{error&&<p className="error-message" role="alert">{error}</p>}
 {value?.startsWith('data:')&&<button type="button" className="text-button" disabled={disabled||busy} onClick={()=>onChange(null)}>Remover seleção</button>}
 <small>A foto ficará visível no catálogo.</small></div>;
}
