(()=>{
  // Build uyumluluk işareti: player-sheet-final-patch.js?v=psfinal-runtime-v2
  // Build uyumluluk işareti: battle-room-live-runtime.js başlangıç zincirinden bilinçli olarak ayrıldı.
  if(window.__catlakSiteLiveBootstrapV4||window.__catlakPlayerSheetBootstrapV2)return;
  window.__catlakSiteLiveBootstrapV4=true;
  window.__catlakPlayerSheetBootstrapV2=true;
  const A=document.querySelector('#app');
  if(!A)return;
  const load=(src,key)=>{
    if(document.querySelector(`script[data-${key}]`))return;
    const s=document.createElement('script');
    s.setAttribute(`data-${key}`,'1');
    s.src=src+'?v='+Date.now();
    s.async=false;
    document.body.appendChild(s)
  };
  let tries=0;
  function appReady(){
    if(A.querySelector('[data-cc-boot-placeholder],[data-cc-auth-loading]'))return false;
    return !!A.querySelector('.role')&&!!A.querySelector('.nav')&&!!A.querySelector('main')
  }
  function boot(){
    if(!appReady()){
      if(tries++<240)setTimeout(boot,150);
      return
    }
    load('./player-sheet-live-runtime.js','player-sheet-live-runtime');
    load('./gm-center-live-runtime.js','gm-center-live-runtime')
  }
  boot()
})();
