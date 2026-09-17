(function(){
'use strict';
if(window.__catlakLiveCombatCenterLoaderV1)return;
window.__catlakLiveCombatCenterLoaderV1=true;
let tries=0;
function start(){
  const app=document.getElementById('app');
  const ready=!!(app&&window.__catlakSupabase);
  if(!ready){
    if(++tries<240)setTimeout(start,50);
    else console.error('Canlı savaş merkezi başlatılamadı: uygulama/Supabase hazır olmadı.');
    return;
  }
  if(window.__catlakLiveCombatCenter&&typeof window.__catlakLiveCombatCenter.render==='function')return;
  if(window.__catlakLiveCombatCenterV1&&!window.__catlakLiveCombatCenter){
    try{delete window.__catlakLiveCombatCenterV1}catch(_){window.__catlakLiveCombatCenterV1=false}
  }
  if(document.querySelector('script[data-live-combat-center-runtime]'))return;
  const s=document.createElement('script');
  s.dataset.liveCombatCenterRuntime='1';
  s.src='./live-combat-center-patch.js?v=livecombat-v2-runtime';
  s.async=false;
  s.onerror=function(){console.error('Canlı savaş merkezi runtime dosyası yüklenemedi.');};
  document.body.appendChild(s);
}
start();
})();
