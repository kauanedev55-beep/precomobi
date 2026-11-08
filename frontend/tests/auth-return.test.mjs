import assert from 'node:assert/strict';
import {test} from 'node:test';
import {rememberInvite,loginReturnPath} from '../.test-build/authReturn.js';
test('invitation survives account registration and login without an external redirect',()=>{
 const memory=new Map();globalThis.sessionStorage={setItem:(k,v)=>memory.set(k,v),getItem:k=>memory.get(k)||null,removeItem:k=>memory.delete(k)};
 const path='/convite/'+'a'.repeat(43);rememberInvite(path);assert.equal(loginReturnPath(),path);assert.equal(loginReturnPath(),'/lista');
 for(const path of ['https://evil.invalid','//evil.invalid','/\\evil.invalid'])assert.equal(loginReturnPath(path),'/lista');
 assert.equal(loginReturnPath('/listas/7'),'/listas/7');delete globalThis.sessionStorage;
});
