(()=>{
const A=document.querySelector('#app'),S=window.__catlakSupabase;if(!A||!S)return;
const txt=e=>String(e?.textContent||'').trim();
const isSheet=()=>txt(A.querySelector('.role'))!=='GM'&&A.querySelector('.nav button.on[data-tab]')?.dataset.tab==='sheet';
const busy=new Set(),acted=new WeakMap(),local=new Map();
const toast=x=>{const t=document.querySelector('#toast');if(!t)return;t.textContent=String(x);t.classList.remove('hidden');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.add('hidden'),2400)};

if(!document.querySelector('#ps-final-blue-theme')){
  const st=document.createElement('style');st.id='ps-final-blue-theme';st.textContent=`
  #app main.ps-player-sheet{--gold:#59adff!important;--accent:#59adff!important;--psf-blue:#59adff;--psf-soft:#9bd1ff;--psf-line:#2e526f;--psf-bg:#071521;--psf-panel:#0a1b29}
  #app main.ps-player-sheet .card{border-color:var(--psf-line)!important;background:linear-gradient(180deg,#0a1a28,#06131e)!important;box-shadow:0 12px 34px #0005!important}
  #app main.ps-player-sheet section.hero{border-color:#35698f!important;background:linear-gradient(135deg,#0c2234,#071724 60%,#091925)!important}
  #app main.ps-player-sheet .eyebrow,#app main.ps-player-sheet .section-title .eyebrow,#app main.ps-player-sheet [data-gmt-player-panel] .eyebrow{color:var(--psf-blue)!important}
  #app main.ps-player-sheet h1,#app main.ps-player-sheet h2,#app main.ps-player-sheet h3,#app main.ps-player-sheet h4{color:#edf7ff!important}
  #app main.ps-player-sheet .stat{border-color:#294b64!important;background:#071824!important}
  #app main.ps-player-sheet .stat strong,#app main.ps-player-sheet .stat b{color:var(--psf-soft)!important}
  #app main.ps-player-sheet .stat:hover{border-color:var(--psf-blue)!important;box-shadow:inset 0 0 0 1px #59adff33!important}
  #app main.ps-player-sheet [data-gmt-player-panel],#app main.ps-player-sheet [data-gmt-player-panel] .gmt-player-two>div{border-color:#2e526f!important;background:#071824!important}
  #app main.ps-player-sheet [data-gmt-player-panel] .gmt-slot{border-color:#315b79!important;background:#091b29!important;box-shadow:none!important}
  #app main.ps-player-sheet [data-gmt-player-panel] .gmt-slot b{color:var(--psf-blue)!important}
  #app main.ps-player-sheet [data-gmt-player-panel] .gmt-slot span:not(.muted){color:#eaf6ff!important}
  #app main.ps-player-sheet .iw-player-item{border-color:#2d506b!important;background:linear-gradient(180deg,#091a28,#06131e)!important}
  #app main.ps-player-sheet .iw-player-item.on{border-color:#4e96d3!important;box-shadow:inset 0 0 0 1px #59adff2b,0 0 18px #2c78b81c!important}
  #app main.ps-player-sheet .iw-player-item .tag,#app main.ps-player-sheet .ws-slot-badge{border-color:#3a6786!important;background:#0a1e2e!important;color:#bfe0f6!important}
  #app main.ps-player-sheet .ws-slot-controls{display:flex!important;gap:7px!important;flex-wrap:wrap!important;width:100%!important;margin:0 0 3px!important}
  #app main.ps-player-sheet .actions{display:flex!important;gap:7px!important;flex-wrap:wrap!important;align-items:center!important}
  #app main.ps-player-sheet .actions button,#app main.ps-player-sheet .ws-slot-controls button{border:1px solid #37617f!important;background:#0a1e2e!important;color:#dceefb!important;border-radius:9px!important;min-height:36px!important;font-weight:850!important}
  #app main.ps-player-sheet .actions button:hover,#app main.ps-player-sheet .ws-slot-controls button:hover{border-color:var(--psf-blue)!important;background:#0e2d45!important}
  #app main.ps-player-sheet .actions button.primary{border-color:#4d96d2!important;background:linear-gradient(180deg,#16496f,#0d304c)!important;color:#edf8ff!important}
  #app main.ps-player-sheet .ws-slot-controls button.ws-active{border-color:var(--psf-blue)!important;background:#123a59!important;color:#d9efff!important;box-shadow:inset 0 0 0 1px #79bbff2e!important}
  #app main.ps-player-sheet [data-psf-equip],#app main.ps-player-sheet [data-psf-remove]{min-width:82px!important}
  #app main.ps-player-sheet [data-psf-equip]{border-color:#4d96d2!important;background:#123b5c!important;color:#e7f5ff!important}
  #app main.ps-player-sheet [data-psf-remove]{border-color:#406985!important;background:#0b2233!important;color:#c8e7fb!important}
  #app main.ps-player-sheet .ps-race-powers-card,#app main.ps-player-sheet .ps-lore-card{border-color:#2e526f!important;background:linear-gradient(180deg,#091a28,#06131e)!important}
  #app main.ps-player-sheet .ps-race-powers-card .power{border-color:#2d506b!important;background:#071824!important}
  #app main.ps-player-sheet .ps-race-powers-card .power b,#app main.ps-player-sheet .ps-race-powers-card .power strong{color:var(--psf-soft)!important}
  #app main.ps-player-sheet .roll .die{border-color:#3d7dad!important;background:#0b2d46!important;color:#a7d7ff!important}
  #app main.ps-player-sheet section.hero .qol-rest button{border-color:#3d7dad!important;background:#0d2d45!important;color:#a7d7ff!important}
  #app main.ps-player-sheet .ps-combat-card{border-color:#3d7dad!important;background:linear-gradient(135deg,#0b2438,#081724)!important}
  #app main.ps-player-sheet .ps-turn-self{color:var(--psf-soft)!important}
  @media(max-width:700px){#app main.ps-player-sheet .actions button,#app main.ps-player-sheet .ws-slot-controls button{flex:1 1 auto!important;min-width:105px!important}}
  `;document.head.appendChild(st);
}

const weaponCards=()=>[...A.querySelectorAll('main .iw-player-item[data-pla-inv-row]')].filter(c=>txt(c.querySelector('.tag'))==='SİLAH'||!!c.querySelector('[data-a="weapon"]'));
const cardId=c=>String(c?.dataset.plaInvRow||'');
const weaponName=c=>txt(c?.querySelector('h3')).replace(/\s+×\d+\s*$/,'').trim()||'Silah';
const topVal=slot=>A.querySelector(`main [data-gmt-slot="${slot}"] > span`);
function setTop(slot,value){const e=topVal(slot);if(!e)return;const v=value||'Boş';if(e.textContent!==v)e.textContent=v;e.classList.toggle('muted',!value)}
function activeSlot(card){const b=card?.querySelector('[data-ws-slot].ws-active');if(b)return b.dataset.wsSlot||'';const n=weaponName(card);if(txt(topVal('main_weapon'))===n)return'main_weapon';if(txt(topVal('off_weapon'))===n)return'off_weapon';return''}
function chooseSlot(card){const now=activeSlot(card);if(now)return now;const m=txt(topVal('main_weapon')),o=txt(topVal('off_weapon'));if(!m||/^boş$/i.test(m))return'main_weapon';if(!o||/^boş$/i.test(o))return'off_weapon';return'main_weapon'}
function ensureCard(card){
  const actions=card?.querySelector('.actions');if(!actions)return;
  const id=cardId(card);if(!id)return;
  actions.querySelectorAll('button[data-a="equip"],button[data-ws-remove],[data-wlive-remove]').forEach(b=>b.remove());
  let controls=actions.querySelector('[data-ws-controls]');
  if(!controls){controls=document.createElement('div');controls.className='ws-slot-controls';controls.dataset.wsControls='1';controls.innerHTML='<button type="button" data-ws-slot="main_weapon">1. Yuvaya Ata</button><button type="button" data-ws-slot="off_weapon">2. Yuvaya Ata</button>';actions.prepend(controls)}
  let equip=actions.querySelector('[data-psf-equip]');if(!equip){equip=document.createElement('button');equip.type='button';equip.dataset.psfEquip=id;equip.textContent='Kuşan';controls.insertAdjacentElement('afterend',equip)}else equip.dataset.psfEquip=id;
  let remove=actions.querySelector('[data-psf-remove]');if(!remove){remove=document.createElement('button');remove.type='button';remove.dataset.psfRemove=id;remove.textContent='Çıkar';equip.insertAdjacentElement('afterend',remove)}else{remove.dataset.psfRemove=id;if(remove.previousElementSibling!==equip)equip.insertAdjacentElement('afterend',remove)}
}
function paint(card,slot){
  ensureCard(card);const on=!!slot;if(card.classList.contains('on')!==on)card.classList.toggle('on',on);
  card.querySelectorAll('[data-ws-slot]').forEach(b=>{const hit=b.dataset.wsSlot===slot,n=b.dataset.wsSlot==='main_weapon'?'1. Yuvaya':'2. Yuvaya',label=hit?`✓ ${n} Atandı`:`${n} Ata`;b.classList.toggle('ws-active',hit);if(b.textContent!==label)b.textContent=label});
  let badge=card.querySelector('.ws-slot-badge');if(slot){const label=slot==='main_weapon'?'1. YUVA':'2. YUVA';if(!badge){badge=document.createElement('span');badge.className='tag ws-slot-badge';card.querySelector('.tag')?.after(badge)}if(badge.textContent!==label)badge.textContent=label}else badge?.remove();
}
function apply(card,slot){const n=weaponName(card);if(slot){weaponCards().forEach(c=>{if(c!==card&&activeSlot(c)===slot)paint(c,'')});for(const k of['main_weapon','off_weapon'])if(k!==slot&&txt(topVal(k))===n)setTop(k,'');paint(card,slot);setTop(slot,n)}else{paint(card,'');for(const k of['main_weapon','off_weapon'])if(txt(topVal(k))===n)setTop(k,'')}}
function remember(card,slot){const id=cardId(card);if(!id)return;local.set(id,{slot,until:Date.now()+3000});apply(card,slot)}
function applyLocal(card){const s=local.get(cardId(card));if(!s)return false;if(s.until<Date.now()){local.delete(cardId(card));return false}apply(card,s.slot);return true}
async function readSlot(id){const q=await S.from('catlak_inventory').select('equipped,equipped_slot').eq('id',id).maybeSingle();if(q.error)throw q.error;return q.data?.equipped?String(q.data.equipped_slot||''):''}
async function verify(id,expected){for(let i=0;i<6;i++){const got=await readSlot(id);if(got===expected)return true;await new Promise(r=>setTimeout(r,70+i*45))}return false}
async function setSlot(card,slot){const id=cardId(card);if(!id||busy.has(id))return;const before=activeSlot(card);busy.add(id);remember(card,slot);try{const r=await S.rpc('catlak_set_equipped_slot',{p_inventory_id:id,p_slot:slot||null});if(r.error)throw r.error;if(!await verify(id,slot))throw new Error(slot?'Silah kuşanma doğrulanamadı.':'Silah çıkarma doğrulanamadı.');remember(card,slot);toast(slot?'Silah kuşanıldı.':'Silah çıkarıldı.');setTimeout(async()=>{local.delete(id);try{const actual=await readSlot(id);apply(card,actual)}catch(_){ }window.gmtRenderPlayerPanels?.()},1300)}catch(e){local.delete(id);apply(card,before);toast(e?.message||String(e))}finally{busy.delete(id)}}
function own(e){if(!isSheet())return;const eq=e.target?.closest?.('[data-psf-equip]'),rm=e.target?.closest?.('[data-psf-remove]'),b=eq||rm;if(!b)return;const card=b.closest('.iw-player-item[data-pla-inv-row]');if(!card)return;e.preventDefault();e.stopImmediatePropagation();e.stopPropagation();if(e.type==='pointerdown'){acted.set(b,Date.now());setSlot(card,eq?chooseSlot(card):'');return}const at=acted.get(b)||0;if(Date.now()-at<900)return;acted.set(b,Date.now());setSlot(card,eq?chooseSlot(card):'')}
window.addEventListener('pointerdown',own,true);window.addEventListener('click',own,true);
function layout(){if(!isSheet())return;weaponCards().forEach(c=>{ensureCard(c);applyLocal(c)});A.querySelectorAll('main .cc-character-stack').forEach(st=>{const inv=[...st.querySelectorAll('section.card')].find(x=>x.classList.contains('ps-inventory-card')||txt(x.querySelector('.eyebrow'))==='CANLI ENVANTER'),race=[...st.querySelectorAll('section.card')].find(x=>txt(x.querySelector('.eyebrow'))==='IRK GÜÇLERİ');if(inv&&race&&inv.nextElementSibling!==race)inv.insertAdjacentElement('afterend',race)})}
new MutationObserver(()=>requestAnimationFrame(layout)).observe(A,{childList:true,subtree:true});
S.channel('cc-player-sheet-final-v1').on('postgres_changes',{event:'*',schema:'public',table:'catlak_inventory'},()=>setTimeout(async()=>{for(const c of weaponCards()){if(applyLocal(c))continue;try{apply(c,await readSlot(cardId(c)))}catch(_){}}window.gmtRenderPlayerPanels?.()},80)).subscribe();
setTimeout(layout,80);setInterval(layout,1800);window.__catlakPlayerSheetFinal={layout,setSlot};
})();
