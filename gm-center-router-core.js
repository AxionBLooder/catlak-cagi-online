const GMCR_APP=document.getElementById('app');
if(!GMCR_APP)throw new Error('GM Merkezi yönlendiricisi başlatılamadı.');

// GM tarafındaki özel odalar tek merkezden yönetilir.
const GMCR_ROUTES=new Set(['ability','items','stats','races','builder','events','logs','creatures','characters','party']);
let gmcrLastRoute='';
let gmcrLastAt=0;
let gmcrToken=0;
let gmcrPointerRoute='';
let gmcrPointerAt=0;

if(!document.getElementById('gmcr-visual-style')){
  const s=document.createElement('style');
  s.id='gmcr-visual-style';
  s.textContent=`
  #app.gmcr-center-open .nav button.on:not([data-gmt-open]){background:transparent!important;color:var(--muted)!important;border-color:transparent!important;box-shadow:none!important;outline:none!important}
  #app.gmcr-center-open .nav [data-gmt-open]{background:#101e33!important;color:var(--text)!important;border-color:var(--line)!important;box-shadow:inset 0 0 0 1px #d6ad5b33!important;outline:none!important}
  `;
  document.head.appendChild(s);
}

function gmcrRole(){return String(GMCR_APP.querySelector('.role')?.textContent||'').trim()}
function gmcrIsGM(){return gmcrRole()==='GM'}
function gmcrButton(target){return target?.closest?.('#app [data-gm2-route]')||null}
function gmcrToast(text){const t=document.getElementById('toast');if(!t)return;t.textContent=String(text);t.classList.remove('hidden');clearTimeout(gmcrToast.t);gmcrToast.t=setTimeout(()=>t.classList.add('hidden'),3600)}
function gmcrCenterOpen(){
  const selected=String(window.__catlakGmCenterSelectedRoute||'');
  if(GMCR_ROUTES.has(selected))return true;
  if(window.__catlakGmToolsOpen===true)return true;
  if(window.__catlakCreatureLibraryOpen===true)return true;
  if(window.__catlakCampaignStateRoom)return true;
  if(window.__catlakManagementRoomOpen===true)return true;
  if(window.__catlakPartyEeliotHotfix?.isOpen?.())return true;
  if(GMCR_APP.querySelector('[data-gm2-ability-page]'))return true;
  return false;
}
function gmcrSetCenterVisual(open){GMCR_APP.classList.toggle('gmcr-center-open',!!open)}
function gmcrCloseForeignViews(skip=''){
  if(skip!=='characters'){try{window.__catlakManagementRoom?.close?.()}catch(_){ }}
  if(skip!=='party'){
    try{window.__catlakPartyEeliotHotfix?.close?.()}catch(_){ }
    try{window.__catlakPartyManager?.close?.()}catch(_){ }
    window.__catlakPartyRoomOwnsMain=false;
  }
  try{window.__catlakCampaignStateTest?.close?.()}catch(_){ }
  try{window.__catlakQualityOfLifeTest?.closeCreatureLibrary?.()}catch(_){ }
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
    entry.textContent='GM Merkezi';
    entry.title='GM Merkezi';
    nav.appendChild(entry);
  }else if(String(entry.textContent||'').trim()!=='GM Merkezi')entry.textContent='GM Merkezi';
}

function gmcrMakeButtonsClickable(){
  gmcrEnsureEntry();
  window.__catlakGmHubV2Test?.chrome?.();
  try{window.__catlakGmCenterPartyIntegration?.ensure?.()}catch(_){ }
  const bar=GMCR_APP.querySelector('[data-gm2-centerbar]');
  gmcrSetCenterVisual(gmcrCenterOpen());
  if(!bar)return;
  bar.querySelectorAll('[data-gm2-route="combat"]').forEach(b=>b.remove());
  bar.querySelectorAll('[data-gm2-route]').forEach(b=>{
    b.disabled=false;b.removeAttribute('disabled');b.style.pointerEvents='auto';b.style.cursor='pointer';
  });
  bar.style.pointerEvents='auto';
}

function gmcrSelect(route){
  if(!GMCR_ROUTES.has(route))return;
  window.__catlakGmCenterSelectedRoute=route;
  gmcrSetCenterVisual(true);
  GMCR_APP.querySelectorAll('[data-gm2-centerbar] [data-gm2-route]').forEach(b=>{
    const on=String(b.dataset.gm2Route||'')===route;
    b.classList.toggle('on',on);
    b.setAttribute('aria-pressed',on?'true':'false');
  });
}

function gmcrLogicalRoute(){
  if(window.__catlakCampaignStateRoom)return'campaign';
  if(window.__catlakManagementRoomOpen===true)return'characters';
  if(window.__catlakPartyEeliotHotfix?.isOpen?.()&&gmcrIsGM())return'party';
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
  try{window.__catlakManagementRoom?.close?.()}catch(_){ }
  try{window.__catlakPartyEeliotHotfix?.close?.()}catch(_){ }
  window.__catlakPartyRoomOwnsMain=false;
  gmcrSetCenterVisual(false);
  const hub=window.__catlakGmHubV2Test;
  if(typeof hub?.leave==='function')hub.leave();
  else{window.__catlakCampaignStateTest?.close?.();hub?.release?.();window.__catlakGmTools?.close?.();window.__catlakQualityOfLifeTest?.closeCreatureLibrary?.();GMCR_APP.querySelector('[data-gm2-centerbar]')?.remove();GMCR_APP.querySelector('.nav [data-gmt-open]')?.classList.remove('gm2-center-active')}
}

function gmcrOpenManagement(token){
  if(token!==gmcrToken)return true;
  const room=window.__catlakManagementRoom;
  if(typeof room?.open!=='function')return false;
  const opened=room.open(true);
  if(opened===false)return false;
  requestAnimationFrame(()=>{if(token!==gmcrToken)return;gmcrMakeButtonsClickable();gmcrSelect('characters')});
  return true;
}
function gmcrOpenParty(token){
  if(token!==gmcrToken)return true;
  const party=window.__catlakPartyEeliotHotfix;
  if(typeof party?.open!=='function')return false;
  const opened=party.open();
  if(opened===false)return false;
  window.__catlakGmCenterSelectedRoute='party';
  gmcrSetCenterVisual(true);
  requestAnimationFrame(()=>{if(token!==gmcrToken)return;gmcrMakeButtonsClickable();gmcrSelect('party')});
  setTimeout(()=>{if(token===gmcrToken){gmcrMakeButtonsClickable();gmcrSelect('party')}},120);
  return true;
}

function gmcrGo(route){
  if(!gmcrIsGM()||!GMCR_ROUTES.has(route))return false;
  gmcrCloseForeignViews(route);
  gmcrSelect(route);
  const token=++gmcrToken;

  if(route==='characters'){
    let tries=0;const open=()=>{if(token!==gmcrToken)return;if(gmcrOpenManagement(token))return;if(++tries<60){setTimeout(open,25);return}gmcrToast('Yönetim Odası hazır değil. Sayfayı yenileyip tekrar dene.')};open();return true;
  }
  if(route==='party'){
    let tries=0;const open=()=>{if(token!==gmcrToken)return;if(gmcrOpenParty(token))return;if(++tries<60){setTimeout(open,25);return}gmcrToast('Parti Odası hazır değil. Sayfayı yenileyip tekrar dene.')};open();return true;
  }

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
  const retry=()=>{if(token!==gmcrToken)return;if(run())return;if(++tries<30)setTimeout(retry,20);else gmcrToast('GM Merkezi yönlendiricisi hazır değil. Sayfayı yenileyip tekrar dene.')};
  setTimeout(retry,0);return true;
}

function gmcrConsume(e,route){
  e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
  const now=performance.now();if(route===gmcrLastRoute&&now-gmcrLastAt<120)return false;
  gmcrLastRoute=route;gmcrLastAt=now;return gmcrGo(route);
}

GMCR_APP.addEventListener('click',e=>{
  const entry=e.target?.closest?.('#app .nav [data-gmt-open]');if(!entry||!gmcrIsGM())return;
  setTimeout(()=>{window.__catlakGmTools?.close?.();window.__catlakGmCenterSelectedRoute='';gmcrSetCenterVisual(true);gmcrGo('ability');gmcrMakeButtonsClickable()},0);
},false);

new MutationObserver(()=>{requestAnimationFrame(()=>{gmcrEnsureEntry();gmcrSetCenterVisual(gmcrCenterOpen())})}).observe(GMCR_APP,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});

window.addEventListener('pointerdown',e=>{
  if(e.button!=null&&e.button!==0)return;
  const button=gmcrButton(e.target);
  if(button&&gmcrIsGM()){
    const route=String(button.dataset.gm2Route||'');if(!GMCR_ROUTES.has(route))return;
    gmcrPointerRoute=route;gmcrPointerAt=performance.now();gmcrConsume(e,route);return;
  }
  const nav=e.target?.closest?.('#app .nav button');
  if(nav&&gmcrIsGM()&&!nav.matches('[data-gmt-open]'))gmcrLeaveCenter();
},true);

window.addEventListener('click',e=>{
  const entry=e.target?.closest?.('#app .nav [data-gmt-open]');
  if(entry&&gmcrIsGM()){
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();window.__catlakGmTools?.close?.();window.__catlakGmCenterSelectedRoute='';gmcrSetCenterVisual(true);gmcrGo('ability');requestAnimationFrame(gmcrMakeButtonsClickable);return;
  }
  const button=gmcrButton(e.target);
  if(button&&gmcrIsGM()){
    const route=String(button.dataset.gm2Route||'');if(!GMCR_ROUTES.has(route))return;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();const now=performance.now();if(route===gmcrPointerRoute&&now-gmcrPointerAt<900)return;gmcrConsume(e,route);return;
  }
  const nav=e.target?.closest?.('#app .nav button');
  if(e.isTrusted&&nav&&gmcrIsGM()&&!nav.matches('[data-gmt-open]'))gmcrLeaveCenter();
},true);
setTimeout(gmcrMakeButtonsClickable,0);setTimeout(gmcrEnsureEntry,250);setTimeout(gmcrEnsureEntry,1000);

window.__catlakCampaignRouterStableV3=true;
window.__catlakGmCenterRouterCore={active:true,route:gmcrGo,current:gmcrLogicalRoute,select:gmcrSelect,makeClickable:gmcrMakeButtonsClickable,centerOpen:gmcrCenterOpen,leave:gmcrLeaveCenter,reset:gmcrLeaveCenter,ensureEntry:gmcrEnsureEntry,openManagement:()=>gmcrGo('characters'),openParty:()=>gmcrGo('party')};