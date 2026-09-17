const GMCR_APP=document.getElementById('app');
if(!GMCR_APP)throw new Error('GM Merkezi yönlendiricisi başlatılamadı.');

// Savaş & Durumlar artık GM Merkezi rotası değildir; Canlı Oyun'a taşındı.
const GMCR_ROUTES=new Set(['ability','items','stats','races','builder','events','logs','creatures','characters']);
let gmcrLastRoute='';
let gmcrLastAt=0;
let gmcrToken=0;
let gmcrPointerRoute='';
let gmcrPointerAt=0;
let gmcrEntryPointerAt=0;

function gmcrRole(){return String(GMCR_APP.querySelector('.role')?.textContent||'').trim()}
function gmcrIsGM(){return gmcrRole()==='GM'}
function gmcrButton(target){return target?.closest?.('#app [data-gm2-route]')||null}
function gmcrToast(text){const t=document.getElementById('toast');if(!t)return;t.textContent=String(text);t.classList.remove('hidden');clearTimeout(gmcrToast.t);gmcrToast.t=setTimeout(()=>t.classList.add('hidden'),3600)}
function gmcrCenterOpen(){
  const selected=String(window.__catlakGmCenterSelectedRoute||'');
  if(GMCR_ROUTES.has(selected))return true;
  if(window.__catlakCreatureLibraryOpen===true)return true;
  if(window.__catlakCampaignStateRoom)return true;
  if(GMCR_APP.querySelector('[data-gm2-ability-page]'))return true;
  const tool=window.__catlakGmTools?.active?.();
  return tool==='events'||tool==='logs';
}

function gmcrEnsureEntry(){
  if(!gmcrIsGM())return;
  const nav=GMCR_APP.querySelector('.nav');
  if(!nav)return;
  let entry=nav.querySelector('[data-gmt-open]');
  if(!entry){
    entry=document.createElement('button');
    entry.type='button';
    entry.dataset.gmtOpen='1';
    nav.appendChild(entry);
  }
  entry.textContent='GM Merkezi';
  entry.title='GM Merkezi';
}

function gmcrMakeButtonsClickable(){
  gmcrEnsureEntry();
  window.__catlakGmHubV2Test?.chrome?.();
  const bar=GMCR_APP.querySelector('[data-gm2-centerbar]');
  if(!bar)return;
  // Eski savaş rotası başka katman tarafından kısa süreli eklenirse burada da temizlenir.
  bar.querySelectorAll('[data-gm2-route="combat"]').forEach(x=>x.remove());
  bar.style.pointerEvents='auto';
  bar.querySelectorAll('[data-gm2-route]').forEach(b=>{
    b.disabled=false;b.removeAttribute('disabled');b.style.pointerEvents='auto';b.style.cursor='pointer';
  });
}

function gmcrSelect(route){
  if(!GMCR_ROUTES.has(route))return;
  window.__catlakGmCenterSelectedRoute=route;
  GMCR_APP.querySelectorAll('[data-gm2-centerbar] [data-gm2-route]').forEach(b=>{
    const on=String(b.dataset.gm2Route||'')===route;
    b.classList.toggle('on',on);
    b.setAttribute('aria-pressed',on?'true':'false');
  });
}

function gmcrLogicalRoute(){
  if(window.__catlakCampaignStateRoom)return'campaign';
  const forced=String(window.__catlakGmCenterSelectedRoute||'');
  if(GMCR_ROUTES.has(forced))return forced;
  if(window.__catlakCreatureLibraryOpen===true)return'creatures';
  if(GMCR_APP.querySelector('[data-gm2-ability-page]'))return'ability';
  const tool=window.__catlakGmTools?.active?.();
  if(tool==='events'||tool==='logs')return tool;
  if(GMCR_APP.querySelector('.nav [data-cc-stats-tab].on'))return'stats';
  const native=String(GMCR_APP.querySelector('.nav button.on[data-tab]')?.dataset.tab||'');
  return GMCR_ROUTES.has(native)?native:'';
}

function gmcrLeaveCenter(){
  gmcrToken++;gmcrLastRoute='';gmcrLastAt=0;gmcrPointerRoute='';gmcrPointerAt=0;window.__catlakGmCenterSelectedRoute='';
  const hub=window.__catlakGmHubV2Test;
  if(typeof hub?.leave==='function')hub.leave();
  else{window.__catlakCampaignStateTest?.close?.();hub?.release?.();window.__catlakGmTools?.close?.();window.__catlakQualityOfLifeTest?.closeCreatureLibrary?.();GMCR_APP.querySelector('[data-gm2-centerbar]')?.remove();GMCR_APP.querySelector('.nav [data-gmt-open]')?.classList.remove('gm2-center-active')}
}

function gmcrOpenLive(){
  gmcrLeaveCenter();
  const live=GMCR_APP.querySelector('.nav [data-tab="gm"]');
  if(live){live.click();return true}
  gmcrToast('Canlı Oyun bulunamadı.');return false;
}

function gmcrGo(route){
  if(route==='combat')return gmcrOpenLive();
  if(!gmcrIsGM()||!GMCR_ROUTES.has(route))return false;
  window.__catlakCampaignStateTest?.close?.();
  gmcrSelect(route);
  const token=++gmcrToken;
  const run=()=>{
    if(token!==gmcrToken)return true;
    const go=window.__catlakGmHubV2Test?.route;
    if(typeof go!=='function')return false;
    go(route);
    requestAnimationFrame(()=>{if(token===gmcrToken){gmcrMakeButtonsClickable();gmcrSelect(route)}});
    return true;
  };
  if(run())return true;
  let tries=0;
  const retry=()=>{
    if(token!==gmcrToken)return;
    if(run())return;
    if(++tries<30)setTimeout(retry,20);
    else gmcrToast('GM Merkezi yönlendiricisi hazır değil. Sayfayı yenileyip tekrar dene.');
  };
  setTimeout(retry,0);
  return true;
}

function gmcrOpenCenter(){
  if(!gmcrIsGM())return false;
  // Eski GM Araçları combat varsayılanını kesin kapat.
  window.__catlakGmTools?.close?.();
  window.__catlakGmCenterSelectedRoute='';
  return gmcrGo('ability');
}

function gmcrConsume(e,route){
  e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
  const now=performance.now();
  if(route===gmcrLastRoute&&now-gmcrLastAt<120)return false;
  gmcrLastRoute=route;gmcrLastAt=now;
  return gmcrGo(route);
}

new MutationObserver(()=>{requestAnimationFrame(gmcrEnsureEntry)}).observe(GMCR_APP,{childList:true,subtree:true});

window.addEventListener('pointerdown',e=>{
  if(e.button!=null&&e.button!==0)return;
  const entry=e.target?.closest?.('#app .nav [data-gmt-open]');
  if(entry&&gmcrIsGM()){
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    gmcrEntryPointerAt=performance.now();gmcrOpenCenter();return;
  }
  const button=gmcrButton(e.target);
  if(button&&gmcrIsGM()){
    const route=String(button.dataset.gm2Route||'');
    if(route==='combat'){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();gmcrOpenLive();return}
    if(!GMCR_ROUTES.has(route))return;
    gmcrPointerRoute=route;gmcrPointerAt=performance.now();gmcrConsume(e,route);return;
  }
  const nav=e.target?.closest?.('#app .nav button');
  if(nav&&gmcrIsGM()&&!nav.matches('[data-gmt-open]'))gmcrLeaveCenter();
},true);

window.addEventListener('click',e=>{
  const entry=e.target?.closest?.('#app .nav [data-gmt-open]');
  if(entry&&gmcrIsGM()){
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    if(performance.now()-gmcrEntryPointerAt>900)gmcrOpenCenter();
    return;
  }
  const button=gmcrButton(e.target);
  if(button&&gmcrIsGM()){
    const route=String(button.dataset.gm2Route||'');
    if(route==='combat'){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();gmcrOpenLive();return}
    if(!GMCR_ROUTES.has(route))return;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    const now=performance.now();
    if(route===gmcrPointerRoute&&now-gmcrPointerAt<900)return;
    gmcrConsume(e,route);return;
  }
  const nav=e.target?.closest?.('#app .nav button');
  if(e.isTrusted&&nav&&gmcrIsGM()&&!nav.matches('[data-gmt-open]'))gmcrLeaveCenter();
},true);

setTimeout(gmcrMakeButtonsClickable,0);
setTimeout(gmcrEnsureEntry,250);
setTimeout(gmcrEnsureEntry,1000);

window.__catlakCampaignRouterStableV4=true;
window.__catlakCampaignRouterStableV3=true;
window.__catlakGmCenterRouterCore={active:true,route:gmcrGo,current:gmcrLogicalRoute,select:gmcrSelect,makeClickable:gmcrMakeButtonsClickable,centerOpen:gmcrCenterOpen,leave:gmcrLeaveCenter,reset:gmcrLeaveCenter,ensureEntry:gmcrEnsureEntry,openCenter:gmcrOpenCenter};
