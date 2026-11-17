import {test} from 'node:test';
import assert from 'node:assert/strict';
import {openCameraPreview,bindCameraLifecycle} from '../.test-build/cameraPreview.js';
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

test('unsupported camera constraints retry with the device default camera',async()=>{
 const video=new Video();const stream=camera();const seen=observer();const requests=[];
 const session=openCameraPreview(video,{getUserMedia:async c=>{requests.push(c);if(requests.length===1)throw named('OverconstrainedError');return stream;}},seen);
 await flush();assert.equal(requests.length,2);assert.equal(requests[0].video.width,undefined);assert.equal(requests[1].video,true);assert.equal(seen.streams.length,1);session.stop();
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

test('a permanently pending camera request times out and releases any late stream',async()=>{
 const video=new Video();const seen=observer();const stream=camera();let grant;
 const session=openCameraPreview(video,{getUserMedia:()=>new Promise(resolve=>{grant=resolve;})},seen,{captureMs:5});
 await new Promise(resolve=>setTimeout(resolve,15));assert.equal(seen.states.at(-1)[0],'error');assert.match(seen.states.at(-1)[1],/não respondeu/);
 grant(stream);await flush();assert.equal(stream.stops,1);assert.equal(video.srcObject,null);assert.equal(seen.streams.length,0);session.stop();
});

test('a pending play promise leaves opening state and allows an explicit resume',async()=>{
 const video=new Video();const seen=observer();const stream=camera();let finish;
 video.play=function(){this.calls++;if(this.calls===1)return new Promise(resolve=>{finish=resolve;});this.paused=false;return Promise.resolve();};
 const session=openCameraPreview(video,{getUserMedia:async()=>stream},seen,{playMs:5});
 await new Promise(resolve=>setTimeout(resolve,15));assert.equal(seen.states.at(-1)[0],'blocked');
 await session.resume();assert.equal(seen.streams.length,1);finish();await flush();assert.equal(seen.streams.length,1);session.stop();
});


test('inline attributes are set and capture requested synchronously in the initiating tap',async()=>{
 const video=new Video();const stream=camera();let requested=false;
 const session=openCameraPreview(video,{getUserMedia:()=>{
   requested=true;assert.equal(video.muted,true);assert.equal(video.playsInline,true);
   for(const attr of ['muted','autoplay','playsinline','webkit-playsinline'])assert.ok(video.attributes.has(attr));
   return Promise.resolve(stream);
 }},observer());
 assert.equal(requested,true);await flush();session.stop();
});

test('a blocked preview rebinds its existing stream before play without acquiring another camera',async()=>{
 const video=new Video();const stream=camera();const seen=observer();let requests=0;let rebinds=0;let source=null;
 Object.defineProperty(video,'srcObject',{get:()=>source,set(value){source=value;rebinds++;}});
 video.play=function(){this.calls++;if(this.calls===1)return Promise.reject(named('NotAllowedError'));this.paused=false;assert.equal(source,stream);return Promise.resolve();};
 const session=openCameraPreview(video,{getUserMedia:async()=>{requests++;return stream;}},seen);
 await flush();assert.equal(rebinds,1);const resumed=session.resume();assert.equal(video.calls,2);assert.equal(rebinds,3);
 await resumed;assert.equal(requests,1);assert.equal(seen.streams.length,1);session.stop();
});

test('capture ending in iOS stops decoding, releases tracks, and reports a retry instead of a stale ready screen',async()=>{
 const track=new EventTarget();track.readyState='live';let stops=0;track.stop=()=>{stops++;};
 const stream={getTracks:()=>[track]};const video=new Video();const seen=observer();let interrupted=0;
 const session=openCameraPreview(video,{getUserMedia:async()=>stream},{...seen,onInterrupted:()=>{interrupted++;}});
 await flush();assert.equal(seen.states.at(-1)[0],'ready');track.readyState='ended';track.dispatchEvent(new Event('ended'));
 assert.equal(seen.states.at(-1)[0],'error');assert.match(seen.states.at(-1)[1],/interrompida/);assert.equal(interrupted,1);assert.equal(stops,1);assert.equal(video.srcObject,null);
 track.dispatchEvent(new Event('ended'));session.stop();assert.equal(interrupted,1);assert.equal(stops,1);
});

test('backgrounding and pagehide release a pending capture; returning does not silently reopen it',async()=>{
 const page=new EventTarget();page.visibilityState='visible';const win=new EventTarget();const video=new Video();const stream=camera();let grant;let pauses=0;
 const session=openCameraPreview(video,{getUserMedia:()=>new Promise(resolve=>{grant=resolve;})},observer());
 const unbind=bindCameraLifecycle(page,win,()=>{pauses++;session.stop();});
 page.dispatchEvent(new Event('visibilitychange'));assert.equal(pauses,0);
 page.visibilityState='hidden';page.dispatchEvent(new Event('visibilitychange'));grant(stream);await flush();assert.equal(stream.stops,1);assert.equal(video.srcObject,null);
 page.visibilityState='visible';page.dispatchEvent(new Event('visibilitychange'));assert.equal(pauses,1);
 win.dispatchEvent(new Event('pagehide'));assert.equal(pauses,2);unbind();win.dispatchEvent(new Event('pagehide'));assert.equal(pauses,2);
});

test('real camera pixels start decoding even when WebKit never settles play()',async()=>{
 const video=new Video();const stream=camera();const seen=observer();let finish;
 video.play=function(){this.calls++;this.paused=false;return new Promise(resolve=>{finish=resolve;});};
 const stages=[];const session=openCameraPreview(video,{getUserMedia:async()=>stream},{...seen,onStage:s=>stages.push(s)},{playMs:20,frameMs:20});
 await flush();assert.equal(seen.states.at(-1)[0],'ready');assert.equal(seen.streams.length,1);assert.deepEqual(stages,['capture','playback','frames']);
 await new Promise(resolve=>setTimeout(resolve,30));assert.equal(seen.states.at(-1)[0],'ready');finish();await flush();assert.equal(seen.streams.length,1);session.stop();
});

test('resolved play with no pixels times out at the video stage, not a false ready state',async()=>{
 const video=new Video();video.readyState=0;video.videoWidth=0;const seen=observer();const stages=[];const stream=camera();
 const session=openCameraPreview(video,{getUserMedia:async()=>stream},{...seen,onStage:s=>stages.push(s)},{frameMs:5});
 await new Promise(resolve=>setTimeout(resolve,15));assert.equal(seen.states.at(-1)[0],'blocked');assert.equal(seen.streams.length,0);assert.deepEqual(stages,['capture','playback']);session.stop();
});
