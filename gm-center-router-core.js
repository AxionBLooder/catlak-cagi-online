const GMCR_APP=document.getElementById('app');
if(!GMCR_APP)throw new Error('GM Merkezi yönlendiricisi başlatılamadı.');

const GMCR_ROUTES=new Set(['ability','items','stats','races','builder','combat','events','logs','creatures','characters']);
let gmcrLastRoute='';
let gmcrLastAt=0;
let gmcrToken=0;
let gmcrPointerRoute='';
let gmcrPointerAt=0;

function gmcrRole(){return String(GMCR_APP.querySelector('.role')?.textContent||'').trim()}
function gmcrIsGM(){return gmcrRole()==='GM'||!!GMCR_APP.querySelector('[data-gm2-centerbar]')}
function gmcrButton(target){return target?.closest?.('#app [data-gm2-route]')||null}
function gmcrToast(text){const t=document.getElementById('toast');if(!t)return;t.textContent=String(text);t.classList.remove('hidden');clearTimeout(gmcrToast.t);gmcrToast.t=setTimeout(()=>t.classList.add('hidden'),3600)}

function gmcrMakeButtonsClickable(){
  const bar=GMCR_APP.querySelector('[data-gm2-centerbar]');if(!bar)return;
  bar.style.display='flex';
  bar.style.pointerEvents='auto';
  bar.style.position='sticky';bar.style.top='6px';
  bar.style.zIndex='2147483000';
  bar.querySelectorAll('[data-gm2-route]').forEach(b=>{
    b.disabled=false;
    b.removeAttribute('disabled');
    b.style.pointerEvents='auto';
    b.style.cursor='pointer';
    b.style.position='relative';
    b.style.zIndex='1';
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
  const forced=String(window.__catlakGmCenterSelectedRoute||'');
  if(GMCR_ROUTES.has(forced))return forced;
  if(window.__catlakCreatureLibraryOpen===true)return'creatures';
  if(GMCR_APP.querySelector('[data-gm2-ability-page]'))return'ability';
  const tool=window.__catlakGmTools?.active?.();
  if(tool==='combat'||tool==='events'||tool==='logs')return tool;
  if(GMCR_APP.querySelector('.nav [data-cc-stats-tab].on'))return'stats';
  const native=String(GMCR_APP.querySelector('.nav button.on[data-tab]')?.dataset.tab||'');
  return GMCR_ROUTES.has(native)?native:'';
}

function gmcrGo(route){
  if(!gmcrIsGM()||!GMCR_ROUTES.has(route))return false;
  gmcrSelect(route);
  const token=++gmcrToken;
  const run=()=>{
    if(token!==gmcrToken)return true;
    const go=window.__catlakGmHubV2Test?.route;
    if(typeof go==='function'){
      go(route);
      requestAnimationFrame(()=>{if(token===gmcrToken){gmcrMakeButtonsClickable();gmcrSelect(route)}});
      setTimeout(()=>{if(token===gmcrToken){gmcrMakeButtonsClickable();gmcrSelect(route)}},80);
      return true;
    }
    return false;
  };
  if(run())return true;
  let tries=0;
  const retry=()=>{
    if(token!==gmcrToken)return;
    if(run())return;
    if(++tries<80)setTimeout(retry,20);
    else gmcrToast('GM Merkezi yönlendiricisi hazır değil. Sayfayı yenileyip tekrar dene.');
  };
  setTimeout(retry,0);
  return true;
}

function gmcrConsume(e,route){
  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();
  const now=performance.now();
  if(route===gmcrLastRoute&&now-gmcrLastAt<120)return false;
  gmcrLastRoute=route;gmcrLastAt=now;
  return gmcrGo(route);
}

window.addEventListener('pointerdown',e=>{
  const button=gmcrButton(e.target);
  if(!button||!gmcrIsGM())return;
  if(e.button!=null&&e.button!==0)return;
  const route=String(button.dataset.gm2Route||'');
  if(!GMCR_ROUTES.has(route))return;
  gmcrPointerRoute=route;gmcrPointerAt=performance.now();
  gmcrConsume(e,route);
},true);

window.addEventListener('click',e=>{
  const button=gmcrButton(e.target);
  if(button&&gmcrIsGM()){
    const route=String(button.dataset.gm2Route||'');
    if(!GMCR_ROUTES.has(route))return;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    const now=performance.now();
    if(route===gmcrPointerRoute&&now-gmcrPointerAt<900)return;
    gmcrConsume(e,route);
    return;
  }

  if(e.isTrusted&&e.target?.closest?.('#app .nav button')){
    window.__catlakGmCenterSelectedRoute='';
    gmcrToken++;
  }
},true);

const gmcrObserver=new MutationObserver(()=>{
  gmcrMakeButtonsClickable();
  const selected=String(window.__catlakGmCenterSelectedRoute||'');
  if(GMCR_ROUTES.has(selected))gmcrSelect(selected);
});
gmcrObserver.observe(GMCR_APP,{childList:true,subtree:true});
setInterval(gmcrMakeButtonsClickable,1200);
setTimeout(gmcrMakeButtonsClickable,0);

window.__catlakGmCenterRouterCore={
  active:true,
  route:gmcrGo,
  current:gmcrLogicalRoute,
  select:gmcrSelect,
  makeClickable:gmcrMakeButtonsClickable,
  reset:()=>{gmcrLastRoute='';gmcrLastAt=0;gmcrPointerRoute='';gmcrPointerAt=0;gmcrToken++;window.__catlakGmCenterSelectedRoute=''}
};
