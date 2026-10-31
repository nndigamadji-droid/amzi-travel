import {test} from 'node:test';
import assert from 'node:assert/strict';
import {renderPublicPage,publicPages} from '../lib/pages.mjs';
import {readFile} from 'node:fs/promises';
test('les quatre pages partagent le contenu source et possèdent leur titre et leur périmètre',async()=>{const html=await readFile(new URL('../index.html',import.meta.url),'utf8');for(const [path,page] of Object.entries(publicPages)){const result=renderPublicPage(html,path);assert.ok(result.includes(`data-page="${page.id}"`));assert.ok(result.includes(`<title>${page.title} — AMZI TRAVEL</title>`));assert.ok(!result.includes('src="motion.js"'));assert.ok(result.includes('id="quote-form"'));}});

test('chaque page possède un bandeau illustré, un titre unique et le menu partagé',async()=>{
 const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
 for(const path of Object.keys(publicPages)){
  const result=renderPublicPage(html,path);
  assert.match(result,/<header class="page-intro page-banner" aria-labelledby="page-title">/);
  assert.equal((result.match(/id="page-title"/g)||[]).length,1);
  assert.match(result,/aria-label="Fil d’Ariane"/);
  assert.match(result,/id="navigation"/);
  const image=result.match(/class="page-banner-image" src="\/assets\/([^" ]+)"/)[1];
  assert.ok((await readFile(new URL('../assets/'+image,import.meta.url))).length>0);
 }
});
