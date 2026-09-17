(function(){
'use strict';
if(window.__catlakStatCharacterSwitchV2)return;
window.__catlakStatCharacterSwitchV2=true;
const APP=document.querySelector('#app');
if(!APP)return;
const txt=e=>String(e?.textContent||'').trim();
const isGM=()=>txt(APP.querySelector('.role'))==='GM';
const toast=m=>{const t=document.querySelector('#toast');if(!t)return;t.textContent=String(m);t.classList.remove('hidden');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.add('hidden'),3000)};
let token=0,lastId='',lastAt=0;

function workshopOpen(){return !!APP.querySelector('main .cux-workshop [data-cux-character]')}
function editorId(){return String(APP.querySelector('main [data-cux-editor]')?.dataset?.cuxEditor||'')}
function selectedId(){try{return String(window.__catlakStatsTest?.selected?.()||'')}catch(_){return''}}
function mark(id){
 APP.querySelectorAll('main .cux-character-btn[data-cux-character]').forEach(b=>b.classList.toggle('on',String(b.dataset.cuxCharacter)===String(id)));
}

function choose(id){
 id=String(id||'');if(!id||!isGM()||!workshopOpen())return false;
 const now=performance.now();
 if(id===lastId&&now-lastAt<180)return true;
 lastId=id;lastAt=now;const my=++token;
 mark(id);
 const run=(tries=0)=>{
  if(my!==token||!workshopOpen())return false;
  const api=window.__catlakStatsTest;
  if(!api||typeof api.select!=='function'){
   if(tries<40){setTimeout(()=>run(tries+1),25);return false}
   toast('Stat karakter seçicisi hazır değil.');return false;
  }
  try{api.select(id)}catch(e){console.warn('STAT_SWITCH select',e)}
  requestAnimationFrame(()=>{
   if(my!==token)return;
   if(selectedId()===id&&editorId()===id){mark(id);return}
   if(tries<6){setTimeout(()=>run(tries+1),30);return}
   toast('Karakter editörü değiştirilemedi.');
  });
  return true;
 };
 return run();
}

function pickFromEvent(e){
 const b=e.target?.closest?.('#app main .cux-character-btn[data-cux-character],#app main [data-cux-character]');
 if(!b||!isGM()||!workshopOpen())return false;
 const id=String(b.dataset.cuxCharacter||'');if(!id)return false;
 e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
 choose(id);return true;
}

window.addEventListener('pointerdown',pickFromEvent,true);
window.addEventListener('mousedown',e=>{if(e.button==null||e.button===0)pickFromEvent(e)},true);
window.addEventListener('touchstart',pickFromEvent,{capture:true,passive:false});
window.addEventListener('click',pickFromEvent,true);

window.__catlakStatCharacterSwitch={choose,selected:selectedId,editor:editorId};
})();
