(function(){
'use strict';
if(window.__catlakPartyStableEntryV1)return;
window.__catlakPartyStableEntryV1=true;
const APP=document.querySelector('#app');
if(!APP)return;
const txt=e=>String(e?.textContent||'').trim();
const isGM=()=>txt(APP.querySelector('.role'))==='GM';
let queued=false;
function toast(m){const t=document.querySelector('#toast');if(!t)return;t.textContent=String(m);t.classList.remove('hidden');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.add('hidden'),3000)}
function ensureTop(){
 const nav=APP.querySelector('.nav');if(!nav)return null;
 if(!isGM()){nav.querySelector('[data-prh-manager]')?.remove();return null}
 let b=nav.querySelector('[data-prh-manager]');
 if(!b){b=document.createElement('button');b.type='button';b.dataset.prhManager='1';b.textContent='Parti Yönetimi';b.title='Parti Yönetimi odasını aç';const a=nav.querySelector('[data-gmt-open]');a?a.after(b):nav.appendChild(b)}
 return b;
}
function ensureCenter(){
 if(!isGM())return;
 const bar=APP.querySelector('[data-gm2-centerbar]');if(!bar)return;
 let b=bar.querySelector('[data-ps-party-center]');
 if(!b){b=document.createElement('button');b.type='button';b.dataset.psPartyCenter='1';b.textContent='Parti Yönetimi';bar.appendChild(b)}
 b.classList.toggle('on',!!APP.querySelector('main [data-prh-page]'));
}
function maintain(){queued=false;ensureTop();ensureCenter()}
function schedule(){if(queued)return;queued=true;requestAnimationFrame(maintain)}
function openPartyManager(){
 if(!isGM())return;
 const run=(n=0)=>{
  const b=ensureTop();
  if(window.__catlakPartyEeliotHotfix&&b){b.click();setTimeout(()=>{if(!APP.querySelector('main [data-prh-page]')&&n<6)run(n+1)},90);return}
  if(n<20)setTimeout(()=>run(n+1),60);else toast('Parti Yönetimi katmanı hazır değil. Sayfayı bir kez yenile.');
 };
 run();
}
window.addEventListener('click',e=>{const b=e.target.closest?.('#app [data-ps-party-center]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();openPartyManager()},true);
new MutationObserver(schedule).observe(APP,{childList:true,subtree:true});
setTimeout(maintain,80);setTimeout(maintain,400);setTimeout(maintain,1200);
window.__catlakPartyStableEntry={maintain,open:openPartyManager};
})();