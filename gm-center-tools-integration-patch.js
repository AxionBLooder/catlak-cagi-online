const GMCI_APP=document.querySelector('#app');
if(!GMCI_APP)throw new Error('GM Merkezi araç entegrasyonu başlatılamadı.');

const GMCI_TOOLS=[
  ['combat','Savaş & Durumlar'],
  ['events','Olay Atölyesi'],
  ['logs','Oturum Günlüğü']
];
const GMCI_CACHE_PREFIX='catlak-gm-center-tool-fast-v2:';
const GMCI_CACHE_TTL=5*60*1000;
let gmciActive='';
let gmciOpening=false;
let gmciToken=0;
let gmciQueued=false;
let gmciCaptureTimer=0;
let gmciLastClickSub='';
let gmciLastClickAt=0;
const gmciMemoryCache=new Map();

function gmciIsGM(){return String(GMCI_APP.querySelector('.role')?.textContent||'').trim()==='GM'}
function gmciToast(x){const t=document.querySelector('#toast');if(!t)return;t.textContent=String(x);t.classList.remove('hidden');clearTimeout(gmciToast.t);gmciToast.t=setTimeout(()=>t.classList.add('hidden'),4200)}
function gmciBar(){return GMCI_APP.querySelector('[data-gm2-centerbar]')}
function gmciMain(){return GMCI_APP.querySelector('main')}
function gmciShell(){return GMCI_APP.querySelector('main .gmt-shell')}
function gmciLegacyTab(sub){return GMCI_APP.querySelector(`main .gmt-tabs [data-gmt-sub="${CSS.escape(String(sub))}"]`)}
function gmciValidSub(sub){return GMCI_TOOLS.some(([k])=>k===sub)}
function gmciCacheKey(sub){return GMCI_CACHE_PREFIX+sub}

function gmciLoadCache(sub){
  if(!gmciValidSub(sub))return null;
  const mem=gmciMemoryCache.get(sub);
  if(mem&&mem.html&&Date.now()-Number(mem.at||0)<GMCI_CACHE_TTL)return mem;
  try{
    const raw=sessionStorage.getItem(gmciCacheKey(sub));
    const parsed=raw?JSON.parse(raw):null;
    if(parsed&&parsed.html&&Date.now()-Number(parsed.at||0)<GMCI_CACHE_TTL){gmciMemoryCache.set(sub,parsed);return parsed}
  }catch(_){ }
  return null;
}

function gmciCapture(sub=gmciActive){
  if(!gmciValidSub(sub)||window.__catlakGmToolsOpen!==true||window.__catlakGmHubOwnsMain===true)return false;
  const main=gmciMain(),shell=gmciShell(),on=GMCI_APP.querySelector('main .gmt-tabs [data-gmt-sub].on');
  if(!main||!shell||String(on?.dataset.gmtSub||'')!==sub)return false;
  const html=main.innerHTML;
  if(!html||!main.dataset.gmtTools)return false;
  const previous=gmciLoadCache(sub);
  if(previous?.html===html)return true;
  const entry={html,at:Date.now()};
  gmciMemoryCache.set(sub,entry);
  try{sessionStorage.setItem(gmciCacheKey(sub),JSON.stringify(entry))}catch(_){ }
  return true;
}

function gmciQueueCapture(sub=gmciActive){
  clearTimeout(gmciCaptureTimer);
  if(!gmciValidSub(sub))return;
  gmciCaptureTimer=setTimeout(()=>gmciCapture(sub),180);
}

function gmciRestoreCache(sub){
  const entry=gmciLoadCache(sub),main=gmciMain();
  if(!entry||!main)return false;
  main.innerHTML=entry.html;
  main.dataset.gmtTools='1';
  const tabs=main.querySelector('.gmt-tabs'),card=tabs?.closest('section.card');
  if(card){card.hidden=true;card.dataset.gmciLegacyHeader='1'}
  return true;
}

function gmciClearCache(sub=''){
  const keys=sub&&gmciValidSub(sub)?[sub]:GMCI_TOOLS.map(([k])=>k);
  for(const k of keys){gmciMemoryCache.delete(k);try{sessionStorage.removeItem(gmciCacheKey(k))}catch(_){}}
}

function gmciHideLegacyHeader(){
  if(window.__catlakGmHubOwnsMain===true||GMCI_APP.querySelector('[data-gm2-ability-page]'))return;
  const tabs=GMCI_APP.querySelector('main .gmt-tabs'),card=tabs?.closest('section.card');
  if(card){card.hidden=true;card.dataset.gmciLegacyHeader='1'}
}

function gmciEnsureButtons(){
  if(!gmciIsGM())return;
  const bar=gmciBar();if(!bar)return;
  for(const [sub,label] of GMCI_TOOLS){
    let b=bar.querySelector(`[data-gmci-tool="${sub}"]`);
    if(!b){
      b=document.createElement('button');b.type='button';b.dataset.gmciTool=sub;b.textContent=label;
      const before=bar.querySelector('[data-gm2-route="creatures"]');
      before?bar.insertBefore(b,before):bar.appendChild(b);
    }else if(b.textContent!==label)b.textContent=label;
    b.classList.toggle('on',gmciActive===sub);
  }
}

function gmciSetActive(sub){gmciActive=gmciValidSub(sub)?sub:'';gmciEnsureButtons()}

function gmciSelectLegacySub(sub){
  const tab=gmciLegacyTab(sub);if(!tab)return false;
  if(!tab.classList.contains('on'))tab.click();
  return true;
}

function gmciFinishOpen(sub,token){
  if(token!==gmciToken||!gmciIsGM())return false;
  const tab=gmciLegacyTab(sub);if(!tab)return false;
  if(!tab.classList.contains('on'))tab.click();
  gmciSetActive(sub);gmciOpening=false;
  requestAnimationFrame(()=>{gmciHideLegacyHeader();gmciEnsureButtons();gmciQueueCapture(sub)});
  return true;
}

function gmciOpen(sub){
  if(!gmciIsGM()||!gmciValidSub(sub))return false;
  const now=performance.now();
  if(gmciLastClickSub===sub&&now-gmciLastClickAt<450)return true;
  gmciLastClickSub=sub;gmciLastClickAt=now;

  if(gmciActive===sub&&window.__catlakGmToolsOpen===true&&gmciLegacyTab(sub)?.classList.contains('on')){
    gmciHideLegacyHeader();return true;
  }

  const token=++gmciToken;
  gmciOpening=true;gmciSetActive(sub);
  window.__catlakCreatureLibraryOpen=false;
  if(window.__catlakGmHubOwnsMain===true)window.__catlakGmHubV2Test?.release?.();

  // Önce son başarılı görünümü anında getir. Ağ sorgusu bunun üstüne güncel veriyi yazar.
  gmciRestoreCache(sub);

  const open=GMCI_APP.querySelector('.nav [data-gmt-open]');
  if(!open){gmciOpening=false;gmciToast('GM Merkezi yükleyicisi bulunamadı.');return false}

  if(window.__catlakGmToolsOpen!==true)open.click();
  gmciSelectLegacySub(sub);

  let tries=0;
  const wait=()=>{
    if(token!==gmciToken||!gmciIsGM())return;
    if(gmciFinishOpen(sub,token))return;
    if(++tries<32)setTimeout(wait,20);
    else{gmciOpening=false;gmciToast('GM aracı açılırken beklenmeyen bir gecikme oluştu.')}
  };
  setTimeout(wait,0);
  return true;
}

window.addEventListener('click',e=>{
  const tool=e.target.closest?.('#app [data-gmci-tool]');
  if(tool&&gmciIsGM()){
    e.preventDefault();e.stopImmediatePropagation();
    gmciOpen(String(tool.dataset.gmciTool||''));
    return;
  }

  const other=e.target.closest?.('#app [data-gm2-route],#app .nav button,#app .gmt-tabs [data-gmt-sub]');
  if(other&&!other.matches?.('[data-gmci-tool]')){
    if(other.matches?.('[data-gmt-sub]')&&window.__catlakGmHubOwnsMain!==true){
      const sub=String(other.dataset.gmtSub||'');
      if(gmciValidSub(sub)){gmciSetActive(sub);gmciQueueCapture(sub)}
    }else if(!other.matches?.('[data-gmt-open]')){
      gmciSetActive('');gmciToken++;gmciOpening=false;
    }
  }
},true);

function gmciMaintain(){
  gmciQueued=false;gmciEnsureButtons();
  if(window.__catlakGmHubOwnsMain===true||GMCI_APP.querySelector('[data-gm2-ability-page]')){
    if(gmciActive)gmciSetActive('');
    return;
  }
  if(window.__catlakGmToolsOpen===true){
    const on=GMCI_APP.querySelector('main .gmt-tabs [data-gmt-sub].on');
    const sub=String(on?.dataset.gmtSub||'');
    if(gmciValidSub(sub)){
      if(gmciActive!==sub)gmciSetActive(sub);
      gmciHideLegacyHeader();gmciQueueCapture(sub);
    }
  }
}
function gmciQueue(){if(gmciQueued)return;gmciQueued=true;requestAnimationFrame(gmciMaintain)}

new MutationObserver(gmciQueue).observe(GMCI_APP,{childList:true,subtree:true});
setTimeout(gmciMaintain,0);setTimeout(gmciMaintain,250);
window.__catlakGmCenterTools={open:gmciOpen,maintain:gmciMaintain,active:()=>gmciActive,clearCache:gmciClearCache,capture:gmciCapture};
