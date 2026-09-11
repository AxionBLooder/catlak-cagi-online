const SWRF_APP=document.querySelector('#app');
if(!SWRF_APP)throw new Error('Stat Atölyesi rota düzeltmesi başlatılamadı.');

const swrfTxt=e=>String(e?.textContent||'').trim();
const swrfIsGM=()=>swrfTxt(SWRF_APP.querySelector('.role'))==='GM';
const swrfToast=x=>{const t=document.querySelector('#toast');if(!t)return;t.textContent=String(x);t.classList.remove('hidden');clearTimeout(swrfToast.t);swrfToast.t=setTimeout(()=>t.classList.add('hidden'),4200)};
let swrfOpening=false,swrfActive=false,swrfClosingLegacy=false,swrfToken=0;

function swrfCloseLegacy(){
  const nav=SWRF_APP.querySelector('.nav'),main=SWRF_APP.querySelector('main');
  const toolsOpen=window.__catlakGmToolsOpen===true||main?.dataset.gmtTools==='1'||!!main?.querySelector('.gmt-shell');
  if(toolsOpen){
    const base=nav?.querySelector('[data-tab="items"]')||nav?.querySelector('[data-tab="gm"]')||nav?.querySelector('[data-tab="characters"]');
    if(base){swrfClosingLegacy=true;try{base.click()}finally{swrfClosingLegacy=false}}
  }
  window.__catlakGmHubOwnsMain=false;
  window.__catlakCreatureLibraryOpen=false;
  window.__catlakGmToolsOpen=false;
  const fresh=SWRF_APP.querySelector('main');
  if(fresh){delete fresh.dataset.sspStableView;delete fresh.dataset.gmtTools;delete fresh.dataset.qolCreatureLibrary}
}

function swrfDraw(token){
  if(!swrfActive||token!==swrfToken||!swrfIsGM())return false;
  const nav=SWRF_APP.querySelector('.nav'),stat=nav?.querySelector('[data-cc-stats-tab]'),render=window.__catlakRenderCompactStats;
  if(!stat||typeof render!=='function')return false;
  nav.querySelectorAll('button.on').forEach(x=>x.classList.remove('on'));
  stat.classList.add('on');
  const main=SWRF_APP.querySelector('main');
  if(main){delete main.dataset.sspStableView;delete main.dataset.gmtTools;delete main.dataset.qolCreatureLibrary}
  Promise.resolve(render(true)).catch(e=>swrfToast('Stat Atölyesi açılamadı: '+(e?.message||String(e))));
  return true;
}

function swrfGuard(token){
  if(!swrfActive||token!==swrfToken)return;
  const main=SWRF_APP.querySelector('main');
  if(main?.querySelector('.cux-workshop')&&main.dataset.cuxPage==='stats')return;
  swrfDraw(token);
}

function swrfOpenStats(){
  if(!swrfIsGM()||swrfOpening)return false;
  swrfOpening=true;swrfActive=true;const token=++swrfToken;
  try{
    swrfCloseLegacy();
    window.__catlakRouteGeneration=(window.__catlakRouteGeneration||0)+1;
    window.__catlakRouteLoading?.('Stat Atölyesi');
    const attempt=()=>{
      if(!swrfActive||token!==swrfToken){swrfOpening=false;return}
      if(swrfDraw(token)){
        swrfOpening=false;
        setTimeout(()=>swrfGuard(token),100);
        setTimeout(()=>swrfGuard(token),300);
        setTimeout(()=>swrfGuard(token),700);
        return;
      }
      if((attempt.n=(attempt.n||0)+1)<30)setTimeout(attempt,25);
      else{swrfOpening=false;swrfToast('Stat Atölyesi yükleyicisi hazır değil.')}
    };
    requestAnimationFrame(attempt);
    return true;
  }catch(e){
    swrfOpening=false;swrfActive=false;
    swrfToast('Stat Atölyesi açılamadı: '+(e?.message||String(e)));
    return false;
  }
}

window.addEventListener('click',e=>{
  const route=e.target.closest?.('#app [data-gm2-route="stats"]');
  if(route&&swrfIsGM()){
    e.preventDefault();e.stopImmediatePropagation();swrfOpenStats();return;
  }
  if(!swrfClosingLegacy&&swrfActive&&e.target.closest?.('#app [data-gm2-route]:not([data-gm2-route="stats"]),#app .nav button')){
    swrfActive=false;swrfOpening=false;swrfToken++;
  }
},true);

window.__catlakStatWorkshopRouteFix={open:swrfOpenStats,draw:()=>swrfDraw(swrfToken),active:()=>swrfActive};
