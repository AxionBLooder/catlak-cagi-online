(function(){
'use strict';
if(window.__catlakRuntimeExperienceV1)return;
window.__catlakRuntimeExperienceV1=true;

const APP=document.getElementById('app');
const TOAST=document.getElementById('toast');
if(!APP)return;

let realtimeStatus='UNKNOWN',hadConnectionIssue=!navigator.onLine,hideTimer=0,connectTimer=0;
const badRealtime=new Set(['CHANNEL_ERROR','TIMED_OUT','CLOSED']);

function toast(message,ms=4200){
  const t=document.getElementById('toast');if(!t)return;
  t.setAttribute('role','status');t.setAttribute('aria-live','polite');t.setAttribute('aria-atomic','true');
  t.textContent=String(message);t.classList.remove('hidden');
  clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.add('hidden'),ms);
}
function ensureA11y(){
  const t=document.getElementById('toast');
  if(t){
    t.setAttribute('role','status');
    t.setAttribute('aria-live','polite');
    t.setAttribute('aria-atomic','true');
  }
}
function ensureStyle(){
  if(document.getElementById('cc-runtime-experience-style'))return;
  const s=document.createElement('style');s.id='cc-runtime-experience-style';s.textContent=`
    #cc-connection-state{position:fixed;right:14px;bottom:14px;z-index:2147483000;display:flex;align-items:center;gap:8px;max-width:min(420px,calc(100vw - 28px));padding:9px 12px;border:1px solid #36536e;border-radius:999px;background:#081522ee;color:#dbe9f5;box-shadow:0 10px 30px #0008;backdrop-filter:blur(8px);font:700 12px/1.2 Inter,system-ui,Segoe UI,Arial,sans-serif;letter-spacing:.02em;pointer-events:none}
    #cc-connection-state[hidden]{display:none!important}
    #cc-connection-state::before{content:'';width:8px;height:8px;border-radius:50%;background:#8fa4b6;box-shadow:0 0 0 3px #8fa4b61c;flex:0 0 auto}
    #cc-connection-state[data-state="ok"]{border-color:#356a54;color:#b9f1d2;background:#0b241cee}
    #cc-connection-state[data-state="ok"]::before{background:#70dfa5;box-shadow:0 0 0 3px #70dfa522}
    #cc-connection-state[data-state="warn"]{border-color:#80652e;color:#f3d58d;background:#241d0fee}
    #cc-connection-state[data-state="warn"]::before{background:#e3b956;box-shadow:0 0 0 3px #e3b95622}
    #cc-connection-state[data-state="bad"]{border-color:#84434c;color:#ffc1c8;background:#2a1115ee}
    #cc-connection-state[data-state="bad"]::before{background:#ff7f8e;box-shadow:0 0 0 3px #ff7f8e22}
    #app button:focus-visible,#app a:focus-visible,#app input:focus-visible,#app select:focus-visible,#app textarea:focus-visible{outline:2px solid var(--cyan,#69d7ff)!important;outline-offset:2px!important}
    #toast{max-width:min(620px,calc(100vw - 28px));overflow-wrap:anywhere}
    @media(max-width:620px){#cc-connection-state{left:10px;right:10px;bottom:10px;max-width:none;justify-content:center;border-radius:12px}}
    @media(prefers-reduced-motion:reduce){#cc-connection-state,#toast{transition:none!important}}
  `;document.head.appendChild(s);
}
function statusNode(){
  let el=document.getElementById('cc-connection-state');
  if(!el){
    el=document.createElement('div');el.id='cc-connection-state';el.hidden=true;
    el.setAttribute('role','status');el.setAttribute('aria-live','polite');el.setAttribute('aria-atomic','true');
    document.body.appendChild(el);
  }
  return el;
}
function showState(state,text,autoHide=0){
  const el=statusNode();clearTimeout(hideTimer);el.dataset.state=state;el.textContent=text;el.hidden=false;
  if(autoHide>0)hideTimer=setTimeout(()=>{el.hidden=true},autoHide);
}
function onlineState(){
  clearTimeout(connectTimer);
  if(!navigator.onLine){
    hadConnectionIssue=true;
    showState('bad','Çevrimdışı • veri değiştiren işlemler durduruldu');
    return;
  }
  const s=String(realtimeStatus||'').toUpperCase();
  if(badRealtime.has(s)){
    hadConnectionIssue=true;
    showState('bad','Canlı bağlantı koptu • yeniden bağlanılıyor');
    return;
  }
  if(s==='CONNECTING'){
    clearTimeout(connectTimer);
    connectTimer=setTimeout(()=>showState('warn','Canlı bağlantı kuruluyor…'),1200);
    return;
  }
  if(s==='SUBSCRIBED'){
    if(hadConnectionIssue){
      hadConnectionIssue=false;
      showState('ok','Canlı bağlantı geri geldi',1800);
    }else statusNode().hidden=true;
    return;
  }
  if(hadConnectionIssue)showState('warn','Bağlantı kontrol ediliyor…');
}
function mutationAction(button){
  if(!button||!APP.contains(button))return false;
  if(button.closest('.nav')||button.matches('[data-tab],[data-ccr-battle],[data-cc-hard-race-nav],[data-ccr-hub],[data-ccr-hub-tab],[data-gmc-route],[data-gmc-open],[data-gmt-route],[data-gmt-open]'))return false;
  if(button.matches('[data-br3-strike],[data-br3-use],[data-br3-hp-change],[data-br3-end-turn],[data-br3-clear-log]'))return true;
  if(button.matches('[data-cc-hard-hp],[data-cc-hard-stat],[data-cc-hard-weapon],[data-cc-hard-long-rest],[data-cc-hard-ability],[data-cc-hard-equip],[data-cc-hard-slot],[data-cc-hard-vkp]'))return true;
  const ga=String(button.dataset?.gmcAction||'');
  if(['ability-save','ability-delete','ability-assign','ability-unassign','char-level','char-hp','char-note','char-delete','char-invite'].includes(ga))return true;
  if(button.matches('[data-lcc-start],[data-lcc-add-char],[data-lcc-add-enemy],[data-lcc-add-creature],[data-lcc-creature-attack],[data-lcc-hp-change],[data-lcc-init-roll],[data-lcc-end-turn],[data-lcc-end-combat],[data-lcc-cond-add],[data-lcc-cond-remove]'))return true;
  if(button.matches('[data-er-roll],[data-er-clear],[data-er-delete-roll]'))return true;
  if(button.matches('[data-sw-upload],[data-sw-delete],[data-sw-party]'))return true;
  return false;
}

ensureStyle();ensureA11y();statusNode();onlineState();

window.addEventListener('online',()=>{onlineState();toast('İnternet bağlantısı geri geldi.',2200)});
window.addEventListener('offline',()=>{hadConnectionIssue=true;onlineState();toast('İnternet bağlantısı kesildi. Veri değiştiren işlemler geçici olarak durduruldu.',5200)});
window.addEventListener('catlak:realtime-status',e=>{realtimeStatus=String(e.detail?.status||'UNKNOWN').toUpperCase();onlineState()});

window.addEventListener('click',e=>{
  if(navigator.onLine)return;
  const button=e.target?.closest?.('button,[role="button"]');
  if(!mutationAction(button))return;
  e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
  toast('Bağlantı yok. İşlem gönderilmedi; internet geldiğinde tekrar dene.',5200);
},true);

const toastObserver=new MutationObserver(ensureA11y);
if(TOAST)toastObserver.observe(TOAST,{attributes:true,childList:true,characterData:true,subtree:true});

window.__catlakRuntimeExperience={
  state:()=>({online:navigator.onLine,realtime:realtimeStatus,hadConnectionIssue}),
  refresh:onlineState,
  toast
};
})();