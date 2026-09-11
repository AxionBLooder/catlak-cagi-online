(()=>{
  // Build uyumluluk işareti: player-sheet-final-patch.js?v=psfinal-runtime-v2
  if(window.__catlakSiteLiveBootstrapV2||window.__catlakPlayerSheetBootstrapV1)return;
  window.__catlakSiteLiveBootstrapV2=true;
  window.__catlakPlayerSheetBootstrapV1=true;
  if(!document.querySelector('#ps-weapon-live-toggle-style')){
    const st=document.createElement('style');st.id='ps-weapon-live-toggle-style';st.textContent=`
      #app main.ps-player-sheet .iw-player-item:not(.on) .actions [data-psf-equip]{display:inline-flex!important}
      #app main.ps-player-sheet .iw-player-item:not(.on) .actions [data-psf-remove]{display:none!important}
      #app main.ps-player-sheet .iw-player-item.on .actions [data-psf-equip]{display:none!important}
      #app main.ps-player-sheet .iw-player-item.on .actions [data-psf-remove]{display:inline-flex!important}
    `;document.head.appendChild(st)
  }
  const load=(src,key)=>{if(document.querySelector(`script[data-${key}]`))return;const s=document.createElement('script');s.setAttribute(`data-${key}`,'1');s.src=src+'?v='+Date.now();s.async=false;document.body.appendChild(s)};
  load('./player-sheet-live-runtime.js','player-sheet-live-runtime');
  load('./gm-center-live-runtime.js','gm-center-live-runtime');
})();
