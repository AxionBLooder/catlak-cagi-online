(function(){
'use strict';
if(window.__catlakPartyStableEntryV3)return;
window.__catlakPartyStableEntryV3=true;
const APP=document.querySelector('#app');
if(!APP)return;
const txt=e=>String(e?.textContent||'').trim();
const isGM=()=>txt(APP.querySelector('.role'))==='GM';
let queued=false;
function toast(m){const t=document.querySelector('#toast');if(!t)return;t.textContent=String(m);t.classList.remove('hidden');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.add('hidden'),3000)}
function ensureTop(){
 const nav=APP.querySelector('.nav');if(!nav)return null;
 const live=nav.querySelector('[data-tab="gm"]');
 if(live&&txt(live)!=='Canlı Oyun')live.textContent='Canlı Oyun';
 if(!isGM()){
  nav.querySelector('[data-prh-manager]')?.remove();
  nav.querySelectorAll('[data-cpr-manager],[data-pm3-open]').forEach(x=>x.remove());
  return null;
 }
 nav.querySelectorAll('[data-cpr-manager],[data-pm3-open]').forEach(x=>x.remove());
 let b=nav.querySelector('[data-prh-manager]');
 if(!b){
  b=document.createElement('button');
  b.type='button';
  b.dataset.prhManager='1';
  b.textContent='Parti Yönetimi';
  b.title='Parti Yönetimi odasını aç';
 }
 if(live){if(live.nextElementSibling!==b)live.insertAdjacentElement('afterend',b)}
 else if(b.parentElement!==nav)nav.appendChild(b);
 return b;
}
function cleanCenter(){APP.querySelectorAll('[data-gm2-centerbar] [data-ps-party-center]').forEach(x=>x.remove())}
function cleanPartyManager(){APP.querySelectorAll('main [data-prh-page] > .prh-top').forEach(x=>x.remove())}
function cleanLiveChrome(){
 if(!isGM())return;
 const live=APP.querySelector('.nav [data-tab="gm"].on');if(!live)return;
 if(txt(live)!=='Canlı Oyun')live.textContent='Canlı Oyun';
 APP.querySelectorAll('main section.card').forEach(sec=>{
  const eyebrow=txt(sec.querySelector('.eyebrow')),title=txt(sec.querySelector('h1,h2'));
  if((eyebrow==='CANLI OYUN MASASI'||eyebrow==='CANLI OYUN')&&title==='Oyuncular & Zarlar')sec.remove();
 });
}
function maintain(){queued=false;ensureTop();cleanCenter();cleanPartyManager();cleanLiveChrome()}
function schedule(){if(queued)return;queued=true;requestAnimationFrame(maintain)}
function openPartyManager(){
 if(!isGM())return;
 const run=(n=0)=>{
  ensureTop();
  const api=window.__catlakPartyEeliotHotfix;
  if(api&&typeof api.open==='function'){
   api.open();
   setTimeout(()=>{cleanPartyManager();if(!APP.querySelector('main [data-prh-page]')&&n<8)run(n+1)},90);
   return;
  }
  if(n<25)setTimeout(()=>run(n+1),60);
  else toast('Parti Yönetimi katmanı hazır değil. Sayfayı bir kez yenile.');
 };
 run();
}
new MutationObserver(schedule).observe(APP,{childList:true,subtree:true,characterData:true});
setTimeout(maintain,80);setTimeout(maintain,400);setTimeout(maintain,1200);
window.__catlakPartyStableEntry={maintain,open:openPartyManager,cleanLiveChrome,cleanPartyManager,cleanCenter};
})();