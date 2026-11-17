import type {CartEntry} from "./cartItems";
export type DraftProduct={id:number;name:string;sale_unit:"kg"|"unit"};
export type LinkedList<T extends DraftProduct>={id:number;owner_id:number;revision:number;status:"preparation"|"shopping"|"completed";name:string;created_at:string;updated_at:string;items:{id:number;product_id:number;product:T;quantity:string;is_purchased:boolean}[]};
export type DraftSnapshot<T extends DraftProduct>={id:string;name:string;updatedAt:string;items:CartEntry<T>[];linkedList?:LinkedList<T>;syncConflict?:boolean};
function safeItems<T extends DraftProduct>(items:unknown):CartEntry<T>[]|null{
 if(!Array.isArray(items)||items.length>200)return null;const ids=new Set<number>();
 for(const item of items){const p=item?.product;if(!p||!Number.isInteger(p.id)||p.id<1||ids.has(p.id)||typeof p.name!=="string"||!["kg","unit"].includes(p.sale_unit)||!Number.isFinite(item.quantity)||item.quantity<=0||item.quantity>9999999.999||(p.sale_unit==="unit"&&!Number.isInteger(item.quantity)))return null;ids.add(p.id);}
 return items.map(item=>({...item,isPurchased:item.isPurchased===true,product:{...item.product,min_price:null,min_price_market:null,min_price_expires_at:null,min_price_source_url:null}}));
}
export function parseDraft<T extends DraftProduct>(raw:string|null):DraftSnapshot<T>|null{
 try{
  if(!raw||raw.length>2000000)return null;const value=JSON.parse(raw);
  if(typeof value.id!=="string"||typeof value.updatedAt!=="string"||!Number.isFinite(Date.parse(value.updatedAt))||typeof value.name!=="string")return null;
  const items=safeItems<T>(value.items);if(!items)return null;
  let linkedList:LinkedList<T>|undefined;const link=value.linkedList;
  if(link&&Number.isInteger(link.id)&&link.id>0&&Number.isInteger(link.owner_id)&&link.owner_id>0&&Number.isInteger(link.revision)&&link.revision>0&&typeof link.name==="string"&&["preparation","shopping","completed"].includes(link.status)&&typeof link.created_at==="string"&&Number.isFinite(Date.parse(link.created_at))&&typeof link.updated_at==="string"&&Number.isFinite(Date.parse(link.updated_at))&&Array.isArray(link.items)){
   const mapped=link.items.map((i:LinkedList<T>["items"][number])=>({product:i.product,quantity:Number(i.quantity),isPurchased:!!i.is_purchased}));const baseline=safeItems<T>(mapped);
   if(baseline&&link.items.every((i:LinkedList<T>["items"][number])=>Number.isInteger(i.id)&&i.id>0&&i.product_id===i.product?.id))linkedList={...link,name:link.name.slice(0,160),items:baseline.map((i,index)=>({...link.items[index],product:i.product,quantity:String(i.quantity),is_purchased:!!i.isPurchased}))};
  }
  if(!items.length&&!linkedList)return null;
  return {id:value.id,name:value.name.slice(0,160),updatedAt:value.updatedAt,items,linkedList,syncConflict:value.syncConflict===true};
 }catch{return null;}
}
