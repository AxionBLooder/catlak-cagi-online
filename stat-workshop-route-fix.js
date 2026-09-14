const SWRF_APP=document.querySelector('#app');
if(!SWRF_APP)throw new Error('Stat Atölyesi rota köprüsü başlatılamadı.');

const swrfTxt=e=>String(e?.textContent||'').trim();
const swrfIsGM=()=>swrfTxt(SWRF_APP.querySelector('.role'))==='GM';
const swrfNativeStat=()=>SWRF_APP.querySelector('.nav [data-cc-stats-tab]');
const swrfToast=x=>{const t=document.querySelector('#toast');if(!t)return;t.textContent=String(x);t.classList.remove('hidden');clearTimeout(swrfToast.t);swrfToast.t=setTimeout(()=>t.classList.add('hidden'),4200)};
let swrfActive=false,swrfToken=0,swrfPatched=false;

function swrfPrepare(){
  if(!swrfIsGM())return null;
  const nav=SWRF_APP.querySelector('.nav'),stat=swrfNativeStat();
  if(!nav||!stat)return null;
  window.__catlakQualityOfLifeTest?.closeCreatureLibrary?.();
  window.__catlakGmTools?.close?.();
  window.__catlakGmHubOwnsMain=false;
  window.__catlakCreatureLibraryOpen=false;
  window.__catlakGmToolsOpen=false;
  nav.querySelectorAll('button.on').forEach(x=>x.classList.remove('on'));
  stat.classList.add('on');
  window.__catlakGmCenterSelectedRoute='stats';
  window.__catlakGmCenterRouterCore?.select?.('stats');
  const main=SWRF_APP.querySelector('main');
  if(main){delete main.dataset.gmtTools;delete main.dataset.qolCreatureLibrary;main.dataset.gm2Route='stats'}
  return stat;
}

async function swrfDraw(force=true,token=swrfToken){
  if(!swrfActive||token!==swrfToken||!swrfIsGM())return false;
  const stat=swrfPrepare();if(!stat)return false;
  const render=window.__catlakRenderCompactStats;
  if(typeof render!=='function')return false;
  try{await Promise.resolve(render(force));return true}
  catch(e){swrfToast('Stat Atölyesi açılamadı: '+(e?.message||String(e)));return false}
}

function swrfOpen(){
  if(!swrfIsGM())return false;
  swrfActive=true;const token=++swrfToken;
  swrfPrepare();
  const main=SWRF_APP.querySelector('main');
  if(!main?.querySelector('.cux-workshop'))window.__catlakRouteLoading?.('Stat Atölyesi');
  let tries=0;
  const ready=async()=>{
    if(!swrfActive||token!==swrfToken)return;
    if(await swrfDraw(true,token))return;
    if(++tries<60)setTimeout(ready,35);else swrfToast('Stat Atölyesi yükleyicisi hazır değil.');
  };
  setTimeout(ready,0);return true;
}
function swrfLeave(){swrfActive=false;swrfToken++}

function swrfPatchHub(){
  const hub=window.__catlakGmHubV2Test;
  if(!hub||typeof hub.route!=='function')return false;
  if(hub.route.__catlakStatWorkshopRoute){swrfPatched=true;return true}
  const original=hub.route;
  const route=function(key,...args){if(String(key)==='stats')return swrfOpen();swrfLeave();return original.call(this,key,...args)};
  route.__catlakStatWorkshopRoute=true;route.__catlakOriginalRoute=original;hub.route=route;swrfPatched=true;return true;
}
(function swrfWaitForHub(){if(swrfPatchHub())return;if((swrfWaitForHub.n=(swrfWaitForHub.n||0)+1)<240)setTimeout(swrfWaitForHub,25)})();

window.addEventListener('click',e=>{
  if(!swrfIsGM())return;
  if(e.target.closest?.('#app [data-gm2-route="stats"],#app [data-cc-stats-tab]')){swrfActive=true;return}
  if(e.target.closest?.('#app [data-gm2-route]:not([data-gm2-route="stats"]),#app .nav button:not([data-cc-stats-tab])'))swrfLeave();
},true);

window.__catlakStatWorkshopRouteFix={open:swrfOpen,draw:()=>swrfDraw(true),active:()=>swrfActive&&!!swrfNativeStat()?.classList.contains('on'),patched:()=>swrfPatched};
