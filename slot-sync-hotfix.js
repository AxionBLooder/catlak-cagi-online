(()=>{
  const A=document.querySelector('#app');if(!A)return;
  let raf=0,paintTimer=0;
  const txt=e=>String(e?.textContent||'').trim();
  const isSheet=()=>txt(A.querySelector('.role'))!=='GM'&&A.querySelector('.nav button.on[data-tab]')?.dataset.tab==='sheet';
  const weaponCards=()=>[...A.querySelectorAll('main .iw-player-item[data-pla-inv-row]')].filter(card=>txt(card.querySelector('.tag'))==='SİLAH'||!!card.querySelector('[data-a="weapon"]'));
  function ensureCard(card){
    const actions=card.querySelector('.actions');if(!actions)return;
    const equip=actions.querySelector('button[data-a="equip"]');
    let controls=actions.querySelector('[data-ws-controls]');
    if(!controls){
      controls=document.createElement('div');
      controls.className='ws-slot-controls';controls.dataset.wsControls='1';
      controls.innerHTML='<button type="button" data-ws-slot="main_weapon">1. Yuvaya Ata</button><button type="button" data-ws-slot="off_weapon">2. Yuvaya Ata</button>';
      equip?actions.insertBefore(controls,equip):actions.prepend(controls);
    }else if(equip&&controls.nextElementSibling!==equip){
      actions.insertBefore(controls,equip);
    }
  }
  function ensure(){
    if(!isSheet())return;
    weaponCards().forEach(ensureCard);
    if(!A.querySelector('main [data-gmt-player-panel]'))window.gmtRenderPlayerPanels?.();
    clearTimeout(paintTimer);
    paintTimer=setTimeout(()=>window.__catlakWeaponSlotTest?.paint?.(false),60);
  }
  function queue(){
    if(raf)return;
    raf=requestAnimationFrame(()=>{raf=0;ensure()});
  }
  new MutationObserver(queue).observe(A,{childList:true,subtree:true});
  setInterval(()=>{if(isSheet())ensure()},2500);
  setTimeout(queue,0);
  window.__catlakSlotSyncHotfix={ensure,queue};
})();
