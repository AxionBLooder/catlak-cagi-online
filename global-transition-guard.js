(function(){
'use strict';
if(window.__catlakGlobalTransitionGuardV2)return;
window.__catlakGlobalTransitionGuardV2=true;
window.__catlakGlobalTransitionGuardV1=true;
const APP=document.getElementById('app');
if(!APP)return;
const HTML=document.documentElement;
const ROUTES='#app .nav button,#app [data-gm2-route],#app [data-gmt-sub],#app [data-gcs-route],#app [data-gmci-tool],#app [data-prh-manager],#app [data-prh-party]';
let token=0,lastMutation=performance.now(),routeStarted=0,routeKey='',beforeSig='',routeTimer=0,routeMax=0,bootMax=0;

function main(){return APP.querySelector('main')}
function textSig(m){if(!m)return'';const h=m.querySelector('h1,h2,.eyebrow');return String(h?.textContent||'').trim().slice(0,90)}
function sig(){const m=main();if(!m)return'';return [m.className,m.dataset.ccMapPage||'',m.dataset.swPage||'',m.dataset.gmtSub||'',m.dataset.gm2Route||'',m.dataset.gcsPage||'',m.dataset.ccSimpleLive||'',m.dataset.ccrBattle||'',m.childElementCount,m.querySelectorAll(':scope > *').length,textSig(m),m.querySelector('[data-pptf-page]')?'party-manager':'',m.querySelector('[data-prh-page]')?'party-manager-legacy':'',m.querySelector('[data-prh-party-page]')?'party-room':'',m.querySelector('[data-gm2-ability-page]')?'ability':'',m.querySelector('.ccr-battle-grid')?'battle':'',m.classList.contains('ps-player-sheet')?'sheet':''].join('|')}
function key(el){
 if(!el)return'';
 if(el.matches('[data-prh-manager],[data-pm3-open]'))return'party-manager';
 if(el.matches('[data-prh-party]'))return'party-room';
 if(el.matches('[data-gm2-route]'))return'gm2:'+String(el.dataset.gm2Route||'');
 if(el.matches('[data-gmt-sub]'))return'gmt:'+String(el.dataset.gmtSub||'');
 if(el.matches('[data-gcs-route]'))return'gcs:'+String(el.dataset.gcsRoute||'');
 if(el.matches('[data-gmci-tool]'))return'gmci:'+String(el.dataset.gmciTool||'');
 if(el.matches('[data-cc-map-tab]'))return'map';
 if(el.matches('[data-cc-world-tab]'))return'world';
 if(el.matches('[data-cc-stats-tab]'))return'stats';
 if(el.matches('[data-ccr-battle]'))return'battle';
 if(el.matches('[data-gmt-open]'))return'gm-center';
 if(el.matches('button[data-tab]'))return'tab:'+String(el.dataset.tab||'');
 return'';
}
function actualReady(k){
 const m=main();if(!m)return false;
 if(k==='party-manager')return !!m.querySelector('[data-pptf-page],[data-prh-page]');
 if(k==='party-room')return !!m.querySelector('[data-prh-party-page]');
 if(k==='map')return m.dataset.ccMapPage==='1';
 if(k==='world')return m.dataset.swPage==='gallery';
 if(k==='battle')return m.dataset.ccrBattle==='1'||!!m.querySelector('.ccr-battle-grid');
 if(k==='stats')return m.dataset.gm2Route==='stats'||!!m.querySelector('.cux-workshop,[data-cux-editor]');
 if(k==='gm-center')return !!APP.querySelector('[data-gm2-centerbar]')||!!window.__catlakGmCenterSelectedRoute;
 if(k.startsWith('gm2:')){
  const r=k.slice(4);
  if(String(window.__catlakGmCenterSelectedRoute||'')!==r)return false;
  if(r==='ability')return !!m.querySelector('[data-gm2-ability-page]');
  if(r==='logs'||r==='events')return m.dataset.gmtSub===r||m.dataset.gm2Route===r;
  return true;
 }
 if(k.startsWith('gmt:'))return m.dataset.gmtSub===k.slice(4);
 if(k.startsWith('gcs:'))return !!m.querySelector(`[data-gcs-page="${CSS.escape(k.slice(4))}"]`);
 if(k.startsWith('tab:')){
  const t=k.slice(4),b=APP.querySelector(`.nav button[data-tab="${CSS.escape(t)}"]`);if(!b?.classList.contains('on'))return false;
  if(t==='sheet')return m.classList.contains('ps-player-sheet')||!!m.querySelector('.cc-character-stack,.ps-sheet-empty');
  if(t==='gm')return m.dataset.ccSimpleLive==='1'||!!m.querySelector('[data-lcc-board],.cc-live-two');
  return sig()!==beforeSig;
 }
 return sig()!==beforeSig;
}
function clearRoute(){
 clearTimeout(routeTimer);clearTimeout(routeMax);
 HTML.classList.remove('cc-route-cloak');
 routeKey='';beforeSig='';
}
function meaningfulChanged(){return sig()!==beforeSig}
function checkRoute(my){
 if(my!==token||!HTML.classList.contains('cc-route-cloak'))return;
 const elapsed=performance.now()-routeStarted;
 const stable=performance.now()-lastMutation>55;
 // Yeni ekranın gerçekten hazır olması ideal; ama DOM anlamlı biçimde değiştiyse
 // eski görünüm artık yoktur, kilidi hemen bırak.
 if(elapsed>45&&stable&&(actualReady(routeKey)||meaningfulChanged())){clearRoute();return}
 routeTimer=setTimeout(()=>checkRoute(my),35);
}
function begin(el){
 const k=key(el);if(!k||el.disabled)return;
 const now=performance.now();
 // pointerdown + click aynı rota için iki kez begin çağırabiliyor.
 // İkinci çağrı süreyi yeniden başlatıp ekranı kilitlemesin.
 if(HTML.classList.contains('cc-route-cloak')&&k===routeKey&&now-routeStarted<500)return;
 if(actualReady(k))return;
 token++;routeKey=k;routeStarted=now;beforeSig=sig();lastMutation=now;HTML.classList.add('cc-route-cloak');
 clearTimeout(routeTimer);clearTimeout(routeMax);const my=token;
 routeTimer=setTimeout(()=>checkRoute(my),40);
 // Kesin emniyet: hiçbir oda tam ekran hazırlık katmanında takılı kalamaz.
 routeMax=setTimeout(()=>{if(my===token)clearRoute()},720);
}
function revealBoot(){
 if(!HTML.classList.contains('cc-global-boot-cloak'))return;
 if(APP.querySelector('[data-cc-boot-placeholder]'))return;
 HTML.classList.remove('cc-global-boot-cloak');
 window.__catlakGlobalUiReady=true;
}
function tryBoot(){if(window.__catlakLateRuntimeReady)requestAnimationFrame(()=>requestAnimationFrame(revealBoot))}

window.addEventListener('pointerdown',e=>{if(!e.isTrusted||e.button!=null&&e.button!==0)return;const el=e.target?.closest?.(ROUTES);if(el)begin(el)},true);
window.addEventListener('catlak:late-ready',tryBoot);
new MutationObserver(()=>{
 lastMutation=performance.now();
 if(HTML.classList.contains('cc-route-cloak')){
  const my=token;clearTimeout(routeTimer);routeTimer=setTimeout(()=>checkRoute(my),30);
 }
 tryBoot();
}).observe(APP,{childList:true,subtree:true,attributes:true,characterData:true,attributeFilter:['class','data-cc-map-page','data-sw-page','data-gmt-sub','data-gm2-route','data-gcs-page','data-cc-simple-live','data-ccr-battle']});
bootMax=setTimeout(()=>{if(!APP.querySelector('[data-cc-boot-placeholder]'))revealBoot()},5200);
setTimeout(tryBoot,120);setTimeout(tryBoot,500);
window.__catlakGlobalTransition={begin,clear:clearRoute,ready:actualReady,version:2};
})();