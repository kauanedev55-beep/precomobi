import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { useAuth } from "../auth/AuthContext";
import {addCartItem,toggleCartItem,cartItemsPayload,type CartEntry} from "../lib/cartItems";
import {parseDraft,type DraftSnapshot} from "../lib/draftLists";
import {listSignature,mergeList,findDraftList,type ListSnapshot} from "../lib/listSync";
import { createShoppingList, updateShoppingList, getFamilyList, getShoppingLists, type Product, type ShoppingList } from "../services/api";

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
  syncError:string;
  syncConflict:boolean;
  acceptRemoteList:()=>void;
  refreshSavedList:()=>Promise<void>;
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
  const [syncError,setSyncError]=useState("");
  const [syncConflict,setSyncConflict]=useState(false);const conflictRef=useRef(false);
  const live=useRef<ListSnapshot<Product>>({name,items});live.current={name,items};
  const snapshotOf=(list:ShoppingList):ListSnapshot<Product>=>({name:list.name,items:list.items.map(i=>({product:i.product,quantity:Number(i.quantity),isPurchased:i.is_purchased}))});
  const signature=listSignature({name,items});
  function resetSaved(){
    generation.current+=1;savedRef.current=null;setSaved(null);setSyncError("");conflictRef.current=false;setSyncConflict(false);setDraftVersion(v=>v+1);
  }
  function receive(list:ShoppingList,base?:ListSnapshot<Product>){
    const previous=savedRef.current;
    if(!base&&(!previous||previous.list.id!==list.id||previous.list.revision>=list.revision))return;
    const remote=snapshotOf(list);const merged=mergeList(base??snapshotOf(previous!.list),live.current,remote);
    live.current={name:merged.name,items:merged.items};setName(merged.name);setItems(merged.items);
    conflictRef.current=conflictRef.current||merged.conflict;setSyncConflict(conflictRef.current);
    const next={list,signature:listSignature(remote)};savedRef.current=next;setSaved(next);setSyncError("");
  }
  async function refreshSavedList(){
    const current=savedRef.current;if(!current||saveLock.current||document.hidden)return;
    if(document.activeElement instanceof HTMLInputElement&&document.activeElement.closest(".shopping-list-page,.basket-drawer"))return;
    const epoch=generation.current;
    try{const next=await getFamilyList(current.list.id);if(epoch!==generation.current||saveLock.current)return;receive(next.list);setSyncError("");}
    catch{if(epoch===generation.current)setSyncError("Sem sincronização agora.");}
  }
  useEffect(()=>{
    if(!saved?.list.id)return;
    let active=true,fetching=false;
    const refresh=()=>{if(!active||fetching||document.hidden)return;fetching=true;void refreshSavedList().finally(()=>{fetching=false;});};
    refresh();const timer=window.setInterval(refresh,5000);window.addEventListener("focus",refresh);document.addEventListener("visibilitychange",refresh);
    return()=>{active=false;window.clearInterval(timer);window.removeEventListener("focus",refresh);document.removeEventListener("visibilitychange",refresh);};
  },[saved?.list.id]);
  function save():Promise<ShoppingList>{
    if(saveLock.current)return saveLock.current;
    if(!live.current.items.length)return Promise.reject(new Error("Adicione produtos antes de salvar."));
    if(conflictRef.current)return Promise.reject(new Error("A lista mudou em outro aparelho. Confira a atualização antes de salvar."));
    const epoch=generation.current;setSaving(true);
    const operation=(async()=>{
      const previous=savedRef.current;
      if(previous){const remote=await getFamilyList(previous.list.id);if(epoch!==generation.current)throw Error("A lista em edição mudou. Tente novamente.");receive(remote.list);}
      if(conflictRef.current)throw Error("A lista mudou em outro aparelho. Confira a atualização antes de salvar.");
      const current=savedRef.current;const sent={name:live.current.name.trim()||"Minha compra",items:live.current.items};
      if(current?.signature===listSignature(sent))return current.list;
      const payload={name:sent.name,items:cartItemsPayload(sent.items),revision:current?.list.revision};
      const list=current?await updateShoppingList(current.list.id,payload):await createShoppingList(payload);
      if(epoch===generation.current)receive(list,sent);
      return list;
    })().finally(()=>{saveLock.current=null;setSaving(false);});
    saveLock.current=operation;return operation;
  }
  const [pendingDraft,setPendingDraft]=useState(()=>{try{return parseDraft<Product>(localStorage.getItem(key));}catch{return null;}});
  const [archivedDrafts,setArchivedDrafts]=useState<DraftSnapshot<Product>[]>(()=>{try{return JSON.parse(localStorage.getItem(key+"_archives") || "[]").map((v:unknown)=>parseDraft<Product>(JSON.stringify(v))).filter(Boolean);}catch{return [];}});
  const [storageError,setStorageError]=useState("");
  useEffect(()=>{
    if(pendingDraft) return;
    try {
      localStorage.setItem(key+"_archives",JSON.stringify(archivedDrafts));
      if(items.length||saved) localStorage.setItem(key,JSON.stringify({id:"current",name,items,linkedList:saved?.list,syncConflict,updatedAt:new Date().toISOString()}));
      else localStorage.removeItem(key);
      setStorageError("");
    } catch {setStorageError("Não foi possível guardar o rascunho neste aparelho. Salve a lista na conta para não perder as alterações.");}
  },[items,name,saved,syncConflict,pendingDraft,archivedDrafts,key]);
  function archive(snapshot:DraftSnapshot<Product>){setArchivedDrafts(all=>[...all,{...snapshot,id:crypto.randomUUID()}]);}
  function resumeDraft(){if(pendingDraft){resetSaved();setItems(pendingDraft.items);setName(pendingDraft.name);live.current={name:pendingDraft.name,items:pendingDraft.items};
    const linked=pendingDraft.linkedList;if(linked&&user&&linked.owner_id===user.id){const list=linked;const next={list,signature:listSignature(snapshotOf(list))};savedRef.current=next;setSaved(next);conflictRef.current=!!pendingDraft.syncConflict;setSyncConflict(!!pendingDraft.syncConflict);}
    else if(user){const epoch=generation.current;const initial={name:pendingDraft.name,items:pendingDraft.items};void getShoppingLists().then(lists=>{if(epoch!==generation.current||savedRef.current)return;const match=findDraftList(initial,lists,user.id);if(match)receive(match,initial);}).catch(()=>undefined);}
    setPendingDraft(null);}}
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

  function acceptRemoteList(){const list=savedRef.current?.list;if(!list)return;
    archive({id:"current",name:live.current.name,items:live.current.items,updatedAt:new Date().toISOString()});
    const next=snapshotOf(list);live.current=next;setName(next.name);setItems(next.items);conflictRef.current=false;setSyncConflict(false);setSyncError("");
  }

  const value = useMemo<CartContextValue>(
    () => ({
      items,draftVersion,name,setName,save,saving,syncError,syncConflict,acceptRemoteList,refreshSavedList,isSaved:saved?.signature===signature,savedListId:saved?.list.id ?? null,detachSavedList:(id)=>{if(savedRef.current?.list.id===id)resetSaved();},copyAsNew,pendingDraft,archivedDrafts,resumeDraft,startFresh,restoreArchive,storageError,
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
    [items,draftVersion,name,pendingDraft,archivedDrafts,storageError,saving,saved,signature,syncError,syncConflict],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart precisa estar dentro de <CartProvider>");
  return context;
}
