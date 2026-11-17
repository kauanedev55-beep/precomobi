import type {CartEntry} from "./cartItems";
export type ListSnapshot<T extends {id:number}>={name:string;items:CartEntry<T>[]};
export function listSignature<T extends {id:number}>(value:ListSnapshot<T>){return JSON.stringify({name:value.name.trim()||"Minha compra",items:value.items.map(i=>({id:i.product.id,quantity:i.quantity,picked:!!i.isPurchased})).sort((a,b)=>a.id-b.id)});}
// Merge independent edits, but never silently choose between conflicting edits.
export function mergeList<T extends {id:number}>(base:ListSnapshot<T>,local:ListSnapshot<T>,remote:ListSnapshot<T>){
 let conflict=false;
 function field<V>(b:V,l:V,r:V):V{if(l===b)return r;if(r!==b&&r!==l)conflict=true;return l;}
 const name=field(base.name,local.name,remote.name);
 const b=new Map(base.items.map(i=>[i.product.id,i])),l=new Map(local.items.map(i=>[i.product.id,i])),r=new Map(remote.items.map(i=>[i.product.id,i]));
 const same=(a:CartEntry<T>,z:CartEntry<T>)=>a.quantity===z.quantity&&!!a.isPurchased===!!z.isPurchased;
 const items:CartEntry<T>[]=[];
 for(const id of new Set([...r.keys(),...l.keys(),...b.keys()])){
  const old=b.get(id),mine=l.get(id),theirs=r.get(id);
  if(!old){if(mine&&theirs){if(!same(mine,theirs))conflict=true;items.push({...theirs,quantity:mine.quantity,isPurchased:!!mine.isPurchased||!!theirs.isPurchased});}else if(mine||theirs)items.push((mine||theirs)!);continue;}
  if(!mine){if(theirs&&!same(old,theirs))conflict=true;continue;}
  if(!theirs){if(!same(old,mine)){conflict=true;items.push(mine);}continue;}
  const quantity=field(old.quantity,mine.quantity,theirs.quantity);
  let isPurchased=field(!!old.isPurchased,!!mine.isPurchased,!!theirs.isPurchased);
  // A check for the old quantity cannot confirm extra units added locally.
  if(mine.quantity!==old.quantity&&theirs.quantity!==mine.quantity&&theirs.isPurchased&&!old.isPurchased){conflict=true;isPurchased=false;}
  items.push({product:theirs.product,quantity,isPurchased});
 }
 return {name,items,conflict};
}

// Older local drafts did not keep the saved-list ID. Reconnect only an exact,
// unique owner/name/product/quantity match; never guess between similar lists.
export function findDraftList<T extends {id:number},L extends {id:number;owner_id:number;name:string;items:{product:T;quantity:string;is_purchased:boolean}[]}>(draft:ListSnapshot<T>,lists:L[],ownerId:number):L|null{
 const identity=(value:ListSnapshot<T>)=>listSignature({...value,items:value.items.map(i=>({...i,isPurchased:false}))});
 const expected=identity(draft);
 const found=lists.filter(list=>list.owner_id===ownerId&&identity({name:list.name,items:list.items.map(i=>({product:i.product,quantity:Number(i.quantity)}))})===expected);
 return found.length===1?found[0]:null;
}
