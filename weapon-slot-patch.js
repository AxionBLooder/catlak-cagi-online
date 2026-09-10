const WS_S=window.__catlakSupabase;
const WS_APP=document.querySelector('#app');
if(!WS_S||!WS_APP)throw new Error('Çatlak Çağı silah slot katmanı başlatılamadı.');

const wsTxt=e=>String(e?.textContent||'').trim();
const wsIsGM=()=>wsTxt(WS_APP.querySelector('.role'))==='GM';
const wsTab=()=>WS_APP.querySelector('.nav button.on[data-tab]')?.dataset.tab||'';
const wsIsSheet=()=>!wsIsGM()&&wsTab()==='sheet';
const wsToast=x=>{const t=document.querySelector('#toast');if(!t)return;t.textContent=String(x);t.classList.remove('hidden');clearTimeout(wsToast.t);wsToast.t=setTimeout(()=>t.classList.add('hidden'),3600)};
let wsBusy=false,wsTimer=null,wsCache=new Map(),wsCacheAt=0;

if(!document.querySelector('#ws-weapon-slot-style')){
  const s=document.createElement('style');s.id='ws-weapon-slot-style';s.textContent=`
  .ps-player-sheet .ws-slot-badge{margin-left:6px;border-color:#7b6235;color:#f2d284}
  .ps-player-sheet .ws-slot-controls{display:flex;gap:7px;flex-wrap:wrap;width:100%;margin-bottom:2px}
  .ps-player-sheet .ws-slot-controls button{font-weight:800}
  .ps-player-sheet .ws-slot-controls button.ws-active{border-color:#8a713e;background:linear-gradient(135deg,#4b3c1d,#2a261b);color:#ffe2a1;box-shadow:inset 0 0 0 1px #e7b85f38}
  `;document.head.appendChild(s)
}

function wsVisibleWeaponIds(){
  if(!wsIsSheet())return [];
  return [...WS_APP.querySelectorAll('main .iw-player-item[data-pla-inv-row]')]
    .filter(card=>wsTxt(card.querySelector('.tag'))==='SİLAH'||!!card.querySelector('[data-a="weapon"]'))
    .map(card=>card.dataset.plaInvRow).filter(Boolean);
}
async function wsLoad(force=false){
  const ids=[...new Set(wsVisibleWeaponIds())];if(!ids.length){wsCache=new Map();return wsCache}
  if(!force&&Date.now()-wsCacheAt<900&&ids.every(id=>wsCache.has(id)))return wsCache;
  const r=await WS_S.from('catlak_inventory').select('id,equipped,equipped_slot').in('id',ids);
  if(r.error)throw r.error;wsCache=new Map((r.data||[]).map(x=>[x.id,x]));wsCacheAt=Date.now();return wsCache;
}
function wsButton(slot,current){
  const first=slot==='main_weapon',active=current===slot;
  return `<button type="button" class="${active?'ws-active':''}" data-ws-slot="${slot}">${active?'✓ ':''}${first?'1. Silah':'2. Silah'}${active?'':' Yap'}</button>`;
}
function wsPaintCard(card,row){
  const actions=card.querySelector('.actions');if(!actions)return;
  actions.querySelectorAll('button[data-a="equip"]').forEach(b=>b.remove());
  card.querySelectorAll('.ws-slot-badge').forEach(x=>x.remove());
  let controls=actions.querySelector('[data-ws-controls]');
  if(!controls){controls=document.createElement('div');controls.className='ws-slot-controls';controls.dataset.wsControls='1';actions.prepend(controls)}
  const current=row?.equipped?String(row.equipped_slot||''):'';
  const html=wsButton('main_weapon',current)+wsButton('off_weapon',current)+(current?'<button type="button" data-ws-clear>Çıkar</button>':'');
  if(controls.innerHTML!==html)controls.innerHTML=html;
  if(current){
    const tag=card.querySelector('.tag');if(tag){const badge=document.createElement('span');badge.className='tag ws-slot-badge';badge.textContent=current==='main_weapon'?'1. SİLAH':'2. SİLAH';tag.after(badge)}
  }
}
async function wsPaint(force=false){
  if(!wsIsSheet()||wsBusy)return;
  try{
    await wsLoad(force);
    if(!wsIsSheet())return;
    WS_APP.querySelectorAll('main .iw-player-item[data-pla-inv-row]').forEach(card=>{
      if(wsTxt(card.querySelector('.tag'))!=='SİLAH'&&!card.querySelector('[data-a="weapon"]'))return;
      wsPaintCard(card,wsCache.get(card.dataset.plaInvRow));
    });
  }catch(e){console.warn('CATLAK_WEAPON_SLOT_PAINT',e)}
}
function wsSoon(force=false,delay=40){clearTimeout(wsTimer);wsTimer=setTimeout(()=>wsPaint(force),delay)}
async function wsSet(card,slot){
  if(wsBusy||!wsIsSheet())return;const id=card?.dataset.plaInvRow;if(!id)return;wsBusy=true;
  try{
    const r=await WS_S.rpc('catlak_set_equipped_slot',{p_inventory_id:id,p_slot:slot});if(r.error)throw r.error;
    wsCacheAt=0;
    wsToast(slot==='main_weapon'?'1. silah seçildi.':slot==='off_weapon'?'2. silah seçildi.':'Silah çıkarıldı.');
    if(window.__catlakPlayerLiveTest?.refresh)await window.__catlakPlayerLiveTest.refresh(true);
    await wsPaint(true);
  }catch(e){wsToast(e?.message||String(e))}finally{wsBusy=false;wsSoon(true,20)}
}
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-ws-slot],[data-ws-clear]');if(!b||!wsIsSheet())return;
  const card=b.closest('.iw-player-item[data-pla-inv-row]');if(!card)return;
  e.preventDefault();e.stopImmediatePropagation();wsSet(card,b.dataset.wsSlot||null);
},true);

new MutationObserver(()=>wsSoon(false,80)).observe(WS_APP,{childList:true,subtree:true});
WS_S.channel('cc-weapon-slot-live').on('postgres_changes',{event:'*',schema:'public',table:'catlak_inventory'},()=>{wsCacheAt=0;wsSoon(true,30)}).subscribe();
setInterval(()=>wsSoon(false,0),2500);
setTimeout(()=>wsSoon(true,0),180);
window.__catlakWeaponSlotTest={paint:wsPaint,load:wsLoad};
