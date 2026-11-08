import type {CartEntry} from "./cartItems";
export type DraftProduct={id:number;name:string;sale_unit:"kg"|"unit"};
export type DraftSnapshot<T extends DraftProduct>={id:string;name:string;updatedAt:string;items:CartEntry<T>[]};
export function parseDraft<T extends DraftProduct>(raw:string|null):DraftSnapshot<T>|null {
  try {
    if(!raw || raw.length>2000000) return null;
    const value=JSON.parse(raw);
    if(typeof value.id!=="string" || typeof value.updatedAt!=="string" || !Number.isFinite(Date.parse(value.updatedAt)) || typeof value.name!=="string" || !Array.isArray(value.items) || !value.items.length || value.items.length>200) return null;
    const ids=new Set<number>();
    for(const item of value.items) {
      const p=item.product;
      if(!p || !Number.isInteger(p.id) || p.id<1 || ids.has(p.id) || typeof p.name!=="string" || !["kg","unit"].includes(p.sale_unit) || !Number.isFinite(item.quantity) || item.quantity<=0 || item.quantity>9999999.999 || (p.sale_unit==="unit" && !Number.isInteger(item.quantity))) return null;
      ids.add(p.id);
    }
    return {...value,name:value.name.slice(0,160),items:value.items.map((item:CartEntry<T>)=>({...item,product:{...item.product,min_price:null,min_price_market:null,min_price_expires_at:null,min_price_source_url:null}}))};
  } catch {return null;}
}
