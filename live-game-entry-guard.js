(function(){
'use strict';
if(window.__catlakLiveGameEntryGuardV3)return;
window.__catlakLiveGameEntryGuardV3=true;
const APP=document.getElementById('app');const ROOT=document.documentElement;if(!APP)return;
let fallbackTimer=0,readyRaf=0,revealQueued=false,initialChecked=false;
let maintenanceQueued=false,legacyManagementPending=false,playerRepairTimer=0,playerRepairAttempts=0,playerRevealTimer=0;

if(!document.getElementById('cc-live-entry-guard-style')){
 const style=document.createElement('style');style.id='cc-live-entry-guard-style';style.textContent=`
 html.cc-live-entry-pending #app main{visibility:hidden!important}
 html body #app main[data-cc-simple-live="1"] .cc-simple-roll{grid-template-columns:26px minmax(0,1fr) auto!important;gap:5px!important;padding:2px 0!important;min-height:0!important}
 html body #app main[data-cc-simple-live="1"] .cc-simple-total{font-size:.76rem!important;line-height:1!important;min-width:22px!important}
 html body #app main[data-cc-simple-live="1"] .cc-simple-roll b{font-size:.72rem!important;line-height:1.1!important}
 html body #app main[data-cc-simple-live="1"] .cc-simple-roll span{font-size:.68rem!important;line-height:1.1!important}
 html body #app main[data-cc-simple-live="1"] .cc-simple-roll small{font-size:.6rem!important;line-height:1.05!important}
 html body #app main[data-cc-simple-live="1"] .cc-simple-roll button{min-height:24px!important;padding:3px 6px!important;font-size:.64rem!important}
 #app .nav [data-tab="characters"][data-cc-legacy-management="1"]{display:none!important}
 @media(max-width:800px){
   html body #app main[data-cc-simple-live="1"] .cc-simple-roll{grid-template-columns:24px minmax(0,1fr) auto!important;gap:4px!important}
   html body #app main[data-cc-simple-live="1"] .cc-simple-total{font-size:.72rem!important;min-width:20px!important}
 }
 `;document.head.appendChild(style)
}

function role(){return String(APP.querySelector('.role')?.textContent||'').trim()}
function isGM(){return role()==='GM'}
function isPlayer(){const r=role();return !!r&&r!=='GM'}
function gmActive(){return !!APP.querySelector('.nav [data-tab="gm"].on')}
function finalLiveReady(){const main=APP.querySelector('main');if(!(isGM()&&gmActive()&&main&&main.dataset.ccSimpleLive==='1'&&main.querySelector('.cc-live-two')))return false;const combatExpected=!!window.__catlakLiveCombatCenter;return !combatExpected||!!main.querySelector('[data-lcc-board]')}
function cancelReadyLoop(){if(readyRaf){cancelAnimationFrame(readyRaf);readyRaf=0}revealQueued=false}
function clear(){clearTimeout(fallbackTimer);fallbackTimer=0;cancelReadyLoop();ROOT.classList.remove('cc-live-entry-pending')}
function revealStable(){if(revealQueued||!ROOT.classList.contains('cc-live-entry-pending'))return;revealQueued=true;requestAnimationFrame(()=>requestAnimationFrame(()=>{revealQueued=false;if(finalLiveReady())clear()}))}
function watchReady(){if(!ROOT.classList.contains('cc-live-entry-pending'))return;if(!isGM()||!gmActive()){clear();return}if(finalLiveReady()){revealStable();return}readyRaf=requestAnimationFrame(watchReady)}
function begin(){if(!isGM())return;if(finalLiveReady()){clear();return}clearTimeout(fallbackTimer);cancelReadyLoop();ROOT.classList.add('cc-live-entry-pending');fallbackTimer=setTimeout(clear,5000);readyRaf=requestAnimationFrame(watchReady)}

function cleanLegacyManagement(){
 if(!isGM())return;
 const nav=APP.querySelector('.nav');if(!nav)return;
 nav.querySelectorAll('[data-tab="characters"]').forEach(btn=>{
   btn.dataset.ccLegacyManagement='1';
   btn.hidden=true;
   btn.style.setProperty('display','none','important');
   btn.setAttribute('aria-hidden','true');
   btn.setAttribute('tabindex','-1');
 });
}
function openInternalManagement(){
 if(!isGM())return false;
 cleanLegacyManagement();
 const router=window.__catlakGmCleanRouter;
 if(router&&typeof router.route==='function'){
   legacyManagementPending=false;
   router.route('characters');
   return true;
 }
 legacyManagementPending=true;
 scheduleMaintenance();
 return false;
}
function keepInternalManagementStable(){
 if(!isGM())return;
 cleanLegacyManagement();
 const router=window.__catlakGmCleanRouter;
 if(legacyManagementPending&&router&&typeof router.route==='function'){
   legacyManagementPending=false;
   router.route('characters');
   return;
 }
 if(!router||typeof router.current!=='function'||router.current()!=='characters')return;
 const main=APP.querySelector('main');
 if(main&&!main.querySelector('[data-gmc-owned="characters"]')&&typeof router.renderManagement==='function'){
   router.renderManagement(false);
 }
}

function playerSheetReady(){
 const main=APP.querySelector('main');if(!main)return false;
 if(main.querySelector('.cc-character-stack,.ps-sheet-empty,.ccbv-no-character'))return true;
 const text=String(main.textContent||'');
 return /Henüz karakterin yok|Bu hesaba bağlı karakter yok|Davet bekleniyor/i.test(text);
}
function playerBlocked(){
 const main=APP.querySelector('main');
 return !!(main?.classList.contains('auth')||main?.hasAttribute('data-cc-auth-loading')||main?.hasAttribute('data-cc-refresh-error')||main?.id==='cc-safe-boot');
}
function playerBuilderActive(){return !!APP.querySelector('.nav [data-tab="builder"].on')}
function clearPlayerPending(){
 clearTimeout(playerRevealTimer);playerRevealTimer=0;
 ROOT.classList.remove('cc-player-critical-pending','pptf-player-prep');
}
function refreshPlayerLayers(){
 try{window.__catlakPlayerSheetSupport?.refresh?.(true)}catch(_){}
 try{window.__catlakPlayerLiveTest?.refresh?.(true)}catch(_){}
 try{window.__catlakPlayerSheetEquipmentAbilitiesTest?.paint?.(true)}catch(_){}
 try{window.__catlakPlayerSheetTest?.apply?.()}catch(_){}
}
function repairPlayerSheet(force=false){
 clearTimeout(playerRepairTimer);
 if(!isPlayer()||playerBlocked())return false;
 const sheet=APP.querySelector('.nav [data-tab="sheet"]');if(!sheet)return false;
 if(playerBuilderActive()&&!force)return false;
 const active=sheet.classList.contains('on');
 const ready=playerSheetReady();
 if(active&&ready){
   playerRepairAttempts=0;
   refreshPlayerLayers();
   clearPlayerPending();
   return true;
 }
 if(playerRepairAttempts>=5&&!force){
   clearPlayerPending();
   return false;
 }
 playerRepairAttempts++;
 try{sheet.click()}catch(_){}
 playerRepairTimer=setTimeout(()=>{
   refreshPlayerLayers();
   if(playerSheetReady()){playerRepairAttempts=0;clearPlayerPending();return}
   if(playerRepairAttempts<5)repairPlayerSheet(force);
   else clearPlayerPending();
 },Math.min(900,120+playerRepairAttempts*140));
 clearTimeout(playerRevealTimer);
 playerRevealTimer=setTimeout(clearPlayerPending,4500);
 return true;
}
function requestPlayerSheet(force=false){
 if(!isPlayer())return;
 playerRepairAttempts=0;
 setTimeout(()=>repairPlayerSheet(force),0);
 setTimeout(()=>repairPlayerSheet(force),260);
 setTimeout(()=>repairPlayerSheet(force),850);
}

function maintenance(){
 maintenanceQueued=false;
 keepInternalManagementStable();
 if(isPlayer()&&!playerBlocked()&&!playerBuilderActive()){
   const sheet=APP.querySelector('.nav [data-tab="sheet"]');
   if(sheet&&(!sheet.classList.contains('on')||!playerSheetReady()))repairPlayerSheet(false);
 }
}
function scheduleMaintenance(){if(maintenanceQueued)return;maintenanceQueued=true;requestAnimationFrame(maintenance)}

function interceptLegacyManagement(e){
 const legacy=e.target?.closest?.('#app .nav [data-tab="characters"]');
 if(!legacy||!isGM())return false;
 e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
 openInternalManagement();
 return true;
}

window.addEventListener('pointerdown',e=>{
 if(e.button!=null&&e.button!==0)return;
 if(interceptLegacyManagement(e))return;
 const gm=e.target?.closest?.('#app .nav [data-tab="gm"]');
 if(gm&&isGM()){begin();return}
 const sheet=e.target?.closest?.('#app .nav [data-tab="sheet"]');
 if(sheet&&isPlayer())requestPlayerSheet(true);
},true);

window.addEventListener('click',e=>{
 if(interceptLegacyManagement(e))return;
 const nav=e.target?.closest?.('#app .nav button');
 if(nav&&isGM()){
   if(nav.matches('[data-tab="gm"]')){if(!ROOT.classList.contains('cc-live-entry-pending'))begin()}
   else clear();
 }
 if(nav?.matches?.('[data-tab="sheet"]')&&isPlayer())requestPlayerSheet(true);
},true);

new MutationObserver(()=>{
 scheduleMaintenance();
 if(finalLiveReady()){revealStable();initialChecked=true;return}
 if(ROOT.classList.contains('cc-live-entry-pending')){if(!isGM()||!gmActive())clear();return}
 if(!initialChecked&&isGM()&&gmActive()){initialChecked=true;begin()}
}).observe(APP,{childList:true,subtree:true,attributes:true,attributeFilter:['class','data-cc-simple-live']});

queueMicrotask(()=>{
 scheduleMaintenance();
 if(!initialChecked&&isGM()&&gmActive()){initialChecked=true;begin()}
 if(isPlayer())requestPlayerSheet(false);
});

window.__catlakLiveGameEntryGuard={
 begin,clear,ready:finalLiveReady,
 repairPlayerSheet:()=>requestPlayerSheet(true),
 openManagement:openInternalManagement,
 maintain:scheduleMaintenance
};
})();