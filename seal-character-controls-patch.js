(function(){
'use strict';
if(window.__catlakSealCharacterControlsDisabledV1)return;
window.__catlakSealCharacterControlsDisabledV1=true;
const APP=document.querySelector('#app');
function cleanup(){APP?.querySelectorAll?.('[data-scc-panel]').forEach(x=>x.remove())}
cleanup();
new MutationObserver(cleanup).observe(APP||document.documentElement,{childList:true,subtree:true});
window.__catlakSealCharacterControls={render:()=>{cleanup();return false},disabled:true};
})();
