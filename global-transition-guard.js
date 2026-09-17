(function(){
'use strict';
if(window.__catlakGlobalTransitionGuardV3)return;
window.__catlakGlobalTransitionGuardV3=true;
window.__catlakGlobalTransitionGuardV2=true;
window.__catlakGlobalTransitionGuardV1=true;
const APP=document.getElementById('app');
if(!APP)return;
const HTML=document.documentElement;
let bootMax=0;
function clearRoute(){HTML.classList.remove('cc-route-cloak')}
function revealBoot(){
 if(!HTML.classList.contains('cc-global-boot-cloak'))return;
 if(APP.querySelector('[data-cc-boot-placeholder]'))return;
 HTML.classList.remove('cc-global-boot-cloak');
 clearRoute();
 window.__catlakGlobalUiReady=true;
}
function tryBoot(){
 clearRoute();
 if(window.__catlakLateRuntimeReady)requestAnimationFrame(()=>requestAnimationFrame(revealBoot));
}
// Yeni hızlı mimaride bölüm değişimleri perde kullanmaz. DOM doğrudan güncellenir.
function begin(){clearRoute()}
window.addEventListener('pointerdown',clearRoute,true);
window.addEventListener('click',clearRoute,true);
window.addEventListener('catlak:late-ready',tryBoot);
new MutationObserver(()=>{clearRoute();tryBoot()}).observe(APP,{childList:true,subtree:true,attributes:true});
// Emniyet: başlangıç uygulaması hazırsa perde en geç 1.6 saniyede kalkar.
bootMax=setTimeout(()=>{clearRoute();if(!APP.querySelector('[data-cc-boot-placeholder]'))revealBoot()},1600);
setTimeout(tryBoot,80);setTimeout(tryBoot,260);setTimeout(tryBoot,700);
window.__catlakGlobalTransition={begin,clear:clearRoute,ready:()=>true,version:3};
})();