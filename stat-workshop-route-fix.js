const SWRF_APP=document.querySelector('#app');
if(!SWRF_APP)throw new Error('Stat Atölyesi rota düzeltmesi başlatılamadı.');

const swrfTxt=e=>String(e?.textContent||'').trim();
const swrfIsGM=()=>swrfTxt(SWRF_APP.querySelector('.role'))==='GM';
const swrfToast=x=>{const t=document.querySelector('#toast');if(!t)return;t.textContent=String(x);t.classList.remove('hidden');clearTimeout(swrfToast.t);swrfToast.t=setTimeout(()=>t.classList.add('hidden'),4200)};
const swrfNativeStat=()=>SWRF_APP.querySelector('.nav [data-cc-stats-tab]');
const swrfNativeActive=()=>!!SWRF_APP.querySelector('.nav [data-cc-stats-tab].on');
let swrfOpening=false,swrfActive=false,swrfToken=0;

async function swrfDraw(token,force=true){
  if(!swrfActive||token!==swrfToken||!swrfIsGM()||!swrfNativeActive())return false;
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

  // Ana uygulamanın kendi Stat rotasını çalıştır. Bu, aktif rota durumunu ve
  // sayfa yaşam döngüsünü tek bir yerde tutar; GM Merkezi tıklamasını engellemez.
  if(!swrfNativeActive()){
    try{stat.click()}catch(e){swrfOpening=false;swrfToast('Stat Atölyesi açılamadı: '+(e?.message||String(e)));return}
  }

  let tries=0;
  const finish=()=>{
    if(!swrfActive||token!==swrfToken){swrfOpening=false;return}
    if(swrfNativeActive()&&typeof window.__catlakRenderCompactStats==='function'){
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
  swrfActive=true;
  const token=++swrfToken;
  swrfOpening=true;
  swrfEnsureOpen(token);
  return true;
}

window.addEventListener('click',e=>{
  const statsRoute=e.target.closest?.('#app [data-gm2-route="stats"]');
  if(statsRoute&&swrfIsGM()){
    // Kritik: preventDefault/stopImmediatePropagation kullanma.
    // browser-app.js gerçek Stat rotasını önce çalıştırabilsin.
    swrfActive=true;
    swrfOpening=true;
    const token=++swrfToken;
    setTimeout(()=>swrfEnsureOpen(token),0);
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
  active:()=>swrfActive&&swrfNativeActive()
};
