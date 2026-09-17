(function(){
'use strict';
if(window.__catlakLiveGameEntryGuardV2)return;
window.__catlakLiveGameEntryGuardV2=true;
const APP=document.getElementById('app');const ROOT=document.documentElement;if(!APP)return;
let fallbackTimer=0,readyRaf=0,revealQueued=false,initialChecked=false;
if(!document.getElementById('cc-live-entry-guard-style')){const style=document.createElement('style');style.id='cc-live-entry-guard-style';style.textContent=`html.cc-live-entry-pending #app main{visibility:hidden!important}`;document.head.appendChild(style)}
function isGM(){return String(APP.querySelector('.role')?.textContent||'').trim()==='GM'}
function gmActive(){return !!APP.querySelector('.nav [data-tab="gm"].on')}
function finalLiveReady(){const main=APP.querySelector('main');if(!(isGM()&&gmActive()&&main&&main.dataset.ccSimpleLive==='1'&&main.querySelector('.cc-live-two')))return false;const combatExpected=!!window.__catlakLiveCombatCenter;return !combatExpected||!!main.querySelector('[data-lcc-board]')}
function cancelReadyLoop(){if(readyRaf){cancelAnimationFrame(readyRaf);readyRaf=0}revealQueued=false}
function clear(){clearTimeout(fallbackTimer);fallbackTimer=0;cancelReadyLoop();ROOT.classList.remove('cc-live-entry-pending')}
function revealStable(){if(revealQueued||!ROOT.classList.contains('cc-live-entry-pending'))return;revealQueued=true;requestAnimationFrame(()=>requestAnimationFrame(()=>{revealQueued=false;if(finalLiveReady())clear()}))}
function watchReady(){if(!ROOT.classList.contains('cc-live-entry-pending'))return;if(!isGM()||!gmActive()){clear();return}if(finalLiveReady()){revealStable();return}readyRaf=requestAnimationFrame(watchReady)}
function begin(){if(!isGM())return;if(finalLiveReady()){clear();return}clearTimeout(fallbackTimer);cancelReadyLoop();ROOT.classList.add('cc-live-entry-pending');fallbackTimer=setTimeout(clear,5000);readyRaf=requestAnimationFrame(watchReady)}
window.addEventListener('pointerdown',e=>{if(e.button!=null&&e.button!==0)return;const gm=e.target?.closest?.('#app .nav [data-tab="gm"]');if(gm&&isGM())begin()},true);
window.addEventListener('click',e=>{const nav=e.target?.closest?.('#app .nav button');if(!nav||!isGM())return;if(nav.matches('[data-tab="gm"]')){if(!ROOT.classList.contains('cc-live-entry-pending'))begin()}else clear()},true);
new MutationObserver(()=>{if(finalLiveReady()){revealStable();initialChecked=true;return}if(ROOT.classList.contains('cc-live-entry-pending')){if(!isGM()||!gmActive())clear();return}if(!initialChecked&&isGM()&&gmActive()){initialChecked=true;begin()}}).observe(APP,{childList:true,subtree:true,attributes:true,attributeFilter:['class','data-cc-simple-live']});
queueMicrotask(()=>{if(!initialChecked&&isGM()&&gmActive()){initialChecked=true;begin()}});
window.__catlakLiveGameEntryGuard={begin,clear,ready:finalLiveReady};
})();