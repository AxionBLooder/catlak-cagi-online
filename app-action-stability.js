(function(){
'use strict';
if(window.__catlakActionStabilityV2)return;
window.__catlakActionStabilityV2=true;

const APP=document.getElementById('app');
if(!APP)return;
if(!document.getElementById('cc-entry-stability-style')){
  const st=document.createElement('style');st.id='cc-entry-stability-style';st.textContent='html.cc-battle-entry-pending #app main{visibility:hidden!important}html.cc-race-entry-pending #app main{visibility:hidden!important}';document.head.appendChild(st);
}
const txt=e=>String(e?.textContent||'').replace(/\s+/g,' ').trim();
const role=()=>txt(APP.querySelector('.role'));
let snap=null,restoreTimer=0;

function isCommitButton(el){
  const b=el?.closest?.('button,[role="button"]');if(!b||!APP.contains(b))return null;
  const label=txt(b).toLocaleLowerCase('tr-TR');
  if(!/(^|\s)(kaydet|iptal|vazgeç|vazgec)(\s|$)/i.test(label))return null;
  return b;
}
function activeNav(){
  const b=APP.querySelector('.nav button.on');if(!b)return null;
  return{tab:b.dataset.tab||'',battle:b.hasAttribute('data-ccr-battle'),race:b.hasAttribute('data-cc-hard-race-nav'),gm:b.hasAttribute('data-gmt-open')};
}
function take(){
  let gmRoute='';
  try{gmRoute=String(window.__catlakGmCenterRouterCore?.current?.()||window.__catlakGmCenterSelectedRoute||'')}catch(_){}
  snap={at:Date.now(),role:role(),gmRoute,nav:activeNav(),x:window.scrollX,y:window.scrollY};
}
function restore(){
  if(!snap||Date.now()-snap.at>1800)return;
  const s=snap;
  if(s.role==='GM'&&s.gmRoute){
    let current='';
    try{current=String(window.__catlakGmCenterRouterCore?.current?.()||window.__catlakGmCenterSelectedRoute||'')}catch(_){}
    if(current!==s.gmRoute){
      try{window.__catlakGmCenterRouterCore?.route?.(s.gmRoute)}catch(_){}
    }
  }
  requestAnimationFrame(()=>{if(Math.abs(window.scrollY-s.y)>80)window.scrollTo({left:s.x,top:s.y,behavior:'auto'})});
}
function queueRestore(){
  clearTimeout(restoreTimer);
  [0,70,220,520].forEach(ms=>setTimeout(restore,ms));
  restoreTimer=setTimeout(()=>{snap=null},1900);
}
let battleFallback=0;
function beginBattleEntry(){
  document.documentElement.classList.add('cc-battle-entry-pending');
  clearTimeout(battleFallback);battleFallback=setTimeout(()=>document.documentElement.classList.remove('cc-battle-entry-pending'),2200);
}
function finishBattleEntry(){
  clearTimeout(battleFallback);document.documentElement.classList.remove('cc-battle-entry-pending');
}
window.addEventListener('pointerdown',e=>{
  if(e.button!=null&&e.button!==0)return;
  if(e.target?.closest?.('[data-ccr-battle]'))beginBattleEntry();
  if(isCommitButton(e.target))take();
},true);
window.addEventListener('click',e=>{
  const race=e.target?.closest?.('[data-cc-hard-race-nav]');
  if(race&&role()!=='GM'){
    e.preventDefault();e.stopImmediatePropagation();
    window.__catlakRaceWantedEarly=true;
    const h=window.__catlakPlayerSheetHardRecovery;
    if(h?.setRaceView?.(true)){document.documentElement.classList.remove('cc-race-entry-pending');return}
    document.documentElement.classList.add('cc-race-entry-pending');
    Promise.resolve(h?.recover?.()).then(()=>{h?.ensureRaceNav?.();h?.setRaceView?.(true);document.documentElement.classList.remove('cc-race-entry-pending')}).catch(()=>document.documentElement.classList.remove('cc-race-entry-pending'));
    return;
  }
  const sheet=e.target?.closest?.('#app .nav [data-tab="sheet"]');
  if(sheet&&window.__catlakRaceWantedEarly===true&&role()!=='GM'){
    const h=window.__catlakPlayerSheetHardRecovery;
    if(h?.setRaceView){
      e.preventDefault();e.stopImmediatePropagation();window.__catlakRaceWantedEarly=false;h.setRaceView(false);return;
    }
  }
},true);
window.addEventListener('click',e=>{if(isCommitButton(e.target)){if(!snap)take();queueRestore()}},true);
window.addEventListener('submit',e=>{
  const form=e.target;
  if(!form?.closest?.('#app')||form.hasAttribute('data-cc-native-submit'))return;
  e.preventDefault();
  if(!snap)take();
  queueRestore();
},true);

window.__catlakActionStability={snapshot:take,restore,finishBattleEntry};
})();
