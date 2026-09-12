(()=>{
  const APP=document.querySelector('#app');
  if(!APP||window.__catlakPlayerEquipmentLocked)return;
  window.__catlakPlayerEquipmentLocked=true;

  const text=e=>String(e?.textContent||'').trim();
  const isPlayerSheet=()=>text(APP.querySelector('.role'))!=='GM'&&APP.querySelector('.nav button.on[data-tab]')?.dataset.tab==='sheet';
  const selectorParts=[
    'button[data-a="equip"]',
    '[data-psf-toggle]',
    '[data-psf-equip]',
    '[data-psf-remove]',
    '[data-ws-remove]',
    '[data-wlive-remove]',
    '[data-ws-slot]',
    '[data-ws-controls]'
  ];
  const selector=selectorParts.join(',');

  if(!document.querySelector('#player-equipment-lock-style')){
    const style=document.createElement('style');
    style.id='player-equipment-lock-style';
    style.textContent=selectorParts.map(part=>`#app main.ps-player-sheet ${part}`).join(',')+'{display:none!important;visibility:hidden!important;pointer-events:none!important}';
    document.head.appendChild(style);
  }

  let queued=false;
  function clean(){
    queued=false;
    if(!isPlayerSheet())return;
    const main=APP.querySelector('main');
    if(!main)return;
    main.querySelectorAll(selector).forEach(control=>control.remove());
  }
  function schedule(){
    if(queued)return;
    queued=true;
    queueMicrotask(clean);
  }

  new MutationObserver(schedule).observe(APP,{childList:true,subtree:true});
  APP.addEventListener('click',e=>{
    if(!isPlayerSheet()||!e.target?.closest?.(selector))return;
    e.preventDefault();
    e.stopImmediatePropagation();
  },true);
  schedule();
  window.__catlakPlayerEquipmentLock={clean,selector,isPlayerSheet};
})();
