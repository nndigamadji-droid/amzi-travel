import {mkdir,readFile,writeFile,copyFile,readdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join,dirname} from 'node:path';
import {publicPages,renderPublicPage} from '../lib/pages.mjs';

// Liste fermée : aucun dossier de données ni fichier de configuration n’est publié.
export async function buildNetlify(output,{backendOrigin}={}){
 const root=dirname(dirname(fileURLToPath(import.meta.url)));
 await mkdir(output,{recursive:true});
 const html=await readFile(join(root,'index.html'),'utf8');
 const withBase=text=>text.replace('<head>','<head><base href="/">');
 await writeFile(join(output,'index.html'),withBase(html));
 for(const path of Object.keys(publicPages)){
  const folder=join(output,path.slice(1));await mkdir(folder,{recursive:true});
  await writeFile(join(folder,'index.html'),withBase(renderPublicPage(html,path)));
 }
 for(const name of ['styles.css','pages.css','app.js','catalog.mjs','ui-state.mjs','motion.js','motion-state.mjs'])await copyFile(join(root,name),join(output,name));
 await writeFile(join(output,'privacy.html'),withBase(await readFile(join(root,'privacy.html'),'utf8')));
 await mkdir(join(output,'assets'),{recursive:true});
 for(const entry of await readdir(join(root,'assets'),{withFileTypes:true})){
  if(entry.isFile()&&/\.(png|jpe?g|webp|woff2|ico|js)$/.test(entry.name))await copyFile(join(root,'assets',entry.name),join(output,'assets',entry.name));
 }
 await mkdir(join(output,'admin'),{recursive:true});
 for(const name of ['index.html','admin.css','admin.js','form-guard.js'])await copyFile(join(root,'admin',name),join(output,'admin',name));
 if(backendOrigin){
  const url=new URL(backendOrigin);
  if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw new Error('AMZI_BACKEND_ORIGIN doit être une origine HTTPS sans chemin ni identifiant.');
  await writeFile(join(output,'_redirects'),`/api/* ${url.origin}/api/:splat 200!\n`);
 }
 await writeFile(join(output,'_headers'),`/*\n  X-Content-Type-Options: nosniff\n  X-Frame-Options: DENY\n  Referrer-Policy: same-origin\n  X-Robots-Tag: noindex, nofollow\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'\n`);
 await writeFile(join(output,'404.html'),'<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Page introuvable — AMZI TRAVEL</title><h1>Cette page est introuvable.</h1><a href="/">Revenir à l’accueil</a></html>');
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
 if(!process.env.AMZI_BACKEND_ORIGIN)throw new Error('Configurez AMZI_BACKEND_ORIGIN avec l’URL HTTPS du serveur Hostinger avant de publier.');
 await buildNetlify(join(dirname(dirname(fileURLToPath(import.meta.url))),'dist'),{backendOrigin:process.env.AMZI_BACKEND_ORIGIN});
 console.log('Pages Netlify préparées dans dist/.');
}
