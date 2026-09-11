const RSP_APP=document.querySelector('#app');
if(!RSP_APP)throw new Error('Sekme rota koruması başlatılamadı.');

let rspLastKey='';
let rspLastAt=0;
let rspCrossLockUntil=0;
let rspDirectBusy=false;

function rspKey(el){
  if(!el)return'';
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
  return target?.closest?.('#app [data-gm2-route],#app .nav button,#app .gmt-tabs [data-gmt-sub],#app [data-ccr-battle]')||null;
}

function rspIsActive(el){
  if(!el)return false;
  if(el.classList?.contains('on'))return true;
  if(el.matches?.('[data-gm2-route]')){
    const active=RSP_APP.querySelector(`[data-gm2-route="${CSS.escape(String(el.dataset.gm2Route||''))}"].on`);
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
  if(!route||typeof go!=='function'||rspDirectBusy)return false;
  rspBlock(e);
  rspDirectBusy=true;
  try{go(route)}finally{setTimeout(()=>{rspDirectBusy=false},90)}
  return true;
}

window.addEventListener('click',e=>{
  // Programatik click'ler uygulamanın kendi rota zinciridir; onlara dokunmuyoruz.
  if(!e.isTrusted)return;
  const el=rspRouteTarget(e.target);
  if(!el)return;
  const key=rspKey(el);
  if(!key)return;

  const now=performance.now();

  // Açık olan sekmeye tekrar basınca gereksiz veri çekme / render başlatma.
  if(rspIsActive(el)){
    rspBlock(e);
    return;
  }

  // Aynı sekmeye hızlı tekrar basmayı tek isteğe indir.
  if(key===rspLastKey&&now-rspLastAt<700){
    rspBlock(e);
    return;
  }

  // Çok hızlı farklı sekme geçişlerinde eski async ekranın yenisini ezmesini önle.
  if(now<rspCrossLockUntil){
    rspBlock(e);
    return;
  }

  rspLastKey=key;
  rspLastAt=now;
  rspCrossLockUntil=now+120;

  // GM Merkezi için tek ve resmi rota fonksiyonunu kullan. Böylece aynı tıklamayı
  // dinleyen eski/uyumluluk katmanları ikinci kez ekran açmaya çalışmaz.
  if(el.matches?.('[data-gm2-route]'))rspDirectGmRoute(el,e);
},true);

window.__catlakRouteStability={
  key:rspKey,
  reset:()=>{rspLastKey='';rspLastAt=0;rspCrossLockUntil=0;rspDirectBusy=false}
};
