import {test} from 'node:test';
import assert from 'node:assert/strict';
import {listSignature,mergeList} from '../.test-build/listSync.js';
const item=(id,q=1,picked=false)=>({product:{id,name:`Produto ${id}`,sale_unit:'unit'},quantity:q,isPurchased:picked});
const snapshot=(items,name='Família')=>({name,items});

test('a recipient check and uncheck reach the creator snapshot without a new invitation',()=>{
 const base=snapshot([item(1),item(2)]);
 const updated=mergeList(base,base,snapshot([item(1,1,true),item(2)]));
 assert.equal(updated.items[0].isPurchased,true);assert.equal(updated.conflict,false);
 const unchecked=mergeList(updated,updated,base);assert.equal(unchecked.items[0].isPurchased,false);
});
test('independent local quantity and remote check changes both survive',()=>{
 const base=snapshot([item(1),item(2)]),local=snapshot([item(1,3),item(2)]),remote=snapshot([item(1),item(2,1,true),item(3)]);
 const merged=mergeList(base,local,remote);assert.equal(merged.items.find(i=>i.product.id===1).quantity,3);assert.equal(merged.items.find(i=>i.product.id===2).isPurchased,true);assert.ok(merged.items.some(i=>i.product.id===3));assert.equal(merged.conflict,false);
 assert.notEqual(listSignature(merged),listSignature(remote),'local edits stay unsaved');
});
test('remote removals and renaming apply when those fields were not locally changed',()=>{
 const base=snapshot([item(1),item(2)]);const merged=mergeList(base,base,snapshot([item(2)],'Compra da semana'));
 assert.deepEqual(merged.items.map(i=>i.product.id),[2]);assert.equal(merged.name,'Compra da semana');assert.equal(merged.conflict,false);
});
test('conflicting edits are reported and the local quantity is kept for recovery',()=>{
 const base=snapshot([item(1)]);const merged=mergeList(base,snapshot([item(1,2)]),snapshot([item(1,4)]));assert.equal(merged.conflict,true);assert.equal(merged.items[0].quantity,2);
 const deleted=mergeList(base,snapshot([item(1,2)]),snapshot([]));assert.equal(deleted.conflict,true);assert.equal(deleted.items[0].quantity,2);
});
test('a check for the old quantity does not mark extra locally added units as collected',()=>{
 const base=snapshot([item(1)]);const merged=mergeList(base,snapshot([item(1,2)]),snapshot([item(1,1,true)]));assert.equal(merged.conflict,true);assert.equal(merged.items[0].quantity,2);assert.equal(merged.items[0].isPurchased,false);
});
test('stable signatures ignore row order and missing false flags',()=>{
 assert.equal(listSignature(snapshot([item(2),item(1)])),listSignature(snapshot([{product:{id:1},quantity:1},{product:{id:2},quantity:1}])));
});

test('old draft reconnects only to its unique saved owner list, ignoring remote check changes',async()=>{
 const {findDraftList}=await import('../.test-build/listSync.js');
 const list=(id,owner=2)=>({id,owner_id:owner,name:'Família',items:[{product:item(1).product,quantity:'1.000',is_purchased:true}]});
 assert.equal(findDraftList(snapshot([item(1)]),[list(9)],2).id,9);
 assert.equal(findDraftList(snapshot([item(1)]),[list(9,3)],2),null);
 assert.equal(findDraftList(snapshot([item(1)]),[list(9),list(10)],2),null);
 assert.equal(findDraftList(snapshot([item(1,2)]),[list(9)],2),null);
});
