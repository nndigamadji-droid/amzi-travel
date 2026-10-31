import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {request} from 'node:http';
import {openStore} from '../lib/store.mjs';
import {hashPassword} from '../lib/auth.mjs';
import {encryptSnapshot,decryptSnapshot,stateHandler} from '../lib/cloud-snapshot.mjs';
import {createCloudServer,remoteState} from '../scripts/start-render-free.mjs';

function memoryStore(){let value=null,version=0;return {
 async getWithMetadata(){return value?{data:value,etag:String(version)}:null},
 async set(key,data,{onlyIfNew,onlyIfMatch}){if(onlyIfNew&&value||onlyIfMatch!==undefined&&onlyIfMatch!==String(version))return {modified:false};value=Buffer.from(data);return {modified:true,etag:String(++version)}}
}}
test('le stockage chiffré exige un secret et refuse les écritures sur une version dépassée',async()=>{
 const key=randomBytes(32),plain=Buffer.concat([Buffer.from('SQLite format 3\0'),Buffer.from('données confidentielles')]);
 const encrypted=encryptSnapshot(plain,key);assert.ok(!encrypted.includes(Buffer.from('confidentielles')));assert.deepEqual(decryptSnapshot(encrypted,key),plain);
 encrypted[40]^=1;assert.throws(()=>decryptSnapshot(encrypted,key));
 const handle=stateHandler(memoryStore(),{secret:'x'.repeat(48)});
 const call=(method,body,headers={})=>handle(new Request('https://example.test/state',{method,headers:{authorization:'Bearer '+'x'.repeat(48),...headers},body}));
 assert.equal((await handle(new Request('https://example.test/state'))).status,401);
 assert.equal((await call('GET')).status,404);
 const valid=encryptSnapshot(plain,key);
 assert.equal((await call('PUT',valid,{'x-amzi-state-version':'new'})).status,200);
 assert.equal((await call('PUT',valid,{'x-amzi-state-version':'new'})).status,412);
 const first=await call('GET');assert.equal(first.headers.get('x-amzi-state-version'),'1');
 assert.equal((await call('PUT',valid,{'x-amzi-state-version':'0'})).status,412);
 assert.equal((await call('PUT',valid,{'x-amzi-state-version':'1'})).status,200);
});

test('le serveur gratuit confirme seulement après stockage durable et retrouve les devis après redémarrage',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'amzi-durable-')),key=randomBytes(32),token='s'.repeat(48),store=memoryStore();let server;
 const old=process.env.NODE_ENV;process.env.NODE_ENV='production';
 try{
  const local=openStore(dir);local.db.prepare('INSERT INTO users(username,password_hash,role,created_at) VALUES(?,?,?,?)').run('admin',await hashPassword('Only-For-Test-Password!'),'admin',new Date().toISOString());local.close();
  await store.set('current',encryptSnapshot(await readFile(join(dir,'amzi.sqlite')),key),{onlyIfNew:true});
  const handle=stateHandler(store,{secret:token});let outage=false,conflict=false;
  const send=async(url,init)=>{if(outage)return new Response('indisponible',{status:503});if(conflict&&init.method==='PUT'){conflict=false;return new Response('conflit',{status:412})}return handle(new Request(url,init))};
  const state=remoteState({url:'https://storage.test/state',token,key,send});
  const start=async()=>{server=createCloudServer({state,origin:'https://amzi.test'});await server.start()};await start();
  const call=(path,method='GET',body,headers={})=>new Promise((ok,fail)=>{const req=request(server.origin+path,{method,headers:{host:'amzi.test',origin:'https://amzi.test',...(body?{'content-type':'application/json'}:{}),...headers}},res=>{let chunks=[];res.on('data',b=>chunks.push(b));res.on('end',()=>ok({status:res.statusCode,headers:res.headers,data:JSON.parse(Buffer.concat(chunks).toString())}))});req.on('error',fail);req.end(body?JSON.stringify(body):undefined)});
  const valid={name:'Essai durable',contactMethod:'email',email:'test@example.com',departure:'N’Djamena',destination:'Le Caire',service:'Billet d’avion',travelers:2,website:''};
  conflict=true;const saved=await call('/api/quotes','POST',valid,{'idempotency-key':'durable-test-key-123456'});assert.equal(saved.status,201);assert.ok(saved.data.reference);
  await server.close();await start();
  const duplicate=await call('/api/quotes','POST',valid,{'idempotency-key':'durable-test-key-123456'});assert.equal(duplicate.data.reference,saved.data.reference);
  const session=await call('/api/session');assert.match(session.headers['set-cookie'][0],/; Secure/);
  outage=true;assert.equal((await call('/api/quotes','POST',{...valid,name:'Autre essai'},{'idempotency-key':'new-durable-key-123456'})).status,503);
  assert.equal((await call('/health')).status,503);outage=false;
  assert.equal((await call('/api/catalog')).status,200);
  assert.equal((await call('/api/catalog','GET',undefined,{host:'intrus.test'})).status,403);
 }finally{if(server)await server.close();if(old===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=old;await rm(dir,{recursive:true,force:true})}
});
