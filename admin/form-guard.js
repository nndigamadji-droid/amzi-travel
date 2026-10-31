import {formSnapshot} from '/ui-state.mjs';

export function protectForms(pairs){
 const baselines=new Map();let pending=null;
 const prompt=document.querySelector('#discard-dialog');
 const snapshot=form=>formSnapshot(Object.fromEntries(new FormData(form)));
 const clean=form=>baselines.set(form,snapshot(form));
 const dirty=form=>baselines.has(form)&&baselines.get(form)!==snapshot(form);
 const requestClose=(dialog,form)=>{if(!dirty(form)){dialog.close();return}pending={dialog,form,focus:document.activeElement};prompt.showModal();document.querySelector('#keep-editing').focus()};
 for(const [dialog,form] of pairs){
  dialog.querySelector('.close').addEventListener('click',()=>requestClose(dialog,form));
  dialog.addEventListener('cancel',e=>{e.preventDefault();requestClose(dialog,form)});
 }
 const keep=()=>{const previous=pending;pending=null;prompt.close();if(previous?.focus?.isConnected)previous.focus.focus()};
 document.querySelector('#keep-editing').addEventListener('click',keep);
 prompt.addEventListener('cancel',e=>{e.preventDefault();keep()});
 document.querySelector('#discard-changes').addEventListener('click',()=>{const previous=pending;pending=null;prompt.close();if(previous){clean(previous.form);previous.dialog.close()}});
 window.addEventListener('beforeunload',e=>{if(pairs.some(([dialog,form])=>dialog.open&&dirty(form))){e.preventDefault();e.returnValue=''}});
 return {clean,dirty};
}
