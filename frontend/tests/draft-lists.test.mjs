import assert from 'node:assert/strict';
import {test} from 'node:test';
import {parseDraft} from '../.test-build/draftLists.js';
const valid={id:'current',name:'Compras da semana',updatedAt:'2026-11-07T20:00:00Z',items:[{product:{id:1,name:'Batata',sale_unit:'kg',min_price:'2.99'},quantity:0.75,isPurchased:true}]};
test('draft recovery preserves names, fractions and checks but never cached prices',()=>{
 const draft=parseDraft(JSON.stringify(valid));assert.equal(draft.name,valid.name);assert.equal(draft.items[0].quantity,0.75);assert.equal(draft.items[0].isPurchased,true);assert.equal(draft.items[0].product.min_price,null);
});
test('broken or incompatible local drafts cannot crash the app or restore invalid quantities',()=>{
 for(const raw of [null,'not json','[]',JSON.stringify({...valid,items:[]}),JSON.stringify({...valid,items:[...valid.items,...valid.items]}),JSON.stringify({...valid,updatedAt:'bad'}),JSON.stringify({...valid,items:[{...valid.items[0],quantity:-1}]}),JSON.stringify({...valid,items:[{...valid.items[0],product:{id:1,name:'Arroz',sale_unit:'unit'}}]})])assert.equal(parseDraft(raw),null);
});
