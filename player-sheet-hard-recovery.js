(function(){
'use strict';
if(window.__catlakPlayerSheetHardRecoveryV10)return;
window.__catlakPlayerSheetHardRecoveryV10=true;

const APP=document.getElementById('app');
if(!APP)return;
APP.classList.add('cc-player-hard-active');
if(!document.getElementById('cc-player-hard-ui-style')){
  const st=document.createElement('style');st.id='cc-player-hard-ui-style';st.textContent=`
  #app.cc-player-hard-active main .cc-desk-intro{display:none!important}
  #app.cc-player-hard-active main[data-cc-hard-sheet="1"] .cc-character-stack{display:flex!important;flex-direction:column!important;gap:14px!important;max-width:1080px!important;margin:0 auto!important}
  #app.cc-player-hard-active main[data-cc-hard-sheet="1"] .cc-character-stack>section{width:100%!important;margin:0!important}
  #app.cc-player-hard-active main[data-cc-hard-sheet="1"] section.hero{order:10}
  #app.cc-player-hard-active main[data-cc-hard-sheet="1"] [data-cc-hard-stats]{order:20}
  #app.cc-player-hard-active main[data-cc-hard-sheet="1"] [data-cc-hard-race]{order:30}
  #app.cc-player-hard-active main[data-cc-hard-sheet="1"] [data-cc-hard-conditions]{order:40}
  #app.cc-player-hard-active main[data-cc-hard-sheet="1"] [data-cc-hard-abilities]{order:50}
  #app.cc-player-hard-active main[data-cc-hard-sheet="1"] [data-cc-hard-equipment]{order:60}
  #app.cc-player-hard-active main[data-cc-hard-sheet="1"] [data-cc-hard-inventory]{order:70}
  #app.cc-player-hard-active main[data-cc-hard-sheet="1"] [data-cc-hard-rolls]{order:80}
  #app.cc-player-hard-active [data-cc-hard-stats] .eyebrow{display:none!important}
  #app.cc-player-hard-active [data-cc-hard-stats] .stat{cursor:pointer!important;pointer-events:auto!important}
  #app.cc-player-hard-active [data-cc-hard-equipment] .gmt-slot{display:grid;grid-template-columns:95px minmax(0,1fr);gap:10px;padding:7px 0;border-bottom:1px solid var(--line)}
  #app.cc-player-hard-active [data-cc-hard-equipment] .gmt-slot:last-child{border-bottom:0}
  #app.cc-player-hard-active [data-cc-hard-equipment] .gmt-slot b{color:var(--gold)}
  `;document.head.appendChild(st)
}
const STATS=['STR','DEX','CON','INT','WIS','CHA'];
let busy=false,queued=false,lastRun=0,realtimeStarted=false,stableBusy=false,stableAgain=false;
const stableKinds=new Set();

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
const previousPreserve=window.__catlakShouldPreserveCurrentView;
window.__catlakShouldPreserveCurrentView=function(){
  const m=main();
  if(sheetActive()&&m?.dataset.ccHardSheet==='1'&&ready())return true;
  try{return typeof previousPreserve==='function'?!!previousPreserve():false}catch(_){return false}
};

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
function equipmentHtml(c,x){
  const itemMap=new Map((x.items||[]).map(i=>[String(i.id),i]));
  const rows=(x.inv||[]).filter(r=>String(r.character_id)===String(c.id)&&r.equipped);
  const slot=(key)=>{const hit=rows.find(r=>String(r.equipped_slot||'')===key),it=hit&&itemMap.get(String(hit.item_id));return it?.name||'Boş'};
  return `<section class="card gmt-player-panel" data-gmt-player-panel="${esc(c.id)}" data-cc-hard-equipment>
    <div class="gmt-player-two"><div data-gmt-equip-pane><div class="eyebrow">TAKILI TEÇHİZAT</div><h2>Silah Yuvaları</h2><div data-pssr-slots>
      <div class="gmt-slot" data-gmt-slot="main_weapon"><b>1. Silah</b><span class="${slot('main_weapon')==='Boş'?'muted':''}">${esc(slot('main_weapon'))}</span></div>
      <div class="gmt-slot" data-gmt-slot="off_weapon"><b>2. Silah</b><span class="${slot('off_weapon')==='Boş'?'muted':''}">${esc(slot('off_weapon'))}</span></div>
      <div class="gmt-slot" data-gmt-slot="armor"><b>Zırh</b><span class="${slot('armor')==='Boş'?'muted':''}">${esc(slot('armor'))}</span></div>
      <div class="gmt-slot" data-gmt-slot="accessory_1"><b>Aksesuar 1</b><span class="${slot('accessory_1')==='Boş'?'muted':''}">${esc(slot('accessory_1'))}</span></div>
      <div class="gmt-slot" data-gmt-slot="accessory_2"><b>Aksesuar 2</b><span class="${slot('accessory_2')==='Boş'?'muted':''}">${esc(slot('accessory_2'))}</span></div>
    </div></div></div>
  </section>`;
}
function charHtml(raw,x){
  const c=derived(raw,x),lv=Math.max(1,num(c.level)||1);
  return `<div class="cc-character-stack ps-player-sheet" data-cc-hard-stack="${esc(c.id)}"><section class="card hero" data-cc-hard-recovery-hero="${esc(c.id)}"><div><h1>${esc(c.name||'Karakter')}</h1><p>${esc(c.species_name||'-')} • ${esc(c.class_name||'-')} ${lv} • ${esc(c.background_name||'-')}</p></div>
  <div class="vitals"><div class="vital"><span>HP</span><b>${num(c.hp_current)}/${num(c.hp)}</b><div class="row center"><button class="small" data-a="hp" data-cc-hard-hp="1" data-id="${esc(c.id)}" data-d="-1">−</button><button class="small" data-a="hp" data-cc-hard-hp="1" data-id="${esc(c.id)}" data-d="1">+</button></div></div><div class="vital"><span>AC</span><b>${num(c.ac)}</b></div><div class="vital"><span>HIZ</span><b>${num(c.speed)}</b></div><div class="vital"><span>SEVİYE</span><b>${lv}</b></div></div></section>
  <section class="card" data-cc-hard-stats><div class="section-title"><div><h2>Statlar</h2></div><span class="live">● CANLI</span></div><div class="stats">${STATS.map(k=>`<button class="stat" data-a="stat" data-cc-hard-stat="${k}" data-cc-hard-character="${esc(c.id)}" data-id="${esc(c.id)}" data-stat="${k}"><b>${k}</b><strong>${num(c.ds?.[k])}</strong><small>${signed(mod(c.ds?.[k]))}</small></button>`).join('')}</div></section>
  ${vampHtml(c)}${pathHtml(c,x)}
  <section class="card" data-cc-hard-race><div class="eyebrow">IRK GÜÇLERİ</div>${powersHtml(c,x)}${embeddedPowers(c)}</section>
  ${conditionsHtml(c,x)}
  ${abilitiesHtml(c,x)}
  ${equipmentHtml(c,x)}
  <section class="card" data-cc-hard-inventory><div class="eyebrow">CANLI ENVANTER</div><h2>Silah • Zırh • Eşya</h2>${inventoryHtml(c,x)}</section>
  <section class="card" data-cc-hard-rolls><div class="eyebrow">SON ZARLAR</div>${rollsHtml(c,x)}</section></div>`;
}
function applyLayers(){
  try{window.__catlakLiveGameEntryGuard?.repairPlayerSheet?.()}catch(_){}
}
function freshStack(c,x){
  const box=document.createElement('div');box.innerHTML=charHtml(c,x).trim();return box.firstElementChild;
}
function replaceStableSection(stack,fresh,selector){
  const old=stack.querySelector(selector),next=fresh.querySelector(selector);
  if(old&&next){old.replaceWith(next);return true}
  if(!old&&next){const grid=stack.querySelector(':scope > .psv4-grid .psv4-detail')||stack;grid.appendChild(next);return true}
  if(old&&!next){old.remove();return true}
  return false;
}
function stableSelectors(kinds){
  if(kinds.has('all'))return ['section.hero','[data-cc-hard-stats]','[data-cc-hard-race]','[data-cc-hard-conditions]','[data-cc-hard-abilities]','[data-cc-hard-equipment]','[data-cc-hard-inventory]','[data-cc-hard-rolls]'];
  const out=new Set();
  const add=(...xs)=>xs.forEach(x=>out.add(x));
  if(kinds.has('character'))add('section.hero');
  if(kinds.has('inventory'))add('section.hero','[data-cc-hard-stats]','[data-cc-hard-equipment]','[data-cc-hard-inventory]');
  if(kinds.has('rolls'))add('[data-cc-hard-rolls]');
  if(kinds.has('conditions'))add('[data-cc-hard-conditions]');
  if(kinds.has('abilities'))add('[data-cc-hard-abilities]');
  if(kinds.has('combat'))add('section.hero','[data-cc-hard-abilities]','[data-cc-hard-conditions]');
  return [...out];
}
function patchStable(chars,x,kinds){
  const selectors=stableSelectors(kinds);
  for(const c of chars){
    const stack=APP.querySelector(`main[data-cc-hard-sheet="1"] .cc-character-stack[data-cc-hard-stack="${CSS.escape(String(c.id))}"]`);if(!stack)continue;
    const fresh=freshStack(c,x);
    selectors.forEach(sel=>replaceStableSection(stack,fresh,sel));
  }
  APP.querySelectorAll('.cc-desk-intro').forEach(x=>x.remove());
}
async function refreshStable(kind='all'){
  stableKinds.add(kind);
  if(stableBusy){stableAgain=true;return true}
  if(!sheetActive()||main()?.dataset.ccHardSheet!=='1'||!ready())return false;
  stableBusy=true;
  try{
    const kinds=new Set(stableKinds);stableKinds.clear();
    const S=await getRuntime();if(!S)return false;
    const ses=await getSession(S);if(!ses?.user?.id)return false;
    const chars=await ownedRows(S,ses.user.id);if(!chars.length)return false;
    const x=await extras(S,chars);if(!sheetActive()||main()?.dataset.ccHardSheet!=='1')return false;
    patchStable(chars,x,kinds);
    return true;
  }catch(e){console.warn('CATLAK_PLAYER_STABLE_REFRESH',e);return false}
  finally{
    stableBusy=false;
    if(stableAgain||stableKinds.size){stableAgain=false;setTimeout(()=>refreshStable(''),40)}
  }
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
    if(label)label.textContent=next+'/'+max;toast('HP '+next+'/'+max);setTimeout(()=>refreshStable('character'),50);
  });
}
async function hardStat(btn){
  const cid=btn.dataset.ccHardCharacter||btn.dataset.id,stat=String(btn.dataset.ccHardStat||'').toUpperCase();if(!cid||!STATS.includes(stat))return;
  return withAction('stat:'+cid+':'+stat,btn,async()=>{
    const S=await getRuntime(),r=await S.rpc('catlak_roll_stat',{p_character_id:cid,p_stat:stat});if(r.error)throw r.error;
    toast((r.data?.label||stat)+': '+(r.data?.total??'?'));setTimeout(()=>refreshStable('rolls'),60);
  });
}
async function hardWeapon(btn){
  const id=btn.dataset.id,kind=btn.dataset.ccHardWeapon||btn.dataset.k||'attack';if(!id)return;
  return withAction('weapon:'+id+':'+kind,btn,async()=>{
    const S=await getRuntime(),r=await S.rpc('catlak_roll_weapon',{p_inventory_id:id,p_action:kind});if(r.error)throw r.error;
    toast((r.data?.label||'Silah')+': '+(r.data?.total??'DM Kararı'));setTimeout(()=>refreshStable('rolls'),60);
  });
}
async function hardEquip(btn){
  const id=btn.dataset.id;if(!id)return;
  return withAction('equip:'+id,btn,async()=>{
    const S=await getRuntime(),r=await S.rpc('catlak_set_equipped',{p_inventory_id:id,p_equipped:btn.dataset.v==='1'});if(r.error)throw r.error;
    toast('Ekipman güncellendi.');setTimeout(()=>refreshStable('inventory'),60);
  });
}
async function hardSlot(btn){
  const card=btn.closest('.iw-player-item[data-pla-inv-row]'),id=card?.dataset.plaInvRow,slot=btn.dataset.wsSlot||null;if(!id)return;
  return withAction('slot:'+id,btn,async()=>{
    const S=await getRuntime(),r=await S.rpc('catlak_set_equipped_slot',{p_inventory_id:id,p_slot:slot});if(r.error)throw r.error;
    toast(slot==='main_weapon'?'Silah 1. yuvaya atandı.':slot==='off_weapon'?'Silah 2. yuvaya atandı.':'Silah çıkarıldı.');
    setTimeout(()=>refreshStable('inventory'),50);
  });
}
async function hardVkp(btn){
  const id=btn.dataset.id;if(!id)return;
  return withAction('vkp:'+id,btn,async()=>{
    const S=await getRuntime(),r=await S.rpc('catlak_update_vampire_kp',{p_character_id:id,p_delta:num(btn.dataset.d)});if(r.error)throw r.error;
    toast('KP: '+r.data);setTimeout(()=>refreshStable('character'),60);
  });
}
async function hardAbility(btn){
  const id=btn.dataset.ccHardAbility;if(!id)return;
  const target=APP.querySelector('[data-cc-hard-ability-target="'+CSS.escape(id)+'"]')?.value||null;
  return withAction('ability:'+id,btn,async()=>{
    const S=await getRuntime(),r=await S.rpc('catlak_player_use_ability',{p_assignment_id:id,p_target_id:target});if(r.error)throw r.error;
    const d=r.data||{};let m=d.ability||'Yetenek';if(d.hit===false)m+=': ISKA';else if(d.effect_type==='damage')m+=': '+d.amount+' hasar';else if(d.effect_type==='heal')m+=': '+d.amount+' iyileştirme';else m+=' kullanıldı';
    toast(m);setTimeout(()=>refreshStable('combat'),60);
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
  const hadReady=ready(),hardOwned=main()?.dataset.ccHardSheet==='1';
  if(hadReady&&hardOwned){if(force)refreshStable('all');return true}
  if(hadReady&&!force)return true;
  if(hadReady&&!hardOwned)return true;
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
    APP.querySelectorAll('.cc-desk-intro').forEach(x=>x.remove());
    delete m.dataset.ccDesk;delete m.dataset.ccPage;
    m.innerHTML=chars.map(c=>charHtml(c,base)).join('');
    try{window.__catlakPlayerSheetBindFix?.bind?.()}catch(_){}
    applyLayers();release();
    const baseReady=ready();
    extras(S,chars).then(x=>{
      if(!sheetActive())return;
      const cur=main();if(!cur||cur.dataset.ccHardSheet!=='1')return;
      patchStable(chars,x,new Set(['all']));
      release();
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
window.addEventListener('catlak:data-refreshed',()=>{if(!sheetActive())return;if(main()?.dataset.ccHardSheet==='1'&&ready())return;schedule(true,30)});
new MutationObserver(()=>{
  if(!sheetActive()||ready())return;
  const m=main();if(!m)return;
  if(!m.children.length||m.dataset.ccDesk==='1'||m.dataset.ccHardSheet==='waiting')schedule(false,80);
}).observe(APP,{childList:true,subtree:true});
async function realtime(){
  if(realtimeStarted)return;const S=await getRuntime();if(!S||realtimeStarted)return;realtimeStarted=true;
  const sync=kind=>{if(!sheetActive())return;if(main()?.dataset.ccHardSheet==='1'&&ready())setTimeout(()=>refreshStable(kind),50);else schedule(true,80)};
  S.channel('cc-player-hard-sheet-v2')
    .on('postgres_changes',{event:'*',schema:'public',table:'catlak_characters'},()=>sync('character'))
    .on('postgres_changes',{event:'*',schema:'public',table:'catlak_inventory'},()=>sync('inventory'))
    .on('postgres_changes',{event:'*',schema:'public',table:'catlak_rolls'},()=>sync('rolls'))
    .on('postgres_changes',{event:'*',schema:'public',table:'catlak_character_conditions'},()=>sync('conditions'))
    .on('postgres_changes',{event:'*',schema:'public',table:'catlak_character_abilities'},()=>sync('abilities'))
    .on('postgres_changes',{event:'*',schema:'public',table:'catlak_combatants'},()=>sync('combat'))
    .on('postgres_changes',{event:'*',schema:'public',table:'catlak_combat_state'},()=>sync('combat'))
    .subscribe();
}
setTimeout(()=>{if(!ready())schedule(true,0)},180);
setTimeout(()=>{if(!ready())schedule(true,0)},700);
setTimeout(()=>{if(!ready())schedule(true,0)},1600);
setTimeout(()=>{if(!ready())schedule(true,0)},3200);
realtime();
window.__catlakPlayerSheetHardRecovery={recover:()=>recover(true),refresh:refreshStable,ready};
})();