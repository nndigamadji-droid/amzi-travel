import {createServer,request} from 'node:http';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {createApp} from '../server.mjs';
import {encryptSnapshot,decryptSnapshot} from '../lib/cloud-snapshot.mjs';

export function remoteState({url,token,key,send=fetch}){
 const request=(method,body,headers={})=>send(url,{method,headers:{authorization:'Bearer '+token,...headers},body,signal:AbortSignal.timeout(12000)});
 return {
  async read(){const r=await request('GET');if(!r.ok)throw new Error('Stockage distant indisponible.');const etag=r.headers.get('x-amzi-state-version');if(!etag)throw new Error('Version du stockage absente.');return {data:decryptSnapshot(await r.arrayBuffer(),key),etag}},
  async write(data,etag){const r=await request('PUT',encryptSnapshot(data,key),{'x-amzi-state-version':etag,'content-type':'application/octet-stream'});if(r.status===412)return false;if(!r.ok)throw new Error('Enregistrement distant non confirmé.');return true}
 };
}

export function createCloudServer({state,origin,host='127.0.0.1',port=0,backendHost='',maxQueue=12}){
 let queue=Promise.resolve(),queued=0,healthy=true;
 const answer=(res,status,message)=>{res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});res.end(JSON.stringify({message}))};
 const server=createServer(async(req,res)=>{
  const publicHost=new URL(origin).host;
  if(req.headers.host!==publicHost&&req.headers.host!==backendHost)return answer(res,403,'Hôte non autorisé.');
  if(req.url==='/health')return answer(res,healthy?200:503,healthy?'AMZI TRAVEL — disponible':'Stockage indisponible.');
  if(!req.url.startsWith('/api/'))return answer(res,404,'Les pages du site sont disponibles sur '+origin);
  if(['POST','PUT','PATCH','DELETE'].includes(req.method)&&req.headers.origin!==origin)return answer(res,403,'Origine non autorisée.');
  let chunks=[],size=0;
  for await(const part of req){size+=part.length;if(size>24_000)return answer(res,413,'La demande est trop volumineuse.');chunks.push(part)}
  if(queued>=maxQueue)return answer(res,429,'Service occupé. Réessayez dans un instant.');
  const body=Buffer.concat(chunks);queued++;
  const previous=queue;let release;queue=new Promise(ok=>release=ok);await previous;
  try{
   for(let attempt=0;attempt<3;attempt++){
    const snapshot=await state.read();healthy=true;const dir=await mkdtemp(join(tmpdir(),'amzi-cloud-'));let app;
    try{
     const file=join(dir,'amzi.sqlite');await writeFile(file,snapshot.data,{mode:0o600});
     // Le compteur est enregistré avec la demande : il survit aux mises en veille.
     const writable=req.method!=='GET'||!req.url.startsWith('/api/catalog');
     const db=new DatabaseSync(file);
     try{
      db.exec('CREATE TABLE IF NOT EXISTS cloud_limits(key TEXT PRIMARY KEY,count INTEGER NOT NULL,until INTEGER NOT NULL)');
      const now=Date.now();db.prepare('DELETE FROM cloud_limits WHERE until<?').run(now);
      const bucket=req.url.split('?')[0]+':'+req.method;
      const limit=bucket==='/api/login:POST'?12:bucket==='/api/quotes:POST'?8:120;
      const current=db.prepare('SELECT count,until FROM cloud_limits WHERE key=?').get(bucket);
      if(current?.count>=limit){answer(res,429,'Trop de tentatives. Patientez une minute.');return}
      if(writable)db.prepare('INSERT INTO cloud_limits VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET count=count+1').run(bucket,1,now+60_000);
     }finally{db.close()}
     app=await createApp({dataDir:dir,port:0,host:'127.0.0.1',origin,secureCookies:true,backups:false,mail:{}});await app.start();
     const headers={...req.headers,host:publicHost};delete headers.connection;delete headers['content-length'];delete headers['transfer-encoding'];
     const response=await new Promise((ok,fail)=>{
      const forwarded=request(app.listenOrigin+req.url,{method:req.method,headers,timeout:15000},upstream=>{
       let parts=[];upstream.on('data',part=>parts.push(part));upstream.on('end',()=>ok({status:upstream.statusCode,headers:upstream.headers,payload:Buffer.concat(parts)}));upstream.on('error',fail);
      });forwarded.on('error',fail);forwarded.on('timeout',()=>forwarded.destroy(new Error('Délai dépassé.')));forwarded.end(['GET','HEAD'].includes(req.method)?undefined:body);
     });
     const payload=response.payload;
     await app.close();app=null;
     if(writable&&!await state.write(await readFile(file),snapshot.etag))continue;
     const returned={...response.headers};delete returned['content-length'];delete returned['transfer-encoding'];delete returned['content-encoding'];
     res.writeHead(response.status,returned);res.end(payload);return;
    }finally{if(app)await app.close();await rm(dir,{recursive:true,force:true})}
   }
   answer(res,409,'Une modification simultanée a eu lieu. Vos champs sont conservés ; réessayez.');
  }catch{healthy=false;if(!res.headersSent)answer(res,503,'Enregistrement indisponible. Votre demande ne peut pas être confirmée. Vos champs sont conservés ; réessayez.');else res.end()}
  finally{queued--;release()}
 });
 return {
  get origin(){return `http://${host}:${server.address().port}`},
  async start(){await new Promise((ok,fail)=>{server.once('error',fail);server.listen(port,host,ok)});return this},
  async close(){await queue;server.closeAllConnections();await new Promise(ok=>server.close(ok))}
 };
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const key=Buffer.from(process.env.AMZI_STATE_KEY||'','base64');
 if(!process.env.PUBLIC_ORIGIN?.startsWith('https://')||!process.env.AMZI_STATE_URL?.startsWith('https://')||!process.env.AMZI_STATE_TOKEN||key.length!==32)throw new Error('Configurez le stockage chiffré distant et PUBLIC_ORIGIN avant le démarrage.');
 process.env.NODE_ENV='production';
 const state=remoteState({url:process.env.AMZI_STATE_URL,token:process.env.AMZI_STATE_TOKEN,key});
 await state.read();
 const server=createCloudServer({state,origin:process.env.PUBLIC_ORIGIN,host:'0.0.0.0',port:Number(process.env.PORT||10000),backendHost:process.env.RENDER_EXTERNAL_HOSTNAME||''});
 await server.start();console.log('AMZI : serveur démarré avec stockage chiffré distant.');
 for(const event of ['SIGINT','SIGTERM'])process.on(event,async()=>{await server.close();process.exit(0)});
}
