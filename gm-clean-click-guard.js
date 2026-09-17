(function(){
'use strict';
if(window.__catlakGmCleanClickGuardV3)return;
window.__catlakGmCleanClickGuardV3=true;
function stop(e,prevent=false){if(prevent)e.preventDefault();e.stopPropagation();e.stopImmediatePropagation()}
function closeManagement(){try{window.__catlakGmUiPolish?.closeManagement?.()}catch(_){}}
function dispatch(el){
  if(!el)return;
  const api=window.__catlakGmCleanRouter;
  if(el.matches('[data-gmc-open]')){closeManagement();window.__catlakPartyEeliotHotfix?.close?.();api?.open?.();return}
  if(el.matches('[data-gmc-route]')){closeManagement();window.__catlakPartyEeliotHotfix?.close?.();api?.route?.(el.dataset.gmcRoute);return}
  if(el.matches('[data-gmc-action]')){api?.action?.(el);return}
  if(el.matches('[data-prh-manager]')){closeManagement();api?.close?.();window.__catlakPartyEeliotHotfix?.open?.();return}
  if(el.matches('[data-prh-party]')){closeManagement();api?.close?.();window.__catlakPartyEeliotHotfix?.renderParty?.();return}
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
  const nav=e.target?.closest?.('#app .nav button');
  if(e.isTrusted&&nav&&!nav.matches('[data-gmc-open],[data-prh-manager],[data-prh-party],[data-cc-management-room]')){
    closeManagement();
    try{window.__catlakPartyEeliotHotfix?.close?.()}catch(_){}
    apiClose();
  }
},true);
function apiClose(){try{window.__catlakGmCleanRouter?.close?.()}catch(_){}try{document.documentElement.classList.remove('cc-ext-management-pending')}catch(_){}}
})();