(function(){
'use strict';
if(window.__catlakActionStabilityV1)return;
window.__catlakActionStabilityV1=true;

const APP=document.getElementById('app');
if(!APP)return;
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
window.addEventListener('pointerdown',e=>{if(e.button!=null&&e.button!==0)return;if(isCommitButton(e.target))take()},true);
window.addEventListener('click',e=>{if(isCommitButton(e.target)){if(!snap)take();queueRestore()}},true);
window.addEventListener('submit',e=>{
  const form=e.target;
  if(!form?.closest?.('#app')||form.hasAttribute('data-cc-native-submit'))return;
  e.preventDefault();
  if(!snap)take();
  queueRestore();
},true);

window.__catlakActionStability={snapshot:take,restore};
})();
