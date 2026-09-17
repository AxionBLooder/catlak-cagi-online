(function(){
  'use strict';
  if(window.__catlakPartyStatUiFixV2)return;
  window.__catlakPartyStatUiFixV2=true;

  const APP=document.querySelector('#app');
  if(!APP)return;

  const txt=e=>String(e?.textContent||'').trim();
  const isGM=()=>txt(APP.querySelector('.role'))==='GM';
  const statActive=()=>{
    try{if(window.__catlakStatWorkshopRouteFix?.active?.())return true}catch(_){ }
    const main=APP.querySelector('main');
    return !!(main?.querySelector('.cux-workshop,[data-cux-editor]')||main?.dataset?.gm2Route==='stats'||APP.querySelector('.nav [data-cc-stats-tab].on'));
  };

  let navQueued=false;
  function ensurePartyButton(){
    navQueued=false;
    const nav=APP.querySelector('.nav');
    if(!nav)return;
    if(!isGM()){
      nav.querySelector('[data-prh-manager]')?.remove();
      return;
    }
    let b=nav.querySelector('[data-prh-manager]');
    if(!b){
      b=document.createElement('button');
      b.type='button';
      b.dataset.prhManager='1';
      b.textContent='Parti Yönetimi';
      b.title='Parti Yönetimi odasını aç';
      const anchor=nav.querySelector('[data-gmt-open]')||nav.querySelector('[data-cc-stats-tab]');
      anchor?anchor.insertAdjacentElement('afterend',b):nav.appendChild(b);
    }
  }
  function scheduleNav(){
    if(navQueued)return;
    navQueued=true;
    requestAnimationFrame(ensurePartyButton);
  }

  function leaveStatsForParty(){
    if(!isGM())return;
    const nav=APP.querySelector('.nav');
    nav?.querySelector('[data-cc-stats-tab]')?.classList.remove('on');
    window.__catlakGmCenterSelectedRoute='';

    const main=APP.querySelector('main');
    if(main){
      delete main.dataset.gm2Route;
      delete main.dataset.cuxRoute;
      delete main.dataset.cuxPage;
      if(main.querySelector('.cux-workshop,[data-cux-editor]')){
        if(typeof window.__catlakRouteLoading==='function')window.__catlakRouteLoading('Parti Yönetimi');
        else main.innerHTML='<section class="card"><div class="eyebrow">GM</div><h2>Parti Yönetimi açılıyor…</h2></section>';
      }
    }
  }

  let selectToken=0;
  function editorId(){
    return String(APP.querySelector('[data-cux-editor]')?.dataset?.cuxEditor||'');
  }
  function selectedId(){
    try{return String(window.__catlakStatsTest?.selected?.()||'')}catch(_){return ''}
  }
  function forceStatCharacter(id){
    id=String(id||'');
    if(!id||!isGM()||!statActive())return false;
    const token=++selectToken;
    let attempts=0;

    const run=()=>{
      if(token!==selectToken)return;
      const api=window.__catlakStatsTest;
      if(!api||typeof api.select!=='function'){
        if(++attempts<20)setTimeout(run,35);
        return;
      }
      try{api.select(id)}catch(e){console.warn('PSUF stat select',e)}
      requestAnimationFrame(()=>{
        if(token!==selectToken)return;
        if(selectedId()===id&&editorId()===id)return;
        if(++attempts<4){setTimeout(run,25);return}
        if(typeof api.render==='function'){
          Promise.resolve(api.render(true)).then(()=>{
            if(token!==selectToken)return;
            try{api.select(id)}catch(_){ }
          }).catch(e=>console.warn('PSUF stat redraw',e));
        }
      });
    };
    run();
    return true;
  }

  window.addEventListener('pointerdown',e=>{
    const party=e.target.closest?.('#app [data-prh-manager]');
    if(party&&isGM()){
      leaveStatsForParty();
      scheduleNav();
      return;
    }
  },true);

  window.addEventListener('click',e=>{
    const c=e.target.closest?.('#app [data-cux-character]');
    if(c&&isGM()&&statActive()){
      e.preventDefault();
      e.stopImmediatePropagation();
      forceStatCharacter(c.dataset.cuxCharacter);
      return;
    }
  },true);

  new MutationObserver(records=>{
    for(const r of records){
      const target=r.target?.nodeType===1?r.target:null;
      if(target?.closest?.('.nav')){scheduleNav();return}
      for(const n of r.addedNodes){
        if(n.nodeType!==1)continue;
        if(n.matches?.('.nav,.role')||n.querySelector?.('.nav,.role')){scheduleNav();return}
      }
    }
  }).observe(APP,{childList:true,subtree:true});

  APP.addEventListener('click',e=>{
    if(e.target.closest?.('.nav button'))setTimeout(ensurePartyButton,0);
  },false);

  setTimeout(ensurePartyButton,80);
  setTimeout(ensurePartyButton,350);
  setTimeout(ensurePartyButton,1200);

  window.__catlakPartyStatUiFix={version:2,ensurePartyButton,forceStatCharacter,leaveStatsForParty};
})();
