const GMCI_APP=document.querySelector('#app');
if(!GMCI_APP)throw new Error('GM Merkezi araç entegrasyonu başlatılamadı.');

const GMCI_TOOLS=[
  ['combat','Savaş & Durumlar'],
  ['events','Olay Atölyesi'],
  ['logs','Oturum Günlüğü']
];
let gmciActive='';
let gmciOpening=false;
let gmciToken=0;
let gmciQueued=false;

function gmciIsGM(){return String(GMCI_APP.querySelector('.role')?.textContent||'').trim()==='GM'}
function gmciToast(x){const t=document.querySelector('#toast');if(!t)return;t.textContent=String(x);t.classList.remove('hidden');clearTimeout(gmciToast.t);gmciToast.t=setTimeout(()=>t.classList.add('hidden'),4200)}
function gmciBar(){return GMCI_APP.querySelector('[data-gm2-centerbar]')}
function gmciShell(){return GMCI_APP.querySelector('main .gmt-shell')}
function gmciLegacyTab(sub){return GMCI_APP.querySelector(`main .gmt-tabs [data-gmt-sub="${CSS.escape(String(sub))}"]`)}

function gmciHideLegacyHeader(){
  if(window.__catlakGmHubOwnsMain===true||GMCI_APP.querySelector('[data-gm2-ability-page]'))return;
  const tabs=GMCI_APP.querySelector('main .gmt-tabs');
  const card=tabs?.closest('section.card');
  if(card){card.hidden=true;card.dataset.gmciLegacyHeader='1'}
}

function gmciEnsureButtons(){
  if(!gmciIsGM())return;
  const bar=gmciBar();if(!bar)return;
  for(const [sub,label] of GMCI_TOOLS){
    let b=bar.querySelector(`[data-gmci-tool="${sub}"]`);
    if(!b){
      b=document.createElement('button');
      b.type='button';
      b.dataset.gmciTool=sub;
      b.textContent=label;
      const before=bar.querySelector('[data-gm2-route="creatures"]');
      before?bar.insertBefore(b,before):bar.appendChild(b);
    }else if(b.textContent!==label)b.textContent=label;
    b.classList.toggle('on',gmciActive===sub);
  }
}

function gmciSetActive(sub){
  gmciActive=sub||'';
  gmciEnsureButtons();
}

function gmciFinishOpen(sub,token){
  if(token!==gmciToken||!gmciIsGM())return;
  const tab=gmciLegacyTab(sub);
  if(!tab)return false;
  if(!tab.classList.contains('on'))tab.click();
  gmciSetActive(sub);
  gmciOpening=false;
  requestAnimationFrame(()=>{gmciHideLegacyHeader();gmciEnsureButtons()});
  return true;
}

function gmciOpen(sub){
  if(!gmciIsGM()||!GMCI_TOOLS.some(([k])=>k===sub))return false;
  if(gmciOpening&&gmciActive===sub)return true;
  const token=++gmciToken;
  gmciOpening=true;
  gmciSetActive(sub);
  window.__catlakCreatureLibraryOpen=false;
  if(window.__catlakGmHubOwnsMain===true)window.__catlakGmHubV2Test?.release?.();

  const ready=()=>{
    if(token!==gmciToken||!gmciIsGM())return;
    if(gmciFinishOpen(sub,token))return;
    const open=GMCI_APP.querySelector('.nav [data-gmt-open]');
    if(!open){gmciOpening=false;gmciToast('GM Merkezi yükleyicisi bulunamadı.');return}
    if(window.__catlakGmToolsOpen!==true||!gmciShell())open.click();
    let tries=0;
    const wait=()=>{
      if(token!==gmciToken)return;
      if(gmciFinishOpen(sub,token))return;
      if(++tries<30)setTimeout(wait,25);
      else{gmciOpening=false;gmciToast('GM aracı açılırken beklenmeyen bir gecikme oluştu.')}
    };
    setTimeout(wait,0);
  };
  ready();
  return true;
}

window.addEventListener('click',e=>{
  const tool=e.target.closest?.('#app [data-gmci-tool]');
  if(tool&&gmciIsGM()){
    e.preventDefault();e.stopImmediatePropagation();
    const sub=String(tool.dataset.gmciTool||'');
    if(gmciActive===sub&&window.__catlakGmToolsOpen===true&&gmciLegacyTab(sub)?.classList.contains('on'))return;
    gmciOpen(sub);
    return;
  }

  const other=e.target.closest?.('#app [data-gm2-route],#app .nav button,#app .gmt-tabs [data-gmt-sub]');
  if(other&&!other.matches?.('[data-gmci-tool]')){
    if(other.matches?.('[data-gmt-sub]')&&window.__catlakGmHubOwnsMain!==true){
      const sub=String(other.dataset.gmtSub||'');
      if(GMCI_TOOLS.some(([k])=>k===sub))gmciSetActive(sub);
    }else if(!other.matches?.('[data-gmt-open]')){
      gmciSetActive('');
      gmciToken++;
      gmciOpening=false;
    }
  }
},true);

function gmciMaintain(){
  gmciQueued=false;
  gmciEnsureButtons();
  if(window.__catlakGmHubOwnsMain===true||GMCI_APP.querySelector('[data-gm2-ability-page]')){
    if(gmciActive)gmciSetActive('');
    return;
  }
  if(window.__catlakGmToolsOpen===true){
    const on=GMCI_APP.querySelector('main .gmt-tabs [data-gmt-sub].on');
    const sub=String(on?.dataset.gmtSub||'');
    if(GMCI_TOOLS.some(([k])=>k===sub)&&gmciActive!==sub)gmciSetActive(sub);
    gmciHideLegacyHeader();
  }
}
function gmciQueue(){if(gmciQueued)return;gmciQueued=true;requestAnimationFrame(gmciMaintain)}

new MutationObserver(gmciQueue).observe(GMCI_APP,{childList:true,subtree:true});
setTimeout(gmciMaintain,0);
setTimeout(gmciMaintain,250);
window.__catlakGmCenterTools={open:gmciOpen,maintain:gmciMaintain,active:()=>gmciActive};
