import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { useAuth } from "../auth/AuthContext";
import {addCartItem,toggleCartItem,type CartEntry} from "../lib/cartItems";
import {parseDraft,type DraftSnapshot} from "../lib/draftLists";
import type { Product } from "../services/api";

// Only explicitly saved lists persist in the API. Drafts live in memory during navigation.
const STORAGE_KEY = "precomobi_draft_v2";

export type CartItem = CartEntry<Product>;

type CartContextValue = {
  items: CartItem[];
  draftVersion:number;
  name:string;
  setName:(name:string)=>void;
  pendingDraft:DraftSnapshot<Product>|null;
  archivedDrafts:DraftSnapshot<Product>[];
  resumeDraft:()=>void;
  startFresh:()=>void;
  restoreArchive:(id:string)=>void;
  storageError:string;
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
  const [name,setName]=useState("Minha compra");
  const [draftVersion,setDraftVersion]=useState(0);
  const [pendingDraft,setPendingDraft]=useState(()=>{try{return parseDraft<Product>(localStorage.getItem(key));}catch{return null;}});
  const [archivedDrafts,setArchivedDrafts]=useState<DraftSnapshot<Product>[]>(()=>{try{return JSON.parse(localStorage.getItem(key+"_archives") || "[]").map((v:unknown)=>parseDraft<Product>(JSON.stringify(v))).filter(Boolean);}catch{return [];}});
  const [storageError,setStorageError]=useState("");
  useEffect(()=>{
    if(pendingDraft) return;
    try {
      localStorage.setItem(key+"_archives",JSON.stringify(archivedDrafts));
      if(items.length) localStorage.setItem(key,JSON.stringify({id:"current",name,items,updatedAt:new Date().toISOString()}));
      else localStorage.removeItem(key);
      setStorageError("");
    } catch {setStorageError("Não foi possível guardar o rascunho neste aparelho. Salve a lista na conta para não perder as alterações.");}
  },[items,name,pendingDraft,archivedDrafts,key]);
  function archive(snapshot:DraftSnapshot<Product>){setArchivedDrafts(all=>[...all,{...snapshot,id:crypto.randomUUID()}]);}
  function resumeDraft(){if(pendingDraft){setDraftVersion(v=>v+1);setItems(pendingDraft.items);setName(pendingDraft.name);setPendingDraft(null);}}
  function startFresh(){setDraftVersion(v=>v+1);if(pendingDraft) archive(pendingDraft);setPendingDraft(null);setItems([]);setName("Minha compra");}
  function restoreArchive(id:string){
    const snapshot=archivedDrafts.find(d=>d.id===id);if(!snapshot)return;
    if(items.length) archive({id:"current",name,items,updatedAt:new Date().toISOString()});
    setDraftVersion(v=>v+1);setItems(snapshot.items);setName(snapshot.name);
    setArchivedDrafts(all=>all.filter(d=>d.id!==id));
  }

  const value = useMemo<CartContextValue>(
    () => ({
      items,draftVersion,name,setName,pendingDraft,archivedDrafts,resumeDraft,startFresh,restoreArchive,storageError,
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
      clear: () => {setItems([]);setDraftVersion(v=>v+1);},
      replaceAll: (next) => {setItems(next);setDraftVersion(v=>v+1);},
    }),
    [items,draftVersion,name,pendingDraft,archivedDrafts,storageError],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart precisa estar dentro de <CartProvider>");
  return context;
}
