import {test} from 'node:test';
import assert from 'node:assert/strict';
import {prepareListShare,listShareText} from '../.test-build/listSharing.js';

test('sharing an unsaved draft saves its current list before issuing the invite',async()=>{
 const calls=[];let save;
 const pending=prepareListShare(()=>{calls.push('save');return new Promise(resolve=>{save=resolve;});},async id=>{calls.push(['invite',id]);return {token:'private-token',expires_at:'2026-11-24T00:00:00Z'};},'https://example.test');
 assert.deepEqual(calls,['save']);save({id:42,name:'Compra de casa',status:'preparation'});
 const shared=await pending;assert.deepEqual(calls,['save',['invite',42]]);assert.equal(shared.url,'https://example.test/convite/private-token');assert.equal(shared.id,42);assert.match(listShareText(shared),/Compra de casa/);
});

test('sharing a saved or completed list preserves its ID and status without copying it',async()=>{
 let invited;
 const shared=await prepareListShare(async()=>({id:9,name:'Compra concluída',status:'completed',items:['private details']}),async id=>{invited=id;return {token:'token',expires_at:'later'};},'https://example.test');
 assert.equal(invited,9);assert.equal(shared.status,'completed');assert.equal(shared.id,9);assert.equal('items' in shared,false);
});

test('a save failure does not create an invitation to an old or missing list',async()=>{
 let invites=0;await assert.rejects(prepareListShare(async()=>{throw Error('Confira a quantidade');},async()=>{invites++;return {token:'x',expires_at:'later'};},'https://example.test'),/Confira/);assert.equal(invites,0);
});

test('invitation permission errors are surfaced without generating a fake link',async()=>{
 await assert.rejects(prepareListShare(async()=>({id:8,name:'Lista'}),async()=>{throw Error('Acesso negado');},'https://example.test'),/Acesso negado/);
});
