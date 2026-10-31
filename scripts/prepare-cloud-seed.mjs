// Préparation privée exécutée uniquement sur demande de déploiement, jamais au build.
import {randomBytes} from 'node:crypto';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {openStore} from '../lib/store.mjs';
import {hashPassword} from '../lib/auth.mjs';
import {encryptSnapshot} from '../lib/cloud-snapshot.mjs';
const folder=process.argv[2];if(!folder)throw new Error('Dossier privé requis.');
await mkdir(folder,{recursive:true});
const password=randomBytes(24).toString('base64url'),token=randomBytes(48).toString('base64url'),key=randomBytes(32);
const dbfile=join(folder,'seed.sqlite');
const store=openStore(folder,dbfile);
if(store.db.prepare('SELECT 1 FROM users').get()){store.close();throw new Error('Une initialisation existe déjà : aucune modification.');}
store.db.prepare('INSERT INTO users(username,password_hash,role,created_at) VALUES(?,?,?,?)').run('amzi-admin',await hashPassword(password),'admin',new Date().toISOString());store.close();
await writeFile(join(folder,'seed.bin'),encryptSnapshot(await readFile(dbfile),key),{mode:0o600});
await writeFile(join(folder,'netlify.env'),'AMZI_STATE_TOKEN='+token+'\n',{mode:0o600});
await writeFile(join(folder,'render.env'),['NODE_ENV=production','PUBLIC_ORIGIN=https://amzi-travel.netlify.app','AMZI_STATE_URL=https://amzi-travel.netlify.app/.netlify/functions/amzi-state','AMZI_STATE_TOKEN='+token,'AMZI_STATE_KEY='+key.toString('base64')].join('\n')+'\n',{mode:0o600});
await writeFile(join(folder,'acces-agence.txt'),'AMZI TRAVEL — Accès privé\nAdresse : https://amzi-travel.netlify.app/admin/\nIdentifiant : amzi-admin\nMot de passe : '+password+'\n\nConservez ce fichier dans un emplacement privé. Ne le publiez pas.\n',{mode:0o600});
console.log('Initialisation privée prête ; aucune donnée client locale copiée.');
