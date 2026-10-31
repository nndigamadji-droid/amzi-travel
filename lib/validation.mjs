export class HttpError extends Error {constructor(status,message){super(message);this.status=status}}
export const statuses=['reçue','en traitement','devis transmis','conclue','classée'];
export const services=['Billet d’avion','Séjour via une agence partenaire','Pèlerinage','Autre demande'];
export const roles=['admin','advisor','editor'];
export function text(value,max,required=false){
 if(value!==undefined&&typeof value!=='string')throw new HttpError(422,'Un champ texte est invalide.');
 const s=(value??'').trim();if(s.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(s)||required&&!s)throw new HttpError(422,'Un champ est vide, trop long ou invalide.');return s;
}
export function date(value){const s=text(value,10);if(s&&(!/^\d{4}-\d{2}-\d{2}$/.test(s)||!Number.isFinite(Date.parse(s+'T00:00:00Z'))||new Date(s+'T00:00:00Z').toISOString().slice(0,10)!==s))throw new HttpError(422,'Une date est invalide.');return s}
export function validateQuote(body){
 const q={name:text(body.name,100,true),email:text(body.email,150),phone:text(body.phone,40),contactMethod:body.contactMethod||'email',departure:text(body.departure,100,true),destination:text(body.destination,150,true),service:text(body.service,80,true),travelers:Number(body.travelers),start:date(body.start),end:date(body.end),budget:text(body.budget,100),theme:text(body.theme,30),message:text(body.message,2000)};
 if(!services.includes(q.service)||!['email','phone'].includes(q.contactMethod)||!Number.isInteger(q.travelers)||q.travelers<1||q.travelers>99)throw new HttpError(422,'Vérifiez le service, le contact et le nombre de voyageurs.');
 if(q.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(q.email))throw new HttpError(422,'L’adresse e-mail est invalide.');
 if(q.phone&&!/^\+?[\d\s().-]{8,35}$/.test(q.phone))throw new HttpError(422,'Le téléphone est invalide.');
 if(q.contactMethod==='email'&&!q.email||q.contactMethod==='phone'&&!q.phone)throw new HttpError(422,'Renseignez le contact correspondant au canal de réponse choisi.');
 if(q.start&&q.end&&q.end<q.start)throw new HttpError(422,'Le retour ne peut pas précéder le départ.');return q;
}
export function credentials(body){const username=text(body.username,64,true).toLowerCase();if(!/^[a-z0-9][a-z0-9._@-]{2,63}$/.test(username)||typeof body.password!=='string'||body.password.length<14||body.password.length>128)throw new HttpError(422,'Identifiant de 3 à 64 caractères et mot de passe de 14 à 128 caractères requis.');return {username,password:body.password}}
export function validateTrip(body,id){
 if(!/^[a-z0-9-]{2,40}$/.test(id))throw new HttpError(422,'Référence de destination invalide.');
 const trip={id,country:text(body.country,80,true),title:text(body.title,120,true),place:text(body.place,160,true),image:text(body.image,80,true),tag:text(body.tag,70,true),intro:text(body.intro,1400,true),theme:text(body.theme,30,true),origin:'Tchad',price:null,published:body.published!==false};
 if(!['International','Pèlerinage'].includes(trip.theme)||! /^[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$/.test(trip.image))throw new HttpError(422,'Type ou image de destination invalide.');return trip;
}
export function csvCell(value){let s=String(value??'');if(/^[\s]*[=+@\-\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"'}
