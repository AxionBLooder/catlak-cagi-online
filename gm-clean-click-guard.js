(function(){
'use strict';
if(window.__catlakGmCleanClickGuardV9)return;
window.__catlakGmCleanClickGuardV9=true;
function stop(e,prevent=false){if(prevent)e.preventDefault();e.stopPropagation();e.stopImmediatePropagation()}
function closeManagement(){try{window.__catlakGmUiPolish?.closeManagement?.()}catch(_){}}
function centerBridgeNav(nav){return !!(window.__catlakGmCenterBridge||nav?.matches?.('[data-gmc-native-bridge]'))}
function clearForeignRooms(){
  closeManagement();
  try{window.__catlakPartyEeliotHotfix?.close?.()}catch(_){}
  try{window.__catlakGmTools?.close?.()}catch(_){}
  try{window.__catlakCampaignStateTest?.close?.()}catch(_){}
  try{window.__catlakQualityOfLifeTest?.closeCreatureLibrary?.()}catch(_){}
  try{window.__catlakGmCleanRouter?.close?.()}catch(_){}
  try{window.__catlakPartyRoomOwnsMain=false}catch(_){}
  try{document.documentElement.classList.remove('cc-ext-management-pending')}catch(_){}
}
function retry(fn){let done=false,step=0;const waits=[0,60,140,260,480];const run=()=>{if(done)return;try{done=fn()===true}catch(_){}if(done||step>=waits.length-1)return;step++;setTimeout(run,waits[step])};setTimeout(run,waits[0])}
function dispatch(el){
  if(!el)return;
  const api=window.__catlakGmCleanRouter;
  if(el.matches('[data-cc-management-room]')){try{window.__catlakPartyEeliotHotfix?.close?.()}catch(_){}try{api?.close?.()}catch(_){}retry(()=>{const x=window.__catlakGmUiPolish?.openManagement;if(typeof x!=='function')return false;x();return true});return}
  if(el.matches('[data-gmc-open]')){closeManagement();try{window.__catlakPartyEeliotHotfix?.close?.()}catch(_){}retry(()=>{const x=window.__catlakGmCleanRouter?.open;if(typeof x!=='function')return false;x();return true});return}
  if(el.matches('[data-gmc-route]')){closeManagement();window.__catlakPartyEeliotHotfix?.close?.();api?.route?.(el.dataset.gmcRoute);return}
  if(el.matches('[data-gmc-action]')){api?.action?.(el);return}
  if(el.matches('[data-prh-manager]')){closeManagement();api?.close?.();try{window.__catlakGmTools?.close?.()}catch(_){}try{window.__catlakCampaignStateTest?.close?.()}catch(_){}try{window.__catlakQualityOfLifeTest?.closeCreatureLibrary?.()}catch(_){}window.__catlakPartyEeliotHotfix?.open?.();return}
  if(el.matches('[data-prh-party]')){clearForeignRooms();window.__catlakPartyEeliotHotfix?.renderParty?.();return}
}
window.addEventListener('pointerdown',e=>{
  if(e.button!=null&&e.button!==0)return;
  const el=e.target?.closest?.('[data-gmc-open],[data-gmc-route],[data-gmc-action],[data-prh-manager],[data-prh-party],[data-cc-management-room]');
  if(el){stop(e,false);return}
  const nav=e.target?.closest?.('#app .nav button');
  if(nav&&!centerBridgeNav(nav))clearForeignRooms();
},true);
window.addEventListener('click',e=>{
  const el=e.target?.closest?.('[data-gmc-open],[data-gmc-route],[data-gmc-action],[data-prh-manager],[data-prh-party],[data-cc-management-room]');
  if(el){stop(e,true);dispatch(el);return}
  const nav=e.target?.closest?.('#app .nav button');
  if(nav&&!centerBridgeNav(nav)&&!nav.matches('[data-gmc-open],[data-prh-manager],[data-prh-party],[data-cc-management-room]'))clearForeignRooms();
},true);
})();