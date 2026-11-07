import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { useAuth } from "../auth/AuthContext";
import {addCartItem,toggleCartItem,type CartEntry} from "../lib/cartItems";
import type { Product } from "../services/api";

// Only explicitly saved lists persist in the API. Drafts live in memory during navigation.
const STORAGE_KEY = "precomobi_draft_list";

export type CartItem = CartEntry<Product>;

type CartContextValue = {
  items: CartItem[];
  add: (product: Product, quantity?: number) => void;
  setQuantity: (productId: number, quantity: number) => void;
  remove: (productId: number) => void;
  togglePurchased: (productId: number) => void;
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
  const [items, setItems] = useState<CartItem[]>([]);
  // Retire this account's old automatic draft; saved lists in the database are untouched.
  useEffect(() => {try {localStorage.removeItem(key);} catch { /* In-memory shopping still works. */ }}, [key]);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      add: (product, quantity = 1) =>
        setItems(current=>addCartItem(current,product,quantity)),
      togglePurchased: productId=>setItems(current=>toggleCartItem(current,productId)),
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
