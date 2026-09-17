(function(){
'use strict';
if(window.__catlakStatCharacterSwitchV1)return;
window.__catlakStatCharacterSwitchV1=true;
const APP=document.querySelector('#app');
if(!APP)return;
const txt=e=>String(e?.textContent||'').trim();
const isGM=()=>txt(APP.querySelector('.role'))==='GM';
const toast=m=>{const t=document.querySelector('#toast');if(!t)return;t.textContent=String(m);t.classList.remove('hidden');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.add('hidden'),3000)};
let token=0;

function workshopOpen(){return !!APP.querySelector('main .cux-workshop [data-cux-character]')}
function editorId(){return String(APP.querySelector('main [data-cux-editor]')?.dataset?.cuxEditor||'')}
function selectedId(){try{return String(window.__catlakStatsTest?.selected?.()||'')}catch(_){return''}}

async function choose(id){
 id=String(id||'');if(!id||!isGM())return false;
 const my=++token;
 let tries=0;
 const run=async()=>{
  if(my!==token||!workshopOpen())return false;
  const api=window.__catlakStatsTest;
  if(!api||typeof api.select!=='function'){
   if(++tries<40){setTimeout(run,30);return false}
   toast('Stat karakter seçicisi hazır değil.');return false;
  }
  try{api.select(id)}catch(e){console.warn('STAT_SWITCH select',e)}
  await new Promise(r=>requestAnimationFrame(r));
  if(my!==token)return false;
  if(selectedId()===id&&editorId()===id)return true;
  if(typeof api.render==='function'){
   try{await Promise.resolve(api.render(true));api.select(id)}catch(e){console.warn('STAT_SWITCH redraw',e)}
  }
  await new Promise(r=>requestAnimationFrame(r));
  if(selectedId()===id&&editorId()===id)return true;
  if(++tries<4){setTimeout(run,35);return false}
  toast('Karakter editörü değiştirilemedi.');return false;
 };
 return run();
}

window.addEventListener('click',e=>{
 const b=e.target.closest?.('#app main .cux-character-btn[data-cux-character],#app main [data-cux-character]');
 if(!b||!isGM()||!workshopOpen())return;
 e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
 choose(b.dataset.cuxCharacter);
},true);

window.__catlakStatCharacterSwitch={choose,selected:selectedId,editor:editorId};
})();
