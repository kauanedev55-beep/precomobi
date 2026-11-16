import {useEffect,useState} from "react";
import {Link} from "react-router-dom";
import {useAuth} from "../auth/AuthContext";
import {previewPriceImport,publishPriceImport,getLatestPriceImport,type PriceImportPreview,type PriceImportBatch} from "../services/api";
import {formatDateTime,formatPrice} from "../lib/format";

export function AdminPrices(){
 const {user}=useAuth();
 const [batch,setBatch]=useState<PriceImportBatch|null>(null);
 const [preview,setPreview]=useState<PriceImportPreview|null>(null);
 const [reviewed,setReviewed]=useState(false);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [message,setMessage]=useState("");
 const [latest,setLatest]=useState<string|null>(null);
 useEffect(()=>{if(user?.is_admin)void getLatestPriceImport().then(v=>setLatest(v.last_import_at)).catch(()=>undefined);},[user?.is_admin]);
 if(!user?.is_admin)return <section><h1>Atualização de preços</h1><p>Esta área é exclusiva da administradora.</p><Link to="/perfil">Voltar ao perfil</Link></section>;
 async function readFile(file:File|undefined){
   setError("");setMessage("");setBatch(null);setPreview(null);setReviewed(false);
   if(!file)return;
   if(file.size>250000){setError("O arquivo deve ter até 250 KB.");return;}
   try{
     const value=JSON.parse(await file.text());
     if(!value || !Array.isArray(value.entries)||!value.entries.length)throw new Error("Use um arquivo de preços revisados com a lista entries. O relatório de consulta do coletor ainda não contém preços.");
     setBatch({entries:value.entries,reviewed:false});
   }catch(e){setError(e instanceof Error ? e.message : "Não foi possível ler o arquivo.");}
 }
 async function check(){
   if(!batch||busy)return;setBusy(true);setError("");setMessage("");setReviewed(false);
   try{setPreview(await previewPriceImport(batch));}catch(e){setPreview(null);setError((e as Error).message);}finally{setBusy(false);}
 }
 async function publish(){
   if(!batch||!preview||!reviewed||busy)return;setBusy(true);setError("");
   try{
     const result=await publishPriceImport({...batch,reviewed:true});
     setMessage(`Conferência concluída: ${result.added_prices} preços e ${result.added_offers} promoções adicionados. Registros iguais não foram duplicados.`);
     const current=await getLatestPriceImport().catch(()=>null);if(current)setLatest(current.last_import_at);
     setPreview(null);setBatch(null);setReviewed(false);
   }catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }
 return <section className="form-page"><Link to="/perfil">← Meu perfil</Link><h1>Atualizar preços</h1>
 <p>Importe os valores conferidos no folheto. Primeiro você revisa produtos, lojas e validade; depois publica.</p>
 <p className="form-hint">Última importação registrada: {latest ? formatDateTime(latest) : "nenhuma nesta ferramenta"}. A consulta diária do coletor e a publicação de preços são etapas diferentes.</p>
 <div className="form-card"><label className="field"><span>Arquivo de preços revisados (.json)</span><input type="file" accept=".json,application/json" disabled={busy} onChange={e=>void readFile(e.target.files?.[0])}/></label>
 <p className="form-hint">O coletor encontra folhetos e sinaliza mudanças. Ele não garante leitura de preços em imagens. Não use preços de compra online como se fossem da loja física.</p>
 <button type="button" className="outline-button" disabled={!batch||busy} onClick={()=>void check()}>{busy ? "Conferindo…" : "Conferir arquivo"}</button></div>
 {error && <p className="error-message" role="alert">{error}</p>}{message && <p className="notice good" role="status">{message}</p>}
 {preview && <><h2>Confira antes de publicar</h2><p>{preview.rows.length} combinações de produto e loja. Preços de clube ficam nas promoções; somente o preço sem clube entra na comparação.</p>
 <ul className="card-list">{preview.rows.map(row=><li className="list-card" key={row.product_id+":"+row.market_id}><div><strong>{row.product_name}</strong><p>{row.market_name} · {row.city}</p><p>Sem clube: {row.regular_price!==null ? formatPrice(row.regular_price) : "não informado"} / {row.sale_unit==="kg" ? "kg" : "embalagem/unidade"}{row.club_price!==null && <> · {row.club_name}: {formatPrice(row.club_price)}</>}</p><p>De {formatDateTime(row.valid_from)} até {formatDateTime(row.valid_until)}</p><p>{row.conditions}</p><a href={row.source_url} target="_blank" rel="noopener noreferrer">Conferir fonte ↗</a></div></li>)}</ul>
 <label className="picked-toggle"><input type="checkbox" checked={reviewed} disabled={busy} onChange={e=>setReviewed(e.target.checked)}/><span>Conferi preços, embalagem/peso, validade e abrangência de cada loja no folheto.</span></label>
 <button type="button" className="primary-button" disabled={!reviewed||busy} onClick={()=>void publish()}>{busy ? "Publicando…" : "Publicar preços revisados"}</button></>}
 </section>;
}
