(function(){
'use strict';
if(window.__catlakActionStabilityV5)return;
window.__catlakActionStabilityV5=true;

const APP=document.getElementById('app');
if(!APP)return;
if(!document.getElementById('cc-entry-stability-style')){
  const st=document.createElement('style');st.id='cc-entry-stability-style';st.textContent='html.cc-battle-entry-pending #app main>*{visibility:hidden!important}html.cc-battle-entry-pending #app main::before{content:"Savaş Odası hazırlanıyor…";display:block;visibility:visible!important;margin:20px auto;max-width:980px;padding:18px;border:1px solid #284254;border-radius:12px;background:#08131c;color:#91a7bb;font-weight:700}';document.head.appendChild(st);
}
const txt=e=>String(e?.textContent||'').replace(/\s+/g,' ').trim();
const role=()=>txt(APP.querySelector('.role'));
let snap=null,restoreTimer=0,actionHoldUntil=0;
const previousPreserve=window.__catlakShouldPreserveCurrentView;

function isCommitButton(el){
  const b=el?.closest?.('button,[role="button"]');if(!b||!APP.contains(b))return null;
  const label=txt(b).toLocaleLowerCase('tr-TR');
  const core=String(b.dataset?.a||'').toLowerCase();
  const custom=String(b.dataset?.gmcAction||b.dataset?.gmtAction||'').toLowerCase();
  const known=new Set(['itemsave','pathsave','powersave','speciessave','charnote','ruling']);
  if(known.has(core)||b.hasAttribute('data-cux-save')||/save|note/.test(custom))return b;
  if(!/(^|\s)(kaydet|güncelle|guncelle|uygula|onayla|tamam)(\s|$)/i.test(label))return null;
  return b;
}
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
function holdAction(ms=5000){actionHoldUntil=Math.max(actionHoldUntil,Date.now()+ms)}
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
  [0,100,300,700,1500,2800,4500].forEach(ms=>setTimeout(restore,ms));
  restoreTimer=setTimeout(()=>{snap=null},5200);
}
let battleFallback=0;
function finishBattleEntry(){
  clearTimeout(battleFallback);document.documentElement.classList.remove('cc-battle-entry-pending');
}
window.addEventListener('pointerdown',e=>{if(e.button!=null&&e.button!==0)return;if(isCommitButton(e.target)){holdAction();take()}},true);
window.addEventListener('click',e=>{if(isCommitButton(e.target)){holdAction();if(!snap)take();queueRestore()}},true);
window.addEventListener('submit',e=>{
  const form=e.target;
  if(!form?.closest?.('#app')||form.hasAttribute('data-cc-native-submit'))return;
  e.preventDefault();
  holdAction();
  if(!snap)take();
  queueRestore();
},true);

window.__catlakActionStability={snapshot:take,restore,finishBattleEntry,hold:holdAction,preserve:managedViewActive};
})();
