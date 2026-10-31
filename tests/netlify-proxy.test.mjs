import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createServer} from 'node:net';
import {request} from 'node:http';
import {openStore} from '../lib/store.mjs';
import {createApp} from '../server.mjs';

test('le relais Hostinger accepte son hôte explicite sans affaiblir origine et cookies',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'amzi-proxy-'));
 const oldMode=process.env.NODE_ENV,oldHost=process.env.AMZI_BACKEND_HOST;
 let app;
 try{
  const store=openStore(dir);store.db.prepare('INSERT INTO users(username,password_hash,role,created_at) VALUES(?,?,?,?)').run('fixture','non-utilisable','admin',new Date().toISOString());store.close();
  const probe=createServer();await new Promise(ok=>probe.listen(0,'127.0.0.1',ok));const port=probe.address().port;await new Promise(ok=>probe.close(ok));
  process.env.NODE_ENV='production';process.env.AMZI_BACKEND_HOST='backend.example';
  app=await createApp({dataDir:dir,port,origin:'https://amzi.example',backups:false,mail:{}});await app.start();
  const call=(path,headers,method='GET')=>new Promise((ok,fail)=>{
   const req=request({hostname:'127.0.0.1',port,path,method,headers},res=>{res.resume();res.on('end',()=>ok({status:res.statusCode,headers:{get:name=>res.headers[name]?.toString()}}))});req.on('error',fail);req.end();
  });
  assert.equal((await call('/api/catalog',{host:'backend.example'})).status,200);
  assert.equal((await call('/api/catalog',{host:'intrus.example'})).status,403);
  assert.equal((await call('/api/quotes',{host:'backend.example',origin:'https://intrus.example'},'POST')).status,403);
  const session=await call('/api/session',{host:'backend.example'});
  assert.equal(session.status,200);assert.match(session.headers.get('set-cookie'),/; Secure/);
 }finally{
  if(app)await app.close();
  if(oldMode===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=oldMode;
  if(oldHost===undefined)delete process.env.AMZI_BACKEND_HOST;else process.env.AMZI_BACKEND_HOST=oldHost;
  await rm(dir,{recursive:true,force:true});
 }
});
