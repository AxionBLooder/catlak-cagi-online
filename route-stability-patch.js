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

function rspIsActive(el){
  if(!el)return false;
  if(el.classList?.contains('on'))return true;
  if(el.matches?.('[data-gm2-route]')){
    const active=RSP_APP.querySelector(`[data-gm2-route="${CSS.escape(String(el.dataset.gm2Route||''))}"].on`);
    return active===el;
  }
  if(el.matches?.('[data-gmci-tool]')){
    const active=RSP_APP.querySelector(`[data-gmci-tool="${CSS.escape(String(el.dataset.gmciTool||''))}"].on`);
    return active===el;
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
  // Programatik click'ler uygulamanın kendi rota zinciridir; onları serbest bırak.
  if(!e.isTrusted)return;
  const el=rspRouteTarget(e.target);if(!el)return;
  const key=rspKey(el);if(!key)return;
  const now=performance.now();

  // Zaten açık olan sekmeye tekrar basmak ikinci sorgu/render başlatmasın.
  if(rspIsActive(el)){
    rspBlock(e);
    return;
  }

  // Sadece AYNI hedefte çok hızlı çift tıklamayı tekleştir.
  if(key===rspLastKey&&now-rspLastAt<380){
    rspBlock(e);
    return;
  }

  // Farklı sekmeler arasında artık zaman kilidi yok: tıklama anında işlenir.
  rspLastKey=key;
  rspLastAt=now;

  // GM Merkezi ana rotaları tek resmi fonksiyondan geçsin.
  // Yeni Savaş/Olay/Günlük düğmelerini kendi hızlı katmanı yönetir.
  if(el.matches?.('[data-gm2-route]'))rspDirectGmRoute(el,e);
},true);

window.__catlakRouteStability={
  key:rspKey,
  reset:()=>{rspLastKey='';rspLastAt=0}
};
