(function(){
'use strict';
if(window.__catlakPartyManagerCleanupV1)return;
window.__catlakPartyManagerCleanupV1=true;
const APP=document.querySelector('#app');
if(!APP)return;
let queued=false;
function clean(){
  queued=false;
  APP.querySelectorAll('[data-gm2-centerbar] [data-ps-party-center]').forEach(x=>x.remove());
  APP.querySelectorAll('main [data-prh-page] > .prh-top').forEach(x=>x.remove());
}
function schedule(){if(queued)return;queued=true;requestAnimationFrame(clean)}
new MutationObserver(schedule).observe(APP,{childList:true,subtree:true});
setTimeout(clean,80);setTimeout(clean,350);setTimeout(clean,1000);
window.__catlakPartyManagerCleanup={clean};
})();
