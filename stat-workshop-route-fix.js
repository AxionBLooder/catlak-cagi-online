const SWRF_APP=document.querySelector('#app');
if(!SWRF_APP)throw new Error('Stat Atölyesi rota düzeltmesi başlatılamadı.');

const swrfTxt=e=>String(e?.textContent||'').trim();
const swrfIsGM=()=>swrfTxt(SWRF_APP.querySelector('.role'))==='GM';
const swrfToast=x=>{const t=document.querySelector('#toast');if(!t)return;t.textContent=String(x);t.classList.remove('hidden');clearTimeout(swrfToast.t);swrfToast.t=setTimeout(()=>t.classList.add('hidden'),4200)};
const swrfNativeStat=()=>SWRF_APP.querySelector('.nav [data-cc-stats-tab]');
const swrfNativeActive=()=>!!SWRF_APP.querySelector('.nav [data-cc-stats-tab].on');
const SWRF_CACHE_KEY='catlak-stat-workshop-fast-cache-v1';
const SWRF_CACHE_TTL=5*60*1000;
let swrfOpening=false,swrfActive=false,swrfToken=0;
let swrfOriginalRender=null,swrfRefreshPromise=null,swrfCache=null,swrfCacheTimer=0;

function swrfLoadCache(){
  if(swrfCache)return swrfCache;
  try{
    const raw=sessionStorage.getItem(SWRF_CACHE_KEY);
    const parsed=raw?JSON.parse(raw):null;
    if(parsed&&parsed.html&&Date.now()-Number(parsed.at||0)<SWRF_CACHE_TTL)swrfCache=parsed;
  }catch(_){ }
  return swrfCache;
}

function swrfCaptureCache(){
  clearTimeout(swrfCacheTimer);
  swrfCacheTimer=setTimeout(()=>{
    const main=SWRF_APP.querySelector('main');
    if(!main||main.dataset.cuxPage!=='stats'||!main.querySelector('.cux-workshop'))return;
    const next={html:main.innerHTML,at:Date.now()};
    swrfCache=next;
    try{sessionStorage.setItem(SWRF_CACHE_KEY,JSON.stringify(next))}catch(_){ }
  },30);
}

function swrfRestoreCache(){
  const cache=swrfLoadCache();
  const main=SWRF_APP.querySelector('main');
  if(!cache||!main||Date.now()-Number(cache.at||0)>=SWRF_CACHE_TTL)return false;
  main.innerHTML=cache.html;
  main.dataset.cuxPage='stats';
  return true;
}

function swrfInstallFastRender(){
  const current=window.__catlakRenderCompactStats;
  if(typeof current!=='function')return false;
  if(current.__catlakFastStatRender)return true;
  swrfOriginalRender=current;

  const fastRender=function(force=false){
    const main=SWRF_APP.querySelector('main');
    const openingStats=swrfNativeActive()&&(!main||main.dataset.cuxPage!=='stats'||!main.querySelector('.cux-workshop'));
    if(openingStats)swrfRestoreCache();

    // Aynı anda gelen GM Merkezi + yerel Stat render çağrılarını tek sorguda birleştir.
    if(swrfRefreshPromise)return swrfRefreshPromise;

    const job=Promise.resolve(swrfOriginalRender.call(this,force))
      .then(result=>{swrfCaptureCache();return result})
      .finally(()=>{if(swrfRefreshPromise===job)swrfRefreshPromise=null});
    swrfRefreshPromise=job;
    return job;
  };
  fastRender.__catlakFastStatRender=true;
  fastRender.__catlakOriginalRender=swrfOriginalRender;
  window.__catlakRenderCompactStats=fastRender;
  return true;
}

(function swrfWaitForRenderer(){
  if(swrfInstallFastRender())return;
  if((swrfWaitForRenderer.n=(swrfWaitForRenderer.n||0)+1)<80)setTimeout(swrfWaitForRenderer,25);
})();

new MutationObserver(()=>{
  const main=SWRF_APP.querySelector('main');
  if(main?.dataset.cuxPage==='stats'&&main.querySelector('.cux-workshop'))swrfCaptureCache();
}).observe(SWRF_APP,{childList:true,subtree:true});

async function swrfDraw(token,force=true){
  if(!swrfActive||token!==swrfToken||!swrfIsGM()||!swrfNativeActive())return false;
  swrfInstallFastRender();
  const render=window.__catlakRenderCompactStats;
  if(typeof render!=='function')return false;
  try{
    await Promise.resolve(render(force));
    return true;
  }catch(e){
    swrfToast('Stat Atölyesi açılamadı: '+(e?.message||String(e)));
    return false;
  }
}

function swrfEnsureOpen(token){
  if(!swrfActive||token!==swrfToken||!swrfIsGM()){swrfOpening=false;return}
  const stat=swrfNativeStat();
  if(!stat){swrfOpening=false;swrfToast('Stat Atölyesi düğmesi bulunamadı.');return}

  if(!swrfNativeActive()){
    try{stat.click()}catch(e){swrfOpening=false;swrfToast('Stat Atölyesi açılamadı: '+(e?.message||String(e)));return}
  }

  let tries=0;
  const finish=()=>{
    if(!swrfActive||token!==swrfToken){swrfOpening=false;return}
    const main=SWRF_APP.querySelector('main');
    if(main?.dataset.cuxPage==='stats'&&main.querySelector('.cux-workshop')){
      swrfOpening=false;
      swrfCaptureCache();
      return;
    }
    if(swrfNativeActive()&&typeof window.__catlakRenderCompactStats==='function'){
      // Ana rota zaten render başlattıysa wrapper aynı Promise'i döndürür; ikinci DB sorgusu açılmaz.
      swrfOpening=false;
      swrfDraw(token,true);
      return;
    }
    if(++tries<20)setTimeout(finish,25);
    else{swrfOpening=false;swrfToast('Stat Atölyesi yükleyicisi hazır değil.')}
  };
  setTimeout(finish,0);
}

function swrfOpenStats(){
  if(!swrfIsGM())return false;
  swrfInstallFastRender();
  swrfActive=true;
  const token=++swrfToken;
  swrfOpening=true;
  swrfEnsureOpen(token);
  return true;
}

window.addEventListener('click',e=>{
  const statsRoute=e.target.closest?.('#app [data-gm2-route="stats"]');
  if(statsRoute&&swrfIsGM()){
    swrfInstallFastRender();
    swrfActive=true;
    swrfOpening=true;
    // Önceki başarılı Stat görünümünü anında geri getir; güncel veri arkada yenilenir.
    setTimeout(()=>{if(swrfNativeActive())swrfRestoreCache()},0);
    const token=++swrfToken;
    setTimeout(()=>swrfEnsureOpen(token),0);
    return;
  }

  const nativeStat=e.target.closest?.('#app [data-cc-stats-tab]');
  if(nativeStat&&swrfIsGM()){
    swrfInstallFastRender();
    swrfActive=true;
    setTimeout(()=>{if(swrfNativeActive())swrfRestoreCache()},0);
    return;
  }

  const otherGmRoute=e.target.closest?.('#app [data-gm2-route]:not([data-gm2-route="stats"])');
  const otherNativeRoute=e.target.closest?.('#app .nav button:not([data-cc-stats-tab])');
  if((otherGmRoute||otherNativeRoute)&&swrfActive){
    swrfActive=false;
    swrfOpening=false;
    swrfToken++;
  }
},true);

window.__catlakStatWorkshopRouteFix={
  open:swrfOpenStats,
  draw:()=>swrfDraw(swrfToken,true),
  active:()=>swrfActive&&swrfNativeActive(),
  clearCache:()=>{swrfCache=null;try{sessionStorage.removeItem(SWRF_CACHE_KEY)}catch(_){}}
};
