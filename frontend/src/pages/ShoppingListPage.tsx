import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";
import { useCart } from "../cart/CartContext";
import { useRegion } from "../region/RegionContext";
import { useOffers } from "../offers/OffersContext";
import { ShoppingPhoto } from "../components/ShoppingPhoto";
import { Icon } from "../components/Icon";
import { Empty, ErrorBox, Loading } from "../components/StateViews";
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
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
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

  async function saveAndCompare() {
    if (!city) {setSaveError("Escolha onde você quer comprar no seletor de cidade acima."); return;}
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
      navigate(`/comparacao/${created.id}`);
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
      <div className="grocery-list-heading"><div><span className="grocery-kicker">DA LISTA À SACOLA</span><h1>Minha lista de compras</h1><p>O que você precisa levar para casa? Adicione os produtos e compare os mercados da sua cidade.</p><Link className="primary-button" to="/produtos"><Icon name="plus"/>Adicionar produtos</Link></div><ShoppingPhoto/></div>
      <ol className="shopping-steps" aria-label="Como organizar sua compra"><li aria-current="step"><b>1</b><span>Monte sua lista</span></li><li><b>2</b><span>Compare os mercados</span></li><li><b>3</b><span>Escolha e abra a rota</span></li></ol>
      <h2>Produtos da lista</h2>
      {listOffers.length>0 && <div className="list-offer-notice"><span className="notice-icon"><Icon name="tag"/></span><div><p><strong>{listOffers.length} {listOffers.length===1 ? "promoção encontrada" : "promoções encontradas"}</strong> para produtos desta lista.</p><Link to="/avisos">Conferir condições e validade →</Link></div></div>}
      {cart.items.length === 0 ? (
        <div className="grocery-empty"><span><Icon name="basket" size={32}/></span><div><h3>Vamos colocar o primeiro produto?</h3><p>Busque pelo nome ou leia o código de barras da embalagem.</p></div><Link className="outline-button" to="/produtos">Escolher produtos<Icon name="arrow" size={18}/></Link></div>
      ) : (
        <>
          <ul className="card-list">
            {cart.items.map((item) => (
              <li className="list-card" key={item.product.id}>
                <div>
                  <Link className="card-title" to={`/produtos/${item.product.id}`}>{item.product.name}</Link>
                  <small>{productSubtitle(item.product)}</small>
                </div>
                <div className="card-actions">
                  <label className="qty">
                    <span className="sr-only">Quantidade de {item.product.name}</span>
                    <button type="button" aria-label="Diminuir" onClick={() => cart.setQuantity(item.product.id, item.quantity - 1)}>−</button>
                    <input type="number" min={1} value={item.quantity} onChange={(event) => cart.setQuantity(item.product.id, Math.max(1, Number(event.target.value) || 1))} />
                    <button type="button" aria-label="Aumentar" onClick={() => cart.setQuantity(item.product.id, item.quantity + 1)}>+</button>
                  </label>
                  <button className="text-button danger" type="button" onClick={() => cart.remove(item.product.id)}>Remover</button>
                </div>
              </li>
            ))}
          </ul>
          <div className="form-card inline">
            <label className="field"><span>Nome da lista</span><input value={name} onChange={(event) => setName(event.target.value)} maxLength={160} /></label>
            <div className="button-row">
              <button className="primary-button" type="button" onClick={saveAndCompare} disabled={saving || !city}>{saving ? "Salvando..." : user ? "Salvar e comparar mercados" : "Entrar para salvar e comparar"}</button>
              <button className="outline-button" type="button" onClick={cart.clear}>Limpar lista</button>
            </div>
            {saveError && <p className="error-message" role="alert">{saveError}</p>}
            <p className="form-hint">{!city ? "Escolha a cidade acima para comparar." : `A comparação usa os preços mais recentes dos mercados ${city === "*" ? "nas cidades escolhidas" : `em ${city}`}.`}</p>
          </div>
        </>
      )}

      <h2 id="listas-salvas">Minhas listas salvas</h2>
      <p className="form-hint">Só você tem acesso às suas listas. Informar um preço na comunidade não compartilha sua lista de compras.</p>
      {!user && <Empty title="Entre para ver suas listas"><Link to="/login" state={{ from: "/lista" }}>Fazer login</Link> ou <Link to="/cadastro" state={{ from: "/lista" }}>criar conta</Link>. Cada pessoa vê somente as próprias listas.</Empty>}
      {user && listsLoading && <Loading text="Carregando suas listas..." />}
      {user && listsError && <ErrorBox message={listsError} onRetry={loadLists} />}
      {user && !listsLoading && !listsError && lists.length === 0 && <Empty title="Você ainda não salvou nenhuma lista">Monte uma lista acima e clique em “Salvar e comparar”.</Empty>}
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
