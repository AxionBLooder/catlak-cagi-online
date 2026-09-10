const WS_S=window.__catlakSupabase;
const WS_APP=document.querySelector('#app');
if(!WS_S||!WS_APP)throw new Error('Çatlak Çağı silah slot katmanı başlatılamadı.');

const wsTxt=e=>String(e?.textContent||'').trim();
const wsEsc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const wsIsGM=()=>wsTxt(WS_APP.querySelector('.role'))==='GM';
const wsTab=()=>WS_APP.querySelector('.nav button.on[data-tab]')?.dataset.tab||'';
const wsIsSheet=()=>!wsIsGM()&&wsTab()==='sheet';
const wsToast=x=>{const t=document.querySelector('#toast');if(!t)return;t.textContent=String(x);t.classList.remove('hidden');clearTimeout(wsToast.t);wsToast.t=setTimeout(()=>t.classList.add('hidden'),3600)};
let wsBusy=false,wsTimer=null,wsCache=new Map(),wsCacheAt=0;

if(!document.querySelector('#ws-weapon-slot-style')){
  const s=document.createElement('style');s.id='ws-weapon-slot-style';s.textContent=`
  .ps-player-sheet .ws-slot-board{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin:10px 0 13px}
  .ps-player-sheet .ws-slot-box{border:1px solid #4b4330;border-radius:13px;padding:11px 12px;background:linear-gradient(135deg,#15150f,#0a141e);min-width:0}
  .ps-player-sheet .ws-slot-box span{display:block;font-size:.67rem;font-weight:900;letter-spacing:.12em;color:#d7b86f;margin-bottom:5px}
  .ps-player-sheet .ws-slot-box strong{display:block;font-size:1rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .ps-player-sheet .ws-slot-box.ws-empty strong{color:var(--muted);font-weight:700}
  .ps-player-sheet .ws-slot-badge{margin-left:6px;border-color:#7b6235;color:#f2d284}
  .ps-player-sheet .ws-slot-controls{display:flex;gap:7px;flex-wrap:wrap;width:100%;margin-bottom:2px}
  .ps-player-sheet .ws-slot-controls button{font-weight:800}
  .ps-player-sheet .ws-slot-controls button.ws-active{border-color:#8a713e;background:linear-gradient(135deg,#4b3c1d,#2a261b);color:#ffe2a1;box-shadow:inset 0 0 0 1px #e7b85f38}
  @media(max-width:560px){.ps-player-sheet .ws-slot-board{grid-template-columns:1fr}}
  `;document.head.appendChild(s)
}

function wsVisibleWeaponCards(){
  if(!wsIsSheet())return [];
  return [...WS_APP.querySelectorAll('main .iw-player-item[data-pla-inv-row]')]
    .filter(card=>wsTxt(card.querySelector('.tag'))==='SİLAH'||!!card.querySelector('[data-a="weapon"]'));
}
function wsVisibleWeaponIds(){return wsVisibleWeaponCards().map(card=>card.dataset.plaInvRow).filter(Boolean)}
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
function wsWeaponName(id){
  const card=wsVisibleWeaponCards().find(x=>String(x.dataset.plaInvRow)===String(id));
  return wsTxt(card?.querySelector('h3'))||'Seçili silah';
}
function wsPaintBoard(){
  if(!wsIsSheet())return;
  const card=WS_APP.querySelector('main .ps-inventory-card')||[...WS_APP.querySelectorAll('main section.card')].find(x=>wsTxt(x.querySelector('.eyebrow'))==='CANLI ENVANTER');
  if(!card)return;
  let board=card.querySelector('[data-ws-slot-board]');
  if(!board){board=document.createElement('div');board.className='ws-slot-board';board.dataset.wsSlotBoard='1';const grid=card.querySelector('.iw-player-grid');grid?card.insertBefore(board,grid):card.appendChild(board)}
  const rows=[...wsCache.values()].filter(r=>r?.equipped);
  const main=rows.find(r=>r.equipped_slot==='main_weapon');
  const off=rows.find(r=>r.equipped_slot==='off_weapon');
  const html=`<div class="ws-slot-box ${main?'':'ws-empty'}"><span>1. SİLAH</span><strong>${main?wsEsc(wsWeaponName(main.id)):'BOŞ'}</strong></div><div class="ws-slot-box ${off?'':'ws-empty'}"><span>2. SİLAH</span><strong>${off?wsEsc(wsWeaponName(off.id)):'BOŞ'}</strong></div>`;
  if(board.innerHTML!==html)board.innerHTML=html;
}
async function wsPaint(force=false){
  if(!wsIsSheet()||wsBusy)return;
  try{
    await wsLoad(force);
    if(!wsIsSheet())return;
    wsVisibleWeaponCards().forEach(card=>wsPaintCard(card,wsCache.get(card.dataset.plaInvRow)));
    wsPaintBoard();
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
window.__catlakWeaponSlotTest={paint:wsPaint,load:wsLoad,paintBoard:wsPaintBoard};
