export type CartEntry<T extends {id:number}> = {product:T; quantity:number; isPurchased?:boolean};

export function addCartItem<T extends {id:number}>(items:CartEntry<T>[], product:T, quantity=1):CartEntry<T>[] {
  const existing=items.some(item=>item.product.id===product.id);
  return existing ? items.map(item=>item.product.id===product.id
    ? {...item,quantity:Math.round((item.quantity+quantity)*1000)/1000,isPurchased:false} : item)
    : [...items,{product,quantity,isPurchased:false}];
}
export function toggleCartItem<T extends {id:number}>(items:CartEntry<T>[], id:number):CartEntry<T>[] {
  return items.map(item=>item.product.id===id ? {...item,isPurchased:!item.isPurchased} : item);
}
export function cartItemsPayload<T extends {id:number}>(items:CartEntry<T>[]) {
  return items.map(item=>({product_id:item.product.id,quantity:item.quantity,is_purchased:!!item.isPurchased}));
}
