import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { useAuth } from "../auth/AuthContext";
import type { Product } from "../services/api";

// A "lista em edição" mora no navegador (localStorage) até o usuário salvá-la; só então vai para a API.
const STORAGE_KEY = "precomobi_draft_list";

export type CartItem = { product: Product; quantity: number };

type CartContextValue = {
  items: CartItem[];
  add: (product: Product, quantity?: number) => void;
  setQuantity: (productId: number, quantity: number) => void;
  remove: (productId: number) => void;
  clear: () => void;
  replaceAll: (items: CartItem[]) => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  return <AccountCart key={user?.id ?? "guest"}>{children}</AccountCart>;
}

function AccountCart({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const key = `${STORAGE_KEY}_${user?.id ?? "guest"}`;
  const [items, setItems] = useState<CartItem[]>(() => {
    try { const value = JSON.parse(localStorage.getItem(key) || "[]"); return Array.isArray(value) ? value.filter(i => i?.product?.id && Number.isFinite(i.quantity) && i.quantity > 0) : []; }
    catch { return []; }
  });

  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(items)); } catch { /* Navegação continua sem persistência local. */ }
  }, [items, key]);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      add: (product, quantity = 1) =>
        setItems((current) => {
          const existing = current.find((item) => item.product.id === product.id);
          if (existing) {
            return current.map((item) =>
              item.product.id === product.id ? { ...item, quantity: item.quantity + quantity } : item,
            );
          }
          return [...current, { product, quantity }];
        }),
      setQuantity: (productId, quantity) =>
        setItems((current) =>
          quantity <= 0
            ? current.filter((item) => item.product.id !== productId)
            : current.map((item) => (item.product.id === productId ? { ...item, quantity } : item)),
        ),
      remove: (productId) => setItems((current) => current.filter((item) => item.product.id !== productId)),
      clear: () => setItems([]),
      replaceAll: (next) => setItems(next),
    }),
    [items],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart precisa estar dentro de <CartProvider>");
  return context;
}
