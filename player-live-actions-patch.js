const PLA_S=window.__catlakSupabase;
const PLA_APP=document.querySelector('#app');
if(!PLA_S||!PLA_APP)throw new Error('Çatlak Çağı oyuncu canlı aksiyon katmanı başlatılamadı.');
window.__catlakPlayerLiveOwnsInventory=true;

const plaTxt=e=>String(e?.textContent||'').trim();
const plaEsc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const plaNum=x=>Number(x||0);
const plaIsGM=()=>plaTxt(PLA_APP.querySelector('.role'))==='GM';
const plaTab=()=>PLA_APP.querySelector('.nav button.on[data-tab]')?.dataset.tab||'';
const plaIsSheet=()=>!plaIsGM()&&plaTab()==='sheet';
const plaToast=x=>{const t=document.querySelector('#toast');if(!t)return;t.textContent=String(x);t.classList.remove('hidden');clearTimeout(plaToast.t);plaToast.t=setTimeout(()=>t.classList.add('hidden'),3600)};
let plaRefreshTimer=null,plaRefreshDue=0,plaPendingForce=false,plaRefreshing=false,plaLastRefresh=0;
const plaBusy=new Set();
const plaActed=new Map();

if(!document.querySelector('#pla-player-live-style')){
  const s=document.createElement('style');s.id='pla-player-live-style';s.textContent=`
  .ps-player-sheet .pla-static-stats .eyebrow{display:none!important}
  .ps-player-sheet .pla-static-stats .stat{cursor:default!important;pointer-events:none!important;transform:none!important}
  .ps-player-sheet .pla-static-stats .stat:hover{transform:none!important;box-shadow:none!important}
  .ps-player-sheet .iw-player-item.pla-equip-pending{opacity:1!important;filter:none!important;transition:none!important}
  .ps-player-sheet [data-pla-inventory-owner="1"] .iw-player-item{animation:none!important}
  `;document.head.appendChild(s)
}

function plaCharId(stack){return stack?.querySelector('section.hero [data-a="hp"][data-id]')?.dataset.id||''}
function plaEyebrow(sec){return plaTxt(sec?.querySelector(':scope > .eyebrow, :scope > .section-title .eyebrow'))}
function plaInventorySection(stack){return [...stack.querySelectorAll('section.card')].find(s=>plaEyebrow(s)==='CANLI ENVANTER')||null}
function plaRollSection(stack){return [...stack.querySelectorAll('section.card')].find(s=>plaEyebrow(s)==='SON ZARLAR')||null}
function plaModeLabel(m){return m==='accessory'?'Pasif / Aksesuar':m==='consumable'?'Tüketilebilir':'Genel Eşya'}
function plaClaimInventory(){
  if(!plaIsSheet())return;
  PLA_APP.querySelectorAll('main .cc-character-stack section.card').forEach(sec=>{
    if(plaEyebrow(sec)!=='CANLI ENVANTER')return;
    sec.dataset.iwPlayerInventory='1';sec.dataset.plaInventoryOwner='1';
  });
}
function plaStaticStats(){
  if(!plaIsSheet())return;
  PLA_APP.querySelectorAll('main .cc-character-stack section.card').forEach(sec=>{
    if(plaEyebrow(sec)!=='D20 TESTLERİ'&&!sec.classList.contains('ps-stat-card'))return;
    sec.classList.add('pla-static-stats');
    const h=sec.querySelector('.section-title h2, :scope > h2');if(h&&h.textContent!=='Statlar')h.textContent='Statlar';
    sec.querySelectorAll('.stat').forEach(b=>{
      if(b.dataset.a==='stat'){b.removeAttribute('data-a');b.removeAttribute('data-id');b.removeAttribute('data-stat')}
      b.classList.add('static');b.setAttribute('aria-disabled','true');b.tabIndex=-1;
      const sm=b.querySelector('small');if(sm){const t=plaTxt(sm).replace(/\s*•\s*d20(?:\s*at)?\s*$/i,'').trim();if(sm.textContent!==t)sm.textContent=t}
    })
  })
}
function plaPlayerItem(r,i){
  const fx=i.effects||{},note=fx.public_note||'',mode=fx.item_mode||'general',type=i.item_type,weaponSlot=String(r.equipped_slot||''),shownEquipped=type==='weapon'?!!r.equipped&&(weaponSlot==='main_weapon'||weaponSlot==='off_weapon'):!!r.equipped;let meta='',actions='';
  if(type==='weapon'){
    const stat=i.attack_stat&&i.attack_stat!=='NONE'?i.attack_stat:'STR',weaponBonus=plaNum(i.attack_bonus);
    meta=`Saldırı • ${stat} bonusu${weaponBonus?` ${weaponBonus>0?'+':'-'} ${Math.abs(weaponBonus)} silah`:''} • Hasar • ${stat} bonusu`;
    actions=`<button type="button" class="primary" data-a="weapon" data-id="${r.id}" data-k="attack">Saldırı At</button><button type="button" data-a="weapon" data-id="${r.id}" data-k="damage">Hasar Vur</button>`;
  }else if(type==='armor'){
    meta=i.ac_mode==='set'?`AC Tabanı ${i.ac_value}`:i.ac_mode==='bonus'?`AC +${i.ac_value}`:'AC etkisi yok';
  }else if(mode==='accessory'){
    meta='Pasif / Aksesuar';
  }else if(mode==='consumable'){
    meta=`Tüketilebilir • ${fx.consume_formula||''}`;actions=`<button type="button" class="primary" data-iw-use="${r.id}">Kullan</button>`;
  }else meta=plaModeLabel(mode);
  return `<article class="iw-player-item ${shownEquipped?'on':''}" data-pla-inv-row="${r.id}"><span class="tag">${type==='weapon'?'SİLAH':type==='armor'?'ZIRH':'EŞYA'}</span><h3>${plaEsc(i.name)} ${r.quantity>1?'×'+r.quantity:''}</h3><p>${plaEsc(i.description||'')}</p><div class="iw-meta">${plaEsc(meta)}</div>${note?`<div class="iw-player-note">${plaEsc(note)}</div>`:''}${actions?`<div class="actions" style="margin-top:10px">${actions}</div>`:''}</article>`;
}
function plaRollRow(r){
  const die=Array.isArray(r.dice)?Number(r.dice[0]):NaN,crit=die===20?' cc-critical':die===1?' cc-fumble':'',diceTxt=Array.isArray(r.dice)&&r.dice.length?`[${r.dice.map(plaNum).join(', ')}]`:'';
  return `<div class="roll${crit}" data-pla-roll="${r.id}"><div class="die">${r.total==null?'?':plaEsc(r.total)}</div><div><b>${plaEsc(r.label||r.roll_kind||'Zar')}</b><br><small>${plaEsc(diceTxt)}${r.modifier?` ${r.modifier>0?'+':''}${plaNum(r.modifier)}`:''} • ${new Date(r.created_at).toLocaleTimeString('tr-TR')}</small>${Number(r.total)===0?'<div class="ccr-critical">KRİTİK BAŞARISIZLIK</div>':''}</div></div>`;
}
function plaSignature(rows,fields){return JSON.stringify(rows.map(r=>fields.map(k=>r?.[k]??null)))}
function plaSyncInventoryState(sec,rows){
  const cards=[...sec.querySelectorAll('.iw-player-item[data-pla-inv-row]')];if(cards.length!==rows.length)return false;
  for(const x of rows){
    const id=String(x.r.id),card=cards.find(c=>String(c.dataset.plaInvRow||'')===id);if(!card)return false;
    const rawEquipped=!!x.r.equipped,slot=rawEquipped?String(x.r.equipped_slot||''):'',equipped=x.i.item_type==='weapon'?rawEquipped&&(slot==='main_weapon'||slot==='off_weapon'):rawEquipped;
    card.classList.toggle('on',equipped);
    if(x.i.item_type==='weapon'){
      let badge=card.querySelector('.ws-slot-badge');
      if(slot==='main_weapon'||slot==='off_weapon'){
        const label=slot==='main_weapon'?'1. YUVA':'2. YUVA';
        if(!badge){badge=document.createElement('span');badge.className='tag ws-slot-badge';card.querySelector('.tag')?.after(badge)}
        if(badge)badge.textContent=label;
      }else badge?.remove();
    }
  }
  return true;
}
function plaSyncEquipmentPanel(stack,rows){
  const panel=stack?.querySelector('[data-gmt-player-panel]');if(!panel)return;
  const equip=[...panel.querySelectorAll('.gmt-player-two>div')].find(x=>plaTxt(x.querySelector(':scope > .eyebrow'))==='TAKILI TEÇHİZAT');if(!equip)return;
  const byLabel={
    'Ana Silah':'main_weapon','İkinci Silah':'off_weapon','1. Silah':'main_weapon','2. Silah':'off_weapon','Zırh':'armor','Aksesuar 1':'accessory_1','Aksesuar 2':'accessory_2'
  };
  equip.querySelectorAll('.gmt-slot').forEach(slot=>{
    const key=slot.dataset.gmtSlot||byLabel[plaTxt(slot.querySelector('b'))];if(!key)return;
    const hit=rows.find(x=>x.r?.equipped&&String(x.r?.equipped_slot||'')===key);
    let value=slot.querySelector(':scope > span');
    if(!value){value=document.createElement('span');slot.appendChild(value)}
    value.textContent=hit?.i?.name||'Boş';value.classList.toggle('muted',!hit);
  });
}
function plaSyncRollSection(sec,rows){
  if(!sec)return;
  const sig=plaSignature(rows,['id','label','roll_kind','formula','modifier','total','dice','created_at']);if(sec.dataset.plaRollSig===sig)return;
  const holder=document.createElement('div');
  holder.innerHTML=`<div class="eyebrow">SON ZARLAR</div>${rows.length?`<div class="rolls">${rows.map(plaRollRow).join('')}</div>`:'<div class="empty">Henüz zar yok.</div>'}`;
  sec.replaceChildren(...holder.childNodes);sec.dataset.plaRollSig=sig;
}

async function plaRefreshNow(force=false){
  if(!plaIsSheet())return;
  if(plaRefreshing){plaRefreshSoon(force,45);return}
  if(!force&&Date.now()-plaLastRefresh<180)return;
  plaClaimInventory();plaStaticStats();plaRefreshing=true;plaLastRefresh=Date.now();
  try{
    const stacks=[...PLA_APP.querySelectorAll('main .cc-character-stack')];if(!stacks.length)return;
    const ids=[...new Set(stacks.map(plaCharId).filter(Boolean))];if(!ids.length)return;
    const [vr,ir,rr]=await Promise.all([
      PLA_S.from('catlak_inventory').select('id,character_id,item_id,quantity,equipped,equipped_slot,player_note,granted_at').in('character_id',ids).order('granted_at',{ascending:true}),
      PLA_S.from('catlak_items').select('id,name,item_type,description,attack_stat,attack_bonus,attack_formula,damage_formula,damage_type,effects,ac_mode,ac_value,is_active'),
      PLA_S.from('catlak_rolls').select('*').in('character_id',ids).order('created_at',{ascending:false}).limit(60)
    ]);
    for(const r of [vr,ir,rr])if(r.error)throw r.error;
    const inv=vr.data||[],items=ir.data||[],rolls=rr.data||[],itemMap=new Map(items.map(i=>[i.id,i]));
    for(const stack of stacks){
      const cid=plaCharId(stack);if(!cid)continue;
      const sec=plaInventorySection(stack),rows=inv.filter(x=>x.character_id===cid).map(r=>({r,i:itemMap.get(r.item_id)})).filter(x=>x.i&&x.i.is_active!==false);plaSyncEquipmentPanel(stack,rows);
      if(sec){
        sec.dataset.iwPlayerInventory='1';sec.dataset.plaInventoryOwner='1';
        const stateRows=rows.map(x=>({...x.r,item_name:x.i.name,item_type:x.i.item_type,description:x.i.description,attack_stat:x.i.attack_stat,attack_bonus:x.i.attack_bonus,attack_formula:x.i.attack_formula,damage_formula:x.i.damage_formula,effects:x.i.effects,ac_mode:x.i.ac_mode,ac_value:x.i.ac_value}));
        const structureSig=plaSignature(stateRows,['id','item_id','quantity','item_name','item_type','description','attack_stat','attack_bonus','attack_formula','damage_formula','effects','ac_mode','ac_value']);
        const stateSig=plaSignature(stateRows,['id','equipped','equipped_slot']);
        if(sec.dataset.plaInventoryStructureSig!==structureSig||!plaSyncInventoryState(sec,rows)){
          sec.innerHTML=`<div class="eyebrow">CANLI ENVANTER</div><h2>Silah • Zırh • Eşya</h2>${rows.length?`<div class="iw-player-grid">${rows.map(x=>plaPlayerItem(x.r,x.i)).join('')}</div>`:'<div class="iw-empty">Envanter boş.</div>'}`;
          sec.dataset.plaInventoryStructureSig=structureSig;sec.dataset.iwPlayerInventory='1';sec.dataset.plaInventoryOwner='1';plaSyncInventoryState(sec,rows);
        }
        sec.dataset.plaInventorySig=stateSig;
      }
      const rs=plaRollSection(stack),own=rolls.filter(x=>x.character_id===cid).slice(0,10);plaSyncRollSection(rs,own);
    }
    plaClaimInventory();plaStaticStats();
  }catch(e){console.warn('CATLAK_PLAYER_LIVE_REFRESH',e)}finally{plaRefreshing=false}
}
function plaRefreshSoon(force=false,delay=60){
  plaPendingForce=plaPendingForce||!!force;
  const due=Date.now()+Math.max(0,Number(delay)||0);
  if(plaRefreshTimer&&plaRefreshDue<=due)return;
  clearTimeout(plaRefreshTimer);plaRefreshDue=due;
  plaRefreshTimer=setTimeout(()=>{plaRefreshTimer=null;plaRefreshDue=0;const runForce=plaPendingForce;plaPendingForce=false;plaRefreshNow(runForce)},Math.max(0,due-Date.now()));
}
function plaActionButton(target){const b=target?.closest?.('[data-a="weapon"][data-id]');if(!b||!plaIsSheet()||!b.closest('main'))return null;return b}
function plaRollToast(d){
  const dice=Array.isArray(d?.dice)&&d.dice.length?d.dice.map(plaNum).join(' + '):'',mod=plaNum(d?.modifier),calc=dice?`${dice}${mod?` ${mod>0?'+':'-'} ${Math.abs(mod)}`:''} = `:'';
  return `${d?.label||'Silah'}: ${calc}${d?.total==null?'GM Kararı':d.total}`;
}
async function plaRun(b){
  const a=b.dataset.a,id=b.dataset.id;if(a!=='weapon'||!id)return;const key=`weapon:${id}:${b.dataset.k||''}`;if(plaBusy.has(key))return;plaBusy.add(key);b.disabled=true;
  try{
    const kind=b.dataset.k==='damage'?'damage':'attack',r=await PLA_S.rpc('catlak_roll_weapon',{p_inventory_id:id,p_action:kind});if(r.error)throw r.error;plaToast(plaRollToast(r.data||{}));plaRefreshSoon(true,10);
  }catch(e){plaToast(e?.message||String(e));plaRefreshSoon(true,40)}finally{plaBusy.delete(key);if(b.isConnected)b.disabled=false}
}
function plaCapture(e){const b=plaActionButton(e.target);if(!b)return;e.preventDefault();e.stopImmediatePropagation();const actionKey=`weapon:${b.dataset.id}:${b.dataset.k||''}`;if(e.type==='pointerdown'){plaActed.set(actionKey,Date.now());plaRun(b);return}const at=plaActed.get(actionKey)||0;if(Date.now()-at<900)return;plaActed.set(actionKey,Date.now());plaRun(b)}
document.addEventListener('pointerdown',plaCapture,true);
document.addEventListener('click',plaCapture,true);

const plaObserver=new MutationObserver(()=>{if(plaIsSheet()){plaClaimInventory();plaStaticStats();plaRefreshSoon(false,120)}});plaObserver.observe(PLA_APP,{childList:true,subtree:true});
PLA_S.channel('cc-player-live-actions')
 .on('postgres_changes',{event:'*',schema:'public',table:'catlak_inventory'},()=>plaRefreshSoon(true,20))
 .on('postgres_changes',{event:'*',schema:'public',table:'catlak_items'},()=>plaRefreshSoon(true,30))
 .on('postgres_changes',{event:'*',schema:'public',table:'catlak_rolls'},()=>plaRefreshSoon(true,20))
 .on('postgres_changes',{event:'*',schema:'public',table:'catlak_characters'},()=>plaRefreshSoon(false,80))
 .subscribe();
plaClaimInventory();
setInterval(()=>{if(plaIsSheet()){plaClaimInventory();plaStaticStats();plaRefreshSoon(false,0)}},4000);
setTimeout(()=>{plaClaimInventory();plaStaticStats();plaRefreshSoon(true,0)},120);
window.__catlakPlayerLiveTest={refresh:plaRefreshNow,schedule:plaRefreshSoon,item:plaPlayerItem,roll:plaRollRow,syncRolls:plaSyncRollSection,staticStats:plaStaticStats,claimInventory:plaClaimInventory,rollToast:plaRollToast};
