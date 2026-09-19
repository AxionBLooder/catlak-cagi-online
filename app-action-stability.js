(function(){
'use strict';
if(window.__catlakActionStabilityV9)return;
window.__catlakActionStabilityV9=true;

const APP=document.getElementById('app');
if(!APP)return;
const txt=e=>String(e?.textContent||'').replace(/\s+/g,' ').trim();
const role=()=>txt(APP.querySelector('.role'));
let snap=null,restoreTimer=0,restoreTimers=[],navigationEpoch=0,actionHoldUntil=0,stableActionUntil=0,allowAppRenderUntil=0;
const previousPreserve=window.__catlakShouldPreserveCurrentView;

function isNavigationButton(b){
  if(!b||!APP.contains(b))return true;
  if(b.closest('.nav'))return true;
  if(b.matches('[data-tab],[data-ccr-battle],[data-cc-hard-race-nav],[data-ccr-hub],[data-ccr-hub-tab],[data-gmc-open],[data-gmc-route],[data-gmt-open],[data-gmt-route]'))return true;
  const core=String(b.dataset?.a||'').toLowerCase();
  return ['amode','auth','logout'].includes(core);
}
function isStableAction(el){
  const b=el?.closest?.('button,[role="button"]');if(!b||!APP.contains(b)||isNavigationButton(b))return null;
  if(b.closest('main[data-ccr-battle="1"],main.ccr-battle-surface'))return null;
  if(b.matches('[data-cc-party-push],[data-cc-party-clear],[data-vamf-party],[data-ccq-party-other],[data-sw-party]'))return null;
  // Managed battle and map-sharing actions preserve their own DOM/viewport.
  return b;
}
function isCommitButton(el){return isStableAction(el)}
function navigationIntent(el){
  return el?.closest?.('#app .nav button,#app [data-tab],#app [data-gmc-open],#app [data-gmc-route],#app [data-gmt-open],#app [data-gmt-route],#app [data-cc-management-room],#app [data-prh-manager],#app [data-prh-party],#app [data-ccr-battle],#app [data-ccr-hub],#app [data-ccr-hub-tab],#app [data-cc-hard-race-nav],#app [data-a="logout"],#app [data-a="auth"]')||null;
}
function isIntentionalAppExit(el){
  const b=navigationIntent(el);
  if(!b)return false;
  if(b.matches?.('button[data-ccr-battle]'))return false;
  return true;
}
function cancelRestore(){
  navigationEpoch++;
  snap=null;
  actionHoldUntil=0;
  stableActionUntil=0;
  clearTimeout(restoreTimer);
  restoreTimers.forEach(clearTimeout);
  restoreTimers=[];
}
function permitAppRender(ms=1800){allowAppRenderUntil=Math.max(allowAppRenderUntil,Date.now()+ms)}
function managedViewActive(){
  const main=APP.querySelector('main');
  if(window.__catlakBattleRoomOpen===true||main?.dataset.ccrBattle==='1')return true;
  try{if(window.__catlakGmCleanRouter?.isOpen?.())return true}catch(_){}
  if(window.__catlakManagementRoomOpen===true||window.__catlakPartyRoomOwnsMain===true)return true;
  if(window.__catlakCreatureLibraryOpen===true||window.__catlakCampaignStateRoom)return true;
  if(main?.dataset.cuxPage==='stats'||main?.querySelector?.('[data-cux-editor]'))return true;
  if(main?.querySelector?.('[data-lcc-board]'))return true;
  return false;
}
function holdAction(ms=9000){actionHoldUntil=Math.max(actionHoldUntil,Date.now()+ms);stableActionUntil=Math.max(stableActionUntil,Date.now()+ms)}
function installAppRenderGuard(){
  if(window.__catlakActionAppRenderGuardInstalled)return;
  const desc=Object.getOwnPropertyDescriptor(Element.prototype,'innerHTML');
  if(!desc?.get||!desc?.set)return;
  Object.defineProperty(Element.prototype,'innerHTML',{
    configurable:desc.configurable,enumerable:desc.enumerable,get:desc.get,
    set:function(value){
      if(this===APP&&managedViewActive()&&Date.now()>allowAppRenderUntil){
        const html=String(value??'');
        const auth=/class=["'][^"']*auth\b/i.test(html)||/data-cc-auth-loading/i.test(html)||/data-cc-refresh-error/i.test(html);
        if(!auth){
          window.__catlakActionAppRenderBlocked=(Number(window.__catlakActionAppRenderBlocked)||0)+1;
          holdAction(1600);
          return;
        }
      }
      return desc.set.call(this,value);
    }
  });
  window.__catlakActionAppRenderGuardInstalled=true;
}
window.__catlakShouldPreserveCurrentView=function(){
  if(Date.now()<actionHoldUntil||managedViewActive())return true;
  try{return typeof previousPreserve==='function'?!!previousPreserve():false}catch(_){return false}
};
function activeNav(){
  const b=APP.querySelector('.nav button.on');if(!b)return null;
  return{tab:b.dataset.tab||'',battle:b.hasAttribute('data-ccr-battle'),race:b.hasAttribute('data-cc-hard-race-nav'),gm:b.hasAttribute('data-gmt-open')};
}
function take(){
  let gmRoute='';
  try{gmRoute=String(window.__catlakGmCleanRouter?.current?.()||window.__catlakGmCenterRouterCore?.current?.()||window.__catlakGmCenterSelectedRoute||'')}catch(_){}
  snap={at:Date.now(),epoch:navigationEpoch,role:role(),gmRoute,nav:activeNav(),x:window.scrollX,y:window.scrollY};
}
function restore(){
  if(!snap||snap.epoch!==navigationEpoch||Date.now()-snap.at>9500)return;
  const s=snap;
  if(s.role==='GM'&&s.gmRoute){
    let current='';
    try{current=String(window.__catlakGmCleanRouter?.current?.()||window.__catlakGmCenterRouterCore?.current?.()||window.__catlakGmCenterSelectedRoute||'')}catch(_){}
    if(current!==s.gmRoute){
      try{
        if(window.__catlakGmCleanRouter?.route)window.__catlakGmCleanRouter.route(s.gmRoute);
        else window.__catlakGmCenterRouterCore?.route?.(s.gmRoute)
      }catch(e){window.__catlakReportError?.('gm-route-restore',e)}
    }
  }
  requestAnimationFrame(()=>{if(Math.abs(window.scrollY-s.y)>2)window.scrollTo({left:s.x,top:s.y,behavior:'auto'})});
}
function queueRestore(){
  clearTimeout(restoreTimer);
  restoreTimers.forEach(clearTimeout);
  restoreTimers=[0,40,120,280,600,1100,1900,3200,5200,7600].map(ms=>setTimeout(restore,ms));
  restoreTimer=setTimeout(()=>{snap=null;restoreTimers=[]},9600);
}
let battleFallback=0;
function finishBattleEntry(){
  clearTimeout(battleFallback);document.documentElement.classList.remove('cc-battle-entry-pending');
}
window.addEventListener('pointerdown',e=>{
  if(e.button!=null&&e.button!==0)return;
  if(navigationIntent(e.target)){cancelRestore();permitAppRender()}
  if(isStableAction(e.target)){holdAction();take()}
},true);
window.addEventListener('click',e=>{
  if(navigationIntent(e.target)){cancelRestore();permitAppRender()}
  if(isStableAction(e.target)){holdAction();if(!snap)take();queueRestore()}
},true);
window.addEventListener('wheel',()=>{if(snap||restoreTimers.length)cancelRestore()},{capture:true,passive:true});
window.addEventListener('touchmove',()=>{if(snap||restoreTimers.length)cancelRestore()},{capture:true,passive:true});
window.addEventListener('keydown',e=>{
  if(['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].includes(e.key)&&(snap||restoreTimers.length))cancelRestore();
},true);
window.addEventListener('submit',e=>{
  const form=e.target;
  if(!form?.closest?.('#app')||form.hasAttribute('data-cc-native-submit'))return;
  e.preventDefault();
  holdAction();
  if(!snap)take();
  queueRestore();
},true);

installAppRenderGuard();
window.__catlakActionStability={snapshot:take,restore,cancelRestore,finishBattleEntry,hold:holdAction,preserve:managedViewActive,isStableAction,permitAppRender,blockedAppRenders:()=>Number(window.__catlakActionAppRenderBlocked)||0};
})();
