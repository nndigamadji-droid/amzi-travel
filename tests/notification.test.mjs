import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {setTimeout as pause} from 'node:timers/promises';
import {createApp} from '../server.mjs';
import {openStore} from '../lib/store.mjs';
const quote={name:'Test notification',phone:'+23566000000',contactMethod:'phone',email:'',departure:'N’Djamena',destination:'Arabie saoudite',service:'Pèlerinage',travelers:1};
test('un échec du fournisseur e-mail ne perd pas la demande',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'amzi-mail-'));let app;let succeeds=false,calls=0;
 try{
  app=await createApp({dataDir:dir,port:0,mail:{key:'fake-test-key',from:'test@example.com',to:'test@example.com'},sendRequest:async()=>{calls++;return {ok:succeeds}},backups:false});await app.start();
  const r=await fetch(app.origin+'/api/quotes',{method:'POST',headers:{origin:app.origin,'content-type':'application/json','idempotency-key':'mail-failure-test-request'},body:JSON.stringify(quote)});assert.equal(r.status,201);const {reference}=await r.json();
  const store=openStore(dir);for(let i=0;i<20;i++){const row=store.db.prepare('SELECT * FROM quotes WHERE reference=?').get(reference);if(row.notification==='failed')break;await pause(10)}
  const row=store.db.prepare('SELECT * FROM quotes WHERE reference=?').get(reference);assert.equal(row.notification,'failed');assert.equal(JSON.parse(row.data).phone,quote.phone);assert.equal(calls,1);store.close();
 }finally{if(app)await app.close();await rm(dir,{recursive:true,force:true})}
});
test('la limitation des envois refuse une nouvelle demande sans fausse confirmation',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'amzi-limit-'));const app=await createApp({dataDir:dir,port:0,quoteLimit:1,mail:{},backups:false});
 try{await app.start();const submit=key=>fetch(app.origin+'/api/quotes',{method:'POST',headers:{origin:app.origin,'content-type':'application/json','idempotency-key':key},body:JSON.stringify(quote)});assert.equal((await submit('first-rate-request-key')).status,201);const r=await submit('second-rate-request-key');assert.equal(r.status,429);assert.equal((await r.json()).reference,undefined)}finally{await app.close();await rm(dir,{recursive:true,force:true})}
});
