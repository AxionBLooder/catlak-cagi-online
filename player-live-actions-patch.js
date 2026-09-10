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
let plaRefreshTimer=null,plaRefreshing=false,plaLastRefresh=0;
const plaBusy=new Set();
const plaActed=new WeakMap();

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
  const fx=i.effects||{},note=fx.public_note||'',mode=fx.item_mode||'general',type=i.item_type;let meta='',actions='';
  if(type==='weapon'){
    const stat=i.attack_stat&&i.attack_stat!=='NONE'?i.attack_stat:'STR',weaponBonus=plaNum(i.attack_bonus);
    meta=`Saldırı • ${stat} bonusu${weaponBonus?` ${weaponBonus>0?'+':'-'} ${Math.abs(weaponBonus)} silah`:''} • Hasar • ${stat} bonusu`;
    actions=`<button type="button" data-a="equip" data-id="${r.id}" data-v="${r.equipped?'0':'1'}">${r.equipped?'Çıkar':'Kuşan'}</button><button type="button" class="primary" data-a="weapon" data-id="${r.id}" data-k="attack">Saldırı At</button><button type="button" data-a="weapon" data-id="${r.id}" data-k="damage">Hasar Vur</button>`;
  }else if(type==='armor'){
    meta=i.ac_mode==='set'?`AC Tabanı ${i.ac_value}`:i.ac_mode==='bonus'?`AC +${i.ac_value}`:'AC etkisi yok';
    actions=`<button type="button" data-a="equip" data-id="${r.id}" data-v="${r.equipped?'0':'1'}">${r.equipped?'Çıkar':'Kuşan'}</button>`;
  }else if(mode==='accessory'){
    meta='Pasif / Aksesuar';actions=`<button type="button" data-a="equip" data-id="${r.id}" data-v="${r.equipped?'0':'1'}">${r.equipped?'Çıkar':'Tak'}</button>`;
  }else if(mode==='consumable'){
    meta=`Tüketilebilir • ${fx.consume_formula||''}`;actions=`<button type="button" class="primary" data-iw-use="${r.id}">Kullan</button>`;
  }else meta=plaModeLabel(mode);
  return `<article class="iw-player-item ${r.equipped?'on':''}" data-pla-inv-row="${r.id}"><span class="tag">${type==='weapon'?'SİLAH':type==='armor'?'ZIRH':'EŞYA'}</span><h3>${plaEsc(i.name)} ${r.quantity>1?'×'+r.quantity:''}</h3><p>${plaEsc(i.description||'')}</p><div class="iw-meta">${plaEsc(meta)}</div>${note?`<div class="iw-player-note">${plaEsc(note)}</div>`:''}${actions?`<div class="actions" style="margin-top:10px">${actions}</div>`:''}</article>`;
}
function plaRollRow(r){
  const die=Array.isArray(r.dice)?Number(r.dice[0]):NaN,crit=die===20?' cc-critical':die===1?' cc-fumble':'',diceTxt=Array.isArray(r.dice)&&r.dice.length?`[${r.dice.map(plaNum).join(', ')}]`:'';
  return `<div class="roll${crit}" data-pla-roll="${r.id}"><div class="die">${r.total==null?'?':plaEsc(r.total)}</div><div><b>${plaEsc(r.label||r.roll_kind||'Zar')}</b><br><small>${plaEsc(diceTxt)}${r.modifier?` ${r.modifier>0?'+':''}${plaNum(r.modifier)}`:''} • ${new Date(r.created_at).toLocaleTimeString('tr-TR')}</small>${Number(r.total)===0?'<div class="ccr-critical">KRİTİK BAŞARISIZLIK</div>':''}</div></div>`;
}
function plaSignature(rows,fields){return JSON.stringify(rows.map(r=>fields.map(k=>r?.[k]??null)))}
async function plaRefreshNow(force=false){
  if(!plaIsSheet()||plaRefreshing)return;
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
    let equipmentDirty=false;
    for(const stack of stacks){
      const cid=plaCharId(stack);if(!cid)continue;
      const sec=plaInventorySection(stack),rows=inv.filter(x=>x.character_id===cid).map(r=>({r,i:itemMap.get(r.item_id)})).filter(x=>x.i&&x.i.is_active!==false);
      if(sec){
        sec.dataset.iwPlayerInventory='1';sec.dataset.plaInventoryOwner='1';
        const sig=plaSignature(rows.map(x=>({...x.r,item_name:x.i.name,item_type:x.i.item_type,attack_stat:x.i.attack_stat,attack_bonus:x.i.attack_bonus,attack_formula:x.i.attack_formula,damage_formula:x.i.damage_formula,effects:x.i.effects,ac_mode:x.i.ac_mode,ac_value:x.i.ac_value})),['id','item_id','quantity','equipped','equipped_slot','item_name','item_type','attack_stat','attack_bonus','attack_formula','damage_formula','effects','ac_mode','ac_value']);
        if(sec.dataset.plaInventorySig!==sig){sec.innerHTML=`<div class="eyebrow">CANLI ENVANTER</div><h2>Silah • Zırh • Eşya</h2>${rows.length?`<div class="iw-player-grid">${rows.map(x=>plaPlayerItem(x.r,x.i)).join('')}</div>`:'<div class="iw-empty">Envanter boş.</div>'}`;sec.dataset.plaInventorySig=sig;sec.dataset.iwPlayerInventory='1';sec.dataset.plaInventoryOwner='1';equipmentDirty=true}
      }
      const rs=plaRollSection(stack),own=rolls.filter(x=>x.character_id===cid).slice(0,10);
      if(rs){const sig=plaSignature(own,['id','label','roll_kind','formula','modifier','total','dice','created_at']);if(rs.dataset.plaRollSig!==sig){rs.innerHTML=`<div class="eyebrow">SON ZARLAR</div>${own.length?`<div class="rolls">${own.map(plaRollRow).join('')}</div>`:'<div class="empty">Henüz zar yok.</div>'}`;rs.dataset.plaRollSig=sig}}
    }
    if(equipmentDirty)PLA_APP.querySelectorAll('[data-gmt-player-panel]').forEach(x=>x.remove());
    plaClaimInventory();plaStaticStats();
  }catch(e){console.warn('CATLAK_PLAYER_LIVE_REFRESH',e)}finally{plaRefreshing=false}
}
function plaRefreshSoon(force=false,delay=60){clearTimeout(plaRefreshTimer);plaRefreshTimer=setTimeout(()=>plaRefreshNow(force),delay)}
function plaActionButton(target){const b=target?.closest?.('[data-a="equip"][data-id],[data-a="weapon"][data-id]');if(!b||!plaIsSheet()||!b.closest('main'))return null;return b}
function plaOptimisticEquip(b,equip){
  const card=b.closest('.iw-player-item');if(!card)return()=>{};
  const prev={on:card.classList.contains('on'),text:b.textContent,v:b.dataset.v};
  const tag=plaTxt(card.querySelector('.tag')),off=tag==='EŞYA'?'Tak':'Kuşan';
  card.classList.add('pla-equip-pending');card.classList.toggle('on',equip);b.dataset.v=equip?'0':'1';b.textContent=equip?'Çıkar':off;
  return()=>{card.classList.toggle('on',prev.on);card.classList.remove('pla-equip-pending');b.textContent=prev.text;b.dataset.v=prev.v}
}
function plaRollToast(d){
  const dice=Array.isArray(d?.dice)&&d.dice.length?d.dice.map(plaNum).join(' + '):'',mod=plaNum(d?.modifier),calc=dice?`${dice}${mod?` ${mod>0?'+':'-'} ${Math.abs(mod)}`:''} = `:'';
  return `${d?.label||'Silah'}: ${calc}${d?.total==null?'GM Kararı':d.total}`;
}
async function plaRun(b){
  const a=b.dataset.a,id=b.dataset.id;if(!a||!id)return;const key=`${a}:${id}:${b.dataset.k||b.dataset.v||''}`;if(plaBusy.has(key))return;plaBusy.add(key);b.disabled=true;let rollback=null;
  try{
    if(a==='equip'){
      const equip=b.dataset.v==='1';rollback=plaOptimisticEquip(b,equip);const r=await PLA_S.rpc('catlak_set_equipped',{p_inventory_id:id,p_equipped:equip});if(r.error)throw r.error;b.closest('.iw-player-item')?.classList.remove('pla-equip-pending');plaToast(equip?'Teçhizat kuşanıldı.':'Teçhizat çıkarıldı.');PLA_APP.querySelectorAll('[data-gmt-player-panel]').forEach(x=>x.remove());plaRefreshSoon(true,10);
    }else if(a==='weapon'){
      const kind=b.dataset.k==='damage'?'damage':'attack',r=await PLA_S.rpc('catlak_roll_weapon',{p_inventory_id:id,p_action:kind});if(r.error)throw r.error;plaToast(plaRollToast(r.data||{}));plaRefreshSoon(true,10);
    }
  }catch(e){rollback?.();plaToast(e?.message||String(e));plaRefreshSoon(true,40)}finally{plaBusy.delete(key);if(b.isConnected)b.disabled=false}
}
function plaCapture(e){const b=plaActionButton(e.target);if(!b)return;e.preventDefault();e.stopImmediatePropagation();if(e.type==='pointerdown'){plaActed.set(b,Date.now());plaRun(b);return}const at=plaActed.get(b)||0;if(Date.now()-at<900)return;plaActed.set(b,Date.now());plaRun(b)}
document.addEventListener('pointerdown',plaCapture,true);
document.addEventListener('click',plaCapture,true);

const plaObserver=new MutationObserver(()=>{if(plaIsSheet()){plaClaimInventory();plaStaticStats();plaRefreshSoon(false,120)}});plaObserver.observe(PLA_APP,{childList:true,subtree:true});
PLA_S.channel('cc-player-live-actions')
 .on('postgres_changes',{event:'*',schema:'public',table:'catlak_inventory'},()=>{PLA_APP.querySelectorAll('[data-gmt-player-panel]').forEach(x=>x.remove());plaRefreshSoon(true,20)})
 .on('postgres_changes',{event:'*',schema:'public',table:'catlak_items'},()=>plaRefreshSoon(true,30))
 .on('postgres_changes',{event:'*',schema:'public',table:'catlak_rolls'},()=>plaRefreshSoon(true,20))
 .on('postgres_changes',{event:'*',schema:'public',table:'catlak_characters'},()=>plaRefreshSoon(false,80))
 .subscribe();
plaClaimInventory();
setInterval(()=>{if(plaIsSheet()){plaClaimInventory();plaStaticStats();plaRefreshSoon(false,0)}},4000);
setTimeout(()=>{plaClaimInventory();plaStaticStats();plaRefreshSoon(true,0)},120);
window.__catlakPlayerLiveTest={refresh:plaRefreshNow,item:plaPlayerItem,roll:plaRollRow,staticStats:plaStaticStats,claimInventory:plaClaimInventory,rollToast:plaRollToast};