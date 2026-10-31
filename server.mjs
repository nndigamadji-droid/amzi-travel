import {publicPages,renderPublicPage} from './lib/pages.mjs';
import {createServer} from 'node:http';
import {readFile,mkdir,readdir,stat,unlink} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {dirname,join,resolve,extname} from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {openStore} from './lib/store.mjs';
import {hashPassword,verifyPassword,createSession,sessionFromRequest} from './lib/auth.mjs';
import {HttpError,text,credentials,validateQuote,validateTrip,statuses,roles,csvCell} from './lib/validation.mjs';

const ROOT=dirname(fileURLToPath(import.meta.url));
const PUBLIC=new Set(['/','/index.html','/styles.css','/app.js','/catalog.mjs','/ui-state.mjs','/motion.js','/motion-state.mjs','/privacy.html','/admin','/admin/','/admin/index.html','/admin/admin.css','/admin/admin.js','/admin/form-guard.js']);
const TYPES={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.jpeg':'image/jpeg','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2','.ico':'image/x-icon'};
export async function createApp(options={}){
 const dataDir=resolve(options.dataDir||process.env.AMZI_DATA_DIR||join(ROOT,'data'));
 const store=openStore(dataDir,options.dbPath);const db=store.db;
 const port=options.port??Number(process.env.PORT||4180),host=options.host||'127.0.0.1';
 const production=process.env.NODE_ENV==='production';const configuredOrigin=options.origin||process.env.PUBLIC_ORIGIN;
 if(production&&(!configuredOrigin?.startsWith('https://')||!db.prepare('SELECT 1 FROM users LIMIT 1').get())){store.close();throw new Error('Initialisez le compte en local et configurez PUBLIC_ORIGIN en HTTPS avant le mode production.')}
 const secureCookies=options.secureCookies??production;
 const publicConfig={email:'Sounarow@gmail.com',phones:['+23566570579','+23569560256'],address:process.env.AMZI_ADDRESS||'',country:'Tchad',local:!production};
 const mail=options.mail??{key:process.env.RESEND_API_KEY,from:process.env.NOTIFY_FROM,to:process.env.NOTIFY_TO||publicConfig.email};
 const sendRequest=options.sendRequest??fetch;
 const mailReady=Boolean(mail.key&&mail.from&&mail.to);
 const limits=new Map();let lastCleanup=0,backupTimer,notifyTimer,origin='';const pendingNotifications=new Set();
 const limit=(key,max,window=60_000)=>{const now=Date.now();if(now-lastCleanup>60_000){for(const [k,v] of limits)if(v.until<now)limits.delete(k);db.prepare('DELETE FROM sessions WHERE expires<?').run(now);lastCleanup=now}const bucket=limits.get(key)||{count:0,until:now+window};if(bucket.until<now){bucket.count=0;bucket.until=now+window}if(++bucket.count>max)throw new HttpError(429,'Trop de tentatives. Patientez avant de réessayer.');limits.set(key,bucket)};
 function json(res,status,data,extra={}){res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...extra});res.end(JSON.stringify(data))}
 function cookie(token){return `amzi_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${secureCookies?'; Secure':''}`}
 function requireRole(req,allowed){const s=sessionFromRequest(db,req);if(!s?.user_id)throw new HttpError(401,'Connectez-vous à l’espace agence.');if(!allowed.includes(s.role))throw new HttpError(403,'Votre rôle ne permet pas cette action.');return s}
 function csrf(req){const s=sessionFromRequest(db,req);if(!s||s.csrf!==req.headers['x-csrf-token'])throw new HttpError(403,'Session expirée. Rechargez la page.');return s}
 async function body(req){if(!req.headers['content-type']?.startsWith('application/json'))throw new HttpError(415,'Un contenu JSON est requis.');let chunks=[],size=0;for await(const chunk of req){size+=chunk.length;if(size>24_000)throw new HttpError(413,'La demande est trop volumineuse.');chunks.push(chunk)}try{const b=JSON.parse(Buffer.concat(chunks).toString());if(!b||typeof b!=='object'||Array.isArray(b))throw Error();return b}catch{throw new HttpError(400,'La demande est illisible.')}}
 function audit(reference,actor,action){db.prepare('INSERT INTO history(reference,actor,action,created_at) VALUES(?,?,?,?)').run(reference,actor,action,new Date().toISOString())}
 async function notify(reference){
  if(pendingNotifications.has(reference))return;const row=db.prepare('SELECT * FROM quotes WHERE reference=?').get(reference);if(!row)return;
  if(!mailReady){db.prepare("UPDATE quotes SET notification='unconfigured' WHERE reference=?").run(reference);return false}
  if(row.notification==='sent')return true;pendingNotifications.add(reference);
  db.prepare("UPDATE quotes SET notification='pending', attempts=attempts+1,last_attempt=? WHERE reference=?").run(new Date().toISOString(),reference);
  try{const r=await sendRequest('https://api.resend.com/emails',{method:'POST',signal:AbortSignal.timeout(10000),headers:{authorization:`Bearer ${mail.key}`,'content-type':'application/json','idempotency-key':'amzi-quote-'+reference},body:JSON.stringify({from:mail.from,to:[mail.to],subject:`AMZI TRAVEL — nouvelle demande ${reference}`,text:`Une demande de devis a été enregistrée : ${reference}. Consultez les détails dans l’espace agence : ${origin}/admin/.`})});if(!r.ok)throw Error('mail');db.prepare("UPDATE quotes SET notification='sent' WHERE reference=?").run(reference);return true}catch{db.prepare("UPDATE quotes SET notification='failed' WHERE reference=?").run(reference);return false}finally{pendingNotifications.delete(reference)}
 }
 async function dailyBackup(){const folder=join(dataDir,'backups');await mkdir(folder,{recursive:true,mode:0o700});const name=`amzi-${new Date().toISOString().slice(0,10)}.sqlite`;if(!existsSync(join(folder,name)))await store.backup(join(folder,name));for(const f of await readdir(folder)){if(!/^amzi-\d{4}-\d{2}-\d{2}\.sqlite$/.test(f))continue;const path=join(folder,f);if(Date.now()-(await stat(path)).mtimeMs>30*86400_000)await unlink(path)}}
 const server=createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');res.setHeader('X-Frame-Options','DENY');res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'; object-src 'none'");
  if(production)res.setHeader('Strict-Transport-Security','max-age=31536000');
  try{
   if(req.headers.host!==new URL(origin).host)throw new HttpError(403,'Hôte non autorisé.');
   const url=new URL(req.url,origin),path=url.pathname,method=req.method,ip=req.socket.remoteAddress;
   if(['POST','PATCH','PUT','DELETE'].includes(method)&&req.headers.origin!==origin)throw new HttpError(403,'Origine non autorisée.');
   if(path.startsWith('/api/')){
    if(path==='/api/config'&&method==='GET')return json(res,200,publicConfig);
    if(path==='/api/catalog'&&method==='GET')return json(res,200,{trips:db.prepare('SELECT data FROM catalog WHERE published=1 ORDER BY rowid').all().map(r=>JSON.parse(r.data))});
    if(path==='/api/session'&&method==='GET'){
     limit('session:'+ip,60);let s=sessionFromRequest(db,req),headers={};if(!s){const fresh=createSession(db);headers={'set-cookie':cookie(fresh.token)};s={csrf:fresh.csrf}}
     return json(res,200,{csrf:s.csrf,user:s.user_id?{username:s.username,role:s.role}:null,setupRequired:!db.prepare('SELECT 1 FROM users LIMIT 1').get()},headers);
    }
    if(path==='/api/setup'&&method==='POST'){
     limit('setup:'+ip,5,15*60_000);csrf(req);if(production)throw new HttpError(403,'Initialisation uniquement en local.');if(db.prepare('SELECT 1 FROM users LIMIT 1').get())throw new HttpError(409,'Le compte initial existe déjà.');const c=credentials(await body(req));const hash=await hashPassword(c.password);
     db.exec('BEGIN IMMEDIATE');try{if(db.prepare('SELECT 1 FROM users LIMIT 1').get())throw new HttpError(409,'Le compte initial existe déjà.');db.prepare('INSERT INTO users(username,password_hash,role,created_at) VALUES(?,?,?,?)').run(c.username,hash,'admin',new Date().toISOString());db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw e}return json(res,201,{ok:true});
    }
    if(path==='/api/login'&&method==='POST'){
     limit('login:'+ip,10,15*60_000);const old=csrf(req),b=await body(req);const username=text(b.username,64,true).toLowerCase();if(typeof b.password!=='string'||!b.password||b.password.length>128)throw new HttpError(401,'Identifiant ou mot de passe incorrect.');const password=b.password;const user=db.prepare('SELECT * FROM users WHERE username=?').get(username);const fallback='00000000000000000000000000000000:'+('00'.repeat(64));const verified=await verifyPassword(password,user?.password_hash||fallback);if(!user||!verified)throw new HttpError(401,'Identifiant ou mot de passe incorrect.');db.prepare('DELETE FROM sessions WHERE token_hash=?').run(old.token_hash);const s=createSession(db,user.id);return json(res,200,{csrf:s.csrf,user:{username:user.username,role:user.role}},{'set-cookie':cookie(s.token)});
    }
    if(path==='/api/logout'&&method==='POST'){const s=csrf(req);db.prepare('DELETE FROM sessions WHERE token_hash=?').run(s.token_hash);return json(res,200,{ok:true},{'set-cookie':`amzi_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secureCookies?'; Secure':''}`})}
    if(path==='/api/quotes'&&method==='POST'){
     limit('quote:'+ip,options.quoteLimit??12,15*60_000);const b=await body(req);if(b.website)throw new HttpError(422,'La demande n’a pas pu être validée.');const q=validateQuote(b);const key=req.headers['idempotency-key'];if(typeof key!=='string'||!/^[a-zA-Z0-9-]{16,100}$/.test(key))throw new HttpError(422,'Identifiant de demande invalide. Rechargez le formulaire.');const fingerprint=createHash('sha256').update(JSON.stringify(q)).digest('hex');const previous=db.prepare('SELECT * FROM quotes WHERE request_key=?').get(key);
     if(previous){if(previous.fingerprint!==fingerprint)throw new HttpError(409,'Cette demande a déjà été enregistrée avec un autre contenu. Rechargez le formulaire pour une nouvelle demande.');return json(res,200,{reference:previous.reference,notification:previous.notification})}
     const reference='AMZI-'+new Date().toISOString().slice(0,10).replaceAll('-','')+'-'+randomUUID().slice(0,8).toUpperCase(),now=new Date().toISOString(),notification=mailReady?'pending':'unconfigured';
     db.exec('BEGIN IMMEDIATE');try{db.prepare('INSERT INTO quotes(reference,request_key,fingerprint,data,status,created_at,updated_at,notification) VALUES(?,?,?,?,?,?,?,?)').run(reference,key,fingerprint,JSON.stringify(q),'reçue',now,now,notification);audit(reference,'visiteur','Demande enregistrée');db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw e}
     json(res,201,{reference,notification});if(mailReady)setImmediate(()=>notify(reference).catch(()=>{}));return;
    }
    if(path.startsWith('/api/admin/')){
     const user=requireRole(req,['admin','advisor','editor']);if(method!=='GET')csrf(req);
     if(path==='/api/admin/users'&&method==='GET'){requireRole(req,['admin']);return json(res,200,{users:db.prepare('SELECT id,username,role,created_at FROM users ORDER BY id').all()})}
     if(path==='/api/admin/users'&&method==='POST'){
      requireRole(req,['admin']);const b=await body(req),c=credentials(b);if(!roles.includes(b.role))throw new HttpError(422,'Rôle invalide.');if(db.prepare('SELECT 1 FROM users WHERE username=?').get(c.username))throw new HttpError(409,'Cet identifiant existe déjà.');const hash=await hashPassword(c.password);db.prepare('INSERT INTO users(username,password_hash,role,created_at) VALUES(?,?,?,?)').run(c.username,hash,b.role,new Date().toISOString());return json(res,201,{ok:true});
     }
     if(path==='/api/admin/catalog'&&method==='GET'){requireRole(req,['admin','editor']);return json(res,200,{trips:db.prepare('SELECT data,published FROM catalog ORDER BY rowid').all().map(r=>({...JSON.parse(r.data),published:Boolean(r.published)})),images:(await readdir(join(ROOT,'assets'))).filter(x=>/\.(jpg|jpeg|png|webp)$/.test(x))})}
     if(path.startsWith('/api/admin/catalog/')&&method==='PUT'){
      requireRole(req,['admin','editor']);const id=path.split('/').at(-1);const trip=validateTrip(await body(req),id);if(!existsSync(join(ROOT,'assets',trip.image)))throw new HttpError(422,'L’image sélectionnée n’existe pas.');db.prepare('INSERT INTO catalog(id,data,published,updated_at) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,published=excluded.published,updated_at=excluded.updated_at').run(id,JSON.stringify(trip),Number(trip.published),new Date().toISOString());return json(res,200,{ok:true});
     }
     requireRole(req,['admin','advisor']);
     if(path==='/api/admin/quotes'&&method==='GET'){
      const quotes=db.prepare('SELECT * FROM quotes ORDER BY created_at DESC LIMIT 2000').all().map(r=>({reference:r.reference,...JSON.parse(r.data),status:r.status,notes:r.notes,createdAt:r.created_at,updatedAt:r.updated_at,notification:r.notification,attempts:r.attempts,history:db.prepare('SELECT actor,action,created_at FROM history WHERE reference=? ORDER BY id').all(r.reference)}));return json(res,200,{quotes,mailConfigured:mailReady});
     }
     if(path==='/api/admin/export.csv'&&method==='GET'){
      const rows=[['Référence','Date','Nom','E-mail','Téléphone','Départ','Destination','Service','Voyageurs','Statut','Notes']];for(const r of db.prepare('SELECT * FROM quotes ORDER BY created_at DESC').all()){const q=JSON.parse(r.data);rows.push([r.reference,r.created_at,q.name,q.email,q.phone,q.departure,q.destination,q.service,q.travelers,r.status,r.notes])}res.writeHead(200,{'content-type':'text/csv; charset=utf-8','content-disposition':'attachment; filename="amzi-demandes.csv"','cache-control':'no-store'});return res.end('\uFEFF'+rows.map(r=>r.map(csvCell).join(';')).join('\r\n'));
     }
     const match=/^\/api\/admin\/quotes\/(AMZI-[A-Z0-9-]+)(\/notify)?$/.exec(path);
     if(match){const reference=match[1];if(!db.prepare('SELECT 1 FROM quotes WHERE reference=?').get(reference))throw new HttpError(404,'Dossier introuvable.');
      if(match[2]&&method==='POST'){if(!mailReady)throw new HttpError(503,'L’envoi e-mail n’est pas configuré. La demande reste enregistrée.');const success=await notify(reference);return json(res,success?200:503,{ok:success,message:success?'Notification acceptée par le service d’envoi.':'Échec de notification. La demande reste enregistrée.'})}
      if(!match[2]&&method==='PATCH'){const b=await body(req);if(!statuses.includes(b.status))throw new HttpError(422,'Statut invalide.');const notes=text(b.notes,4000);db.exec('BEGIN IMMEDIATE');try{db.prepare('UPDATE quotes SET status=?,notes=?,updated_at=? WHERE reference=?').run(b.status,notes,new Date().toISOString(),reference);audit(reference,user.username,'Statut : '+b.status+' ; notes mises à jour');db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw e}return json(res,200,{ok:true})}
     }
    }
    throw new HttpError(404,'Action introuvable.');
   }
   if(method!=='GET'&&method!=='HEAD')throw new HttpError(405,'Méthode non autorisée.');
   const asset=/^\/assets\/[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp|woff2|ico|js)$/.test(path);
   if(!PUBLIC.has(path)&&path!=='/pages.css'&&!asset&&!publicPages[path]){res.writeHead(404,{'content-type':'text/html; charset=utf-8'});return res.end('<!doctype html><html lang="fr"><meta charset="utf-8"><title>Page introuvable — AMZI TRAVEL</title><h1>Cette page est introuvable.</h1><a href="/">Revenir à AMZI TRAVEL</a></html>')}
   const file=(path==='/'||publicPages[path])?'/index.html':['/admin','/admin/'].includes(path)?'/admin/index.html':path;
   let buffer=await readFile(join(ROOT,file));if(publicPages[path])buffer=Buffer.from(renderPublicPage(buffer.toString('utf8'),path));res.writeHead(200,{'content-type':TYPES[extname(file)]||'application/octet-stream','cache-control':asset?'public, max-age=3600':'no-cache','X-Robots-Tag':'noindex, nofollow'});return res.end(method==='HEAD'?undefined:buffer);
  }catch(e){if(res.headersSent){res.end();return}json(res,e.status||(e.code==='ENOENT'?404:500),{message:e.status?e.message:e.code==='ENOENT'?'Fichier introuvable.':'Le service est temporairement indisponible. Votre demande ne peut pas être confirmée. Réessayez.'})}
 });
 server.requestTimeout=15000;server.headersTimeout=10000;
 const app={get origin(){return origin},dataDir,backup:store.backup,
  async start(){await new Promise((ok,fail)=>{server.once('error',fail);server.listen(port,host,ok)});origin=configuredOrigin||`http://${host}:${server.address().port}`;if(options.backups!==false){await dailyBackup();backupTimer=setInterval(()=>dailyBackup().catch(()=>console.error('Sauvegarde automatique non disponible.')),3600_000);backupTimer.unref()}notifyTimer=setInterval(()=>{if(mailReady)for(const q of db.prepare("SELECT reference FROM quotes WHERE notification IN ('pending','failed','unconfigured') AND attempts<5 AND (last_attempt IS NULL OR last_attempt<?) LIMIT 10").all(new Date(Date.now()-60_000).toISOString()))void notify(q.reference)},60_000);notifyTimer.unref();return app},
  async close(){clearInterval(backupTimer);clearInterval(notifyTimer);if(server.listening){server.closeAllConnections();await new Promise(ok=>server.close(ok))}try{store.close()}catch{}}
 };return app;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){const app=await createApp();await app.start();console.log(`AMZI TRAVEL : ${app.origin}\nEspace agence : ${app.origin}/admin/`);for(const event of ['SIGINT','SIGTERM'])process.on(event,async()=>{await app.close();process.exit(0)})}
