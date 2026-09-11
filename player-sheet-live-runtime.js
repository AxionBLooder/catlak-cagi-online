(()=>{
  if(window.__catlakPlayerWeaponLiveV3)return;
  window.__catlakPlayerWeaponLiveV3=true;
  const A=document.querySelector('#app');if(!A)return;
  const txt=e=>String(e?.textContent||'').trim();
  const toast=x=>{const t=document.querySelector('#toast');if(!t)return;t.textContent=String(x);t.classList.remove('hidden');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.add('hidden'),2200)};

  if(!document.querySelector('#ps-live-blue-theme')){
    const st=document.createElement('style');st.id='ps-live-blue-theme';st.textContent=`
      #app main.ps-player-sheet{--gold:#59adff!important;--accent:#59adff!important}
      #app main.ps-player-sheet .eyebrow,#app main.ps-player-sheet .section-title .eyebrow,#app main.ps-player-sheet [data-gmt-player-panel] .eyebrow{color:#59adff!important}
      #app main.ps-player-sheet [data-gmt-player-panel] .gmt-slot{border-color:#315b79!important;background:#091b29!important;box-shadow:none!important}
      #app main.ps-player-sheet [data-gmt-player-panel] .gmt-slot b{color:#59adff!important}
      #app main.ps-player-sheet .iw-player-item.on{border-color:#4e96d3!important;box-shadow:inset 0 0 0 1px #59adff2b,0 0 18px #2c78b81c!important}
      #app main.ps-player-sheet .actions button[data-a="equip"][data-pla-equip-kind="weapon"],
      #app main.ps-player-sheet .actions button[data-ws-remove],
      #app main.ps-player-sheet .actions [data-wlive-remove]{display:none!important}
      #app main.ps-player-sheet .actions [data-psf-equip],#app main.ps-player-sheet .actions [data-psf-remove]{display:inline-flex!important;align-items:center!important;justify-content:center!important;min-width:82px!important;min-height:36px!important;border-radius:9px!important;font-weight:850!important}
      #app main.ps-player-sheet .actions [data-psf-equip]{border:1px solid #4d96d2!important;background:#123b5c!important;color:#e7f5ff!important}
      #app main.ps-player-sheet .actions [data-psf-remove]{border:1px solid #406985!important;background:#0b2233!important;color:#c8e7fb!important}
    `;document.head.appendChild(st)
  }

  let tries=0;
  function boot(){
    const S=window.__catlakSupabase;
    if(!S){if(tries++<300)setTimeout(boot,60);return}
    init(S)
  }

  function init(S){
    const pending=new Map(),busy=new Set(),acted=new WeakMap();
    let rows=new Map(),syncBusy=false,syncQueued=false,syncTimer=0,scanQueued=false;
    window.__catlakWeaponLivePending=pending;

    const isSheet=()=>txt(A.querySelector('.role'))!=='GM'&&A.querySelector('.nav button.on[data-tab]')?.dataset.tab==='sheet';
    const cards=()=>isSheet()?[...A.querySelectorAll('main .iw-player-item[data-pla-inv-row]')].filter(c=>txt(c.querySelector('.tag'))==='SİLAH'||!!c.querySelector('[data-a="weapon"]')):[];
    const id=c=>String(c?.dataset.plaInvRow||'');
    const name=c=>txt(c?.querySelector('h3')).replace(/\s+×\d+\s*$/,'').trim()||'Silah';
    const top=slot=>A.querySelector(`main [data-gmt-slot="${slot}"] > span`);
    const rowSlot=r=>r?.equipped?String(r.equipped_slot||''):'';
    function setTop(slot,value){const e=top(slot);if(!e)return;const v=value||'Boş';if(e.textContent!==v)e.textContent=v;e.classList.toggle('muted',!value)}

    function ensure(card){
      const actions=card?.querySelector('.actions');if(!actions)return;
      const x=id(card);if(!x)return;
      let equip=actions.querySelector('[data-psf-equip]');
      if(!equip){equip=document.createElement('button');equip.type='button';equip.dataset.psfEquip=x;equip.textContent='Kuşan';const controls=actions.querySelector('[data-ws-controls]');controls?controls.insertAdjacentElement('afterend',equip):actions.prepend(equip)}
      let remove=actions.querySelector('[data-psf-remove]');
      if(!remove){remove=document.createElement('button');remove.type='button';remove.dataset.psfRemove=x;remove.textContent='Çıkar';equip.insertAdjacentElement('afterend',remove)}
      equip.dataset.psfEquip=x;remove.dataset.psfRemove=x;
      if(remove.previousElementSibling!==equip)equip.insertAdjacentElement('afterend',remove)
    }

    function paint(card,slot){
      ensure(card);
      const on=!!slot;card.classList.toggle('on',on);
      card.querySelectorAll('[data-ws-slot]').forEach(b=>{const hit=b.dataset.wsSlot===slot,n=b.dataset.wsSlot==='main_weapon'?'1. Yuvaya':'2. Yuvaya',label=hit?`✓ ${n} Atandı`:`${n} Ata`;b.classList.toggle('ws-active',hit);if(b.textContent!==label)b.textContent=label});
      let badge=card.querySelector('.ws-slot-badge');
      if(slot){const label=slot==='main_weapon'?'1. YUVA':'2. YUVA';if(!badge){badge=document.createElement('span');badge.className='tag ws-slot-badge';card.querySelector('.tag')?.after(badge)}if(badge&&badge.textContent!==label)badge.textContent=label}
      else badge?.remove()
    }

    function effectiveSlot(card){const x=id(card),p=pending.get(x);if(p)return p.slot;return rowSlot(rows.get(x))}
    function repaint(){
      if(!isSheet())return;
      let main='',off='';
      for(const card of cards()){
        const slot=effectiveSlot(card);paint(card,slot);
        if(slot==='main_weapon')main=name(card);else if(slot==='off_weapon')off=name(card)
      }
      setTop('main_weapon',main);setTop('off_weapon',off)
    }

    async function fetchRows(){
      const ids=[...new Set(cards().map(id).filter(Boolean))];
      if(!ids.length)return new Map();
      const q=await S.from('catlak_inventory').select('id,equipped,equipped_slot').in('id',ids);
      if(q.error)throw q.error;
      return new Map((q.data||[]).map(r=>[String(r.id),r]))
    }

    async function syncAll(){
      if(!isSheet())return;
      if(syncBusy){syncQueued=true;return}
      syncBusy=true;
      try{rows=await fetchRows();repaint()}catch(e){console.warn('CATLAK_WEAPON_LIVE_SYNC',e)}finally{syncBusy=false;if(syncQueued){syncQueued=false;setTimeout(syncAll,0)}}
    }
    function syncSoon(delay=40){clearTimeout(syncTimer);syncTimer=setTimeout(syncAll,delay)}

    function claim(card,slot){
      const x=id(card);if(!x)return;
      if(slot){for(const c of cards()){const y=id(c);if(y!==x&&effectiveSlot(c)===slot)pending.set(y,{slot:'',reason:'displaced'})}}
      pending.set(x,{slot,reason:'action'});repaint()
    }

    function choose(card){const now=effectiveSlot(card);if(now)return now;let main=false,off=false;for(const c of cards()){const s=effectiveSlot(c);if(s==='main_weapon')main=true;if(s==='off_weapon')off=true}if(!main)return'main_weapon';if(!off)return'off_weapon';return'main_weapon'}

    async function waitConfirmed(target,expected){
      let latest=new Map();
      for(let i=0;i<7;i++){
        latest=await fetchRows();
        const got=rowSlot(latest.get(target));
        if(got===expected)return latest;
        await new Promise(r=>setTimeout(r,70+i*45))
      }
      throw new Error(expected?'Silah yuvası güncellenemedi.':'Silah çıkarma işlemi doğrulanamadı.')
    }

    async function setSlot(card,slot){
      const x=id(card);if(!x||busy.has(x))return;
      busy.add(x);claim(card,slot);
      try{
        const r=await S.rpc('catlak_set_equipped_slot',{p_inventory_id:x,p_slot:slot||''});if(r.error)throw r.error;
        rows=await waitConfirmed(x,slot);
        pending.clear();repaint();
        toast(slot==='main_weapon'?'Silah 1. yuvaya kuşanıldı.':slot==='off_weapon'?'Silah 2. yuvaya kuşanıldı.':'Silah çıkarıldı.');
        setTimeout(syncAll,120);setTimeout(syncAll,500)
      }catch(e){pending.clear();await syncAll();toast(e?.message||String(e))}finally{busy.delete(x)}
    }

    function own(e){
      if(!isSheet())return;
      const equip=e.target?.closest?.('[data-psf-equip]'),remove=e.target?.closest?.('[data-psf-remove]'),slotBtn=e.target?.closest?.('[data-ws-slot]');
      const b=equip||remove||slotBtn;if(!b)return;
      const card=b.closest('.iw-player-item[data-pla-inv-row]');if(!card)return;
      e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
      if(e.type==='pointerdown'){
        acted.set(b,Date.now());
        const slot=remove?'':slotBtn?String(slotBtn.dataset.wsSlot||''):choose(card);
        setSlot(card,slot);return
      }
      if(Date.now()-(acted.get(b)||0)<900)return;
      acted.set(b,Date.now());
      const slot=remove?'':slotBtn?String(slotBtn.dataset.wsSlot||''):choose(card);
      setSlot(card,slot)
    }

    function scan(){scanQueued=false;if(!isSheet())return;cards().forEach(ensure);repaint()}
    function queueScan(){if(scanQueued)return;scanQueued=true;requestAnimationFrame(scan)}
    window.addEventListener('pointerdown',own,true);window.addEventListener('click',own,true);
    new MutationObserver(()=>queueScan()).observe(A,{childList:true,subtree:true});
    S.channel('cc-player-weapon-live-v3').on('postgres_changes',{event:'*',schema:'public',table:'catlak_inventory'},()=>syncSoon(35)).subscribe();
    setInterval(()=>{if(isSheet())syncSoon(0)},1600);
    setTimeout(()=>{queueScan();syncAll()},80);
    window.__catlakPlayerWeaponLive={sync:syncAll,scan:queueScan,setSlot,pending}
  }
  boot()
})();
