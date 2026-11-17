import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import "../styles/mobile-clarity.css";
import { useAuth } from "../auth/AuthContext";
import { useCart } from "../cart/CartContext";
import { useRegion } from "../region/RegionContext";
import { useOffers } from "../offers/OffersContext";
import {ProductPhoto} from "../components/ProductPhoto";
import {produceGuide,productDisplayName} from "../lib/produceGuides";
import { ShoppingPhoto } from "../components/ShoppingPhoto";
import { Icon } from "../components/Icon";
import { Empty, ErrorBox, Loading } from "../components/StateViews";
import { QuantityPicker } from "../components/QuantityPicker";
import { formatDate, productSubtitle } from "../lib/format";
import { deleteShoppingList, getShoppingLists, type ShoppingList } from "../services/api";

export function ShoppingListPage() {
  const { user } = useAuth();
  const cart = useCart();
  const {city} = useRegion();
  const alerts = useOffers();
  const listOffers = alerts.offers.filter(o => cart.items.some(i => i.product.id===o.product_id));
  const navigate = useNavigate();
  const {name,setName}=cart;
  const [invalidQuantities,setInvalidQuantities]=useState<number[]>([]);
  const quantitiesValid=!invalidQuantities.some(id=>cart.items.some(i=>i.product.id===id));
  const {saving}=cart;
  const [saveError, setSaveError] = useState("");
  const savedId=cart.savedListId;
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [listsLoading, setListsLoading] = useState(false);
  const [listsError, setListsError] = useState("");

  const loadLists = useCallback(async () => {
    if (!user) return;
    setListsLoading(true);
    setListsError("");
    try {
      setLists(await getShoppingLists());
    } catch (err) {
      setListsError(err instanceof Error ? err.message : "Não foi possível carregar suas listas.");
    } finally {
      setListsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadLists();
  }, [loadLists]);


  async function saveList() {
    if (!user) {
      navigate("/login", { state: { from: "/lista", reason: "Faça login para salvar sua lista." } });
      return;
    }
    setSaveError("");
    try {
      const saved = await cart.save();
      alerts.refresh();
      setLists(current => [saved,...current.filter(list=>list.id!==saved.id)]);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Não foi possível salvar a lista.");
    }
  }

  async function remove(list: ShoppingList) {
    if (!window.confirm(`Excluir a lista “${list.name}”?`)) return;
    try {
      await deleteShoppingList(list.id);
      cart.detachSavedList(list.id);
      alerts.refresh();
      setLists((current) => current.filter((item) => item.id !== list.id));
    } catch (err) {
      setListsError(err instanceof Error ? err.message : "Não foi possível excluir a lista.");
    }
  }

  return (
    <section className="shopping-list-page">
      <div className="grocery-list-heading"><div><h1>Minha lista</h1></div><ShoppingPhoto/></div>
      {cart.items.length>0&&<div className="shopping-list-toolbar"><Link className="outline-button" to="/produtos"><Icon name="plus" size={18}/>Adicionar</Link><button className="primary-button" type="button" disabled={!quantitiesValid} onClick={()=>navigate("/comparacao/atual",{state:{name:name.trim()||"Minha compra"}})}>Comparar preços</button></div>}
      {savedId && <p className="notice good" role="status">{cart.isSaved ? "Lista salva." : "Alterações ainda não salvas."} <Link to={`/listas/${savedId}`}>Abrir lista salva</Link></p>}
      {listOffers.length>0&&<Link className="outline-button list-offer-summary" to="/avisos"><Icon name="tag" size={18}/>{listOffers.length} {listOffers.length===1?"oferta nesta lista":"ofertas nesta lista"}</Link>}
      {cart.items.length === 0 ? (
        <div className="grocery-empty"><span><Icon name="basket" size={32}/></span><div><h3>Vamos colocar o primeiro produto?</h3><p>Busque pelo nome ou leia o código de barras da embalagem.</p></div><Link className="outline-button" to="/produtos">Escolher produtos<Icon name="arrow" size={18}/></Link></div>
      ) : (
        <>
          <ul className="card-list">
            {cart.items.map((item) => (
              <li className={`list-card${item.isPurchased ? " is-picked" : ""}`} key={item.product.id}>
                <div className="shopping-produce-title">
                  <label className="picked-toggle"><input type="checkbox" checked={!!item.isPurchased} onChange={()=>cart.togglePurchased(item.product.id)} aria-label={`Já peguei ${productDisplayName(item.product)}`}/><span>Já peguei</span></label>
                  {produceGuide(item.product) && item.product.image_url && <ProductPhoto url={item.product.image_url} name={productDisplayName(item.product)} hint={produceGuide(item.product)?.hint} source={item.product.catalog_source_url} size={82}/>}
                  <div><Link className="card-title" to={`/produtos/${item.product.id}`}>{productDisplayName(item.product)}</Link>
                  <small>{productSubtitle(item.product)}</small>
                  {produceGuide(item.product) && <small className="list-produce-hint">{produceGuide(item.product)?.badge}</small>}</div>
                </div>
                <div className="card-actions">
                  <QuantityPicker onValidityChange={valid=>setInvalidQuantities(ids=>valid ? ids.filter(id=>id!==item.product.id) : [...new Set([...ids,item.product.id])])} value={item.quantity} unit={item.product.sale_unit} name={item.product.name} onChange={q=>cart.setQuantity(item.product.id,q)}/>
                  <button className="text-button danger" type="button" onClick={() => cart.remove(item.product.id)}>Remover</button>
                </div>
              </li>
            ))}
          </ul>
          <details className="list-save-options"><summary>Salvar lista (opcional)</summary><label className="field"><span>Nome da lista</span><input value={name} onChange={event=>setName(event.target.value)} maxLength={160}/></label><button className="outline-button" type="button" onClick={saveList} disabled={saving||!quantitiesValid||cart.isSaved}>{saving?"Salvando…":cart.isSaved?"Lista salva ✓":"Salvar lista"}</button></details>
          {!quantitiesValid&&<p className="error-message" role="alert">Confira o peso ou a quantidade.</p>}
          {saveError&&<p className="error-message" role="alert">{saveError}</p>}

        </>
      )}

      {cart.archivedDrafts.length>0 && <details className="list-more-actions"><summary>Rascunhos anteriores neste aparelho ({cart.archivedDrafts.length})</summary>{cart.archivedDrafts.map(d=><p key={d.id}>{d.name} · {d.items.length} produtos <button className="outline-button" onClick={()=>cart.restoreArchive(d.id)}>Continuar este rascunho</button></p>)}</details>}
      <details className="saved-lists"><summary id="listas-salvas">Listas salvas ({lists.length})</summary>
      {!user && <Empty title="Entre para ver suas listas"><Link to="/login" state={{ from: "/lista" }}>Fazer login</Link> ou <Link to="/cadastro" state={{ from: "/lista" }}>criar conta</Link>. Cada pessoa vê somente as próprias listas.</Empty>}
      {user && listsLoading && <Loading text="Carregando suas listas..." />}
      {user && listsError && <ErrorBox message={listsError} onRetry={loadLists} />}
      {user && !listsLoading && !listsError && lists.length === 0 && <Empty title="Você ainda não salvou nenhuma lista">Monte uma lista acima e clique em “Salvar lista”.</Empty>}
      {user && !listsLoading && lists.length > 0 && (
        <ul className="card-list">
          {lists.map((list) => (
            <li className="list-card" key={list.id}>
              <div>
                <Link className="card-title" to={`/listas/${list.id}`}>{list.name}</Link>
                <small>{({preparation:"Em preparação",shopping:"Em compras",completed:"Concluída"})[list.status || "preparation"]} · {list.items.length} {list.items.length === 1 ? "item" : "itens"} · criada em {formatDate(list.created_at)}</small>
              </div>
              <div className="card-actions">
                <Link className="primary-button small" to={`/listas/${list.id}`}>Abrir lista</Link>
                <button className="outline-button" type="button" onClick={() => {cart.copyAsNew(list.name,list.items.map((item) => ({ product: item.product, quantity: Number(item.quantity), isPurchased:false })));window.scrollTo({top:0,behavior:"smooth"});}}>Editar como nova</button>
                {list.owner_id===user?.id && <button className="text-button danger" type="button" onClick={() => remove(list)}>Excluir</button>}
              </div>
            </li>
          ))}
        </ul>
      )}
      </details>
    </section>
  );
}
