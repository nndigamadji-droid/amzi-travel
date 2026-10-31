import {readFilters,filterUrl,quoteErrors} from './ui-state.mjs';
import {filterTrips,validateDates,quoteDestination} from './catalog.mjs';
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let trips=[],catalogError=false;
try{const response=await fetch('/api/catalog');if(!response.ok)throw Error();trips=(await response.json()).trips}catch{catalogError=true}
const countries=[...new Set(trips.map(t=>t.country))].sort((a,b)=>a.localeCompare(b,'fr'));
for(const selector of ['#quick-country','#filter-country'])for(const country of countries){const option=document.createElement('option');option.value=country;option.textContent=country;$(selector).append(option)}
const state={...readFilters(location.href,countries),duration:''};
function render(syncUrl=true){
 if(syncUrl)history.replaceState(null,'',filterUrl(location.href,state));
 const visible=filterTrips(trips,state);
 $('#trip-grid').scrollLeft=0;
 $('#trip-grid').innerHTML=visible.map(t=>`<article class="trip-card"><div class="trip-image-wrap"><img src="assets/${esc(t.image)}" alt="${esc(t.country)} — photographie d’illustration" width="600" height="460" loading="lazy"></div><div class="trip-body"><p class="trip-location">${esc(t.country)}</p><h3>${esc(t.title)}</h3><p class="trip-route">${esc(t.place)}</p><div class="trip-bottom"><div><small>Au départ du Tchad</small><strong>Sur devis</strong></div><button type="button" data-trip="${esc(t.id)}" aria-label="Découvrir ${esc(t.title)}"><span class="card-action-label">Découvrir</span><span aria-hidden="true">↗</span></button></div></div></article>`).join('');
 $('#result-count').textContent=`${visible.length} destination${visible.length>1?'s':''} au départ du Tchad`;
 $('#empty-state').hidden=visible.length>0;
 for(const button of document.querySelectorAll('[data-theme]')){const active=button.dataset.theme===state.theme;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active))}
 $('#filter-country').value=state.country;
 $('#quick-country').value=state.country;$('#quick-search').elements.theme.value=state.theme;
}
render(false);
window.addEventListener('popstate',()=>{Object.assign(state,readFilters(location.href,countries));render(false)});
$('#destination-summary').textContent=trips.length?trips.map(t=>t.country).join(' · '):'Précisez votre destination dans le formulaire.';
if(catalogError){$('#result-count').textContent='Le catalogue est momentanément indisponible.';$('#empty-state').querySelector('p').textContent='Réessayez plus tard ou contactez directement AMZI TRAVEL. Vous pouvez toujours préciser votre destination dans le formulaire.'}
for(const button of document.querySelectorAll('[data-theme]'))button.addEventListener('click',()=>{state.theme=button.dataset.theme;render()});
$('#filter-country').addEventListener('change',e=>{state.country=e.target.value;render()});

function resetFilters(){Object.assign(state,{country:'',theme:'',duration:''});render()}
$('#reset-filters').addEventListener('click',resetFilters);
$('#empty-reset').addEventListener('click',()=>{resetFilters();$('#catalog-title').focus({preventScroll:true})});
$('.filter-toggle').addEventListener('click',e=>{const button=e.currentTarget;const open=button.getAttribute('aria-expanded')!=='true';button.setAttribute('aria-expanded',String(open));$('#more-filters').hidden=!open});
$('#quick-search').addEventListener('submit',e=>{e.preventDefault();const data=new FormData(e.currentTarget);Object.assign(state,{country:data.get('country'),theme:data.get('theme'),duration:''});render();document.getElementById('destinations').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'})});
const tripDialog=$('#trip-dialog');
$('#trip-grid').addEventListener('click',e=>{const button=e.target.closest('[data-trip]');if(!button)return;const t=trips.find(t=>t.id===button.dataset.trip);$('#trip-dialog-content').innerHTML=`<img class="detail-hero" src="assets/${esc(t.image)}" alt="${esc(t.country)} — photographie d’illustration"><div class="detail-body"><p class="eyebrow">${esc(t.country)} · AU DÉPART DU TCHAD</p><h2 id="trip-dialog-title">${esc(t.title)}</h2><p>${esc(t.intro)}</p><p class="detail-alert">AMZI TRAVEL intervient comme intermédiaire. Les compagnies, agences partenaires, disponibilités, tarifs, frais et conditions seront précisés dans la proposition. Aucun vol direct, forfait ou délai de délivrance de visa n’est garanti.</p><h3>Votre demande, étape par étape</h3><ol class="itinerary"><li>Précisez votre ville de départ au Tchad, votre destination et vos dates.</li><li>${t.theme==='Pèlerinage'?'Indiquez le type de pèlerinage souhaité, Omra ou Hajj, et les prestations à étudier.':'Choisissez un billet d’avion, un séjour via une agence partenaire ou précisez un autre besoin.'}</li><li>L’agence consulte les prestataires concernés pour étudier les possibilités.</li><li>Examinez le devis et les conditions des prestataires avant de confirmer.</li></ol><div class="detail-foot"><span>Tarif et disponibilités à confirmer</span><button type="button" class="button button-navy" id="choose-trip">Demander un devis <span aria-hidden="true">↗</span></button></div></div>`;tripDialog.showModal();document.body.style.overflow='hidden';$('#choose-trip').addEventListener('click',()=>{if(document.body.dataset.page!=='devis'){const u=new URL('/devis',location.origin);u.searchParams.set('destination',quoteDestination(t));u.searchParams.set('theme',t.theme);if(t.theme==='Pèlerinage')u.searchParams.set('service','Pèlerinage');location.assign(u.pathname+u.search);return}closeDialog(tripDialog);$('#quote-destination').value=quoteDestination(t);$('#quote-form').elements.theme.value=t.theme;$('#quote-service').value=t.theme==='Pèlerinage'?'Pèlerinage':'';$('#devis').scrollIntoView({behavior:'instant'});$('#quote-destination').focus({preventScroll:true})})});
function closeDialog(dialog){dialog.close();document.body.style.overflow=''}
for(const dialog of document.querySelectorAll('dialog')){dialog.querySelector('.dialog-close').addEventListener('click',()=>closeDialog(dialog));dialog.addEventListener('close',()=>{document.body.style.overflow=''});dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeDialog(dialog)})}
const dateStart=$('#date-start'),dateEnd=$('#date-end');
function checkDates(){dateEnd.setCustomValidity(validateDates(dateStart.value,dateEnd.value)?'':'La date de retour doit être égale ou postérieure à la date de départ.')}
dateStart.addEventListener('change',()=>{dateEnd.min=dateStart.value;checkDates()});dateEnd.addEventListener('change',checkDates);
const quoteForm=$('#quote-form');
const contactMethod=$('#contact-method');
function updateContact(){const phone=contactMethod.value==='phone';$('#contact-phone').required=phone;$('#contact-email').required=!phone;$('#email-required').textContent=phone?'':' *';$('#phone-required').textContent=phone?' *':''}
contactMethod.addEventListener('change',updateContact);updateContact();
const controls=[...quoteForm.querySelectorAll('input,select,textarea')].filter(el=>el.name&&el.name!=='website');
for(const el of controls){
 if(!el.id)el.id='quote-'+el.name;
 const hint=document.createElement('span');hint.id=el.id+'-error';hint.className='field-error';hint.hidden=true;
 el.insertAdjacentElement('afterend',hint);
 el.setAttribute('aria-describedby',((el.getAttribute('aria-describedby')||'')+' '+hint.id).trim());
 el.addEventListener('input',()=>{el.removeAttribute('aria-invalid');hint.hidden=true});
}
function showErrors(errors,message){
 for(const el of controls){const hint=document.getElementById(el.id+'-error');const invalid=Boolean(errors[el.name]);el.setAttribute('aria-invalid',String(invalid));hint.textContent=errors[el.name]||'';hint.hidden=!invalid}
 $('#form-error').textContent=message||'Vérifiez les champs signalés ci-dessous.';$('#form-error').hidden=false;
 const first=controls.find(el=>errors[el.name]);(first||$('#form-error')).focus();
}
let submitting=false;
quoteForm.addEventListener('submit',async e=>{
 e.preventDefault();if(submitting)return;
 const payload=Object.fromEntries(new FormData(quoteForm));
 const errors=quoteErrors(payload);if(Object.keys(errors).length){showErrors(errors);return}
 checkDates();if(!quoteForm.reportValidity())return;
 const button=quoteForm.querySelector('[type="submit"]');const original=button.innerHTML;let failure=null;submitting=true;button.disabled=true;button.textContent='Enregistrement en cours…';$('#form-error').hidden=true;
 try{
  const bytes=new TextEncoder().encode(JSON.stringify(payload));const signature=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
  let pending;try{pending=JSON.parse(sessionStorage.getItem('amzi-pending-request'))}catch{}
  if(pending?.signature!==signature)pending={signature,key:crypto.randomUUID()};try{sessionStorage.setItem('amzi-pending-request',JSON.stringify(pending))}catch{}
  const response=await fetch('/api/quotes',{method:'POST',headers:{'content-type':'application/json','idempotency-key':pending.key},body:JSON.stringify(payload)});
  const data=await response.json();if(!response.ok){const error=Error(data.message||'La demande n’a pas pu être enregistrée.');error.field=data.field;throw error;}
  $('#quote-reference').textContent=data.reference;$('#success-dialog').showModal();document.body.style.overflow='hidden';quoteForm.reset();dateEnd.min='';dateEnd.setCustomValidity('');updateContact();
 }catch(err){failure=err}
 finally{submitting=false;button.disabled=false;button.innerHTML=original;if(failure){const text=failure.message==='Failed to fetch'?'Connexion interrompue. Vos champs sont conservés. Réessayez ; une même demande ne sera pas enregistrée deux fois.':failure.message;showErrors(failure.field?{[failure.field]:text}:{},text)}}
});
$('.close-success').addEventListener('click',()=>closeDialog($('#success-dialog')));
$('#legal-button').addEventListener('click',()=>{$('#legal-dialog').showModal();document.body.style.overflow='hidden'});
const menu=$('.menu-toggle');function closeMenu(restoreFocus=false){const wasOpen=menu.getAttribute('aria-expanded')==='true';menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label','Ouvrir le menu');$('#navigation').classList.remove('open');if(restoreFocus&&wasOpen)menu.focus()}
menu.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'Fermer le menu':'Ouvrir le menu');$('#navigation').classList.toggle('open',open)});
for(const a of document.querySelectorAll('#navigation a'))a.addEventListener('click',()=>closeMenu());
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu(true)});

$('#pilgrimage-cta').addEventListener('click',()=>{$('#quote-destination').value='Arabie saoudite — projet de pèlerinage';$('#quote-service').value='Pèlerinage';$('#quote-form').elements.theme.value='Pèlerinage'});

for(const link of document.querySelectorAll('[data-service]'))link.addEventListener('click',()=>{const service=link.dataset.service;$('#quote-service').value=service;$('#quote-form').elements.theme.value=service==='Pèlerinage'?'Pèlerinage':'International';if(service==='Pèlerinage')$('#quote-destination').value='Arabie saoudite — projet de pèlerinage'});

for(const link of document.querySelectorAll('[data-inspiration]'))link.addEventListener('click',()=>{
 $('#quote-destination').value=link.dataset.inspiration;
 $('#quote-form').elements.theme.value=link.dataset.project;
 $('#quote-service').value='';
});

for(const link of document.querySelectorAll('[data-fare-destination]'))link.addEventListener('click',()=>{
 $('#quote-destination').value=link.dataset.fareDestination;
 $('#quote-service').value='Billet d’avion';
 $('#quote-theme').value='International';
 const detail=[link.dataset.fareKind,link.dataset.fareDates].filter(Boolean).join(' · ');
 if(detail)$('#quote-message').value='Je souhaite vérifier le tarif pour : '+link.dataset.fareDestination+' · '+detail+'.';
});
const weekly=document.querySelector('.weekly-section');
if(weekly&&new Date().toLocaleDateString('en-CA',{timeZone:'Africa/Ndjamena'})>weekly.dataset.reviewUntil){
 for(const price of document.querySelectorAll('.observed-price')){price.textContent='Sur devis';price.nextElementSibling.hidden=true}
 $('#fare-status').textContent='Le relevé doit être actualisé. Contactez AMZI TRAVEL pour les prix disponibles selon vos dates.';
}

// Les pages distinctes partagent le même catalogue et transmettent seulement le projet choisi.
if(document.body.dataset.page==='devis'){
 const params=new URLSearchParams(location.search);
 for(const [key,selector] of [['destination','#quote-destination'],['service','#quote-service'],['theme','#quote-theme'],['message','#quote-message']]){
  const value=params.get(key);if(value&&value.length<=2000){const field=$(selector);if(field.tagName!=='SELECT'||[...field.options].some(o=>o.value===value))field.value=value}
 }
}
document.addEventListener('click',e=>{
 const link=e.target.closest('a');if(!link||link.getAttribute('href')!=='/devis'||document.body.dataset.page==='devis'||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;
 const isProject=link.matches('[data-service],[data-inspiration],[data-fare-destination],#pilgrimage-cta,#hero-primary');
 if(!isProject)return;
 e.preventDefault();const url=new URL('/devis',location.origin);
 for(const [key,selector] of [['destination','#quote-destination'],['service','#quote-service'],['theme','#quote-theme'],['message','#quote-message']]){const value=$(selector).value;if(value)url.searchParams.set(key,value)}
 location.assign(url.pathname+url.search);
});
for(const a of document.querySelectorAll('#navigation a'))if(new URL(a.href).pathname.replace(/\/+$/,'')===location.pathname.replace(/\/+$/,''))a.setAttribute('aria-current','page');
