(function(){
'use strict';
if(window.__catlakRuntimeHealthGuardV1)return;
window.__catlakRuntimeHealthGuardV1=true;
const ROOT=document.documentElement,APP=document.getElementById('app');
if(!APP)return;
const timers=new Map();
const limits={
  'cc-battle-entry-pending':5200,
  'cc-live-entry-pending':5200,
  'cc-gm-nav-transition':1200,
  'cc-player-critical-pending':6500
};
function clearClass(cls){
  ROOT.classList.remove(cls);
  if(cls==='cc-battle-entry-pending')APP.querySelector('main')?.classList.remove('ccr-base-building');
}
function arm(cls){
  clearTimeout(timers.get(cls));
  if(!ROOT.classList.contains(cls)){timers.delete(cls);return}
  timers.set(cls,setTimeout(()=>{clearClass(cls);timers.delete(cls)},limits[cls]));
}
function scan(){Object.keys(limits).forEach(arm)}
new MutationObserver(rs=>{
  if(rs.some(r=>r.attributeName==='class'))scan();
}).observe(ROOT,{attributes:true,attributeFilter:['class']});
window.addEventListener('pageshow',scan);
window.addEventListener('focus',scan);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')scan()});
scan();
window.__catlakRuntimeHealthGuard={scan,clear:clearClass};
})();