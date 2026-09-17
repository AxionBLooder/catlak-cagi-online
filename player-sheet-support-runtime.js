(function(){
'use strict';
if(window.__catlakPlayerSheetSupportV1)return;
window.__catlakPlayerSheetSupportV1=true;
const APP=document.querySelector('#app'),S=window.__catlakSupabase;
if(!APP||!S)return;
const txt=e=>String(e?.textContent||'').trim();
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const isPlayer=()=>txt(APP.querySelector('.role'))!=='GM';
const isSheet=()=>isPlayer()&&APP.querySelector('.nav button.on[data-tab]')?.dataset.tab==='sheet';
const charId=stack=>stack?.querySelector('section.hero [data-a="hp"][data-id]')?.dataset.id||'';
const slots=['main_weapon','off_weapon','armor','accessory_1','accessory_2'];
const slotName=k=>({main_weapon:'1. Silah',off_weapon:'2. Silah',armor:'Zırh',accessory_1:'Aksesuar 1',accessory_2:'Aksesuar 2'})[k]||k;
let busy=false,pending=false,timer=0,lastAt=0,cache=null;
const CACHE_MS=2500;

if(!document.querySelector('#pssr-style')){
  const s=document.createElement('style');s.id='pssr-style';s.textContent=`
  .ps-player-sheet [data-gmt-player-panel]{padding:14px!important;border-color:#394c5c!important;background:#09131e!important}
  .ps-player-sheet [data-gmt-player-panel] .gmt-player-two{display:flex!important;flex-direction:column!important;gap:11px!important}
  .ps-player-sheet [data-gmt-player-panel] .gmt-player-two>div{padding:12px;border:1px solid #263b4c;border-radius:12px;background:#07111b}
  .ps-player-sheet [data-gmt-player-panel] .gmt-slot{display:grid;grid-template-columns:100px minmax(0,1fr);gap:8px;padding:7px 0;border-bottom:1px solid var(--line);font-size:.83rem}
  .ps-player-sheet [data-gmt-player-panel] .gmt-slot:last-child{border-bottom:0}
  .ps-player-sheet [data-gmt-player-panel] .gmt-slot b{color:var(--gold)}
  .pssr-status-pill{display:inline-flex;border:1px solid var(--line);border-radius:999px;padding:4px 8px;margin:3px 4px 3px 0;font-size:.78rem}
  `;document.head.appendChild(s)
}

function ensurePanel(stack){
  if(!stack)return null;
  let panel=stack.querySelector('[data-gmt-player-panel]');
  if(!panel){
    panel=document.createElement('section');panel.className='card gmt-player-panel';panel.dataset.gmtPlayerPanel=charId(stack)||'player';panel.dataset.gmtStableEquipment='1';
    panel.innerHTML='<div class="gmt-player-two"><div data-gmt-status-pane><div class="eyebrow">AKTİF DURUMLAR</div><h2>Durum Etkileri</h2><div data-gmt-status-list></div></div><div data-gmt-equip-pane><div class="eyebrow">TAKILI TEÇHİZAT</div><h2>Slotlar</h2><p class="gmt-mini">Takılı silah, zırh ve aksesuarlar.</p><div data-pssr-slots></div></div></div>';
    const hero=stack.querySelector('section.hero');hero?hero.insertAdjacentElement('afterend',panel):stack.prepend(panel);
  }
  panel.dataset.gmtStableEquipment='1';
  let holder=panel.querySelector('[data-pssr-slots]');
  if(!holder){holder=document.createElement('div');holder.dataset.pssrSlots='1';panel.querySelector('[data-gmt-equip-pane]')?.appendChild(holder)}
  for(const key of slots){
    let row=holder.querySelector(`[data-gmt-slot="${key}"]`);
    if(!row){row=document.createElement('div');row.className='gmt-slot';row.dataset.gmtSlot=key;row.innerHTML='<b></b><span class="muted">Boş</span>';holder.appendChild(row)}
    row.querySelector('b').textContent=slotName(key);
  }
  return panel;
}

async function load(ids,force=false){
  if(!force&&cache&&Date.now()-lastAt<CACHE_MS)return cache;
  const [kr,vr,ir]=await Promise.all([
    S.from('catlak_character_conditions').select('id,character_id,name,remaining_rounds,note,active').in('character_id',ids).eq('active',true).order('created_at',{ascending:true}),
    S.from('catlak_inventory').select('id,character_id,item_id,equipped,equipped_slot,quantity').in('character_id',ids).eq('equipped',true).order('granted_at',{ascending:true}),
    S.from('catlak_items').select('id,name,is_active')
  ]);
  for(const r of [kr,vr,ir])if(r.error)throw r.error;
  cache={conditions:kr.data||[],inventory:vr.data||[],items:ir.data||[]};lastAt=Date.now();return cache;
}

function paintStack(stack,data){
  const cid=charId(stack);if(!cid)return;
  const panel=ensurePanel(stack);if(!panel)return;
  const status=panel.querySelector('[data-gmt-status-list]');
  const conds=data.conditions.filter(x=>String(x.character_id)===String(cid));
  if(status){
    status.innerHTML=conds.length
      ?conds.map(x=>`<span class="pssr-status-pill"><b>${esc(x.name||'Durum')}</b>${x.remaining_rounds==null?'':' • '+Number(x.remaining_rounds)+' round'}${x.note?' • '+esc(x.note):''}</span>`).join('')
      :'<p class="muted">Aktif durum etkisi yok.</p>';
  }
  const itemMap=new Map(data.items.map(i=>[String(i.id),i]));
  const rows=data.inventory.filter(x=>String(x.character_id)===String(cid)&&x.equipped);
  for(const key of slots){
    const row=panel.querySelector(`[data-gmt-slot="${key}"]`),hit=rows.find(x=>String(x.equipped_slot||'')===key),item=hit&&itemMap.get(String(hit.item_id)),span=row?.querySelector(':scope > span');
    if(!span)continue;const ok=item&&item.is_active!==false;span.textContent=ok?item.name:'Boş';span.classList.toggle('muted',!ok);
  }
}

async function refresh(force=false){
  if(!isSheet())return false;
  if(busy){pending=pending||force;return false}
  const stacks=[...APP.querySelectorAll('main .cc-character-stack')],ids=[...new Set(stacks.map(charId).filter(Boolean))];
  if(!ids.length)return false;
  busy=true;
  try{const data=await load(ids,force);if(!isSheet())return false;stacks.forEach(st=>paintStack(st,data));try{window.__catlakPlayerSheetTest?.apply?.()}catch(_){}try{window.__catlakPlayerSheetEquipmentAbilitiesTest?.paint?.(false)}catch(_){}return true}
  catch(e){console.warn('CATLAK_PLAYER_SHEET_SUPPORT',e);return false}
  finally{busy=false;if(pending){const f=pending;pending=false;schedule(!!f,20)}}
}
function schedule(force=false,ms=80){clearTimeout(timer);timer=setTimeout(()=>refresh(force),ms)}
new MutationObserver(()=>{if(isSheet())schedule(false,90)}).observe(APP,{childList:true,subtree:true});
S.channel('cc-player-sheet-support')
 .on('postgres_changes',{event:'*',schema:'public',table:'catlak_inventory'},()=>{cache=null;schedule(true,20)})
 .on('postgres_changes',{event:'*',schema:'public',table:'catlak_items'},()=>{cache=null;schedule(true,30)})
 .on('postgres_changes',{event:'*',schema:'public',table:'catlak_character_conditions'},()=>{cache=null;schedule(true,20)})
 .subscribe();
setTimeout(()=>schedule(true,0),80);
window.__catlakPlayerSheetSupport={refresh,schedule,ensurePanel};
})();
