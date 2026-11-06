import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

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
import { createShoppingList, deleteShoppingList, getShoppingLists, type ShoppingList } from "../services/api";

export function ShoppingListPage() {
  const { user } = useAuth();
  const cart = useCart();
  const {city} = useRegion();
  const alerts = useOffers();
  const listOffers = alerts.offers.filter(o => cart.items.some(i => i.product.id===o.product_id));
  const navigate = useNavigate();
  const [name, setName] = useState("Minha compra");
  const [invalidQuantities,setInvalidQuantities]=useState<number[]>([]);
  const quantitiesValid=!invalidQuantities.some(id=>cart.items.some(i=>i.product.id===id));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [savedId,setSavedId] = useState<number | null>(null);
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

  useEffect(() => {if(cart.items.length) setSavedId(null);}, [cart.items.length]);

  async function saveList() {
    if (!user) {
      navigate("/login", { state: { from: "/lista", reason: "Faça login para salvar sua lista e compará-la." } });
      return;
    }
    setSaving(true);
    setSaveError("");
    try {
      const created = await createShoppingList({
        name: name.trim() || "Minha compra",
        items: cart.items.map((item) => ({ product_id: item.product.id, quantity: item.quantity })),
      });
      alerts.refresh();
      setLists(current => [created,...current]);
      setSavedId(created.id);
      cart.clear();
      setName("Minha compra");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Não foi possível salvar a lista.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(list: ShoppingList) {
    if (!window.confirm(`Excluir a lista “${list.name}”?`)) return;
    try {
      await deleteShoppingList(list.id);
      alerts.refresh();
      setLists((current) => current.filter((item) => item.id !== list.id));
    } catch (err) {
      setListsError(err instanceof Error ? err.message : "Não foi possível excluir a lista.");
    }
  }

  return (
    <section>
      <div className="grocery-list-heading"><div><span className="grocery-kicker">DA LISTA À SACOLA</span><h1>Minha lista de compras</h1><p>O que você precisa levar para casa? Adicione os produtos e compare os mercados da sua cidade.</p>{cart.items.length > 0 && <Link className="primary-button" to="/produtos"><Icon name="plus"/>Adicionar produtos</Link>}</div><ShoppingPhoto/></div>
      <ol className="shopping-steps" aria-label="Como organizar sua compra"><li aria-current="step"><b>1</b><span>Monte sua lista</span></li><li><b>2</b><span>Compare os mercados</span></li><li><b>3</b><span>Escolha e abra a rota</span></li></ol>
      {savedId && <p className="notice good" role="status">Lista salva na sua conta. <Link to={`/comparacao/${savedId}`}>Comparar esta lista</Link>. A lista em edição já está pronta para uma nova compra.</p>}
      {cart.items.length > 0 && <h2>Produtos da lista</h2>}
      {listOffers.length>0 && <div className="list-offer-notice"><span className="notice-icon"><Icon name="tag"/></span><div><p><strong>{listOffers.length} {listOffers.length===1 ? "promoção encontrada" : "promoções encontradas"}</strong> para produtos desta lista.</p><Link to="/avisos">Conferir condições e validade →</Link></div></div>}
      {cart.items.length === 0 ? (
        <div className="grocery-empty"><span><Icon name="basket" size={32}/></span><div><h3>Vamos colocar o primeiro produto?</h3><p>Busque pelo nome ou leia o código de barras da embalagem.</p></div><Link className="outline-button" to="/produtos">Escolher produtos<Icon name="arrow" size={18}/></Link></div>
      ) : (
        <>
          <ul className="card-list">
            {cart.items.map((item) => (
              <li className="list-card" key={item.product.id}>
                <div className="shopping-produce-title">
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
          <div className="form-card inline">
            <label className="field"><span>Nome da lista</span><input value={name} onChange={(event) => setName(event.target.value)} maxLength={160} /></label>
            <div className="button-row">
              <button className="primary-button" type="button" disabled={saving || !city || !quantitiesValid} onClick={() => navigate("/comparacao/atual",{state:{name:name.trim() || "Minha compra"}})}>Comparar sem salvar</button>
              <button className="outline-button" type="button" onClick={saveList} disabled={saving || !quantitiesValid}>{saving ? "Salvando..." : "Salvar lista"}</button>
              <button className="outline-button" type="button" onClick={cart.clear}>Começar nova lista</button>
            </div>
            {!quantitiesValid && <p className="error-message" role="alert">Confira o peso ou a quantidade dos produtos antes de continuar.</p>}
            {saveError && <p className="error-message" role="alert">{saveError}</p>}
            <p className="form-hint">{!city ? "Escolha a cidade acima para comparar." : `A comparação usa os preços mais recentes dos mercados ${city === "*" ? "nas cidades escolhidas" : `em ${city}`}.`}</p>
          </div>
        </>
      )}

      <h2 id="listas-salvas">Minhas listas salvas</h2>
      <p className="form-hint">A lista em edição é temporária: fica disponível enquanto você navega, mas não volta depois de fechar ou recarregar o aplicativo. Só fica guardada na conta quando você toca em Salvar lista. Só você tem acesso às suas listas. Informar um preço na comunidade não compartilha sua lista de compras.</p>
      {!user && <Empty title="Entre para ver suas listas"><Link to="/login" state={{ from: "/lista" }}>Fazer login</Link> ou <Link to="/cadastro" state={{ from: "/lista" }}>criar conta</Link>. Cada pessoa vê somente as próprias listas.</Empty>}
      {user && listsLoading && <Loading text="Carregando suas listas..." />}
      {user && listsError && <ErrorBox message={listsError} onRetry={loadLists} />}
      {user && !listsLoading && !listsError && lists.length === 0 && <Empty title="Você ainda não salvou nenhuma lista">Monte uma lista acima e clique em “Salvar lista”.</Empty>}
      {user && !listsLoading && lists.length > 0 && (
        <ul className="card-list">
          {lists.map((list) => (
            <li className="list-card" key={list.id}>
              <div>
                <span className="card-title">{list.name}</span>
                <small>{list.items.length} {list.items.length === 1 ? "item" : "itens"} · criada em {formatDate(list.created_at)}</small>
              </div>
              <div className="card-actions">
                <Link className="primary-button small" to={`/comparacao/${list.id}`}>Comparar</Link>
                <button className="outline-button" type="button" onClick={() => cart.replaceAll(list.items.map((item) => ({ product: item.product, quantity: Number(item.quantity) })))}>Editar como nova</button>
                <button className="text-button danger" type="button" onClick={() => remove(list)}>Excluir</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
