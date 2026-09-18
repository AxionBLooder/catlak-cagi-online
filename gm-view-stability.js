(function(){
'use strict';
if(window.__catlakGmViewStabilityV1)return;
window.__catlakGmViewStabilityV1=true;
const APP=document.getElementById('app');
if(!APP)return;
const ROOT=document.documentElement;
const previousPreserve=window.__catlakShouldPreserveCurrentView;
let navToken=0,clearTimer=0,raf1=0,raf2=0;

function isGM(){
  return String(APP.querySelector('.role')?.textContent||'').trim()==='GM';
}
function customOwnsMain(){
  if(!isGM())return false;
  const main=APP.querySelector('main');
  if(window.__catlakPartyRoomOwnsMain===true)return true;
  try{if(window.__catlakGmUiPolish?.isManagementOpen?.())return true}catch(_){}
  try{if(window.__catlakGmCleanRouter?.isOpen?.())return true}catch(_){}
  if(!main)return false;
  return !!(
    main.dataset.ccManagementV2==='1' ||
    main.dataset.ccExternalManagement==='1' ||
    main.dataset.gmtTools ||
    main.dataset.gmtSub ||
    main.dataset.qolCreatureLibrary ||
    main.dataset.cuxPage ||
    main.querySelector('[data-prsv2-page],[data-gmc-owned]')
  );
}
window.__catlakShouldPreserveCurrentView=function(){
  if(customOwnsMain())return true;
  try{return typeof previousPreserve==='function'?!!previousPreserve():false}catch(_){return false}
};

const old=document.getElementById('cc-gm-view-stability-style');if(old)old.remove();
const style=document.createElement('style');style.id='cc-gm-view-stability-style';style.textContent=`
html.cc-gm-nav-transition body #app main{visibility:hidden!important}
html.cc-gm-nav-transition body #app{min-height:calc(100vh - 100px)}
`;
document.head.appendChild(style);

function finish(token=navToken){
  if(token!==navToken)return;
  clearTimeout(clearTimer);cancelAnimationFrame(raf1);cancelAnimationFrame(raf2);
  raf1=requestAnimationFrame(()=>{raf2=requestAnimationFrame(()=>{if(token===navToken)ROOT.classList.remove('cc-gm-nav-transition')})});
}
function begin(){
  if(!isGM())return;
  const token=++navToken;
  ROOT.classList.add('cc-gm-nav-transition');
  clearTimeout(clearTimer);
  clearTimer=setTimeout(()=>finish(token),280);
}
window.addEventListener('pointerdown',e=>{
  if(e.button!=null&&e.button!==0)return;
  const target=e.target?.closest?.('#app .nav button,[data-gmc-route]');
  if(target&&isGM())begin();
},true);
new MutationObserver(rs=>{
  if(!ROOT.classList.contains('cc-gm-nav-transition'))return;
  const main=APP.querySelector('main');
  if(!main)return;
  if(rs.some(r=>r.type==='childList'&&(r.target===main||main.contains(r.target))))finish(navToken);
}).observe(APP,{childList:true,subtree:true});

window.__catlakGmViewStability={begin,finish,preserve:customOwnsMain};
})();