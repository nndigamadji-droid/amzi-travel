import {heroScenes,sceneAt,slideEffects} from './motion-state.mjs';
const hero=document.querySelector('.hero');

const gsap=window.gsap;
document.documentElement.dataset.animationEngine=gsap?'gsap':'unavailable';
let reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,floating=null;
function syncMotion(){
 document.documentElement.dataset.motion=reduced?'reduced':'running';
 if(floating)floating.paused(reduced||document.hidden);
}
if(gsap){
 const media=gsap.matchMedia();
 media.add({normal:'(prefers-reduced-motion: no-preference)',reduced:'(prefers-reduced-motion: reduce)'},context=>{
  reduced=context.conditions.reduced;
  if(!reduced){
   gsap.timeline({defaults:{ease:'power3.out'}})
    .from('.hero-copy > *',{y:24,autoAlpha:0,duration:.7,stagger:.11},.12)
    .from('.hero-discovery',{y:30,autoAlpha:0,duration:.7},.65);
   floating=gsap.timeline({repeat:-1,yoyo:true,defaults:{duration:3.8,ease:'sine.inOut'}})
    .to('.hero-aircraft > img',{y:-10,rotation:-.5},0)
    .to('.hero-wordmark',{y:-4},0);
  }else floating=null;
  syncMotion();return ()=>{floating=null};
 });
}else{reduced=true;syncMotion()}
document.addEventListener('visibilitychange',syncMotion);
let slideIndex=0,slideTimer=null,changing=false;
const backdrops=[...document.querySelectorAll('.hero-backdrop')];
let activeBackdrop=0;
function preloadNext(){const next=new Image();next.src='assets/'+sceneAt(slideIndex+1).image}
preloadNext();
const copy=document.querySelector('.hero-message');
const title=document.querySelector('#hero-title'),description=document.querySelector('#hero-description'),link=document.querySelector('#hero-primary');
async function changeSlide(){
 if(changing||document.hidden||hero.contains(document.activeElement))return;
 changing=true;
 const nextIndex=(slideIndex+1)%heroScenes.length;
 const scene=sceneAt(nextIndex);
 const nextBackdrop=backdrops[1-activeBackdrop],previousBackdrop=backdrops[activeBackdrop];
 nextBackdrop.src='assets/'+scene.image;
 try{await nextBackdrop.decode()}catch{changing=false;return}
 slideIndex=nextIndex;
 const apply=()=>{
  title.textContent=scene.title;description.textContent=scene.description;
  link.querySelector('.cta-label').textContent=scene.label;link.href=scene.href;link.dataset.heroService=scene.id;
  hero.dataset.scene=scene.id;hero.dataset.slide=String(slideIndex+1);
  hero.dataset.image=scene.image;
  if(gsap&&!reduced){
   const directions=[{xPercent:4},{xPercent:-4},{yPercent:4},{yPercent:-4},{scale:1.12},{scale:1.04},{rotation:1.5,scale:1.08},{rotation:-1.5,scale:1.08},{scale:1.16},{xPercent:3,scale:1.06}];
   gsap.fromTo(nextBackdrop,{opacity:0,...directions[slideIndex]},{opacity:1,xPercent:0,yPercent:0,rotation:0,scale:1,duration:1.35,ease:'power2.out',overwrite:true});
   gsap.to(previousBackdrop,{opacity:0,duration:1.1});
  }else{nextBackdrop.style.opacity='1';previousBackdrop.style.opacity='0'}
  activeBackdrop=1-activeBackdrop;preloadNext();changing=false;
  if(gsap&&!reduced){
   gsap.set(copy,{clearProps:'transform,opacity,clipPath'});
   gsap.fromTo(copy,{opacity:0,...slideEffects[slideIndex]},{opacity:1,x:0,y:0,scale:1,rotation:0,rotationX:0,clipPath:'inset(0 0% 0 0)',duration:.85,ease:'power3.out',clearProps:'transform,opacity,clipPath'});
  }
 };
 if(gsap&&!reduced)gsap.to(copy,{opacity:0,duration:.25,onComplete:apply});else apply();
}
slideTimer=setInterval(changeSlide,8000);
hero.dataset.slide='1';hero.dataset.image=sceneAt(0).image;
window.addEventListener('pagehide',()=>clearInterval(slideTimer));
window.addEventListener('pageshow',e=>{if(e.persisted){clearInterval(slideTimer);slideTimer=setInterval(changeSlide,8000)}});

document.querySelector('#hero-primary').addEventListener('click',e=>{
 const id=e.currentTarget.dataset.heroService;
 if(id==='destinations')return;
 document.querySelector('#quote-service').value=id==='pelerinage'?'Pèlerinage':'Billet d’avion';
 document.querySelector('#quote-form').elements.theme.value=id==='pelerinage'?'Pèlerinage':'International';
 if(id==='pelerinage')document.querySelector('#quote-destination').value='Arabie saoudite — projet de pèlerinage';
});
const grid=document.querySelector('#trip-grid');
const arrows=[...document.querySelectorAll('[data-catalog-direction]')];
function updateArrows(){for(const b of arrows)b.disabled=Number(b.dataset.catalogDirection)<0?grid.scrollLeft<3:grid.scrollLeft+grid.clientWidth>=grid.scrollWidth-3}
for(const b of arrows)b.addEventListener('click',()=>grid.scrollBy({left:Number(b.dataset.catalogDirection)*(grid.clientWidth+24),behavior:reduced?'instant':'smooth'}));
grid.addEventListener('scroll',updateArrows,{passive:true});window.addEventListener('resize',updateArrows);new MutationObserver(updateArrows).observe(grid,{childList:true});updateArrows();
window.addEventListener('pagehide',()=>{if(floating)floating.pause()});window.addEventListener('pageshow',syncMotion);
