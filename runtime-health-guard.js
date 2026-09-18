(function(){
'use strict';
if(window.__catlakRuntimeHealthGuardV5)return;
window.__catlakRuntimeHealthGuardV5=true;
const ROOT=document.documentElement,APP=document.getElementById('app');
if(!APP)return;

const timers=new Map();
const limits={
  'cc-battle-entry-pending':5200,
  'cc-live-entry-pending':5200,
  'cc-gm-nav-transition':1200,
  'cc-player-critical-pending':6500,
  'cc-fast-nav-switch':950
};

if(!document.getElementById('cc-fast-nav-style')){
  const st=document.createElement('style');
  st.id='cc-fast-nav-style';
  st.textContent=`
    html.cc-fast-nav-switch #app main{opacity:.72!important;min-height:46vh!important;transition:opacity .12s ease!important}
    html.cc-fast-nav-switch #app::after{content:'Güncelleniyor…';display:block;max-width:980px;margin:8px auto;padding:8px 12px;border:1px solid #284254;border-radius:10px;background:#08131c;color:#91a7bb;font-size:.76rem;font-weight:800;box-sizing:border-box}
    html.cc-player-critical-pending #app main{visibility:hidden!important;min-height:46vh!important}
    html.cc-player-critical-pending #app::after{content:'Oyuncu Masası hazırlanıyor…';display:block;max-width:980px;margin:22px auto;padding:18px;border:1px solid #284254;border-radius:12px;background:#08131c;color:#91a7bb;font-weight:800;box-sizing:border-box}
  `;
  document.head.appendChild(st);
}

function clearClass(cls){
  ROOT.classList.remove(cls);
  if(cls==='cc-battle-entry-pending')APP.querySelector('main')?.classList.remove('ccr-base-building');
}
function arm(cls){
  clearTimeout(timers.get(cls));
  if(!ROOT.classList.contains(cls)){timers.delete(cls);return}
  timers.set(cls,setTimeout(()=>{clearClass(cls);timers.delete(cls)},limits[cls]));
}
function scan(){Object.keys(limits).forEach(arm)}

let navSwitchArmed=false;
function beginNavSwitch(btn){
  if(!btn||btn.classList.contains('on'))return;
  if(btn.matches('[data-cc-hard-race-nav],[data-tab="sheet"],[data-tab="gm"],[data-ccr-battle],[data-gmc-open]'))return;
  navSwitchArmed=true;
  ROOT.classList.add('cc-fast-nav-switch');
  arm('cc-fast-nav-switch');
}
function finishNavSwitch(){
  if(!navSwitchArmed&&!ROOT.classList.contains('cc-fast-nav-switch'))return;
  navSwitchArmed=false;
  clearClass('cc-fast-nav-switch');
}
window.addEventListener('pointerdown',e=>{
  if(e.button!=null&&e.button!==0)return;
  const b=e.target?.closest?.('#app .nav button,#app [data-gmc-centerbar] button');
  if(b)beginNavSwitch(b);
},true);

new MutationObserver(rs=>{
  if(ROOT.classList.contains('cc-fast-nav-switch')){
    if(ROOT.dataset.ccViewTransition)return;
    const main=APP.querySelector('main');
    const changed=rs.some(r=>r.target===main||main?.contains(r.target)||[...r.addedNodes].some(n=>n===main||n.nodeType===1&&main?.contains(n)));
    if(changed)requestAnimationFrame(()=>requestAnimationFrame(finishNavSwitch));
  }
}).observe(APP,{childList:true,subtree:true});

new MutationObserver(rs=>{
  if(rs.some(r=>r.attributeName==='class'))scan();
}).observe(ROOT,{attributes:true,attributeFilter:['class']});

const diagnostics=[],owners=new Map();
function claim(surface,owner){
  const key=String(surface||''),value=String(owner||'');if(!key||!value)return false;
  const current=owners.get(key);
  if(current&&current!==value){report('ownership',new Error(key+' zaten '+current+' tarafından yönetiliyor'),value);return false}
  owners.set(key,value);return true
}
function report(kind,error,context='runtime'){
  const message=String(error?.message||error||'Bilinmeyen hata');
  const entry={at:new Date().toISOString(),kind:String(kind||'error'),context:String(context||'runtime'),message:message.slice(0,500)};
  diagnostics.push(entry);if(diagnostics.length>30)diagnostics.shift();
  console.error('CATLAK_RUNTIME',entry,error);
  window.dispatchEvent(new CustomEvent('catlak:runtime-error',{detail:entry}));
  return entry;
}
window.__catlakReportError=(context,error)=>report('handled',error,context);
window.addEventListener('error',e=>{if(e?.message)report('error',e.error||e.message,'window')});
window.addEventListener('unhandledrejection',e=>report('promise',e?.reason,'promise'));
window.addEventListener('catlak:data-refreshed',finishNavSwitch);
window.addEventListener('pageshow',()=>{finishNavSwitch();scan()});
window.addEventListener('focus',scan);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')scan()});
scan();
window.__catlakRuntimeDiagnostics={list:()=>diagnostics.slice(),clear:()=>{diagnostics.length=0},report};
window.__catlakRuntimeOwnership={claim,owner:surface=>owners.get(String(surface||''))||'',owns:(surface,owner)=>owners.get(String(surface||''))===String(owner||''),list:()=>Object.fromEntries(owners)};

const viewBatches=new Map(),viewCache=new Map(),viewPerf=[],viewStarted=new Map();
function viewBegin(surface){
  const key=String(surface||'');
  if(key){ROOT.dataset.ccViewTransition=key;viewStarted.set(key,performance.now())}
  ROOT.classList.add('cc-fast-nav-switch');
  navSwitchArmed=true;arm('cc-fast-nav-switch');
}
function viewReady(surface){
  const key=String(surface||''),current=String(ROOT.dataset.ccViewTransition||'');
  if(key&&viewStarted.has(key)){
    const ms=Math.max(0,Math.round(performance.now()-viewStarted.get(key)));
    viewStarted.delete(key);viewPerf.push({surface:key,ms,at:new Date().toISOString()});if(viewPerf.length>40)viewPerf.shift()
  }
  if(!key||!current||current===key){delete ROOT.dataset.ccViewTransition;finishNavSwitch()}
}
function viewBatch(key,fn,delay=70){
  const k=String(key||'default'),old=viewBatches.get(k);if(old)clearTimeout(old);
  const id=setTimeout(()=>{viewBatches.delete(k);try{fn()}catch(e){report('batch',e,k)}},Math.max(0,Number(delay)||0));
  viewBatches.set(k,id);return id;
}
function viewCacheSet(key,html){if(key&&typeof html==='string')viewCache.set(String(key),html)}
function viewCacheRestore(key,main){
  const html=viewCache.get(String(key||''));if(!html||!main)return false;main.innerHTML=html;return true
}
function viewMount(surface,main,html){
  if(!main||typeof html!=='string')return false;
  const tpl=document.createElement('template');tpl.innerHTML=html;
  main.replaceChildren(tpl.content.cloneNode(true));main.dataset.ccViewMount=String(surface||'');
  return true
}
window.__catlakViewRuntime={begin:viewBegin,ready:viewReady,batch:viewBatch,mount:viewMount,cache:viewCacheSet,restore:viewCacheRestore,has:key=>viewCache.has(String(key||''))};
window.__catlakRuntimePerformance={views:()=>viewPerf.slice(),slow:ms=>viewPerf.filter(x=>x.ms>=(Number(ms)||250)),clear:()=>{viewPerf.length=0}};
window.__catlakRuntimeHealthGuard={scan,clear:clearClass,finishNavSwitch};
})();