import {test} from 'node:test';
import assert from 'node:assert/strict';
import {openCameraPreview} from '../.test-build/cameraPreview.js';
const flush=()=>new Promise(resolve=>setImmediate(resolve));
const named=name=>Object.assign(new Error(name),{name});
function camera(){let stops=0;return {getTracks:()=>[{stop(){stops++;}}],get stops(){return stops;}};}
class Video extends EventTarget{
 muted=false;defaultMuted=false;autoplay=false;playsInline=false;readyState=2;videoWidth=1280;paused=true;srcObject=null;attributes=new Map();calls=0;
 play(){this.calls++;this.paused=false;return Promise.resolve();}
 pause(){this.paused=true;}
 setAttribute(key,value){this.attributes.set(key,value);}
}
function observer(){const states=[];const streams=[];return {states,streams,onState:(s,m)=>states.push([s,m]),onReady:stream=>streams.push(stream)};}

test('camera attaches a silent inline preview and starts only after frames are ready',async()=>{
 const video=new Video();const stream=camera();const seen=observer();let constraints;
 const session=openCameraPreview(video,{getUserMedia:async c=>{constraints=c;return stream;}},seen);
 await flush();
 assert.equal(constraints.audio,false);assert.equal(constraints.video.facingMode.ideal,'environment');
 assert.equal(video.muted,true);assert.equal(video.defaultMuted,true);assert.equal(video.playsInline,true);
 assert.ok(video.attributes.has('webkit-playsinline'));
 assert.deepEqual(seen.streams,[stream]);assert.equal(seen.states.at(-1)[0],'ready');
 session.stop();session.stop();assert.equal(stream.stops,1);assert.equal(video.srcObject,null);
});

test('Safari playback rejection can resume directly in a tap without requesting permission again',async()=>{
 const video=new Video();const stream=camera();const seen=observer();let requests=0;
 video.play=function(){this.calls++;if(this.calls===1)return Promise.reject(named('NotAllowedError'));this.paused=false;return Promise.resolve();};
 const session=openCameraPreview(video,{getUserMedia:async()=>{requests++;return stream;}},seen);
 await flush();assert.equal(seen.states.at(-1)[0],'blocked');assert.equal(seen.streams.length,0);assert.equal(stream.stops,0);
 const resumed=session.resume();assert.equal(video.calls,2,'play must execute synchronously during the tap');
 await resumed;assert.equal(requests,1);assert.deepEqual(seen.streams,[stream]);
 await session.resume();assert.equal(seen.streams.length,1);session.stop();
});

test('permission rejection does not retry automatically or pretend a camera opened',async()=>{
 const video=new Video();const seen=observer();let requests=0;
 const session=openCameraPreview(video,{getUserMedia:async()=>{requests++;throw named('NotAllowedError');}},seen);
 await flush();assert.equal(requests,1);assert.equal(seen.states.at(-1)[0],'error');assert.match(seen.states.at(-1)[1],/não foi liberado/);assert.equal(seen.streams.length,0);session.stop();
});

test('unsupported resolution retries rear camera without resolution constraints',async()=>{
 const video=new Video();const stream=camera();const seen=observer();const requests=[];
 const session=openCameraPreview(video,{getUserMedia:async c=>{requests.push(c);if(requests.length===1)throw named('OverconstrainedError');return stream;}},seen);
 await flush();assert.equal(requests.length,2);assert.equal(requests[1].video.width,undefined);assert.equal(requests[1].video.facingMode.ideal,'environment');assert.equal(seen.streams.length,1);session.stop();
});

test('closing during permission request disposes a late stream instead of attaching it',async()=>{
 const video=new Video();const stream=camera();const seen=observer();let grant;
 const session=openCameraPreview(video,{getUserMedia:()=>new Promise(resolve=>{grant=resolve;})},seen);
 session.stop();const count=seen.states.length;grant(stream);await flush();
 assert.equal(stream.stops,1);assert.equal(video.srcObject,null);assert.equal(seen.streams.length,0);assert.equal(seen.states.length,count);
});

test('closing a pending preview cannot pause or detach a newer camera session',async()=>{
 const video=new Video();const oldStream=camera();const currentStream=camera();const oldSeen=observer();const currentSeen=observer();let resolvePlay;
 video.play=function(){this.calls++;if(this.calls===1)return new Promise(resolve=>{resolvePlay=resolve;});this.paused=false;return Promise.resolve();};
 const old=openCameraPreview(video,{getUserMedia:async()=>oldStream},oldSeen);await flush();old.stop();
 const current=openCameraPreview(video,{getUserMedia:async()=>currentStream},currentSeen);await flush();resolvePlay();await flush();
 assert.equal(video.srcObject,currentStream);assert.equal(video.paused,false);assert.equal(oldSeen.streams.length,0);assert.deepEqual(currentSeen.streams,[currentStream]);assert.equal(oldStream.stops,1);assert.equal(currentStream.stops,0);current.stop();
});

test('decoder waits for actual camera pixels rather than only a resolved play promise',async()=>{
 const video=new Video();video.readyState=0;video.videoWidth=0;const stream=camera();const seen=observer();
 const session=openCameraPreview(video,{getUserMedia:async()=>stream},seen);await flush();assert.equal(seen.streams.length,0);
 video.readyState=2;video.videoWidth=1280;video.dispatchEvent(new Event('loadeddata'));await flush();assert.equal(seen.streams.length,1);session.stop();
});

test('closing while waiting for a frame prevents decoder startup and clears camera access',async()=>{
 const video=new Video();video.readyState=0;const stream=camera();const seen=observer();
 const session=openCameraPreview(video,{getUserMedia:async()=>stream},seen);await flush();session.stop();video.readyState=2;video.dispatchEvent(new Event('playing'));await flush();assert.equal(seen.streams.length,0);assert.equal(stream.stops,1);assert.equal(video.srcObject,null);
});
