import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const read=p=>readFileSync(new URL('../public/'+p,import.meta.url));

test('installed app stays in its own scope with correctly sized Android and iPhone icons',()=>{
 const m=JSON.parse(read('manifest.json'));
 assert.equal(m.id,'/');assert.equal(m.start_url,'/');assert.equal(m.scope,'/');assert.equal(m.display,'standalone');
 assert(m.icons.some(i=>i.sizes==='192x192' && i.purpose==='any'));
 assert(m.icons.some(i=>i.sizes==='512x512' && i.purpose==='any'));
 assert(m.icons.some(i=>i.sizes==='512x512' && i.purpose==='maskable'));
 for(const icon of [...m.icons,{src:'/icons/precomobi-apple-180.png',sizes:'180x180'}]){
  const png=read(icon.src.slice(1));assert.equal(png.subarray(1,4).toString(),'PNG');
  assert.deepEqual([png.readUInt32BE(16),png.readUInt32BE(20)],icon.sizes.split('x').map(Number));
 }
});

function worker(){
 const events={},operations=[],self={location:{origin:'https://precomobi.example'},clients:{claim:async()=>operations.push('claim')},addEventListener:(name,fn)=>events[name]=fn};
 const cache={addAll:async urls=>operations.push(urls)};
 const offline={body:'offline'};
 let broken=false;
 const context={self,URL,Response,caches:{open:async()=>cache,keys:async()=>['precomobi-offline-v0','another-app-cache'],delete:async k=>operations.push(k),match:async url=>{operations.push(['match',url]);return offline;}},fetch:async (request,options)=>{operations.push(['network',request.url,options]);if(broken)throw Error('offline');return {body:'fresh'};}};
 vm.runInNewContext(read('sw.js').toString(),context);
 return {events,operations,offline,fail:()=>broken=true};
}
const request=(changes={})=>({method:'GET',mode:'navigate',url:'https://precomobi.example/lista',...changes});
function dispatch(w,req){let result;w.events.fetch({request:req,respondWith:p=>result=p});return result;}

test('worker never intercepts APIs, authentication requests, assets or third-party traffic',()=>{
 const w=worker();
 for(const req of [request({method:'POST'}),request({mode:'cors',url:'https://precomobi.example/api/auth/me'}),request({url:'https://precomobi.example/api/prices'}),request({url:'https://api.other.example/lista'}),request({mode:'no-cors',url:'https://precomobi.example/assets/main.js'})])assert.equal(dispatch(w,req),undefined);
 assert.equal(w.operations.length,0);
});

test('only the offline notice is cached, account and price pages always use the network',async()=>{
 const w=worker();let installed,activated;
 w.events.install({waitUntil:p=>installed=p});await installed;
 assert.equal(JSON.stringify(w.operations[0]),JSON.stringify(['/offline.html','/icons/precomobi-192.png']));
 w.events.activate({waitUntil:p=>activated=p});await activated;
 assert(w.operations.includes('precomobi-offline-v0'));assert(!w.operations.includes('another-app-cache'));
 const fresh=await dispatch(w,request());assert.equal(fresh.body,'fresh');
 const network=w.operations.find(o=>Array.isArray(o)&&o[0]==='network');assert.equal(network[2].cache,'no-store');
 w.fail();assert.equal(await dispatch(w,request({url:'https://precomobi.example/convite/private-token'})),w.offline);
 assert(w.operations.some(o=>Array.isArray(o)&&o[0]==='match'&&o[1]==='/offline.html'));
});
