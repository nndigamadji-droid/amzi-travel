import {test} from 'node:test';
import assert from 'node:assert/strict';
import {heroScenes,sceneAt,slideEffects} from '../motion-state.mjs';
test('les commandes de scène bouclent dans les deux sens',()=>{assert.equal(sceneAt(-1).id,heroScenes.at(-1).id);assert.equal(sceneAt(heroScenes.length).id,heroScenes[0].id)});
test('les scènes aviation conservent les actions autorisées sans promettre une réservation',()=>{assert.ok(heroScenes.length>=10);assert.equal(new Set(heroScenes.map(s=>s.title)).size,heroScenes.length);assert.equal(slideEffects.length,10);for(const s of heroScenes){assert.ok(['/devis','/destinations'].includes(s.href));assert.ok(s.title.length>10);assert.ok(!/paiement|réservation confirmée|24\/7/.test(s.title))}});

test('chaque message possède une image distincte disponible et une description',async()=>{const {existsSync}=await import('node:fs');assert.equal(new Set(heroScenes.map(s=>s.image)).size,10);for(const scene of heroScenes){assert.ok(existsSync(new URL('../assets/'+scene.image,import.meta.url)));assert.ok(scene.imageAlt.length>15)}});
