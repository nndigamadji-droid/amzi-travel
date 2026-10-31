import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,readdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {buildNetlify} from '../scripts/build-netlify.mjs';

test('la préparation Netlify génère les pages publiques sans publier les données privées',async()=>{
 const output=await mkdtemp(join(tmpdir(),'amzi-netlify-'));
 try{
  await buildNetlify(output,{backendOrigin:'https://backend.example'});
  const files=await readdir(output);
  for(const forbidden of ['data','.env','server.mjs','lib','tests','verification'])assert.ok(!files.includes(forbidden));
  assert.match(await readFile(join(output,'admin/index.html'),'utf8'),/AMZI/);
  assert.equal(await readFile(join(output,'_redirects'),'utf8'),'/api/* https://backend.example/api/:splat 200!\n');
  for(const route of ['destinations','agence','services','devis']){
   const html=await readFile(join(output,route,'index.html'),'utf8');
   assert.ok(html.includes('<base href="/">'));
   assert.ok(html.includes('class="page-intro page-banner"'));
   assert.ok(html.includes(`data-page="${route}"`));
  }
 }finally{await rm(output,{recursive:true,force:true})}
});
