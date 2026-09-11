(()=>{
  if(window.__catlakPlayerSheetBootstrapV1)return;
  window.__catlakPlayerSheetBootstrapV1=true;
  const s=document.createElement('script');
  s.dataset.playerSheetLiveRuntime='1';
  s.src='./player-sheet-live-runtime.js?v='+Date.now();
  s.async=false;
  document.body.appendChild(s);
})();
