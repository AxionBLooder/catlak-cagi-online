const SWRF_APP=document.querySelector('#app');
if(!SWRF_APP)throw new Error('Stat Atölyesi rota düzeltmesi başlatılamadı.');

const swrfTxt=e=>String(e?.textContent||'').trim();
const swrfIsGM=()=>swrfTxt(SWRF_APP.querySelector('.role'))==='GM';
const swrfToast=x=>{const t=document.querySelector('#toast');if(!t)return;t.textContent=String(x);t.classList.remove('hidden');clearTimeout(swrfToast.t);swrfToast.t=setTimeout(()=>t.classList.add('hidden'),4200)};
let swrfOpening=false;

function swrfOpenStats(){
  if(!swrfIsGM()||swrfOpening)return false;
  const nav=SWRF_APP.querySelector('.nav');
  const stat=nav?.querySelector('[data-cc-stats-tab]');
  const render=window.__catlakRenderCompactStats;
  if(!stat||typeof render!=='function')return false;
  swrfOpening=true;
  try{
    window.__catlakGmHubOwnsMain=false;
    window.__catlakCreatureLibraryOpen=false;
    window.__catlakGmToolsOpen=false;
    const main=SWRF_APP.querySelector('main');
    if(main){delete main.dataset.sspStableView;delete main.dataset.gmtTools;delete main.dataset.qolCreatureLibrary}
    nav.querySelectorAll('button.on').forEach(x=>x.classList.remove('on'));
    stat.classList.add('on');
    window.__catlakRouteGeneration=(window.__catlakRouteGeneration||0)+1;
    window.__catlakRouteLoading?.('Stat Atölyesi');
    requestAnimationFrame(()=>{
      Promise.resolve(render(true)).catch(e=>swrfToast('Stat Atölyesi açılamadı: '+(e?.message||String(e)))).finally(()=>{swrfOpening=false});
    });
    return true;
  }catch(e){
    swrfOpening=false;
    swrfToast('Stat Atölyesi açılamadı: '+(e?.message||String(e)));
    return false;
  }
}

window.addEventListener('click',e=>{
  const route=e.target.closest?.('#app [data-gm2-route="stats"]');
  if(!route||!swrfIsGM())return;
  e.preventDefault();
  e.stopImmediatePropagation();
  if(swrfOpenStats())return;
  let tries=0;
  const retry=()=>{
    if(swrfOpenStats())return;
    if(++tries<20)setTimeout(retry,25);
    else swrfToast('Stat Atölyesi yükleyicisi hazır değil. Sayfayı bir kez yenileyip tekrar dene.');
  };
  setTimeout(retry,0);
},true);

window.__catlakStatWorkshopRouteFix={open:swrfOpenStats};
