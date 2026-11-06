import {useState, type FormEvent} from "react";
import {Link, useSearchParams} from "react-router-dom";
import {BarcodeScanner} from "../components/BarcodeScanner";
import {useCart} from "../cart/CartContext";
import {QuantityPicker} from "../components/QuantityPicker";
import {createProduct, type Product} from "../services/api";
import {productSubtitle} from "../lib/format";

const categories=["Frutas","Verduras","Legumes","Grãos","Laticínios","Carnes e pescados","Bebidas","Padaria","Massas","Mercearia","Doces","Limpeza","Higiene","Outros"];
const packages=["A granel","Saco","Pacote","Caixa","Garrafa","Lata","Pote","Bandeja","Maço","Unidade","Outro"];
export function ProductCreatePage() {
  const [params]=useSearchParams();const cart=useCart();
  const back=params.get("origem")==="contribuir" ? "/contribuir" : "/produtos";
  const [name,setName]=useState(params.get("nome") || "");const [category,setCategory]=useState(params.get("categoria") || "");
  const [saleUnit,setSaleUnit]=useState<"unit"|"kg">("unit");const [packaging,setPackaging]=useState("");
  const [amount,setAmount]=useState("");const [amountUnit,setAmountUnit]=useState("g");
  const [brand,setBrand]=useState("");const [noBrand,setNoBrand]=useState(false);
  const [ean,setEan]=useState(params.get("ean") || "");const [noBarcode,setNoBarcode]=useState(false);
  const [description,setDescription]=useState("");const [scanning,setScanning]=useState(false);
  const [saving,setSaving]=useState(false);const [error,setError]=useState("");const [created,setCreated]=useState<Product|null>(null);
  const [quantity,setQuantity]=useState(1);const [quantityValid,setQuantityValid]=useState(true);const [added,setAdded]=useState(false);
  async function submit(e:FormEvent) {
    e.preventDefault();setError("");
    if(!noBrand && !brand.trim()) {setError("Informe a marca ou marque Sem marca.");return;}
    if(!noBarcode && !ean.trim()) {setError("Informe o código ou marque Sem código de barras.");return;}
    setSaving(true);
    try {setCreated(await createProduct({name:name.trim(),category,brand:noBrand?null:brand.trim(),no_brand:noBrand,
      ean:noBarcode?null:ean.trim(),no_barcode:noBarcode,sale_unit:saleUnit,packaging,
      quantity_value:saleUnit==="kg" ? "1" : amount.trim().replace(",","."),quantity_unit:saleUnit==="kg" ? "kg" : amountUnit,description:description.trim() || null}));}
    catch(err) {setError(err instanceof Error ? err.message : "Não foi possível cadastrar. Seus dados continuam aqui.");}
    finally {setSaving(false);}
  }
  return <section className="product-create-page">
    <Link className="outline-button back-button" to={back}>← Voltar para {back==="/contribuir" ? "colaboração" : "produtos"}</Link>
    {created ? <div className="form-card product-create-success"><span className="grocery-kicker">PRODUTO CADASTRADO</span><h1>{created.name}</h1><p>{productSubtitle(created)}</p><p role="status">Já está no catálogo do PreçoMobi, mesmo sem existir na API externa. Ainda não há preço informado.</p><QuantityPicker onValidityChange={setQuantityValid} name={created.name} value={quantity} unit={created.sale_unit} onChange={v=>{setQuantity(v);setAdded(false);}}/><div className="button-row"><button className="primary-button" disabled={added || !quantityValid} onClick={()=>{cart.add(created,quantity);setAdded(true);}}>{added ? "Adicionado à lista ✓" : "Adicionar à minha lista"}</button><Link className="outline-button" to="/lista">Ir para minha lista</Link><Link className="outline-button" to={`/contribuir?produto=${created.id}`}>Informar preço no mercado</Link></div><Link className="text-button" to={`/produtos/${created.id}`}>Ver ficha do produto</Link></div> : <>
    <span className="grocery-kicker">NÃO ENCONTROU? CADASTRE AQUI</span><h1>Cadastrar produto</h1>
    <p>Cadastre o produto que você usa em casa. Não precisa existir na API externa. O cadastro é compartilhado; sua lista continua privada.</p>
    <form className="form-card product-create-form" onSubmit={submit}>
      <fieldset><legend>1. Qual é o produto?</legend><label className="field"><span>Nome completo e variedade</span><input required minLength={3} maxLength={180} value={name} onChange={e=>setName(e.target.value)} placeholder="Ex.: Banana prata ou Arroz branco tipo 1"/></label><label className="field"><span>Categoria</span><select required value={category} onChange={e=>setCategory(e.target.value)}><option value="">Escolha a categoria</option>{categories.map(c=><option key={c}>{c}</option>)}</select></label>
      <label className="field"><span>Marca</span><input required={!noBrand} disabled={noBrand} maxLength={120} value={brand} onChange={e=>setBrand(e.target.value)}/></label><label className="product-check"><input type="checkbox" checked={noBrand} onChange={e=>{setNoBrand(e.target.checked);if(e.target.checked)setBrand("");}}/>Sem marca (ex.: fruta a granel)</label></fieldset>
      <fieldset><legend>2. Como é vendido?</legend><div className="sale-unit-options"><label><input type="radio" name="saleUnit" checked={saleUnit==="unit"} onChange={()=>{setSaleUnit("unit");setPackaging("");}}/>Por unidade ou embalagem<span>Ex.: um pacote de arroz ou um maço de couve</span></label><label><input type="radio" name="saleUnit" checked={saleUnit==="kg"} onChange={()=>{setSaleUnit("kg");setPackaging("A granel");}}/>Por quilo (kg)<span>Ex.: banana, tomate ou batata pesados na balança</span></label></div>
      <label className="field"><span>Tipo de embalagem / apresentação</span><select required value={packaging} onChange={e=>setPackaging(e.target.value)}><option value="">Escolha a apresentação</option>{packages.filter(p=>saleUnit==="kg" || p!=="A granel").map(p=><option key={p}>{p}</option>)}</select></label>
      {saleUnit==="kg" ? <p className="notice">O preço será informado por <strong>1 kg</strong>. Na lista você escolhe o peso que pretende levar, como 0,750 kg. O peso real só será conhecido após pesar no mercado.</p> : <div className="product-form-columns"><label className="field"><span>Conteúdo líquido por embalagem</span><input required inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="Ex.: 500"/></label><label className="field"><span>Medida do conteúdo</span><select value={amountUnit} onChange={e=>setAmountUnit(e.target.value)}><option value="g">Gramas (g)</option><option value="kg">Quilos (kg)</option><option value="ml">Mililitros (ml)</option><option value="L">Litros (L)</option><option value="un">Unidades (un)</option></select></label></div>}
      <p className="form-hint">Informe o conteúdo da embalagem, sem o peso do saco, da bandeja ou do pote. Para um maço sem peso declarado, use 1 unidade.</p></fieldset>
      <fieldset><legend>3. Código e detalhes</legend><label className="field"><span>Código de barras</span><input inputMode="numeric" maxLength={14} required={!noBarcode} disabled={noBarcode} value={ean} onChange={e=>setEan(e.target.value.replace(/\D/g,""))}/></label><button className="outline-button" type="button" disabled={noBarcode} onClick={()=>setScanning(true)}>Ler código com a câmera</button><label className="product-check"><input type="checkbox" checked={noBarcode} onChange={e=>{setNoBarcode(e.target.checked);if(e.target.checked)setEan("");}}/>Sem código de barras</label><label className="field"><span>Detalhes adicionais (opcional)</span><textarea maxLength={500} value={description} onChange={e=>setDescription(e.target.value)} placeholder="Ex.: orgânico, sem lactose, variedade ou informação da embalagem"/></label></fieldset>
      {error && <p className="error-message" role="alert">{error}</p>}<div className="button-row"><button className="primary-button" disabled={saving}>{saving ? "Cadastrando..." : "Cadastrar produto"}</button><Link className="outline-button" to={back}>Voltar sem cadastrar</Link></div>
    </form></>}
    {scanning && <BarcodeScanner onDetected={code=>{setEan(code);setScanning(false);}} onClose={()=>setScanning(false)}/>}
  </section>;
}
