(function(){
'use strict';
if(window.__catlakRuntimeHealthGuardV2)return;
window.__catlakRuntimeHealthGuardV2=true;
const ROOT=document.documentElement,APP=document.getElementById('app');
if(!APP)return;

const timers=new Map();
const limits={
  'cc-battle-entry-pending':5200,
  'cc-live-entry-pending':5200,
  'cc-gm-nav-transition':1200,
  'cc-player-critical-pending':6500,
  'cc-fast-nav-switch':1400
};

if(!document.getElementById('cc-fast-nav-style')){
  const st=document.createElement('style');
  st.id='cc-fast-nav-style';
  st.textContent='html.cc-fast-nav-switch #app main{visibility:hidden!important}';
  document.head.appendChild(st);
}

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

let navSwitchArmed=false;
function beginNavSwitch(btn){
  if(!btn||btn.classList.contains('on'))return;
  if(btn.matches('[data-cc-hard-race-nav],[data-tab="sheet"]'))return;
  navSwitchArmed=true;
  ROOT.classList.add('cc-fast-nav-switch');
  arm('cc-fast-nav-switch');
}
function finishNavSwitch(){
  if(!navSwitchArmed&&!ROOT.classList.contains('cc-fast-nav-switch'))return;
  navSwitchArmed=false;
  clearClass('cc-fast-nav-switch');
}
window.addEventListener('pointerdown',e=>{
  if(e.button!=null&&e.button!==0)return;
  const b=e.target?.closest?.('#app .nav button,#app [data-gmc-centerbar] button');
  if(b)beginNavSwitch(b);
},true);

new MutationObserver(rs=>{
  if(ROOT.classList.contains('cc-fast-nav-switch')){
    const main=APP.querySelector('main');
    const changed=rs.some(r=>r.target===main||main?.contains(r.target)||[...r.addedNodes].some(n=>n===main||n.nodeType===1&&main?.contains(n)));
    if(changed)requestAnimationFrame(()=>requestAnimationFrame(finishNavSwitch));
  }
}).observe(APP,{childList:true,subtree:true});

new MutationObserver(rs=>{
  if(rs.some(r=>r.attributeName==='class'))scan();
}).observe(ROOT,{attributes:true,attributeFilter:['class']});

window.addEventListener('catlak:data-refreshed',finishNavSwitch);
window.addEventListener('pageshow',()=>{finishNavSwitch();scan()});
window.addEventListener('focus',scan);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')scan()});
scan();
window.__catlakRuntimeHealthGuard={scan,clear:clearClass,finishNavSwitch};
})();