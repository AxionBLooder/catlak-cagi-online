(()=>{
  const A=document.querySelector('#app');
  const S=window.__catlakSupabase;
  if(!A||!S||window.__catlakWeaponDualActionsV1)return;

  const txt=e=>String(e?.textContent||'').trim();
  const isSheet=()=>txt(A.querySelector('.role'))!=='GM'&&A.querySelector('.nav button.on[data-tab]')?.dataset.tab==='sheet';
  const busy=new Set(),acted=new WeakMap(),local=new Map();
  let raf=0,syncTimer=0;

  if(!document.querySelector('#wdual-style')){
    const s=document.createElement('style');
    s.id='wdual-style';
    s.textContent=`
      #app main.ps-player-sheet .actions [data-psf-equip],
      #app main.ps-player-sheet .actions [data-psf-remove]{display:inline-flex!important;align-items:center!important;justify-content:center!important;min-width:82px!important;min-height:36px!important;border-radius:9px!important;font-weight:850!important}
      #app main.ps-player-sheet .actions [data-psf-equip]{border:1px solid #4d96d2!important;background:#123b5c!important;color:#e7f5ff!important}
      #app main.ps-player-sheet .actions [data-psf-remove]{border:1px solid #406985!important;background:#0b2233!important;color:#c8e7fb!important}
      #app main.ps-player-sheet .actions [data-psf-equip]:hover,
      #app main.ps-player-sheet .actions [data-psf-remove]:hover{border-color:#59adff!important;background:#0e2d45!important;color:#fff!important}
    `;
    document.head.appendChild(s);
  }

  const toast=x=>{const t=document.querySelector('#toast');if(!t)return;t.textContent=String(x);t.classList.remove('hidden');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.add('hidden'),2400)};
  const weaponCards=()=>isSheet()?[...A.querySelectorAll('main .iw-player-item[data-pla-inv-row]')].filter(c=>txt(c.querySelector('.tag'))==='SİLAH'||!!c.querySelector('[data-a="weapon"]')):[];
  const cardId=c=>String(c?.dataset.plaInvRow||'');
  const weaponName=c=>txt(c?.querySelector('h3')).replace(/\s+×\d+\s*$/,'').trim()||'Silah';
  const topSpan=slot=>A.querySelector(`main [data-gmt-slot="${slot}"] > span`);

  function setTop(slot,value){
    const e=topSpan(slot);if(!e)return;
    const v=value||'Boş';
    if(e.textContent!==v)e.textContent=v;
    e.classList.toggle('muted',!value);
  }
  function activeSlot(card){
    const id=cardId(card),l=local.get(id);if(l&&l.until>Date.now())return l.slot;
    const b=card?.querySelector('[data-ws-slot].ws-active');if(b)return b.dataset.wsSlot||'';
    const n=weaponName(card);
    if(txt(topSpan('main_weapon'))===n)return'main_weapon';
    if(txt(topSpan('off_weapon'))===n)return'off_weapon';
    return'';
  }
  function chooseSlot(card){
    const cur=activeSlot(card);if(cur)return cur;
    const m=txt(topSpan('main_weapon')),o=txt(topSpan('off_weapon'));
    if(!m||/^boş$/i.test(m))return'main_weapon';
    if(!o||/^boş$/i.test(o))return'off_weapon';
    return'main_weapon';
  }
  function ensureButtons(card){
    const actions=card?.querySelector('.actions');if(!actions)return;
    const id=cardId(card);if(!id)return;
    actions.querySelectorAll('button[data-a="equip"][data-pla-equip-kind="weapon"],button[data-ws-remove],[data-wlive-remove]').forEach(b=>b.remove());
    const controls=actions.querySelector('[data-ws-controls]');
    let equip=actions.querySelector('[data-psf-equip]');
    if(!equip){
      equip=document.createElement('button');equip.type='button';equip.dataset.psfEquip=id;equip.textContent='Kuşan';
      controls?controls.insertAdjacentElement('afterend',equip):actions.prepend(equip);
    }else{equip.dataset.psfEquip=id;if(equip.textContent!=='Kuşan')equip.textContent='Kuşan'}
    let remove=actions.querySelector('[data-psf-remove]');
    if(!remove){remove=document.createElement('button');remove.type='button';remove.dataset.psfRemove=id;remove.textContent='Çıkar';equip.insertAdjacentElement('afterend',remove)}
    else{remove.dataset.psfRemove=id;if(remove.textContent!=='Çıkar')remove.textContent='Çıkar';if(remove.previousElementSibling!==equip)equip.insertAdjacentElement('afterend',remove)}
  }
  function paint(card,slot){
    ensureButtons(card);
    const on=!!slot;if(card.classList.contains('on')!==on)card.classList.toggle('on',on);
    card.querySelectorAll('[data-ws-slot]').forEach(b=>{
      const hit=b.dataset.wsSlot===slot,n=b.dataset.wsSlot==='main_weapon'?'1. Yuvaya':'2. Yuvaya',label=hit?`✓ ${n} Atandı`:`${n} Ata`;
      if(b.classList.contains('ws-active')!==hit)b.classList.toggle('ws-active',hit);
      if(b.textContent!==label)b.textContent=label;
    });
    let badge=card.querySelector('.ws-slot-badge');
    if(slot){
      const label=slot==='main_weapon'?'1. YUVA':'2. YUVA';
      if(!badge){badge=document.createElement('span');badge.className='tag ws-slot-badge';card.querySelector('.tag')?.after(badge)}
      if(badge&&badge.textContent!==label)badge.textContent=label;
    }else badge?.remove();
  }
  function apply(card,slot){
    if(!card)return;
    const n=weaponName(card);
    if(slot){
      weaponCards().forEach(c=>{if(c!==card&&activeSlot(c)===slot)paint(c,'')});
      for(const k of['main_weapon','off_weapon'])if(k!==slot&&txt(topSpan(k))===n)setTop(k,'');
      paint(card,slot);setTop(slot,n);
    }else{
      paint(card,'');
      for(const k of['main_weapon','off_weapon'])if(txt(topSpan(k))===n)setTop(k,'');
    }
  }
  function remember(card,slot){
    const id=cardId(card);if(!id)return;
    if(slot)for(const [other,v] of local)if(other!==id&&v.slot===slot)local.delete(other);
    local.set(id,{slot,until:Date.now()+3500});
    apply(card,slot);
  }
  async function readSlot(id){
    const q=await S.from('catlak_inventory').select('equipped,equipped_slot').eq('id',id).maybeSingle();
    if(q.error)throw q.error;
    return q.data?.equipped?String(q.data.equipped_slot||''):'';
  }
  async function confirm(id,expected){
    for(let i=0;i<7;i++){
      const got=await readSlot(id);if(got===expected)return true;
      await new Promise(r=>setTimeout(r,70+i*45));
    }
    return false;
  }
  async function setSlot(card,slot){
    const id=cardId(card);if(!id||busy.has(id))return;
    const before=activeSlot(card);busy.add(id);remember(card,slot);
    try{
      const r=await S.rpc('catlak_set_equipped_slot',{p_inventory_id:id,p_slot:slot||null});
      if(r.error)throw r.error;
      if(!await confirm(id,slot))throw new Error(slot?'Silah kuşanma doğrulanamadı.':'Silah çıkarma doğrulanamadı.');
      remember(card,slot);
      toast(slot?'Silah kuşanıldı.':'Silah çıkarıldı.');
      setTimeout(async()=>{
        local.delete(id);
        try{apply(card,await readSlot(id))}catch(_){ }
        window.gmtRenderPlayerPanels?.();
      },1400);
    }catch(e){
      local.delete(id);apply(card,before);toast(e?.message||String(e));
    }finally{busy.delete(id)}
  }
  function own(e){
    if(!isSheet())return;
    const equip=e.target?.closest?.('[data-psf-equip]'),remove=e.target?.closest?.('[data-psf-remove]'),b=equip||remove;
    if(!b)return;
    const card=b.closest('.iw-player-item[data-pla-inv-row]');if(!card)return;
    e.preventDefault();e.stopImmediatePropagation();e.stopPropagation();
    if(e.type==='pointerdown'){
      acted.set(b,Date.now());setSlot(card,equip?chooseSlot(card):'');return;
    }
    const at=acted.get(b)||0;if(Date.now()-at<900)return;
    acted.set(b,Date.now());setSlot(card,equip?chooseSlot(card):'');
  }
  function scan(){
    if(!isSheet())return;
    weaponCards().forEach(card=>{
      ensureButtons(card);
      const l=local.get(cardId(card));if(l&&l.until>Date.now())apply(card,l.slot);
    });
  }
  async function syncVisible(){
    if(!isSheet())return;
    for(const card of weaponCards()){
      const id=cardId(card),l=local.get(id);if(l&&l.until>Date.now()){apply(card,l.slot);continue}
      try{apply(card,await readSlot(id))}catch(_){ }
    }
  }
  function queue(){if(raf)return;raf=requestAnimationFrame(()=>{raf=0;scan()})}
  window.addEventListener('pointerdown',own,true);
  window.addEventListener('click',own,true);
  new MutationObserver(queue).observe(A,{childList:true,subtree:true});
  S.channel('cc-weapon-dual-actions-v1').on('postgres_changes',{event:'*',schema:'public',table:'catlak_inventory'},()=>{clearTimeout(syncTimer);syncTimer=setTimeout(syncVisible,80)}).subscribe();
  setTimeout(()=>{scan();syncVisible()},100);
  setInterval(scan,1800);
  window.__catlakWeaponDualActionsV1={scan,setSlot,syncVisible};
})();
