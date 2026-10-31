import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createApp} from '../server.mjs';

const valid={name:'Alex Test',email:'alex@example.com',contactMethod:'email',phone:'',departure:'N’Djamena',destination:'Égypte — Le Caire',service:'Billet d’avion',travelers:2,start:'2027-04-05',end:'2027-04-12',budget:'400 000 XAF',theme:'International',message:'Essai automatisé',website:''};
test('cycle complet : devis, sécurité, rôles, catalogue, export et reprise',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'amzi-test-'));let app;
 try {
  app=await createApp({dataDir:dir,port:0,quoteLimit:100,secureCookies:false});await app.start();
  let root=app.origin;
  const request=async(path,{method='GET',body,cookie='',csrf='',key=''}={})=>fetch(root+path,{method,headers:{...(body?{'content-type':'application/json','origin':root}:{}),...(cookie?{cookie}:{}),...(csrf?{'x-csrf-token':csrf}:{}),...(key?{'idempotency-key':key}:{})},body:body?JSON.stringify(body):undefined});
  const session=async()=>{const r=await request('/api/session');return {cookie:r.headers.get('set-cookie').split(';')[0],...await r.json()}};
  const anon=await session();
  await t.test('les pages de navigation sont servies avec leur titre et une feuille de style autorisée',async()=>{for(const [path,id] of [['/destinations','destinations'],['/agence','agence'],['/services','services'],['/devis','devis']]){const r=await request(path);assert.equal(r.status,200);const html=await r.text();assert.ok(html.includes(`data-page="${id}"`));assert.ok(html.includes('href="/pages.css"'));assert.ok(!html.includes('<style>'));}assert.equal((await request('/pages.css')).status,200)});

  await t.test('les données privées restent protégées et les ressources d’animation sont servies',async()=>{for(const path of ['/server.mjs','/data/amzi.sqlite','/README.md','/tests/server.test.mjs'])assert.equal((await request(path)).status,404);assert.equal((await request('/api/admin/quotes')).status,401);for(const path of ['/assets/gsap.js','/motion.js','/motion-state.mjs']){const response=await request(path);assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/javascript/)}});
  await t.test('rejette les champs absents, les dates impossibles et les origines étrangères',async()=>{
   assert.equal((await request('/api/quotes',{method:'POST',body:{...valid,name:' '},key:'invalid-name-key'})).status,422);
   assert.equal((await request('/api/quotes',{method:'POST',body:{...valid,start:'2027-02-30'},key:'invalid-date-key'})).status,422);
   assert.equal((await request('/api/quotes',{method:'POST',body:{...valid,end:'2027-01-01'},key:'invalid-order-key'})).status,422);
   const r=await fetch(root+'/api/quotes',{method:'POST',headers:{'content-type':'application/json',origin:'https://example.org'},body:JSON.stringify(valid)});assert.equal(r.status,403);
  });
  let ref;
  await t.test('enregistre avant confirmation et évite les doublons',async()=>{
   const opts={method:'POST',body:valid,key:'unique-request-key-001'};const r=await request('/api/quotes',opts);assert.equal(r.status,201);const body=await r.json();ref=body.reference;assert.match(ref,/^AMZI-/);assert.equal(body.notification,'unconfigured');
   assert.equal((await (await request('/api/quotes',opts)).json()).reference,ref);
   assert.equal((await request('/api/quotes',{...opts,body:{...valid,name:'Autre personne'}})).status,409);
  });
  await t.test('initialisation protégée et impossible à répéter',async()=>{
   assert.equal((await request('/api/setup',{method:'POST',body:{username:'admin',password:'Example-Only-Password!'},cookie:anon.cookie})).status,403);
   assert.equal((await request('/api/setup',{method:'POST',body:{username:'admin',password:'Example-Only-Password!'},cookie:anon.cookie,csrf:anon.csrf})).status,201);
   assert.equal((await request('/api/setup',{method:'POST',body:{username:'autre',password:'Example-Only-Password!'},cookie:anon.cookie,csrf:anon.csrf})).status,409);
  });
  const login=async(username,password)=>{const s=await session();const r=await request('/api/login',{method:'POST',body:{username,password},cookie:s.cookie,csrf:s.csrf});assert.equal(r.status,200);return {cookie:r.headers.get('set-cookie').split(';')[0],...await r.json()}};
  const admin=await login('admin','Example-Only-Password!');
  await t.test('protège les écritures et suit le dossier',async()=>{
   assert.equal((await request('/api/admin/quotes/'+ref,{method:'PATCH',body:{status:'en traitement',notes:'Appel à prévoir'},cookie:admin.cookie})).status,403);
   const r=await request('/api/admin/quotes/'+ref,{method:'PATCH',body:{status:'en traitement',notes:'Appel à prévoir'},...admin});assert.equal(r.status,200);
   const list=await (await request('/api/admin/quotes',admin)).json();assert.equal(list.quotes.length,1);assert.equal(list.quotes[0].status,'en traitement');assert.ok(list.quotes[0].history.length>=2);
  });
  await t.test('un éditeur ne peut pas consulter les demandes',async()=>{
   assert.equal((await request('/api/admin/users',{method:'POST',body:{username:'editor',password:'Editor-Example-Password!',role:'editor'},...admin})).status,201);
   const editor=await login('editor','Editor-Example-Password!');assert.equal((await request('/api/admin/quotes',editor)).status,403);assert.equal((await request('/api/admin/catalog',editor)).status,200);
  });
  await t.test('un conseiller ne peut pas modifier le catalogue',async()=>{
   await request('/api/admin/users',{method:'POST',body:{username:'advisor',password:'Advisor-Example-Password!',role:'advisor'},...admin});const advisor=await login('advisor','Advisor-Example-Password!');assert.equal((await request('/api/admin/catalog',advisor)).status,403);assert.equal((await request('/api/admin/quotes',advisor)).status,200);
  });
  await t.test('archive une destination sans modifier les autres',async()=>{
   const before=await (await request('/api/catalog')).json();const trip=before.trips[0];const r=await request('/api/admin/catalog/'+trip.id,{method:'PUT',body:{...trip,published:false},...admin});assert.equal(r.status,200);const after=await (await request('/api/catalog')).json();assert.equal(after.trips.length,before.trips.length-1);assert.ok(!after.trips.find(x=>x.id===trip.id));
  });
  await t.test('notification indisponible conservée et export protégé',async()=>{
   assert.equal((await request('/api/admin/quotes/'+ref+'/notify',{method:'POST',body:{},...admin})).status,503);
   await request('/api/quotes',{method:'POST',body:{...valid,name:'=HYPERLINK("test")'},key:'export-formula-key-001'});
   const r=await request('/api/admin/export.csv',admin);assert.equal(r.status,200);assert.ok((await r.text()).includes("'=HYPERLINK"));
  });
  await t.test('déconnexion invalide la session',async()=>{await request('/api/logout',{method:'POST',body:{},...admin});assert.equal((await request('/api/admin/quotes',admin)).status,401)});
  await app.close();
  app=await createApp({dataDir:dir,port:0,secureCookies:false});await app.start();root=app.origin;
  const logged=await login('admin','Example-Only-Password!');const persisted=await (await request('/api/admin/quotes',logged)).json();assert.equal(persisted.quotes.length,2);assert.ok(persisted.quotes.find(q=>q.reference===ref));
  const backupPath=join(dir,'snapshot.sqlite');await app.backup(backupPath);await app.close();
  app=await createApp({dataDir:dir,dbPath:backupPath,port:0,secureCookies:false});await app.start();root=app.origin;const restored=await login('admin','Example-Only-Password!');assert.equal((await (await request('/api/admin/quotes',restored)).json()).quotes.length,2);
 }finally{if(app)await app.close();await rm(dir,{recursive:true,force:true})}
});
