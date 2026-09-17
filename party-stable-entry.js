(function(){
'use strict';
if(window.__catlakPartyStableEntryV2)return;
window.__catlakPartyStableEntryV2=true;
const APP=document.querySelector('#app');
if(!APP)return;
const txt=e=>String(e?.textContent||'').trim();
const isGM=()=>txt(APP.querySelector('.role'))==='GM';
let queued=false;
function toast(m){const t=document.querySelector('#toast');if(!t)return;t.textContent=String(m);t.classList.remove('hidden');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.add('hidden'),3000)}
function ensureTop(){
 const nav=APP.querySelector('.nav');if(!nav)return null;
 if(!isGM()){
  nav.querySelector('[data-prh-manager]')?.remove();
  nav.querySelectorAll('[data-cpr-manager]').forEach(x=>x.remove());
  return null;
 }
 nav.querySelectorAll('[data-cpr-manager]').forEach(x=>x.remove());
 let b=nav.querySelector('[data-prh-manager]');
 if(!b){
  b=document.createElement('button');
  b.type='button';
  b.dataset.prhManager='1';
  b.textContent='Parti Yönetimi';
  b.title='Parti Yönetimi odasını aç';
 }
 const live=nav.querySelector('[data-tab="gm"]');
 if(live){if(live.nextElementSibling!==b)live.insertAdjacentElement('afterend',b)}
 else if(b.parentElement!==nav)nav.appendChild(b);
 return b;
}
function ensureCenter(){
 if(!isGM())return;
 const bar=APP.querySelector('[data-gm2-centerbar]');if(!bar)return;
 let b=bar.querySelector('[data-ps-party-center]');
 if(!b){b=document.createElement('button');b.type='button';b.dataset.psPartyCenter='1';b.textContent='Parti Yönetimi';bar.appendChild(b)}
 b.classList.toggle('on',!!APP.querySelector('main [data-prh-page]'));
}
function cleanLiveIntro(){
 if(!isGM())return;
 const live=APP.querySelector('.nav [data-tab="gm"].on');
 if(!live)return;
 APP.querySelectorAll('main section.card').forEach(sec=>{
  if(txt(sec.querySelector('.eyebrow'))!=='CANLI OYUN MASASI')return;
  sec.querySelectorAll('p').forEach(p=>{
   if(txt(p).includes('Solda oyuncuların attığı zarlar'))p.remove();
  });
 });
}
function maintain(){queued=false;ensureTop();ensureCenter();cleanLiveIntro()}
function schedule(){if(queued)return;queued=true;requestAnimationFrame(maintain)}
function openPartyManager(){
 if(!isGM())return;
 const run=(n=0)=>{
  const b=ensureTop();
  if(window.__catlakPartyEeliotHotfix&&b){
   b.click();
   setTimeout(()=>{if(!APP.querySelector('main [data-prh-page]')&&n<8)run(n+1)},90);
   return;
  }
  if(n<25)setTimeout(()=>run(n+1),60);
  else toast('Parti Yönetimi katmanı hazır değil. Sayfayı bir kez yenile.');
 };
 run();
}
window.addEventListener('click',e=>{
 const b=e.target.closest?.('#app [data-ps-party-center]');
 if(!b)return;
 e.preventDefault();e.stopImmediatePropagation();openPartyManager();
},true);
new MutationObserver(schedule).observe(APP,{childList:true,subtree:true});
setTimeout(maintain,80);setTimeout(maintain,400);setTimeout(maintain,1200);
window.__catlakPartyStableEntry={maintain,open:openPartyManager,cleanLiveIntro};
})();
