const RSP_APP=document.querySelector('#app');
if(!RSP_APP)throw new Error('Sekme rota koruması başlatılamadı.');

let rspLastKey='';
let rspLastAt=0;

function rspKey(el){
  if(!el)return'';
  if(el.matches?.('[data-gmci-tool]'))return'gm-tool:'+String(el.dataset.gmciTool||'');
  if(el.matches?.('[data-gm2-route]'))return'gm:'+String(el.dataset.gm2Route||'');
  if(el.matches?.('[data-cc-stats-tab]'))return'nav:stats';
  if(el.matches?.('[data-cc-world-tab]'))return'nav:world';
  if(el.matches?.('[data-cc-map-tab]'))return'nav:map';
  if(el.matches?.('[data-ccr-battle]'))return'nav:battle';
  if(el.matches?.('[data-gmt-open]'))return'nav:gm-center';
  if(el.matches?.('[data-gmt-sub]'))return'gm-sub:'+String(el.dataset.gmtSub||'');
  if(el.matches?.('button[data-tab]'))return'nav:'+String(el.dataset.tab||'');
  return'';
}

function rspRouteTarget(target){
  return target?.closest?.('#app [data-gmci-tool],#app [data-gm2-route],#app .nav button,#app .gmt-tabs [data-gmt-sub],#app [data-ccr-battle]')||null;
}
function rspMain(){return RSP_APP.querySelector('main')}
function rspCustomOpen(){return !!(window.__catlakPartyRoomOwnsMain||window.__catlakCampaignStateRoom||window.__catlakCreatureLibraryOpen||window.__catlakGmCenterSelectedRoute||window.__catlakBattleRoomOpen)}
function rspIsActive(el){
  if(!el)return false;const m=rspMain();
  if(el.matches?.('[data-gm2-route]'))return String(window.__catlakGmCenterSelectedRoute||'')===String(el.dataset.gm2Route||'');
  if(el.matches?.('[data-gmci-tool]'))return !!el.classList?.contains('on')&&!!m?.querySelector('[data-gmci-page], [data-gmci-panel]');
  if(el.matches?.('[data-cc-map-tab]'))return m?.dataset.ccMapPage==='1';
  if(el.matches?.('[data-cc-world-tab]'))return m?.dataset.swPage==='gallery';
  if(el.matches?.('[data-cc-stats-tab]'))return m?.dataset.gm2Route==='stats'||!!m?.querySelector('.cux-workshop,[data-cux-editor]');
  if(el.matches?.('[data-ccr-battle]'))return window.__catlakBattleRoomOpen===true||m?.dataset.ccrBattle==='1'||!!m?.querySelector('.ccr-battle-grid');
  if(el.matches?.('[data-gmt-open]')){try{return !!window.__catlakGmCenterRouterCore?.centerOpen?.()}catch{return !!RSP_APP.querySelector('[data-gm2-centerbar]')}}
  if(el.matches?.('[data-gmt-sub]'))return m?.dataset.gmtSub===String(el.dataset.gmtSub||'');
  if(el.matches?.('button[data-tab]')){
    if(!el.classList?.contains('on')||rspCustomOpen())return false;
    const ons=[...RSP_APP.querySelectorAll('.nav button.on')].filter(x=>x.offsetParent!==null);
    const tab=String(el.dataset.tab||'');
    if(tab==='sheet')return ons.length===1&&(m?.classList.contains('ps-player-sheet')||!!m?.querySelector('.cc-character-stack,.ps-sheet-empty'));
    if(tab==='gm')return ons.length===1&&(m?.dataset.ccSimpleLive==='1'||!!m?.querySelector('[data-lcc-board],.cc-live-two'));
    return ons.length===1&&ons[0]===el;
  }
  return false;
}

function rspBlock(e){
  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();
}

function rspDirectGmRoute(el,e){
  const route=String(el.dataset.gm2Route||'');
  const go=window.__catlakGmHubV2Test?.route;
  if(!route||typeof go!=='function')return false;
  rspBlock(e);
  go(route);
  return true;
}

window.addEventListener('click',e=>{
  if(!e.isTrusted)return;
  const el=rspRouteTarget(e.target);if(!el)return;
  const key=rspKey(el);if(!key)return;
  const now=performance.now();

  // Sadece gerçekten açık olan ekranı tekrar tıklamayı engelle.
  // Eski/stale .on sınıfları artık geçişi kilitlemez.
  if(rspIsActive(el)){
    rspBlock(e);
    return;
  }

  if(key===rspLastKey&&now-rspLastAt<260){
    rspBlock(e);
    return;
  }

  rspLastKey=key;
  rspLastAt=now;
  try{window.__catlakGlobalTransition?.begin?.(el)}catch(_){ }

  if(el.matches?.('[data-gm2-route]'))rspDirectGmRoute(el,e);
},true);

window.__catlakRouteStability={
  key:rspKey,
  active:rspIsActive,
  reset:()=>{rspLastKey='';rspLastAt=0}
};
