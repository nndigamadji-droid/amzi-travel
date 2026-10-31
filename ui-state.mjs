export function readFilters(url,countries){const p=new URL(url).searchParams;return {country:countries.includes(p.get('country'))?p.get('country'):'',theme:['International','Pèlerinage'].includes(p.get('theme'))?p.get('theme'):''}}
export function filterUrl(url,state){const u=new URL(url);for(const key of ['country','theme']){if(state[key])u.searchParams.set(key,state[key]);else u.searchParams.delete(key)}return u.pathname+u.search+u.hash}
export function formSnapshot(data){return JSON.stringify(Object.entries(data).sort(([a],[b])=>a.localeCompare(b)))}
export function quoteErrors(p){
 const e={};const value=k=>String(p[k]??'').trim();
 for(const [key,label] of [['name','Indiquez votre nom.'],['destination','Indiquez le pays et la ville de destination.'],['departure','Indiquez votre ville de départ au Tchad.']])if(!value(key))e[key]=label;
 const email=value('email'),phone=value('phone');
 if((email||p.contactMethod==='email')&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))e.email='Indiquez une adresse e-mail valide, par exemple nom@exemple.com.';
 if((phone||p.contactMethod==='phone')&&!/^\+?[\d\s().-]{8,35}$/.test(phone))e.phone='Indiquez un numéro valide avec son indicatif, par exemple +235 66 00 00 00.';
 if(!Number.isInteger(Number(p.travelers))||Number(p.travelers)<1||Number(p.travelers)>99)e.travelers='Indiquez entre 1 et 99 voyageurs.';
 if(!p.service)e.service='Choisissez le service souhaité.';
 if(p.start&&p.end&&p.end<p.start)e.end='La date de retour doit être égale ou postérieure au départ.';
 return e;
}
