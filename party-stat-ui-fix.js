(function(){
  'use strict';
  if(window.__catlakPartyStatUiFixV1)return;
  window.__catlakPartyStatUiFixV1=true;

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
    if(!statActive())return;
    const nav=APP.querySelector('.nav');
    nav?.querySelector('[data-cc-stats-tab]')?.classList.remove('on');
    const main=APP.querySelector('main');
    if(main){
      delete main.dataset.gm2Route;
      delete main.dataset.cuxRoute;
      if(main.querySelector('.cux-workshop,[data-cux-editor]')){
        if(typeof window.__catlakRouteLoading==='function')window.__catlakRouteLoading('Parti Yönetimi');
        else main.innerHTML='<section class="card"><div class="eyebrow">GM</div><h2>Parti Yönetimi açılıyor…</h2></section>';
      }
    }
    window.__catlakGmCenterSelectedRoute='';
  }

  let selectToken=0;
  function editorMatches(id){
    const api=window.__catlakStatsTest;
    let selected='';
    try{selected=String(api?.selected?.()||'')}catch(_){ }
    const editor=APP.querySelector('[data-cux-editor]');
    const editorId=String(editor?.dataset?.cuxEditor||'');
    return selected===String(id)&&(editorId===String(id)||!!APP.querySelector(`[data-cux-editor="${CSS.escape(String(id))}"]`));
  }

  function forceStatCharacter(id){
    id=String(id||'');
    if(!id||!isGM())return;
    const token=++selectToken;
    let attempts=0;

    const run=()=>{
      if(token!==selectToken||!APP.querySelector('[data-cux-character]'))return;
      const api=window.__catlakStatsTest;
      if(!api||typeof api.select!=='function'){
        if(++attempts<18)setTimeout(run,45);
        return;
      }
      try{api.select(id)}catch(e){console.warn('PSUF stat select',e)}
      requestAnimationFrame(()=>{
        if(token!==selectToken||editorMatches(id))return;
        if(++attempts<3){setTimeout(run,35);return}
        if(typeof api.render==='function'){
          Promise.resolve(api.render(true)).then(()=>{
            if(token!==selectToken)return;
            try{api.select(id)}catch(_){ }
          }).catch(e=>console.warn('PSUF stat redraw',e));
        }
      });
    };
    run();
  }

  window.addEventListener('pointerdown',e=>{
    const c=e.target.closest?.('#app [data-cux-character]');
    if(c)forceStatCharacter(c.dataset.cuxCharacter);
  },true);

  window.addEventListener('click',e=>{
    const party=e.target.closest?.('#app [data-prh-manager]');
    if(party&&isGM()){
      leaveStatsForParty();
      return;
    }
    const c=e.target.closest?.('#app [data-cux-character]');
    if(c)forceStatCharacter(c.dataset.cuxCharacter);
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

  setTimeout(ensurePartyButton,120);
  setTimeout(ensurePartyButton,600);
  setTimeout(ensurePartyButton,1600);

  window.__catlakPartyStatUiFix={ensurePartyButton,forceStatCharacter,leaveStatsForParty};
})();
