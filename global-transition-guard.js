(function(){
'use strict';
if(window.__catlakGlobalTransitionGuardV4)return;
window.__catlakGlobalTransitionGuardV4=true;
window.__catlakGlobalTransitionGuardV3=true;
window.__catlakGlobalTransitionGuardV2=true;
window.__catlakGlobalTransitionGuardV1=true;
const APP=document.getElementById('app');
if(!APP)return;
const HTML=document.documentElement;
function clear(){HTML.classList.remove('cc-route-cloak','cc-global-boot-cloak')}
function begin(){clear()}
clear();
window.addEventListener('pointerdown',clear,true);
window.addEventListener('click',clear,true);
window.addEventListener('catlak:late-ready',clear);
new MutationObserver(clear).observe(HTML,{attributes:true,attributeFilter:['class']});
new MutationObserver(clear).observe(APP,{childList:true,subtree:true});
setInterval(clear,250);
window.__catlakGlobalUiReady=true;
window.__catlakGlobalTransition={begin,clear,ready:()=>true,version:4};
})();