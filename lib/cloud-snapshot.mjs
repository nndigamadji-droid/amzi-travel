import {randomBytes,createCipheriv,createDecipheriv,timingSafeEqual} from 'node:crypto';

const magic=Buffer.from('AMZI01');
export function encryptSnapshot(data,key){
 if(!Buffer.isBuffer(key)||key.length!==32)throw new Error('Clé de chiffrement invalide.');
 const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);
 const encrypted=Buffer.concat([cipher.update(data),cipher.final()]);
 return Buffer.concat([magic,iv,cipher.getAuthTag(),encrypted]);
}
export function decryptSnapshot(data,key){
 const bytes=Buffer.from(data);
 if(bytes.length<35||!bytes.subarray(0,6).equals(magic))throw new Error('Instantané invalide.');
 const decipher=createDecipheriv('aes-256-gcm',key,bytes.subarray(6,18));
 decipher.setAuthTag(bytes.subarray(18,34));
 const plain=Buffer.concat([decipher.update(bytes.subarray(34)),decipher.final()]);
 if(!plain.subarray(0,16).equals(Buffer.from('SQLite format 3\0')))throw new Error('Base invalide.');
 return plain;
}
export function authorizedStateRequest(request,secret){
 if(!secret||secret.length<40)return false;
 const got=Buffer.from(request.headers.get('authorization')||''),wanted=Buffer.from('Bearer '+secret);
 return got.length===wanted.length&&timingSafeEqual(got,wanted);
}

export function stateHandler(store,{secret,maxBytes=4_000_000}={}){
 return async request=>{
  const headers={'cache-control':'no-store','x-content-type-options':'nosniff'};
  if(!authorizedStateRequest(request,secret))return new Response('Accès refusé.',{status:401,headers});
  try{
   if(request.method==='GET'){
    const snapshot=await store.getWithMetadata('current',{type:'arrayBuffer',consistency:'strong'});
    return snapshot?new Response(snapshot.data,{headers:{...headers,'content-type':'application/octet-stream','x-amzi-state-version':snapshot.etag}}):new Response('Non initialisé.',{status:404,headers});
   }
   if(request.method!=='PUT')return new Response('Méthode refusée.',{status:405,headers});
   // Un en-tête métier évite que le CDN intercepte les conditions HTTP standard.
   const version=request.headers.get('x-amzi-state-version');
   const match=version&&version!=='new'?version:null,fresh=version==='new';
   if(!match&&!fresh)return new Response('Version requise.',{status:428,headers});
   if(Number(request.headers.get('content-length'))>maxBytes)return new Response('Trop volumineux.',{status:413,headers});
   const bytes=new Uint8Array(await request.arrayBuffer());
   if(bytes.length>maxBytes||bytes.length<35||!Buffer.from(bytes.subarray(0,6)).equals(magic))return new Response('Instantané invalide.',{status:413,headers});
   const result=await store.set('current',bytes,{...(match?{onlyIfMatch:match}:{onlyIfNew:true})});
   if(!result.modified)return new Response('Version modifiée. Réessayez.',{status:412,headers});
   return Response.json({etag:result.etag},{headers});
  }catch{return new Response('Stockage indisponible.',{status:503,headers})}
 };
}
