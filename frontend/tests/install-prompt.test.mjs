import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createInstallPromptStore } from '../.test-build/installPrompt.js';

function ready(target, prompt, userChoice) {
 const event = new Event('beforeinstallprompt', { cancelable: true });
 event.prompt = prompt; event.userChoice = userChoice;
 target.dispatchEvent(event); return event;
}

test('Android prompt received before React subscription remains available', async () => {
 const target = new EventTarget(); const store = createInstallPromptStore(target);
 let calls = 0;
 const event = ready(target, async () => {calls++;}, Promise.resolve({outcome:'accepted'}));
 assert(event.defaultPrevented); assert(store.getSnapshot().canInstall);
 let notified = 0; const unsubscribe = store.subscribe(() => notified++);
 await store.install(); assert.equal(calls,1); assert(notified > 0);
 // Accepting the browser request is not yet proof that installation finished.
 assert.equal(store.getSnapshot().installed,false);
 target.dispatchEvent(new Event('appinstalled'));
 assert.equal(store.getSnapshot().installed,true); assert.equal(store.getSnapshot().canInstall,false);
 unsubscribe(); store.dispose();
});

test('native dialog opens in the click without waiting; repeated taps cannot reuse it', async () => {
 const target = new EventTarget(); const store = createInstallPromptStore(target);
 let resolveChoice; const choice = new Promise(r => resolveChoice = r); let calls = 0;
 ready(target, () => {calls++; return Promise.resolve();}, choice);
 const result = store.install();
 assert.equal(calls,1); assert(store.getSnapshot().pending);
 await store.install(); assert.equal(calls,1);
 resolveChoice({outcome:'dismissed'}); await result;
 assert.equal(store.getSnapshot().pending,false); assert.equal(store.getSnapshot().canInstall,false);
 assert.match(store.getSnapshot().message,/continuar pelo site/);
 ready(target,async()=>{},Promise.resolve({outcome:'accepted'}));
 assert(store.getSnapshot().canInstall); store.dispose();
});

test('missing or rejected native installation leaves a usable manual route', async () => {
 const target = new EventTarget(); const store = createInstallPromptStore(target);
 await store.install(); assert.equal(store.getSnapshot().pending,false);
 ready(target,async()=>{throw Error('browser refused');},undefined);
 await store.install();
 assert.equal(store.getSnapshot().pending,false); assert.equal(store.getSnapshot().installed,false);
 assert.match(store.getSnapshot().message,/menu do Chrome/);
 store.dispose();
 const event = ready(target,async()=>{},Promise.resolve({outcome:'accepted'}));
 assert.equal(event.defaultPrevented,false);
});
