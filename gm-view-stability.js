(function(){
'use strict';
if(window.__catlakGmViewStabilityV2)return;
window.__catlakGmViewStabilityV2=true;
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
function finish(){ROOT.classList.remove('cc-gm-nav-transition')}
function begin(){finish()}
window.__catlakGmViewStability={begin,finish,preserve:customOwnsMain};
})();