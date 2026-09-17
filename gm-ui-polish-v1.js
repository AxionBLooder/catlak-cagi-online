(function(){
'use strict';
if(window.__catlakGmUiPolishV1)return;
window.__catlakGmUiPolishV1=true;
const APP=document.getElementById('app');
if(!APP)return;

if(!document.getElementById('cc-gm-ui-polish-style')){
  const s=document.createElement('style');
  s.id='cc-gm-ui-polish-style';
  s.textContent=`
    /* Dışarıdaki eski Karakter Yönetimi düğmesini gizle; yerine Parti Odası yanında Yönetim Odası kullan. */
    html body #app.gmc-gm .nav [data-tab="characters"]{display:none!important}
    #app .nav [data-cc-management-room]{display:inline-flex!important}

    /* Canlı masayı yatay şerit yerine daha kare/merkezi bir çalışma alanına çevir. */
    html body #app main[data-cc-simple-live="1"]{max-width:1180px!important;margin-left:auto!important;margin-right:auto!important;padding:12px!important}
    html body #app main[data-cc-simple-live="1"] .cc-live-two{max-width:980px!important;margin:0 auto 10px!important;grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;gap:10px!important;align-items:stretch!important}
    html body #app main[data-cc-simple-live="1"] .cc-live-two>.card{max-height:330px!important;min-height:250px!important;overflow:auto!important}
    html body #app main[data-cc-simple-live="1"] .lcc-board{max-width:1080px!important;margin:10px auto 0!important}
    html body #app main[data-cc-simple-live="1"] .lcc-columns{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:10px!important}
    html body #app main[data-cc-simple-live="1"] .lcc-conditions{grid-column:1/-1!important}
    html body #app main[data-cc-simple-live="1"] .cc-simple-roll{grid-template-columns:30px minmax(0,1fr) 38px!important;min-height:28px!important;padding:3px 0!important}
    html body #app main[data-cc-simple-live="1"] .cc-simple-player{padding:5px 0!important}

    @media(max-width:900px){
      html body #app main[data-cc-simple-live="1"]{max-width:none!important}
      html body #app main[data-cc-simple-live="1"] .cc-live-two,
      html body #app main[data-cc-simple-live="1"] .lcc-columns{grid-template-columns:1fr!important;max-width:none!important}
      html body #app main[data-cc-simple-live="1"] .cc-live-two>.card{min-height:0!important;max-height:280px!important}
      html body #app main[data-cc-simple-live="1"] .lcc-conditions{grid-column:auto!important}
    }
  `;
  document.head.appendChild(s);
}

function isGM(){return String(APP.querySelector('.role')?.textContent||'').trim()==='GM'}

function removeLiveHeading(){
  const main=APP.querySelector('main[data-cc-simple-live="1"]');
  if(!main)return;
  [...main.children].forEach(el=>{
    if(!(el instanceof HTMLElement)||!el.matches('section.card'))return;
    const eyebrow=String(el.querySelector(':scope > .eyebrow')?.textContent||'').trim();
    const h1=String(el.querySelector(':scope > h1')?.textContent||'').trim();
    if(eyebrow==='CANLI OYUN MASASI'&&h1==='Oyuncular & Zarlar')el.remove();
  });
}

function ensureManagementRoom(){
  if(!isGM())return;
  const nav=APP.querySelector('.nav');
  if(!nav)return;
  let b=nav.querySelector('[data-cc-management-room]');
  if(!b){
    b=document.createElement('button');
    b.type='button';
    b.dataset.ccManagementRoom='1';
    b.textContent='Yönetim Odası';
  }
  const party=nav.querySelector('[data-prh-manager]');
  if(party){
    if(b.previousElementSibling!==party)party.insertAdjacentElement('afterend',b);
  }else if(!b.isConnected){
    const gm=nav.querySelector('[data-gmc-open]');
    gm?gm.insertAdjacentElement('afterend',b):nav.appendChild(b);
  }
  const native=nav.querySelector('[data-tab="characters"]');
  b.classList.toggle('on',!!native?.classList.contains('on'));
}

function maintain(){
  ensureManagementRoom();
  removeLiveHeading();
}

window.addEventListener('click',e=>{
  const b=e.target?.closest?.('[data-cc-management-room]');
  if(!b||!isGM())return;
  e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
  window.__catlakPartyEeliotHotfix?.close?.();
  const api=window.__catlakLiveGameEntryGuard;
  if(api?.openManagement)api.openManagement();
  else APP.querySelector('.nav [data-tab="characters"]')?.click();
  requestAnimationFrame(maintain);
},true);

let queued=false;
function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;maintain()})}
new MutationObserver(schedule).observe(APP,{childList:true,subtree:true,attributes:true,attributeFilter:['class','data-cc-simple-live']});
setTimeout(maintain,0);setTimeout(maintain,300);setTimeout(maintain,900);
window.__catlakGmUiPolish={maintain};
})();