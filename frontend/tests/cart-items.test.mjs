import assert from "node:assert/strict";
import {test} from "node:test";
import {addCartItem,toggleCartItem,cartItemsPayload} from "../.test-build/cartItems.js";

test("adding fractions of a kilo keeps one product and exact thousandths",()=>{
  const potato={id:99,name:"Batata inglesa"};
  const original=addCartItem([],potato,0.1);
  const next=addCartItem(original,potato,0.2);
  assert.equal(next.length,1);assert.equal(next[0].quantity,0.3);
  assert.equal(original[0].quantity,0.1);
});
test("a list can mark products without prices, changing only the chosen product",()=>{
  const initial=addCartItem(addCartItem([],{id:1},2),{id:2},0.75);
  const marked=toggleCartItem(initial,2);
  assert.equal(marked[0].isPurchased,false);assert.equal(marked[1].isPurchased,true);
  assert.equal(initial[1].isPurchased,false);
  assert.equal(toggleCartItem(marked,2)[1].isPurchased,false);
  assert.deepEqual(cartItemsPayload(marked),[
    {product_id:1,quantity:2,is_purchased:false},
    {product_id:2,quantity:0.75,is_purchased:true},
  ]);
});
test("adding more of an already picked product marks it as still needed",()=>{
  const marked=[{product:{id:1},quantity:2,isPurchased:true},{product:{id:2},quantity:1,isPurchased:true}];
  const next=addCartItem(marked,{id:1},1);
  assert.equal(next[0].quantity,3);assert.equal(next[0].isPurchased,false);
  assert.equal(next[1].isPurchased,true);
});
