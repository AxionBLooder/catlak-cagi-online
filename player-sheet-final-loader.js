(()=>{
  // Build uyumluluk işareti: player-sheet-final-patch.js?v=psfinal-runtime-v2
  if(window.__catlakSiteLiveBootstrapV2)return;
  window.__catlakSiteLiveBootstrapV2=true;
  const load=(src,key)=>{if(document.querySelector(`script[data-${key}]`))return;const s=document.createElement('script');s.setAttribute(`data-${key}`,'1');s.src=src+'?v='+Date.now();s.async=false;document.body.appendChild(s)};
  load('./player-sheet-live-runtime.js','player-sheet-live-runtime');
  load('./gm-center-live-runtime.js','gm-center-live-runtime');
})();
