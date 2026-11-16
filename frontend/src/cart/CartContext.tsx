import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { useAuth } from "../auth/AuthContext";
import {addCartItem,toggleCartItem,cartItemsPayload,type CartEntry} from "../lib/cartItems";
import {parseDraft,type DraftSnapshot} from "../lib/draftLists";
import { createShoppingList, updateShoppingList, type Product, type ShoppingList } from "../services/api";

// Only explicit saves write to the API. Account-scoped drafts recover on this device.
const STORAGE_KEY = "precomobi_draft_v2";

export type CartItem = CartEntry<Product>;

type CartContextValue = {
  items: CartItem[];
  draftVersion:number;
  save:()=>Promise<ShoppingList>;
  saving:boolean;
  isSaved:boolean;
  savedListId:number|null;
  detachSavedList:(id:number)=>void;
  copyAsNew:(name:string,items:CartItem[])=>void;
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
  const [saving,setSaving]=useState(false);
  const [saved,setSaved]=useState<{list:ShoppingList;signature:string}|null>(null);
  const savedRef=useRef(saved);
  const saveLock=useRef<Promise<ShoppingList>|null>(null);
  const generation=useRef(0);
  const signature=JSON.stringify({name:name.trim() || "Minha compra",items:cartItemsPayload(items)});
  function resetSaved(){
    generation.current+=1;
    savedRef.current=null;setSaved(null);
    setDraftVersion(v=>v+1);
  }
  function save():Promise<ShoppingList>{
    if(saveLock.current)return saveLock.current;
    if(!items.length)return Promise.reject(new Error("Adicione produtos antes de salvar."));
    if(savedRef.current?.signature===signature)return Promise.resolve(savedRef.current.list);
    const snapshot=signature;
    const epoch=generation.current;
    const previous=savedRef.current;
    const payload={name:name.trim() || "Minha compra",items:cartItemsPayload(items),revision:previous?.list.revision};
    setSaving(true);
    const request=previous ? updateShoppingList(previous.list.id,payload) : createShoppingList(payload);
    const operation=request.then(list=>{
      if(epoch===generation.current){const next={list,signature:snapshot};savedRef.current=next;setSaved(next);}
      return list;
    }).finally(()=>{saveLock.current=null;setSaving(false);});
    saveLock.current=operation;
    return operation;
  }
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
  function resumeDraft(){if(pendingDraft){resetSaved();setItems(pendingDraft.items);setName(pendingDraft.name);setPendingDraft(null);}}
  function startFresh(){resetSaved();if(pendingDraft) archive(pendingDraft);setPendingDraft(null);setItems([]);setName("Minha compra");}
  function restoreArchive(id:string){
    const snapshot=archivedDrafts.find(d=>d.id===id);if(!snapshot)return;
    if(items.length) archive({id:"current",name,items,updatedAt:new Date().toISOString()});
    resetSaved();setItems(snapshot.items);setName(snapshot.name);
    setArchivedDrafts(all=>all.filter(d=>d.id!==id));
  }

  function copyAsNew(nextName:string,nextItems:CartItem[]){
    if(items.length)archive({id:"current",name,items,updatedAt:new Date().toISOString()});
    if(pendingDraft)archive(pendingDraft);
    setPendingDraft(null);resetSaved();setName(nextName);setItems(nextItems);
  }

  const value = useMemo<CartContextValue>(
    () => ({
      items,draftVersion,name,setName,save,saving,isSaved:saved?.signature===signature,savedListId:saved?.list.id ?? null,detachSavedList:(id)=>{if(savedRef.current?.list.id===id)resetSaved();},copyAsNew,pendingDraft,archivedDrafts,resumeDraft,startFresh,restoreArchive,storageError,
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
      clear: () => {setItems([]);resetSaved();},
      replaceAll: (next) => {setItems(next);resetSaved();},
    }),
    [items,draftVersion,name,pendingDraft,archivedDrafts,storageError,saving,saved,signature],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart precisa estar dentro de <CartProvider>");
  return context;
}
