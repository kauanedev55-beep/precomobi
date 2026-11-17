import {useState} from "react";
import {PhotoPicker} from "./PhotoPicker";
import {uploadProductPhoto,type Product} from "../services/api";
export function ProductPhotoEditor({product,onSaved}:{product:Product;onSaved:(url:string|null)=>void}){
 const [photo,setPhoto]=useState<string|null>(null);const [preparing,setPreparing]=useState(false);const [saving,setSaving]=useState(false);const [error,setError]=useState("");const [message,setMessage]=useState("");
 async function save(){if(!photo||preparing||saving)return;setSaving(true);setError("");setMessage("");try{const updated=await uploadProductPhoto(product.id,photo);onSaved(updated.image_url);setPhoto(null);setMessage("Foto atualizada.");}catch(e){setError((e as Error).message);}finally{setSaving(false);}}
 return <details className="product-photo-editor"><summary>{product.image_url?"Trocar foto do produto":"Adicionar foto do produto"}</summary><PhotoPicker value={photo||product.image_url} onChange={value=>{setPhoto(value);setMessage("");}} onBusyChange={setPreparing} disabled={saving}/>{photo&&<button type="button" className="primary-button" disabled={saving||preparing} onClick={()=>void save()}>{saving?"Salvando…":"Salvar foto"}</button>}{error&&<p className="error-message" role="alert">{error}</p>}{message&&<p role="status">{message}</p>}</details>;
}
