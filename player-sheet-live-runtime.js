(()=>{
  const A=document.querySelector('#app');if(!A)return;
  if(!document.querySelector('#psf-loader-blue-theme')){
    const s=document.createElement('style');s.id='psf-loader-blue-theme';s.textContent=`
      #app main.ps-player-sheet{--gold:#59adff!important;--accent:#59adff!important}
      #app main.ps-player-sheet .eyebrow,#app main.ps-player-sheet .section-title .eyebrow,#app main.ps-player-sheet [data-gmt-player-panel] .eyebrow{color:#59adff!important}
      #app main.ps-player-sheet [data-gmt-player-panel] .gmt-slot{border-color:#315b79!important;background:#091b29!important;box-shadow:none!important}
      #app main.ps-player-sheet [data-gmt-player-panel] .gmt-slot b{color:#59adff!important}
      #app main.ps-player-sheet .iw-player-item.on{border-color:#4e96d3!important;box-shadow:inset 0 0 0 1px #59adff2b,0 0 18px #2c78b81c!important}
      #app main.ps-player-sheet .actions button[data-a="equip"][data-pla-equip-kind="weapon"],#app main.ps-player-sheet .actions button[data-ws-remove],#app main.ps-player-sheet .actions [data-wlive-remove]{display:none!important}
      #app main.ps-player-sheet .actions [data-psf-equip],#app main.ps-player-sheet .actions [data-psf-remove]{display:inline-flex!important;align-items:center!important;justify-content:center!important;min-width:82px!important;min-height:36px!important;border-radius:9px!important;font-weight:850!important}
      #app main.ps-player-sheet .actions [data-psf-equip]{border:1px solid #4d96d2!important;background:#123b5c!important;color:#e7f5ff!important}
      #app main.ps-player-sheet .actions [data-psf-remove]{border:1px solid #406985!important;background:#0b2233!important;color:#c8e7fb!important}
    `;document.head.appendChild(s)
  }
  let tries=0;
  function init(S){
    if(window.__catlakLoaderWeaponDual)return;
    const txt=e=>String(e?.textContent||'').trim(),local=new Map(),busy=new Set(),acted=new WeakMap();
    const sheet=()=>txt(A.querySelector('.role'))!=='GM'&&A.querySelector('.nav button.on[data-tab]')?.dataset.tab==='sheet';
    const cards=()=>sheet()?[...A.querySelectorAll('main .iw-player-item[data-pla-inv-row]')].filter(c=>txt(c.querySelector('.tag'))==='SİLAH'||c.querySelector('[data-a="weapon"]')):[];
    const id=c=>String(c?.dataset.plaInvRow||''),name=c=>txt(c?.querySelector('h3')).replace(/\s+×\d+\s*$/,'').trim()||'Silah',top=k=>A.querySelector(`main [data-gmt-slot="${k}"] > span`);
    const setTop=(k,v)=>{const e=top(k);if(e){e.textContent=v||'Boş';e.classList.toggle('muted',!v)}};
    function active(c){const l=local.get(id(c));if(l&&l.until>Date.now())return l.slot;const b=c?.querySelector('[data-ws-slot].ws-active');if(b)return b.dataset.wsSlot||'';const n=name(c);if(txt(top('main_weapon'))===n)return'main_weapon';if(txt(top('off_weapon'))===n)return'off_weapon';return''}
    function choose(c){const a=active(c);if(a)return a;const m=txt(top('main_weapon')),o=txt(top('off_weapon'));if(!m||/^boş$/i.test(m))return'main_weapon';if(!o||/^boş$/i.test(o))return'off_weapon';return'main_weapon'}
    function ensure(c){const a=c?.querySelector('.actions');if(!a)return;const x=id(c);let q=a.querySelector('[data-psf-equip]');if(!q){q=document.createElement('button');q.type='button';q.dataset.psfEquip=x;q.textContent='Kuşan';(a.querySelector('[data-ws-controls]')||a.firstElementChild)?.insertAdjacentElement('afterend',q)}let r=a.querySelector('[data-psf-remove]');if(!r){r=document.createElement('button');r.type='button';r.dataset.psfRemove=x;r.textContent='Çıkar';q.insertAdjacentElement('afterend',r)}q.dataset.psfEquip=x;r.dataset.psfRemove=x}
    function paint(c,slot){ensure(c);c.classList.toggle('on',!!slot);c.querySelectorAll('[data-ws-slot]').forEach(b=>{const hit=b.dataset.wsSlot===slot,n=b.dataset.wsSlot==='main_weapon'?'1. Yuvaya':'2. Yuvaya';b.classList.toggle('ws-active',hit);b.textContent=hit?`✓ ${n} Atandı`:`${n} Ata`})}
    function apply(c,slot){const n=name(c);if(slot){cards().forEach(o=>{if(o!==c&&active(o)===slot)paint(o,'')});for(const k of['main_weapon','off_weapon'])if(k!==slot&&txt(top(k))===n)setTop(k,'');paint(c,slot);setTop(slot,n)}else{paint(c,'');for(const k of['main_weapon','off_weapon'])if(txt(top(k))===n)setTop(k,'')}}
    async function read(x){const q=await S.from('catlak_inventory').select('equipped,equipped_slot').eq('id',x).maybeSingle();if(q.error)throw q.error;return q.data?.equipped?String(q.data.equipped_slot||''):''}
    async function set(c,slot){const x=id(c);if(!x||busy.has(x))return;const before=active(c);busy.add(x);local.set(x,{slot,until:Date.now()+4000});apply(c,slot);try{const r=await S.rpc('catlak_set_equipped_slot',{p_inventory_id:x,p_slot:slot||null});if(r.error)throw r.error;setTimeout(async()=>{local.delete(x);try{apply(c,await read(x))}catch(_){}},1400)}catch(e){local.delete(x);apply(c,before)}finally{busy.delete(x)}}
    function own(e){if(!sheet())return;const q=e.target?.closest?.('[data-psf-equip]'),r=e.target?.closest?.('[data-psf-remove]'),b=q||r;if(!b)return;const c=b.closest('.iw-player-item[data-pla-inv-row]');if(!c)return;e.preventDefault();e.stopImmediatePropagation();e.stopPropagation();if(e.type==='pointerdown'){acted.set(b,Date.now());set(c,q?choose(c):'');return}if(Date.now()-(acted.get(b)||0)<900)return;set(c,q?choose(c):'')}
    function scan(){cards().forEach(c=>{ensure(c);const l=local.get(id(c));if(l&&l.until>Date.now())apply(c,l.slot)})}
    window.addEventListener('pointerdown',own,true);window.addEventListener('click',own,true);new MutationObserver(()=>requestAnimationFrame(scan)).observe(A,{childList:true,subtree:true});setTimeout(scan,60);setInterval(scan,1200);window.__catlakLoaderWeaponDual={scan,set};
  }
  function loadFinal(){if(window.__catlakPlayerSheetFinal)return;if(document.querySelector('script[data-psfinal-runtime]'))return;const s=document.createElement('script');s.dataset.psfinalRuntime='1';s.src='./player-sheet-final-patch.js?v=psfinal-runtime-v2&inline-dual-v4';s.async=false;document.body.appendChild(s)}
  function boot(){const S=window.__catlakSupabase;if(!S){if(tries++<240)setTimeout(boot,75);return}init(S);loadFinal()}
  boot();
})();
