(function(){
'use strict';
if(window.__catlakPlayerSheetHardRecoveryV6)return;
window.__catlakPlayerSheetHardRecoveryV6=true;

const APP=document.getElementById('app');
if(!APP)return;
const STATS=['STR','DEX','CON','INT','WIS','CHA'];
let busy=false,queued=false,lastRun=0,realtimeStarted=false;

const txt=e=>String(e?.textContent||'').trim();
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=x=>Number.isFinite(Number(x))?Number(x):0;
const mod=x=>Math.floor((num(x)-10)/2);
const signed=x=>num(x)>=0?'+'+num(x):String(num(x));
const toast=x=>{const t=document.getElementById('toast');if(!t)return;t.textContent=String(x);t.classList.remove('hidden');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.add('hidden'),3600)};
const isPlayer=()=>{const r=txt(APP.querySelector('.role'));return !!r&&r!=='GM'};
const sheetButton=()=>APP.querySelector('.nav [data-tab="sheet"]');
const sheetActive=()=>isPlayer()&&!!sheetButton()?.classList.contains('on');
const main=()=>APP.querySelector('main');
const ready=()=>!!APP.querySelector('main section.hero [data-a="hp"][data-id]');

function release(){
  document.documentElement.classList.remove('cc-player-critical-pending');
  try{window.__catlakReleaseStartCover?.()}catch(_){}
  const cover=document.getElementById('cc-start-cover');
  if(cover){cover.classList.add('cc-done');setTimeout(()=>cover?.remove(),180)}
}
async function getRuntime(){
  for(let i=0;i<120;i++){if(window.__catlakSupabase)return window.__catlakSupabase;await new Promise(r=>setTimeout(r,40))}
  return null;
}
async function getSession(S){
  try{return (await S.auth.getSession()).data?.session||null}catch(_){return null}
}
async function ownedRows(S,uid){
  try{
    const r=await timeout(S.from('catlak_characters').select('*').eq('owner_id',uid).order('created_at',{ascending:true}),1200,'character owner query');
    if(!r.error&&r.data?.length)return r.data;
  }catch(_){}
  try{
    const snap=await timeout(S.rpc('catlak_player_combat_snapshot'),1200,'combat snapshot');
    const id=snap?.data?.character_id;
    if(id){
      const q=await timeout(S.from('catlak_characters').select('*').eq('id',id).maybeSingle(),1200,'character fallback');
      if(!q.error&&q.data)return [q.data];
    }
  }catch(_){}
  return [];
}
async function timeout(promise,ms=2200,label='request'){
  let timer;
  try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error(label+' timeout')),ms)})])}
  finally{clearTimeout(timer)}
}
async function safeQuery(promise,fallback=[],ms=2200){
  try{const r=await timeout(promise,ms);return r?.error?fallback:(r?.data||fallback)}catch(_){return fallback}
}
async function safeRpc(S,name,args={},fallback=null,ms=1800){
  try{const r=await timeout(S.rpc(name,args),ms,name);return r?.error?fallback:(r?.data??fallback)}catch(_){return fallback}
}
async function extras(S,chars){
  const ids=chars.map(c=>c.id).filter(Boolean);
  const species=[...new Set(chars.map(c=>c.species_name).filter(Boolean))];
  const [inv,items,rolls,powers,paths,conditions,abilities,combat]=await Promise.all([
    ids.length?safeQuery(S.from('catlak_inventory').select('*').in('character_id',ids).order('granted_at',{ascending:true}),[],1800):[],
    safeQuery(S.from('catlak_items').select('*').order('created_at',{ascending:true}),[],1800),
    ids.length?safeQuery(S.from('catlak_rolls').select('*').in('character_id',ids).order('created_at',{ascending:false}).limit(60),[],1800):[],
    species.length?safeQuery(S.from('catlak_species_powers').select('*').in('species_name',species).order('unlock_level',{ascending:true}),[],1800):[],
    species.length?safeQuery(S.from('catlak_special_paths').select('*').in('species_name',species).order('sort_order',{ascending:true}),[],1800):[],
    ids.length?safeQuery(S.from('catlak_character_conditions').select('*').in('character_id',ids).eq('active',true).order('created_at',{ascending:true}),[],1800):[],
    safeRpc(S,'catlak_player_abilities',{},[],1800),
    safeRpc(S,'catlak_player_combat_snapshot',{}, {},1800)
  ]);
  return {inv,items,rolls,powers,paths,conditions,abilities,combat};
}
function derived(c,x){
  const stats={...(c.base_stats||{})};
  const combatRow=(Array.isArray(x?.combat?.order)?x.combat.order:[]).find(r=>String(r.character_id||'')===String(c.id));
  let ac=num(c.base_ac),speed=num(c.base_speed),hp=num(combatRow?.hp_max??c.hp_max),armorSets=[],armorBonus=0;
  const itemMap=new Map(x.items.map(i=>[String(i.id),i]));
  for(const row of x.inv.filter(r=>String(r.character_id)===String(c.id)&&r.equipped)){
    const it=itemMap.get(String(row.item_id));if(!it)continue;
    const fx=it.effects||{};
    for(const k of STATS)stats[k]=num(stats[k])+num(fx[k]);
    speed+=num(fx.speed);hp+=num(fx.hp_max);
    if(it.item_type==='armor'){
      if(it.ac_mode==='set')armorSets.push(num(it.ac_value));
      if(it.ac_mode==='bonus')armorBonus+=num(it.ac_value);
    }
  }
  if(armorSets.length)ac=Math.max(ac,...armorSets);
  return {...c,hp_current:combatRow?.hp_current!=null?num(combatRow.hp_current):num(c.hp_current),ds:stats,ac:ac+armorBonus,speed,hp};
}
function inventoryHtml(c,x){
  const itemMap=new Map(x.items.map(i=>[String(i.id),i]));
  const rows=x.inv.filter(r=>String(r.character_id)===String(c.id)).map(r=>({...r,it:itemMap.get(String(r.item_id))})).filter(r=>r.it);
  if(!rows.length)return '<div class="empty">Envanter boş.</div>';
  return '<div class="grid">'+rows.map(r=>{
    const i=r.it,weapon=i.item_type==='weapon',armor=i.item_type==='armor',manual=weapon&&!i.damage_formula;
    const mainOn=!!r.equipped&&String(r.equipped_slot||'')==='main_weapon';
    const offOn=!!r.equipped&&String(r.equipped_slot||'')==='off_weapon';
    return `<article class="item iw-player-item ${r.equipped?'on':''}" data-pla-inv-row="${esc(r.id)}">
      <span class="tag">${weapon?'SİLAH':armor?'ZIRH':'EŞYA'}</span>
      <h3>${esc(i.name||'Eşya')} ${num(r.quantity)>1?'×'+num(r.quantity):''}</h3>
      <p>${esc(i.description||'')}</p>
      ${armor?`<p>AC: ${i.ac_mode==='set'?'en az '+num(i.ac_value):i.ac_mode==='bonus'?signed(i.ac_value)+' bonus':'etki yok'}</p>`:''}
      <div class="actions">
        ${weapon?`<div class="ws-slot-controls" data-ws-controls="1">
          <button type="button" class="${mainOn?'ws-active':''}" data-ws-slot="main_weapon">${mainOn?'✓ 1. Yuvaya Atandı':'1. Yuvaya Ata'}</button>
          <button type="button" class="${offOn?'ws-active':''}" data-ws-slot="off_weapon">${offOn?'✓ 2. Yuvaya Atandı':'2. Yuvaya Ata'}</button>
        </div>
        <button type="button" data-a="equip" data-cc-hard-equip="1" data-pla-equip-kind="weapon" data-id="${esc(r.id)}" data-v="1">Kuşan</button>
        <button type="button" data-ws-remove="${esc(r.id)}">Çıkar</button>
        <button type="button" data-a="weapon" data-cc-hard-weapon="attack" data-id="${esc(r.id)}" data-k="attack">Saldırı At</button>
        <button type="button" data-a="weapon" data-cc-hard-weapon="damage" data-id="${esc(r.id)}" data-k="damage">${manual?'Hasar • DM Kararı':'Hasar At'}</button>`:armor?`<button type="button" data-a="equip" data-cc-hard-equip="1" data-id="${esc(r.id)}" data-v="${r.equipped?'0':'1'}">${r.equipped?'Çıkar':'Kuşan'}</button>`:''}
      </div>
    </article>`;
  }).join('')+'</div>';
}
function rollsHtml(c,x){
  const rows=x.rolls.filter(r=>String(r.character_id)===String(c.id)).slice(0,10);
  if(!rows.length)return '<div class="empty">Henüz zar yok.</div>';
  return '<div class="rolls">'+rows.map(r=>`<div class="roll">
    <div class="die">${r.total==null?'?':esc(r.total)}</div>
    <div><b>${esc(c.name||r.label||'Karakter')}</b><br><span>${esc(r.label||r.roll_kind||'Zar')}</span><br>
    <small>${esc(r.formula||'')} ${r.modifier?signed(r.modifier):''} • ${r.created_at?new Date(r.created_at).toLocaleTimeString('tr-TR'):''}</small>
    ${r.dm_ruling?`<div class="gold">GM: ${esc(r.dm_ruling)}</div>`:''}</div>
  </div>`).join('')+'</div>';
}
function powersHtml(c,x){
  const rows=x.powers.filter(p=>p.species_name===c.species_name&&p.data?.disabled!==true&&num(p.unlock_level)<=num(c.level));
  if(!rows.length)return '<div class="empty">Bu seviyede kayıtlı ırk gücü yok.</div>';
  return '<div class="grid">'+rows.map(p=>`<article class="power"><small>SEVİYE ${num(p.unlock_level)||1}</small><h3>${esc(p.name)}</h3><p>${esc(p.short_description||p.data?.description||'')}</p>${p.detail_note?`<div class="note"><b>DETAY NOTU</b><p>${esc(p.detail_note)}</p></div>`:''}</article>`).join('')+'</div>';
}
function embeddedPowers(c){
  const rows=Array.isArray(c?.data?.special_abilities)?c.data.special_abilities:[];
  return rows.filter(x=>x&&x.name).map(x=>`<article class="power"><small>ÖZEL</small><h3>${esc(x.name)}</h3><p>${esc(x.description||'')}</p></article>`).join('');
}
function conditionsHtml(c,x){
  const rows=(x.conditions||[]).filter(a=>String(a.character_id)===String(c.id));
  return `<section class="card" data-cc-hard-conditions><div class="eyebrow">AKTİF DURUMLAR</div><h2>Durum Etkileri</h2>${rows.length?'<div class="actions">'+rows.map(a=>`<span class="tag">${esc(a.name||'Durum')}${a.remaining_rounds==null?'':' • '+num(a.remaining_rounds)+' round'}${a.note?' • '+esc(a.note):''}</span>`).join('')+'</div>':'<p class="muted">Aktif durum etkisi yok.</p>'}</section>`;
}
function hardAbilityTargets(a,x){
  const rows=Array.isArray(x?.combat?.order)?x.combat.order:[];
  if(a.target_type==='enemy')return rows.filter(r=>r.kind==='enemy'&&num(r.hp_current)>0);
  if(a.target_type==='ally')return rows.filter(r=>r.kind==='player'&&num(r.hp_current)>0);
  return [];
}
function abilitiesHtml(c,x){
  const rows=Array.isArray(x.abilities)?x.abilities:[];
  if(!rows.length)return `<section class="card" data-cc-hard-abilities><div class="eyebrow">YETENEKLER & BÜYÜLER</div><h2>Karakter Yetenekleri</h2><p class="muted">GM tarafından atanmış aktif yetenek yok.</p></section>`;
  const active=!!x?.combat?.active,isTurn=!!x?.combat?.is_my_turn;
  return `<section class="card" data-cc-hard-abilities><div class="eyebrow">YETENEKLER & BÜYÜLER</div><h2>Karakter Yetenekleri</h2><div class="grid">${rows.map(a=>{
    const targets=hardAbilityTargets(a,x),finite=a.uses_per_combat!=null,out=finite&&num(a.uses_remaining)<=0,needs=a.target_type!=='self';
    const can=!out&&(!active||isTurn)&&(!needs||targets.length>0);
    const target=needs?`<select data-cc-hard-ability-target="${esc(a.assignment_id)}">${targets.length?targets.map(t=>`<option value="${esc(t.id)}">${esc(t.name)} • HP ${num(t.hp_current)}/${num(t.hp_max)}</option>`).join(''):'<option value="">Uygun hedef yok</option>'}</select>`:'';
    const uses=finite?`${num(a.uses_remaining)}/${num(a.uses_per_combat)}`:'∞';
    return `<article class="power"><small>${esc(String(a.ability_type||'skill').toUpperCase())}</small><h3>${esc(a.name||'Yetenek')}</h3><p>${esc(a.description||'')}${a.formula?' • '+esc(a.formula):''}</p><div class="muted">Kullanım: ${uses}</div><div class="actions">${target}<button type="button" class="primary" data-cc-hard-ability="${esc(a.assignment_id)}" ${can?'':'disabled'}>${out?'Hak Bitti':active&&!isTurn?'Sıra Sende Değil':'Kullan'}</button></div></article>`;
  }).join('')}</div></section>`;
}
function pathHtml(c,x){
  const key=c?.data?.special_path;if(!key)return'';
  const p=x.paths.find(p=>p.species_name===c.species_name&&String(p.path_key)===String(key));if(!p)return'';
  const fs=(p.data?.features||[]).filter(f=>num(f.level)<=num(c.level)).sort((a,b)=>num(a.level)-num(b.level));
  return `<section class="card"><div class="section-title"><div><div class="eyebrow">ÖZEL YOL</div><h2>${esc(p.name)}</h2><p class="muted">${esc(p.data?.title||'')} ${p.data?.role?'• '+esc(p.data.role):''}</p></div></div><p>${esc(p.data?.summary||'')}</p>
  <div class="grid">${fs.length?fs.map(f=>`<article class="power"><small>SEVİYE ${num(f.level)}</small><h3>${esc(f.name)}</h3><p>${esc(f.text||f.description||'')}</p></article>`).join(''):'<div class="empty">Henüz yol gücü açılmadı.</div>'}</div></section>`;
}
function vampHtml(c){
  if(String(c.species_name||'')!=='Vampir')return'';
  const max=3+(num(c.level)>=4?1:0)+(num(c.level)>=14?2:0),kp=Math.max(0,Math.min(max,num(c?.data?.vampire_kp??3)));
  return `<section class="card vampire"><div class="section-title"><div><div class="eyebrow">VAMPİR • KIRMIZI PUANI</div><h2>KP ${kp}/${max}</h2></div><div class="actions"><button data-a="vkp" data-cc-hard-vkp="1" data-id="${esc(c.id)}" data-d="-1">KP −</button><button data-a="vkp" data-cc-hard-vkp="1" data-id="${esc(c.id)}" data-d="1">KP +</button></div></div></section>`;
}
function charHtml(raw,x){
  const c=derived(raw,x),lv=Math.max(1,num(c.level)||1);
  return `<div class="cc-character-stack ps-player-sheet" data-cc-hard-stack="${esc(c.id)}"><section class="card hero" data-cc-hard-recovery-hero="${esc(c.id)}"><div><div class="eyebrow">CANLI KARAKTER KAĞIDI</div><h1>${esc(c.name||'Karakter')}</h1><p>${esc(c.species_name||'-')} • ${esc(c.class_name||'-')} ${lv} • ${esc(c.background_name||'-')}</p></div>
  <div class="vitals"><div class="vital"><span>HP</span><b>${num(c.hp_current)}/${num(c.hp)}</b><div class="row center"><button class="small" data-a="hp" data-cc-hard-hp="1" data-id="${esc(c.id)}" data-d="-1">−</button><button class="small" data-a="hp" data-cc-hard-hp="1" data-id="${esc(c.id)}" data-d="1">+</button></div></div><div class="vital"><span>AC</span><b>${num(c.ac)}</b></div><div class="vital"><span>HIZ</span><b>${num(c.speed)}</b></div><div class="vital"><span>SEVİYE</span><b>${lv}</b></div></div></section>
  <section class="card"><div class="section-title"><div><div class="eyebrow">D20 TESTLERİ</div><h2>Statına bas, zarını at</h2></div><span class="live">● CANLI</span></div><div class="stats">${STATS.map(k=>`<button class="stat" data-a="stat" data-cc-hard-stat="${k}" data-cc-hard-character="${esc(c.id)}" data-id="${esc(c.id)}" data-stat="${k}"><b>${k}</b><strong>${num(c.ds?.[k])}</strong><small>${signed(mod(c.ds?.[k]))} • d20 at</small></button>`).join('')}</div></section>
  ${vampHtml(c)}${pathHtml(c,x)}
  <section class="card"><div class="eyebrow">IRK GÜÇLERİ</div>${powersHtml(c,x)}${embeddedPowers(c)}</section>
  ${conditionsHtml(c,x)}
  ${abilitiesHtml(c,x)}
  <section class="card"><div class="eyebrow">CANLI ENVANTER</div><h2>Silah • Zırh • Eşya</h2>${inventoryHtml(c,x)}</section>
  <section class="card"><div class="eyebrow">SON ZARLAR</div>${rollsHtml(c,x)}</section></div>`;
}
function applyLayers(){
  try{window.__catlakPlayerSheetTest?.apply?.()}catch(_){}
  try{window.__catlakStatRollTest?.ensure?.()}catch(_){}
  try{window.__catlakPlayerSheetSupport?.refresh?.(true)}catch(_){}
  try{window.__catlakPlayerLiveTest?.refresh?.(true)}catch(_){}
  try{window.__catlakPlayerSheetEquipmentAbilitiesTest?.paint?.(true)}catch(_){}
  try{window.__catlakLiveGameEntryGuard?.repairPlayerSheet?.()}catch(_){}
  setTimeout(()=>{try{window.__catlakStatRollTest?.ensure?.()}catch(_){}try{window.__catlakPlayerSheetSupport?.refresh?.(true)}catch(_){}try{window.__catlakPlayerSheetEquipmentAbilitiesTest?.paint?.(true)}catch(_){}},120);
}
const actionLocks=new Set();
async function withAction(key,btn,fn){
  if(actionLocks.has(key))return;actionLocks.add(key);if(btn)btn.disabled=true;
  try{return await fn()}catch(e){console.warn('CATLAK_HARD_ACTION',key,e);toast(e?.message||String(e))}
  finally{actionLocks.delete(key);if(btn?.isConnected)btn.disabled=false}
}
async function hardHp(btn){
  const id=btn.dataset.id,delta=num(btn.dataset.d);if(!id||!delta)return;
  const vital=btn.closest('.vital'),label=vital?.querySelector('b');
  const m=String(label?.textContent||'').match(/(\d+)\s*\/\s*(\d+)/),current=num(m?.[1]),max=num(m?.[2]),next=Math.max(0,Math.min(max,current+delta));
  return withAction('hp:'+id,btn,async()=>{
    const S=await getRuntime();if(!S)throw new Error('Bağlantı hazır değil.');
    const r=await S.rpc('catlak_update_my_hp',{p_character_id:id,p_hp:next});if(r.error)throw r.error;
    if(label)label.textContent=next+'/'+max;toast('HP '+next+'/'+max);setTimeout(()=>recover(true),50);
  });
}
async function hardStat(btn){
  const cid=btn.dataset.ccHardCharacter||btn.dataset.id,stat=String(btn.dataset.ccHardStat||'').toUpperCase();if(!cid||!STATS.includes(stat))return;
  return withAction('stat:'+cid+':'+stat,btn,async()=>{
    const S=await getRuntime(),r=await S.rpc('catlak_roll_stat',{p_character_id:cid,p_stat:stat});if(r.error)throw r.error;
    toast((r.data?.label||stat)+': '+(r.data?.total??'?'));setTimeout(()=>recover(true),60);
  });
}
async function hardWeapon(btn){
  const id=btn.dataset.id,kind=btn.dataset.ccHardWeapon||btn.dataset.k||'attack';if(!id)return;
  return withAction('weapon:'+id+':'+kind,btn,async()=>{
    const S=await getRuntime(),r=await S.rpc('catlak_roll_weapon',{p_inventory_id:id,p_action:kind});if(r.error)throw r.error;
    toast((r.data?.label||'Silah')+': '+(r.data?.total??'DM Kararı'));setTimeout(()=>recover(true),60);
  });
}
async function hardEquip(btn){
  const id=btn.dataset.id;if(!id)return;
  return withAction('equip:'+id,btn,async()=>{
    const S=await getRuntime(),r=await S.rpc('catlak_set_equipped',{p_inventory_id:id,p_equipped:btn.dataset.v==='1'});if(r.error)throw r.error;
    toast('Ekipman güncellendi.');setTimeout(()=>recover(true),60);
  });
}
async function hardSlot(btn){
  const card=btn.closest('.iw-player-item[data-pla-inv-row]'),id=card?.dataset.plaInvRow,slot=btn.dataset.wsSlot||null;if(!id)return;
  return withAction('slot:'+id,btn,async()=>{
    const S=await getRuntime(),r=await S.rpc('catlak_set_equipped_slot',{p_inventory_id:id,p_slot:slot});if(r.error)throw r.error;
    toast(slot==='main_weapon'?'Silah 1. yuvaya atandı.':slot==='off_weapon'?'Silah 2. yuvaya atandı.':'Silah çıkarıldı.');
    setTimeout(()=>recover(true),50);
  });
}
async function hardVkp(btn){
  const id=btn.dataset.id;if(!id)return;
  return withAction('vkp:'+id,btn,async()=>{
    const S=await getRuntime(),r=await S.rpc('catlak_update_vampire_kp',{p_character_id:id,p_delta:num(btn.dataset.d)});if(r.error)throw r.error;
    toast('KP: '+r.data);setTimeout(()=>recover(true),60);
  });
}
async function hardAbility(btn){
  const id=btn.dataset.ccHardAbility;if(!id)return;
  const target=APP.querySelector('[data-cc-hard-ability-target="'+CSS.escape(id)+'"]')?.value||null;
  return withAction('ability:'+id,btn,async()=>{
    const S=await getRuntime(),r=await S.rpc('catlak_player_use_ability',{p_assignment_id:id,p_target_id:target});if(r.error)throw r.error;
    const d=r.data||{};let m=d.ability||'Yetenek';if(d.hit===false)m+=': ISKA';else if(d.effect_type==='damage')m+=': '+d.amount+' hasar';else if(d.effect_type==='heal')m+=': '+d.amount+' iyileştirme';else m+=' kullanıldı';
    toast(m);setTimeout(()=>recover(true),60);
  });
}
function showWaiting(message){
  const m=main();if(!m||!sheetActive())return;
  m.dataset.ccHardSheet='waiting';
  m.innerHTML=`<section class="card"><div class="eyebrow">OYUNCU MASASI</div><h2>Karakter kağıdı hazırlanıyor…</h2><p class="muted">${esc(message||'Davet bağlantısı tamamlandı. Karakter verisi bekleniyor.')}</p><button type="button" data-cc-hard-sheet-retry>Tekrar Dene</button></section>`;
  release();
}
async function recover(force=false){
  queued=false;
  if(!sheetActive())return false;
  const hadReady=ready();
  if(hadReady&&!force)return true;
  if(hadReady&&main()?.dataset.ccHardSheet!=='1')return true;
  if(busy)return hadReady;
  const now=Date.now();if(!force&&now-lastRun<180)return hadReady;lastRun=now;busy=true;
  try{
    const S=await getRuntime();if(!S)return hadReady;
    const ses=await getSession(S);if(!ses?.user?.id){if(!hadReady)showWaiting('Oyuncu oturumu henüz hazır değil.');return hadReady}
    if(!hadReady)showWaiting('Karakter bilgileri yükleniyor…');
    let chars=[];
    for(const wait of [0,180,500]){
      if(wait)await new Promise(r=>setTimeout(r,wait));
      chars=await ownedRows(S,ses.user.id);
      if(chars.length)break;
      if(!sheetActive())return false;
    }
    if(!chars.length){if(!hadReady)showWaiting('Karakter hesabına bağlandı ancak kayıt henüz görünür değil. Sistem otomatik tekrar deneyecek.');setTimeout(()=>schedule(true,0),900);return hadReady}
    if(!sheetActive())return false;
    const m=main();if(!m)return false;
    const base={inv:[],items:[],rolls:[],powers:[],paths:[],conditions:[],abilities:[],combat:{}};
    m.className='';
    m.dataset.ccHardSheet='1';
    delete m.dataset.ccDesk;delete m.dataset.ccPage;
    m.innerHTML=chars.map(c=>charHtml(c,base)).join('');
    try{window.__catlakPlayerSheetBindFix?.bind?.()}catch(_){}
    applyLayers();release();
    const baseReady=ready();
    extras(S,chars).then(x=>{
      if(!sheetActive())return;
      const cur=main();if(!cur||cur.dataset.ccHardSheet!=='1')return;
      cur.innerHTML=chars.map(c=>charHtml(c,x)).join('');
      try{window.__catlakPlayerSheetBindFix?.bind?.()}catch(_){}
      applyLayers();release();
    }).catch(e=>console.warn('CATLAK_PLAYER_SHEET_EXTRAS',e));
    return baseReady;
  }catch(e){
    console.warn('CATLAK_PLAYER_SHEET_HARD_RECOVERY',e);
    showWaiting(e?.message||'Karakter verisi yüklenemedi.');
    return false;
  }finally{busy=false}
}
function schedule(force=false,delay=0){
  if(queued&&!force)return;queued=true;
  setTimeout(()=>recover(force),Math.max(0,delay));
}
document.addEventListener('click',e=>{
  const root=e.target?.closest?.('main[data-cc-hard-sheet="1"]');
  if(root){
    const hp=e.target.closest?.('[data-cc-hard-hp][data-id]');if(hp){e.preventDefault();e.stopImmediatePropagation();hardHp(hp);return}
    const stat=e.target.closest?.('[data-cc-hard-stat]');if(stat){e.preventDefault();e.stopImmediatePropagation();hardStat(stat);return}
    const weapon=e.target.closest?.('[data-cc-hard-weapon][data-id]');if(weapon){e.preventDefault();e.stopImmediatePropagation();hardWeapon(weapon);return}
    const equip=e.target.closest?.('[data-cc-hard-equip][data-id]');if(equip){e.preventDefault();e.stopImmediatePropagation();hardEquip(equip);return}
    const slot=e.target.closest?.('[data-ws-slot]');if(slot){e.preventDefault();e.stopImmediatePropagation();hardSlot(slot);return}
    const vkp=e.target.closest?.('[data-cc-hard-vkp][data-id]');if(vkp){e.preventDefault();e.stopImmediatePropagation();hardVkp(vkp);return}
    const ability=e.target.closest?.('[data-cc-hard-ability]');if(ability){e.preventDefault();e.stopImmediatePropagation();hardAbility(ability);return}
  }
  if(e.target?.closest?.('[data-cc-hard-sheet-retry]')){e.preventDefault();e.stopImmediatePropagation();schedule(true,0);return}
  const b=e.target?.closest?.('#app .nav [data-tab="sheet"]');
  if(b&&isPlayer()){setTimeout(()=>schedule(true,0),40);setTimeout(()=>schedule(true,0),300)}
},true);
window.addEventListener('catlak:player-fast-ready',()=>schedule(true,0));
window.addEventListener('catlak:data-refreshed',()=>{if(sheetActive())schedule(true,30)});
new MutationObserver(()=>{
  if(!sheetActive()||ready())return;
  const m=main();if(!m)return;
  if(!m.children.length||m.dataset.ccDesk==='1'||m.dataset.ccHardSheet==='waiting')schedule(false,80);
}).observe(APP,{childList:true,subtree:true});
async function realtime(){
  if(realtimeStarted)return;const S=await getRuntime();if(!S||realtimeStarted)return;realtimeStarted=true;
  const rerun=()=>{if(sheetActive()&&main()?.dataset.ccHardSheet==='1')schedule(true,80)};
  S.channel('cc-player-hard-sheet-v1')
    .on('postgres_changes',{event:'*',schema:'public',table:'catlak_characters'},rerun)
    .on('postgres_changes',{event:'*',schema:'public',table:'catlak_inventory'},rerun)
    .on('postgres_changes',{event:'*',schema:'public',table:'catlak_rolls'},rerun)
    .on('postgres_changes',{event:'*',schema:'public',table:'catlak_character_conditions'},rerun)
    .on('postgres_changes',{event:'*',schema:'public',table:'catlak_character_abilities'},rerun)
    .on('postgres_changes',{event:'*',schema:'public',table:'catlak_combatants'},rerun)
    .on('postgres_changes',{event:'*',schema:'public',table:'catlak_combat_state'},rerun)
    .subscribe();
}
setTimeout(()=>schedule(true,0),180);
setTimeout(()=>schedule(true,0),700);
setTimeout(()=>schedule(true,0),1600);
setTimeout(()=>schedule(true,0),3200);
realtime();
window.__catlakPlayerSheetHardRecovery={recover:()=>recover(true),ready};
})();