(()=>{
  if(window.__catlakGmCenterLiveRuntimeV1)return;
  window.__catlakGmCenterLiveRuntimeV1=true;
  const A=document.querySelector('#app');if(!A)return;
  const ROUTES=new Set(['ability','items','stats','races','builder','combat','events','logs','creatures','characters']);
  const txt=e=>String(e?.textContent||'').trim();
  let route='',epoch=0,started=0,lastMut=0,protectUntil=0,showTimer=0,reasserts=0,wasShown=false;

  if(!document.querySelector('#gm-live-route-style')){
    const s=document.createElement('style');s.id='gm-live-route-style';s.textContent=`
      #app.gm-live-switching > main{visibility:hidden!important}
      #app.gm-live-switching [data-gm2-centerbar]{opacity:1!important;visibility:visible!important;pointer-events:auto!important}
    `;document.head.appendChild(s)
  }

  const barRoute=()=>String(A.querySelector('[data-gm2-centerbar] [data-gm2-route].on')?.dataset.gm2Route||window.__catlakGmCenterSelectedRoute||'');
  const main=()=>A.querySelector(':scope > main')||A.querySelector('main');
  function isGM(){return txt(A.querySelector('.role'))==='GM'||!!A.querySelector('[data-gm2-centerbar]')}
  function nativeOn(r){if(r==='stats')return !!A.querySelector('.nav [data-cc-stats-tab].on');return !!A.querySelector(`.nav button.on[data-tab="${r}"]`)}
  function markerReady(r){
    const m=main();if(!m)return false;
    if(r==='ability')return !!m.querySelector('[data-gm2-ability-page]');
    if(r==='combat')return window.__catlakGmTools?.active?.()==='combat'||/SAVAŞ \/ İNİSİYATİF|SAVAŞ & DURUMLAR/i.test(txt(m));
    if(r==='events')return window.__catlakGmTools?.active?.()==='events'||/OLAY TABLOSU ATÖLYESİ|OLAY ATÖLYESİ/i.test(txt(m));
    if(r==='logs')return window.__catlakGmTools?.active?.()==='logs'||/OTURUM GÜNLÜĞÜ/i.test(txt(m));
    if(r==='creatures')return !!m.querySelector('[data-cex-gm-panel]')||(window.__catlakCreatureLibraryOpen===true&&/YARATIK/i.test(txt(m)));
    if(['items','stats','races','builder','characters'].includes(r))return m.dataset.gm2Route===r||nativeOn(r);
    return true
  }
  function hide(){if(!isGM())return;A.classList.add('gm-live-switching')}
  function show(){A.classList.remove('gm-live-switching');wasShown=true}
  function scheduleCheck(delay=30){clearTimeout(showTimer);const e=epoch;showTimer=setTimeout(()=>check(e),delay)}
  function check(e){
    if(e!==epoch||!route)return;
    const now=performance.now(),quiet=now-lastMut;
    if((markerReady(route)&&quiet>=85&&now-started>=35)||now-started>1100){show();return}
    hide();scheduleCheck(Math.max(20,90-quiet))
  }
  function begin(r){
    if(!ROUTES.has(r)||!isGM())return;
    route=r;epoch++;started=performance.now();lastMut=started;protectUntil=started+950;reasserts=0;wasShown=false;hide();scheduleCheck(45)
  }
  function reassert(){
    if(!route||reasserts>=1)return;
    reasserts++;
    const go=window.__catlakGmCenterRouterCore?.route;
    if(typeof go==='function')setTimeout(()=>{if(route===barRoute())go(route)},0)
  }

  const obs=new MutationObserver(list=>{
    if(!isGM())return;
    const r=barRoute();
    if(ROUTES.has(r)&&r!==route){begin(r);return}
    if(!route||r!==route)return;
    const m=main(),now=performance.now();
    const touchedMain=list.some(x=>m&&(x.target===m||m.contains(x.target)||[...x.addedNodes,...x.removedNodes].some(n=>n===m||(n.nodeType===1&&m.contains(n)))));
    if(!touchedMain)return;
    lastMut=now;
    if(now<protectUntil){
      if(wasShown&&now-started>120&&!markerReady(route))reassert();
      hide();scheduleCheck(90)
    }
  });
  obs.observe(A,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
  setInterval(()=>{const r=barRoute();if(ROUTES.has(r)&&r!==route)begin(r)},250);
  setTimeout(()=>{const r=barRoute();if(ROUTES.has(r))begin(r)},0);
  window.__catlakGmCenterLiveRuntime={begin,current:()=>route,ready:()=>markerReady(route)}
})();
