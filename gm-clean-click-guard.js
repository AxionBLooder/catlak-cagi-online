(function(){
'use strict';
if(window.__catlakGmCleanClickGuardV2)return;
window.__catlakGmCleanClickGuardV2=true;
window.__catlakGmCleanClickGuardV1=true;
function stop(e,prevent=false){if(prevent)e.preventDefault();e.stopPropagation();e.stopImmediatePropagation()}
function dispatch(el){
  if(!el)return;
  const api=window.__catlakGmCleanRouter;
  if(el.matches('[data-gmc-open]')){api?.open?.();return}
  if(el.matches('[data-gmc-route]')){api?.route?.(el.dataset.gmcRoute);return}
  if(el.matches('[data-gmc-action]')){api?.action?.(el);return}
  if(el.matches('[data-prh-manager]')){window.__catlakPartyEeliotHotfix?.open?.();return}
  if(el.matches('[data-prh-party]')){window.__catlakPartyEeliotHotfix?.renderParty?.();return}
}
window.addEventListener('pointerdown',e=>{
  if(e.button!=null&&e.button!==0)return;
  const el=e.target?.closest?.('[data-gmc-open],[data-gmc-route],[data-gmc-action],[data-prh-manager],[data-prh-party]');
  if(!el)return;
  stop(e,false);
},true);
window.addEventListener('click',e=>{
  const el=e.target?.closest?.('[data-gmc-open],[data-gmc-route],[data-gmc-action],[data-prh-manager],[data-prh-party]');
  if(el){stop(e,true);dispatch(el);return}

  // Yalnız kullanıcının GERÇEK üst-menü tıklaması GM Merkezi'ni kapatır.
  // Router'ın native Eşya/Irk/Stat/Builder sekmelerini açmak için yaptığı element.click()
  // sentetik (isTrusted=false) olduğundan artık merkezi yanlışlıkla sıfırlamaz.
  const nav=e.target?.closest?.('#app .nav button');
  if(e.isTrusted&&nav&&!nav.matches('[data-gmc-open],[data-prh-manager],[data-prh-party]')){
    window.__catlakGmCleanRouter?.close?.();
  }
},true);
})();