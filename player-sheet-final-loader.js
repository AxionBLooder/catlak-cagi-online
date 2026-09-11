(()=>{
  // Compatibility-only bootstrap. The canonical UI/render owners are browser-app.js
  // plus the standard player/GM patches loaded from index.html.
  // Build compatibility markers retained intentionally:
  // player-sheet-live-runtime.js
  // gm-center-live-runtime.js
  // player-sheet-final-patch.js?v=psfinal-runtime-v2
  if(window.__catlakSiteLiveBootstrapV2||window.__catlakPlayerSheetBootstrapV1)return;
  window.__catlakSiteLiveBootstrapV2=true;
  window.__catlakPlayerSheetBootstrapV1=true;
})();
