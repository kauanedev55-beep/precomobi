import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";
import { useCart } from "../cart/CartContext";
import { Empty, ErrorBox, Loading } from "../components/StateViews";
import { formatDate, productSubtitle } from "../lib/format";
import { createShoppingList, deleteShoppingList, getShoppingLists, type ShoppingList } from "../services/api";

export function ShoppingListPage() {
  const { user } = useAuth();
  const cart = useCart();
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
      setLists((current) => current.filter((item) => item.id !== list.id));
    } catch (err) {
      setListsError(err instanceof Error ? err.message : "Não foi possível excluir a lista.");
    }
  }

  return (
    <section>
      <h1>Lista de compras</h1>

      <h2>Lista em edição</h2>
      {cart.items.length === 0 ? (
        <Empty title="Sua lista está vazia">
          Adicione produtos pela página de <Link to="/produtos">Produtos</Link> ou pelo detalhe de cada produto.
        </Empty>
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
              <button className="primary-button" type="button" onClick={saveAndCompare} disabled={saving}>{saving ? "Salvando..." : user ? "Salvar e comparar mercados" : "Entrar para salvar e comparar"}</button>
              <button className="outline-button" type="button" onClick={cart.clear}>Limpar lista</button>
            </div>
            {saveError && <p className="error-message" role="alert">{saveError}</p>}
            <p className="form-hint">O total de cada mercado é calculado na comparação, com os preços mais recentes disponíveis.</p>
          </div>
        </>
      )}

      <h2>Minhas listas salvas</h2>
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
