(function(){
'use strict';
if(window.__catlakPlayerSheetHardRecoveryV26)return;
window.__catlakPlayerSheetHardRecoveryV26=true;

const APP=document.getElementById('app');
if(!APP)return;
APP.classList.add('cc-player-hard-active');
if(!document.getElementById('cc-player-hard-ui-style')){
  const st=document.createElement('style');st.id='cc-player-hard-ui-style';st.textContent=`
  #app.cc-player-hard-active main .cc-desk-intro{display:none!important}
  #app.cc-player-hard-active main[data-cc-hard-sheet="1"] .cc-character-stack{display:grid!important;grid-template-columns:minmax(0,1.65fr) minmax(320px,.95fr)!important;gap:16px!important;max-width:1220px!important;margin:0 auto!important;align-items:start!important}
  #app.cc-player-hard-active main[data-cc-hard-sheet="1"] .cc-character-stack>section.hero{grid-column:1/-1!important;width:100%!important;margin:0!important}
  #app.cc-player-hard-active main[data-cc-hard-sheet="1"] .cc-hard-left,#app.cc-player-hard-active main[data-cc-hard-sheet="1"] .cc-hard-right{display:flex!important;flex-direction:column!important;gap:14px!important;min-width:0!important}
  #app.cc-player-hard-active main[data-cc-hard-sheet="1"] .cc-hard-left{grid-column:1}
  #app.cc-player-hard-active main[data-cc-hard-sheet="1"] .cc-hard-right{grid-column:2}
  #app.cc-player-hard-active main[data-cc-hard-sheet="1"] .cc-hard-left>section,#app.cc-player-hard-active main[data-cc-hard-sheet="1"] .cc-hard-right>section{width:100%!important;margin:0!important;box-sizing:border-box!important}
  #app.cc-player-hard-active main[data-cc-hard-sheet="1"] [data-cc-hard-stats]{order:10}
  #app.cc-player-hard-active main[data-cc-hard-sheet="1"] [data-cc-hard-inventory]{order:20}
  #app.cc-player-hard-active main[data-cc-hard-sheet="1"] [data-cc-hard-equipment]{order:10}
  #app.cc-player-hard-active main[data-cc-hard-sheet="1"] [data-cc-hard-conditions]{order:20}
  #app.cc-player-hard-active main[data-cc-hard-sheet="1"] [data-cc-hard-abilities]{order:30}
  #app.cc-player-hard-active main[data-cc-hard-sheet="1"] [data-cc-hard-race]{order:40}
  #app.cc-player-hard-active [data-cc-hard-stats] .eyebrow{display:none!important}
  #app.cc-player-hard-active [data-cc-hard-stats] .stat{cursor:pointer!important;pointer-events:auto!important}
  #app.cc-player-hard-active [data-cc-hard-equipment]{position:static!important;overflow:hidden!important}
  #app.cc-player-hard-active [data-cc-hard-equipment] .cc-slot-deck{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:9px!important;margin-top:10px}
  #app.cc-player-hard-active [data-cc-hard-equipment] .gmt-slot:last-child{grid-column:1/-1}
  #app.cc-player-hard-active .cc-roll-flash{position:fixed;right:18px;bottom:18px;z-index:90;min-width:220px;max-width:340px;padding:12px 14px;border:1px solid #3f6d88;border-radius:12px;background:rgba(7,18,28,.96);box-shadow:0 16px 42px rgba(0,0,0,.38);pointer-events:none}
  #app.cc-player-hard-active .cc-roll-flash b{display:block;font-size:.78rem;color:var(--muted);letter-spacing:.07em}
  #app.cc-player-hard-active .cc-roll-flash strong{display:block;margin-top:3px;font-size:1.8rem;color:var(--text)}
  #app.cc-player-hard-active .cc-roll-flash span{display:block;margin-top:2px;color:#8fd7ff}
  #app.cc-player-hard-active [data-cc-hard-equipment] .gmt-slot{display:grid!important;grid-template-columns:58px minmax(0,1fr)!important;gap:11px!important;align-items:center!important;padding:10px!important;border:1px solid var(--line)!important;border-radius:10px!important;background:linear-gradient(135deg,rgba(12,29,43,.94),rgba(8,18,29,.94))!important}
  #app.cc-player-hard-active [data-cc-hard-equipment] .gmt-slot.is-filled{border-color:#4c708a!important;box-shadow:inset 0 0 0 1px rgba(104,187,230,.07)}
  #app.cc-player-hard-active [data-cc-hard-equipment] .cc-slot-mark{display:grid;place-items:center;height:42px;border:1px solid #36536e;border-radius:8px;color:var(--gold);font-size:.68rem;font-weight:900;letter-spacing:.08em;background:#091724}
  #app.cc-player-hard-active [data-cc-hard-equipment] .cc-slot-copy{min-width:0}
  #app.cc-player-hard-active [data-cc-hard-equipment] .cc-slot-copy b{display:block;color:#f2d284;font-size:.76rem;letter-spacing:.04em}
  #app.cc-player-hard-active [data-cc-hard-equipment] .cc-slot-copy span{display:block;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--text)}
  #app.cc-player-hard-active [data-cc-hard-equipment] .cc-slot-copy span.muted{color:var(--muted)}
  #app.cc-player-hard-active main[data-cc-hard-sheet="1"]:not(.cc-hard-race-view) [data-cc-hard-race],#app.cc-player-hard-active main[data-cc-hard-sheet="1"]:not(.cc-hard-race-view) [data-cc-hard-abilities]{display:none!important}
  #app.cc-player-hard-active main.cc-hard-race-view[data-cc-hard-sheet="1"] .cc-character-stack>section.hero,
  #app.cc-player-hard-active main.cc-hard-race-view[data-cc-hard-sheet="1"] .cc-hard-left{display:none!important}
  #app.cc-player-hard-active main.cc-hard-race-view[data-cc-hard-sheet="1"] .cc-hard-right{grid-column:1/-1!important;display:block!important}
  #app.cc-player-hard-active main.cc-hard-race-view[data-cc-hard-sheet="1"] .cc-hard-right>:not([data-cc-hard-race]):not([data-cc-hard-abilities]){display:none!important}
  #app.cc-player-hard-active main.cc-hard-race-view[data-cc-hard-sheet="1"] [data-cc-hard-race],#app.cc-player-hard-active main.cc-hard-race-view[data-cc-hard-sheet="1"] [data-cc-hard-abilities]{display:block!important;max-width:980px!important;margin:0 auto 14px!important}
  #app.cc-player-hard-active [data-cc-hard-party-visual]{overflow:hidden!important;border-color:#6e5b2f!important;background:linear-gradient(135deg,#151a20,#17131c)!important}
  #app.cc-player-hard-active [data-cc-hard-party-visual] .cc-hard-party-frame{display:flex;align-items:center;justify-content:center;min-height:180px;border:1px solid var(--line);border-radius:12px;background:#050b14;padding:8px;margin-top:10px}
  #app.cc-player-hard-active [data-cc-hard-party-visual] img{display:block;width:auto;height:auto;max-width:100%;max-height:420px;object-fit:contain;border-radius:8px}

  @media(min-width:1181px){
    #app.cc-player-hard-active main[data-cc-hard-sheet="1"] .cc-character-stack{grid-template-columns:minmax(0,1.35fr) minmax(360px,.85fr)!important;gap:14px!important;max-width:1280px!important}
    #app.cc-player-hard-active main[data-cc-hard-sheet="1"]:not(.cc-hard-race-view) .cc-hard-left{display:flex!important;grid-column:1!important;flex-direction:column!important;gap:14px!important;align-self:start!important}
    #app.cc-player-hard-active main[data-cc-hard-sheet="1"]:not(.cc-hard-race-view) .cc-hard-right{display:flex!important;grid-column:2!important;flex-direction:column!important;gap:14px!important;align-self:start!important}
    #app.cc-player-hard-active main[data-cc-hard-sheet="1"] section.hero{padding:14px!important}
    #app.cc-player-hard-active main[data-cc-hard-sheet="1"] section.hero .vitals{gap:8px!important}
    #app.cc-player-hard-active main[data-cc-hard-sheet="1"] section.hero [data-cc-hard-long-rest]{white-space:nowrap}
    #app.cc-player-hard-active main.cc-hard-race-view[data-cc-hard-sheet="1"] .cc-hard-right{display:block!important;grid-column:1/-1!important}
    #app.cc-player-hard-active main.cc-hard-race-view[data-cc-hard-sheet="1"] .cc-hard-left{display:none!important}
  }
  @media(max-width:900px){#app.cc-player-hard-active main[data-cc-hard-sheet="1"] .cc-character-stack{grid-template-columns:1fr!important}.cc-hard-left,.cc-hard-right{grid-column:1!important}#app.cc-player-hard-active main[data-cc-hard-sheet="1"] .cc-character-stack>section.hero{grid-column:1!important}#app.cc-player-hard-active [data-cc-hard-equipment]{position:static!important}}
  `;document.head.appendChild(st)
}
const STATS=['STR','DEX','CON','INT','WIS','CHA'];
let busy=false,queued=false,lastRun=0,realtimeStarted=false,stableBusy=false,stableAgain=false;
let cachedSheetHtml='',cachedSheetAt=0;
const stableKinds=new Set();

const txt=e=>String(e?.textContent||'').trim();
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=x=>Number.isFinite(Number(x))?Number(x):0;
const mod=x=>Math.floor((num(x)-10)/2);
const signed=x=>num(x)>=0?'+'+num(x):String(num(x));
const toast=x=>{const t=document.getElementById('toast');if(!t)return;t.textContent=String(x);t.classList.remove('hidden');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.add('hidden'),3600)};
const isPlayer=()=>{const r=txt(APP.querySelector('.role'));return !!r&&r!=='GM'};
const sheetButton=()=>APP.querySelector('.nav [data-tab="sheet"]');
const raceButton=()=>APP.querySelector('.nav [data-cc-hard-race-nav]');
const main=()=>APP.querySelector('main');
const ready=()=>main()?.dataset.ccHardSheet==='1'&&!!APP.querySelector('main .cc-character-stack[data-cc-hard-stack] section.hero');
const sheetActive=()=>isPlayer()&&(!!sheetButton()?.classList.contains('on')||!!raceButton()?.classList.contains('on'));
function ensureRaceNav(){
  if(!isPlayer())return null;
  const nav=APP.querySelector('.nav'),sheet=sheetButton();if(!nav||!sheet)return null;
  let b=raceButton();if(!b){b=document.createElement('button');b.type='button';b.dataset.ccHardRaceNav='1';b.dataset.ccHardOwned='1';b.textContent='Irk Becerileri';sheet.after(b)}if(raceWanted)b.classList.add('on')
  return b;
}
let raceMode=false,raceWanted=window.__catlakRaceWantedEarly===true,sheetScrollY=0,raceScrollY=0;
function clearPlayerNavSelection(except){
  APP.querySelectorAll('.nav button.on').forEach(b=>{if(b!==except)b.classList.remove('on')});
  except?.classList.add('on');
}
function leaveRaceForForeignNav(){
  const m=main(),race=raceButton();if(!raceMode&&!m?.classList.contains('cc-hard-race-view'))return;
  raceScrollY=window.scrollY;raceMode=false;raceWanted=false;window.__catlakRaceWantedEarly=false;m?.classList.remove('cc-hard-race-view');race?.classList.remove('on');
}
function setRaceView(on){
  raceWanted=!!on;window.__catlakRaceWantedEarly=raceWanted;
  const m=main(),sheet=sheetButton(),race=ensureRaceNav();if(!m||m.dataset.ccHardSheet!=='1'||!race)return false;
  if(on){
    if(!raceMode)sheetScrollY=window.scrollY;
    raceMode=true;m.classList.add('cc-hard-race-view');clearPlayerNavSelection(race);
    requestAnimationFrame(()=>window.scrollTo({top:raceScrollY||Math.max(0,m.offsetTop-10),behavior:'auto'}));
  }else{
    const wasRace=raceMode;if(wasRace)raceScrollY=window.scrollY;
    raceMode=false;m.classList.remove('cc-hard-race-view');clearPlayerNavSelection(sheet);
    if(wasRace)requestAnimationFrame(()=>window.scrollTo({top:sheetScrollY,behavior:'auto'}));
  }
  return true;
}
const previousPreserve=window.__catlakShouldPreserveCurrentView;
window.__catlakShouldPreserveCurrentView=function(){
  const m=main();
  if(sheetActive()&&m?.dataset.ccHardSheet==='1'&&ready())return true;
  try{return typeof previousPreserve==='function'?!!previousPreserve():false}catch(_){return false}
};

function cacheSheet(){
  const m=main();if(!m||m.dataset.ccHardSheet!=='1'||!m.querySelector('.cc-character-stack[data-cc-hard-stack]'))return false;
  cachedSheetHtml=m.innerHTML;cachedSheetAt=Date.now();return true;
}
function restoreCachedSheet(wantRace=false){
  if(!cachedSheetHtml)return false;
  const m=main();if(!m)return false;
  m.className='';m.dataset.ccHardSheet='1';delete m.dataset.ccrBattle;delete m.dataset.ccDesk;delete m.dataset.ccPage;delete m.dataset.ccBindFallback;
  m.innerHTML=cachedSheetHtml;
  ensureRaceNav();
  raceMode=false;raceWanted=!!wantRace;window.__catlakRaceWantedEarly=raceWanted;
  setRaceView(raceWanted);
  applyLayers();
  setTimeout(()=>refreshStable('all'),0);
  return true;
}
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
  const partyAllowed=chars.some(c=>c?.data?.cc_party_member===true);
  const [inv,items,powers,paths,conditions,abilities,combat,partyVisual]=await Promise.all([
    ids.length?safeQuery(S.from('catlak_inventory').select('*').in('character_id',ids).order('granted_at',{ascending:true}),[],1800):[],
    safeQuery(S.from('catlak_items').select('*').order('created_at',{ascending:true}),[],1800),
    species.length?safeQuery(S.from('catlak_species_powers').select('*').in('species_name',species).order('unlock_level',{ascending:true}),[],1800):[],
    species.length?safeQuery(S.from('catlak_special_paths').select('*').in('species_name',species).order('sort_order',{ascending:true}),[],1800):[],
    ids.length?safeQuery(S.from('catlak_character_conditions').select('*').in('character_id',ids).eq('active',true).order('created_at',{ascending:true}),[],1800):[],
    safeRpc(S,'catlak_player_abilities',{},[],1800),
    safeRpc(S,'catlak_player_combat_snapshot',{}, {},1800),
    partyAllowed?safeQuery(S.from('catlak_party_visual').select('*').eq('singleton',true).maybeSingle(),null,1800):Promise.resolve(null)
  ]);
  return {inv,items,powers,paths,conditions,abilities,combat,partyVisual};
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
    const i=r.it,weapon=i.item_type==='weapon',armor=i.item_type==='armor',accessory=i.item_type==='item'&&String(i.effects?.item_mode||'')==='accessory',manual=weapon&&!i.damage_formula;
    const mainOn=!!r.equipped&&String(r.equipped_slot||'')==='main_weapon';
    const offOn=!!r.equipped&&String(r.equipped_slot||'')==='off_weapon';
    const armorOn=!!r.equipped&&String(r.equipped_slot||'')==='armor';
    const acc1On=!!r.equipped&&String(r.equipped_slot||'')==='accessory_1';
    const acc2On=!!r.equipped&&String(r.equipped_slot||'')==='accessory_2';
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
        <button type="button" data-ws-remove="${esc(r.id)}">Yuvadan Çıkar</button>
        <button type="button" data-a="weapon" data-cc-hard-weapon="attack" data-id="${esc(r.id)}" data-k="attack">Saldırı At</button>
        <button type="button" data-a="weapon" data-cc-hard-weapon="damage" data-id="${esc(r.id)}" data-k="damage">${manual?'Hasar • DM Kararı':'Hasar At'}</button>`:armor?`<div class="ws-slot-controls" data-ws-controls="1"><button type="button" class="${armorOn?'ws-active':''}" data-ws-slot="armor">${armorOn?'✓ Zırha Takıldı':'Zırha Tak'}</button>${armorOn?`<button type="button" data-ws-remove="${esc(r.id)}">Yuvadan Çıkar</button>`:''}</div>`:accessory?`<div class="ws-slot-controls" data-ws-controls="1"><button type="button" class="${acc1On?'ws-active':''}" data-ws-slot="accessory_1">${acc1On?'✓ Aksesuar 1':'Aksesuar 1'}</button><button type="button" class="${acc2On?'ws-active':''}" data-ws-slot="accessory_2">${acc2On?'✓ Aksesuar 2':'Aksesuar 2'}</button>${(acc1On||acc2On)?`<button type="button" data-ws-remove="${esc(r.id)}">Yuvadan Çıkar</button>`:''}</div>`:''}
      </div>
    </article>`;
  }).join('')+'</div>';
}
function showRollFlash(cid,r){
  if(!r)return false;
  APP.querySelector('.cc-roll-flash')?.remove();
  const box=document.createElement('div');box.className='cc-roll-flash';
  const label=esc(r.label||r.roll_kind||'Zar'),total=r.total==null?'?':esc(r.total),modText=r.modifier?signed(r.modifier):'';
  box.innerHTML=`<b>${label}</b><strong>${total}</strong><span>${modText}</span>`;
  APP.appendChild(box);clearTimeout(showRollFlash.t);showRollFlash.t=setTimeout(()=>box.remove(),2200);
  return true;
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
  return `<section class="card" data-cc-hard-abilities><div class="eyebrow">YETENEKLER & BÜYÜLER</div><h2>Karakter Yetenekleri</h2><p class="muted">Karakterine ait sınıf, büyü ve özel yetenek açıklamaları burada tutulur. Kullanım ve hedef seçimi yalnız Savaş Odası'nda yapılır.</p><div class="grid">${rows.map(a=>{
    const finite=a.uses_per_combat!=null,uses=finite?`${num(a.uses_remaining)}/${num(a.uses_per_combat)}`:'∞';
    const type=String(a.ability_type||'skill').toUpperCase();
    const target=a.target_type==='enemy'?'Düşman':a.target_type==='ally'?'Müttefik':'Kendi';
    return `<article class="power"><small>${esc(type)}</small><h3>${esc(a.name||'Yetenek')}</h3><p>${esc(a.description||'Açıklama bulunmuyor.')}</p><div class="muted">${a.formula?'Formül: '+esc(a.formula)+' • ':''}Hedef: ${esc(target)} • Kullanım: ${esc(uses)}${a.requires_attack?' • AC karşılaştırmalı saldırı':''}</div></article>`;
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
function partyVisualHtml(c,x){
  const p=x?.partyVisual,allowed=c?.data?.cc_party_member===true&&p?.image_url;
  if(!allowed)return '<section class="card" data-cc-hard-party-visual hidden></section>';
  const kind=p.kind==='npc'?'NPC':p.kind==='map'?'HARİTA':'PARTİ GÖRSELİ';
  return `<section class="card cc-party-show" data-cc-hard-party-visual>
    <div class="eyebrow">GM • ${kind}</div><h2>${esc(p.title||'Partiye Yansıtılan Görsel')}</h2>
    <div class="cc-hard-party-frame"><img src="${esc(p.image_url)}" alt="${esc(p.title||'Parti görseli')}" loading="lazy"></div>
    ${p.note?`<p class="muted">${esc(p.note)}</p>`:''}
  </section>`;
}
function equipmentHtml(c,x){
  const itemMap=new Map((x.items||[]).map(i=>[String(i.id),i]));
  const rows=(x.inv||[]).filter(r=>String(r.character_id)===String(c.id)&&r.equipped);
  const slot=(key)=>{const hit=rows.find(r=>String(r.equipped_slot||'')===key),it=hit&&itemMap.get(String(hit.item_id));return {name:it?.name||'Boş',filled:!!it}};
  const row=(key,label,mark)=>{const v=slot(key);return `<div class="gmt-slot ${v.filled?'is-filled':''}" data-gmt-slot="${key}"><span class="cc-slot-mark">${mark}</span><div class="cc-slot-copy"><b>${label}</b><span class="${v.filled?'':'muted'}">${esc(v.name)}</span></div></div>`};
  return `<section class="card gmt-player-panel" data-gmt-player-panel="${esc(c.id)}" data-cc-hard-equipment>
    <div class="eyebrow">TAKILI TEÇHİZAT</div><h2>Slotlar</h2><p class="muted">Envanterdeki ekipmanı uygun yuvaya atayabilirsin.</p>
    <div class="cc-slot-deck" data-pssr-slots>
      ${row('main_weapon','1. Silah','I')}
      ${row('off_weapon','2. Silah','II')}
      ${row('armor','Zırh','ZR')}
      ${row('accessory_1','Aksesuar 1','A1')}
      ${row('accessory_2','Aksesuar 2','A2')}
    </div>
  </section>`;
}
function charHtml(raw,x){
  const c=derived(raw,x),lv=Math.max(1,num(c.level)||1);
  return `<div class="cc-character-stack ps-player-sheet" data-cc-hard-stack="${esc(c.id)}"><section class="card hero" data-cc-hard-recovery-hero="${esc(c.id)}"><div><h1>${esc(c.name||'Karakter')}</h1><p>${esc(c.species_name||'-')} • ${esc(c.class_name||'-')} ${lv} • ${esc(c.background_name||'-')}</p></div>
  <div class="vitals"><div class="vital" data-cc-hard-hp-readout><span>HP</span><b>${num(c.hp_current)}/${num(c.hp)}</b></div><div class="vital"><span>AC</span><b>${num(c.ac)}</b></div><div class="vital"><span>HIZ</span><b>${num(c.speed)}</b></div><div class="vital"><span>SEVİYE</span><b>${lv}</b></div></div><div class="actions"><button type="button" data-cc-hard-long-rest data-id="${esc(c.id)}" data-max="${num(c.hp)}">Uzun Dinlenme</button></div></section>
  <div class="cc-hard-left">
    <section class="card" data-cc-hard-stats><div class="section-title"><div><h2>Statlar</h2></div><span class="live">● CANLI</span></div><div class="stats">${STATS.map(k=>`<button class="stat" data-a="stat" data-cc-hard-stat="${k}" data-cc-hard-character="${esc(c.id)}" data-id="${esc(c.id)}" data-stat="${k}"><b>${k}</b><strong>${num(c.ds?.[k])}</strong><small>${signed(mod(c.ds?.[k]))}</small></button>`).join('')}</div></section>
    <section class="card" data-cc-hard-inventory><div class="eyebrow">ENVANTER</div><h2>Silah • Zırh • Eşya</h2>${inventoryHtml(c,x)}</section>
    ${partyVisualHtml(c,x)}
  </div>
  <aside class="cc-hard-right">
    ${equipmentHtml(c,x)}
    ${conditionsHtml(c,x)}
    ${vampHtml(c)}${pathHtml(c,x)}
    <section class="card" data-cc-hard-race><div class="eyebrow">IRK BECERİLERİ</div><h2>Irk Güçleri</h2>${powersHtml(c,x)}${embeddedPowers(c)}</section>
    ${abilitiesHtml(c,x)}
  </aside></div>`;
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
  if(kinds.has('all'))return ['section.hero','[data-cc-hard-stats]','[data-cc-hard-race]','[data-cc-hard-conditions]','[data-cc-hard-abilities]','[data-cc-hard-equipment]','[data-cc-hard-inventory]','[data-cc-hard-party-visual]'];
  const out=new Set();
  const add=(...xs)=>xs.forEach(x=>out.add(x));
  if(kinds.has('character'))add('section.hero','[data-cc-hard-party-visual]');
  if(kinds.has('inventory'))add('section.hero','[data-cc-hard-stats]','[data-cc-hard-equipment]','[data-cc-hard-inventory]');
  if(kinds.has('visual'))add('[data-cc-hard-party-visual]');
  if(kinds.has('conditions'))add('[data-cc-hard-conditions]');
  if(kinds.has('abilities'))add('[data-cc-hard-abilities]');
  if(kinds.has('combat'))add('section.hero','[data-cc-hard-abilities]','[data-cc-hard-conditions]');
  return [...out];
}
function patchStable(chars,x,kinds){
  const sx=window.scrollX,sy=window.scrollY,selectors=stableSelectors(kinds);
  for(const c of chars){
    const stack=APP.querySelector(`main[data-cc-hard-sheet="1"] .cc-character-stack[data-cc-hard-stack="${CSS.escape(String(c.id))}"]`);if(!stack)continue;
    const fresh=freshStack(c,x);
    selectors.forEach(sel=>replaceStableSection(stack,fresh,sel));
  }
  APP.querySelectorAll('.cc-desk-intro').forEach(x=>x.remove());
  cacheSheet();
  window.scrollTo(sx,sy);requestAnimationFrame(()=>window.scrollTo(sx,sy));
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
  finally{actionLocks.delete(key);if(btn?.isConnected){btn.disabled=false;btn.classList.remove('cc-rolling')}}
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
    btn.classList.add('cc-rolling');
    const S=await getRuntime(),r=await S.rpc('catlak_roll_stat',{p_character_id:cid,p_stat:stat});if(r.error)throw r.error;
    const roll=Array.isArray(r.data)?r.data[0]:r.data;
    showRollFlash(cid,roll);
    btn.classList.remove('cc-rolling');
  });
}
async function hardWeapon(btn){
  const id=btn.dataset.id,kind=btn.dataset.ccHardWeapon||btn.dataset.k||'attack';if(!id)return;
  return withAction('weapon:'+id+':'+kind,btn,async()=>{
    const S=await getRuntime(),r=await S.rpc('catlak_roll_weapon',{p_inventory_id:id,p_action:kind});if(r.error)throw r.error;
    const roll=Array.isArray(r.data)?r.data[0]:r.data,cid=btn.closest('.cc-character-stack')?.dataset.ccHardStack;
    if(cid)showRollFlash(cid,roll);
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
  const card=btn.closest('.iw-player-item[data-pla-inv-row]'),id=btn.dataset.wsRemove||card?.dataset.plaInvRow,slot=btn.hasAttribute('data-ws-remove')?null:(btn.dataset.wsSlot||null);if(!id)return;
  return withAction('slot:'+id,btn,async()=>{
    const S=await getRuntime(),r=await S.rpc('catlak_set_equipped_slot',{p_inventory_id:id,p_slot:slot});if(r.error)throw r.error;
    const label=slot==='main_weapon'?'1. Silah':slot==='off_weapon'?'2. Silah':slot==='armor'?'Zırh':slot==='accessory_1'?'Aksesuar 1':slot==='accessory_2'?'Aksesuar 2':'Envanter';
    toast(slot?label+' yuvasına takıldı.':'Eşya yuvadan çıkarıldı.');
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
async function hardLongRest(btn){
  const id=btn.dataset.id;if(!id)return;
  return withAction('rest:'+id,btn,async()=>{
    const S=await getRuntime();if(!S)throw new Error('Bağlantı hazır değil.');
    let resetOk=false;
    const rr=await S.rpc('catlak_player_long_rest');
    if(!rr.error)resetOk=true;
    else{
      const ar=await S.rpc('catlak_player_abilities');
      if(ar.error)throw rr.error;
      const finite=(ar.data||[]).filter(a=>a.assignment_id&&a.uses_per_combat!=null);
      if(finite.length){
        const results=await Promise.all(finite.map(a=>S.from('catlak_character_abilities').update({uses_remaining:num(a.uses_per_combat)}).eq('id',a.assignment_id)));
        const bad=results.find(x=>x.error);if(bad)throw rr.error||bad.error;
      }
      resetOk=true;
    }
    const max=Math.max(1,num(btn.dataset.max));
    const hp=await S.rpc('catlak_update_my_hp',{p_character_id:id,p_hp:max});
    if(hp.error)throw hp.error;
    if(resetOk){
      toast('Uzun dinlenme tamamlandı. HP ve sınırlı kullanımlar yenilendi.');
      setTimeout(()=>refreshStable('all'),50);
    }
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
  const msg=String(message||'Davet bağlantısı tamamlandı. Karakter verisi bekleniyor.');
  if(m.dataset.ccHardSheet==='waiting'&&m.dataset.ccHardWait===msg)return;
  m.dataset.ccHardSheet='waiting';m.dataset.ccHardWait=msg;
  m.innerHTML=`<section class="card"><div class="eyebrow">OYUNCU MASASI</div><h2>Karakter kağıdı hazırlanıyor…</h2><p class="muted">${esc(msg)}</p><button type="button" data-cc-hard-sheet-retry>Tekrar Dene</button></section>`;
  release();
}
async function recover(force=false){
  queued=false;
  if(!sheetActive())return false;
  const hadReady=ready(),hardOwned=main()?.dataset.ccHardSheet==='1';
  if(hadReady&&hardOwned){if(force)refreshStable('all');ensureRaceNav();return true}
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
    const x=await extras(S,chars);
    window.__catlakPlayerPartyAllowedEarly=!!x.partyAllowed;
    if(!sheetActive())return false;
    const m=main();if(!m)return false;
    m.className='';
    m.dataset.ccHardSheet='1';
    APP.querySelectorAll('.cc-desk-intro').forEach(x=>x.remove());
    delete m.dataset.ccDesk;delete m.dataset.ccPage;delete m.dataset.ccBindFallback;
    m.innerHTML=chars.map(c=>charHtml(c,x)).join('');
    ensureRaceNav();setRaceView(raceWanted);
    applyLayers();cacheSheet();release();
    return ready();
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
  const foreignNav=e.target?.closest?.('#app .nav button:not([data-cc-hard-race-nav]):not([data-tab="sheet"])');
  if(foreignNav&&isPlayer())leaveRaceForForeignNav();
  const raceNav=e.target?.closest?.('[data-cc-hard-race-nav]');
  if(raceNav&&isPlayer()){e.preventDefault();e.stopImmediatePropagation();try{window.__catlakRoomSystemTest?.closeBattle?.()}catch(_){}raceWanted=true;window.__catlakRaceWantedEarly=true;clearPlayerNavSelection(raceNav);if(restoreCachedSheet(true))return;if(setRaceView(true))return;recover(true).then(ok=>{if(ok){ensureRaceNav();setRaceView(true)}else toast('Irk Becerileri yüklenemedi. Tekrar dene.')});return}
  const sheetNav=e.target?.closest?.('#app .nav [data-tab="sheet"]');
  if(sheetNav&&isPlayer()){
    const alreadyClean=sheetNav.classList.contains('on')&&main()?.dataset.ccHardSheet==='1'&&!main()?.classList.contains('cc-hard-race-view')&&ready();
    if(alreadyClean)return;
    e.preventDefault();e.stopImmediatePropagation();
    try{window.__catlakRoomSystemTest?.closeBattle?.()}catch(_){}
    raceWanted=false;window.__catlakRaceWantedEarly=false;
    clearPlayerNavSelection(sheetNav);
    if(restoreCachedSheet(false))return;
    recover(true).then(ok=>{if(ok){ensureRaceNav();setRaceView(false)}else toast('Oyuncu Masası yüklenemedi. Tekrar dene.')});
    return
  }
  const root=e.target?.closest?.('main[data-cc-hard-sheet="1"]');
  if(root){
    const hp=e.target.closest?.('[data-cc-hard-hp][data-id]');if(hp){e.preventDefault();e.stopImmediatePropagation();hardHp(hp);return}
    const stat=e.target.closest?.('[data-cc-hard-stat]');if(stat){e.preventDefault();e.stopImmediatePropagation();hardStat(stat);return}
    const weapon=e.target.closest?.('[data-cc-hard-weapon][data-id]');if(weapon){e.preventDefault();e.stopImmediatePropagation();hardWeapon(weapon);return}
    const equip=e.target.closest?.('[data-cc-hard-equip][data-id]');if(equip){e.preventDefault();e.stopImmediatePropagation();hardEquip(equip);return}
    const slot=e.target.closest?.('[data-ws-slot],[data-ws-remove]');if(slot){e.preventDefault();e.stopImmediatePropagation();hardSlot(slot);return}
    const vkp=e.target.closest?.('[data-cc-hard-vkp][data-id]');if(vkp){e.preventDefault();e.stopImmediatePropagation();hardVkp(vkp);return}
    const rest=e.target.closest?.('[data-cc-hard-long-rest][data-id]');if(rest){e.preventDefault();e.stopImmediatePropagation();hardLongRest(rest);return}
  }
  if(e.target?.closest?.('[data-cc-hard-sheet-retry]')){e.preventDefault();e.stopImmediatePropagation();schedule(true,0);return}
  const b=e.target?.closest?.('#app .nav [data-tab="sheet"]');
  if(b&&isPlayer()){ensureRaceNav();setTimeout(()=>schedule(true,0),40);setTimeout(()=>schedule(true,0),300)}
},true);
window.addEventListener('catlak:player-fast-ready',()=>schedule(true,0));
window.addEventListener('catlak:data-refreshed',()=>{if(!sheetActive())return;if(main()?.dataset.ccHardSheet==='1'&&ready())return;schedule(true,30)});
new MutationObserver(rs=>{
  if(!isPlayer())return;
  const nav=APP.querySelector('.nav'),m=main();
  const structural=rs.some(r=>{
    if(r.target===APP)return true;
    if(nav&&(r.target===nav||nav.contains(r.target)))return true;
    return [...r.addedNodes].some(n=>n.nodeType===1&&(n.matches?.('main,.nav,.role')||n.querySelector?.('main,.nav,.role')));
  });
  if(!structural&&(!sheetActive()||m?.dataset.ccHardSheet==='1'&&ready()&&(!raceWanted||m.classList.contains('cc-hard-race-view'))))return;
  ensureRaceNav();
  if(!sheetActive())return;
  const cur=main();if(!cur)return;
  if(raceWanted&&!cur.classList.contains('cc-hard-race-view')){schedule(true,0);return}
  if(ready())return;
  schedule(false,20);
}).observe(APP,{childList:true,subtree:true});
async function realtime(){
  if(realtimeStarted)return;const S=await getRuntime();if(!S||realtimeStarted)return;realtimeStarted=true;
  const sync=kind=>{if(!sheetActive())return;if(main()?.dataset.ccHardSheet==='1'&&ready())setTimeout(()=>refreshStable(kind),50);else schedule(true,80)};
  S.channel('cc-player-hard-sheet-v2')
    .on('postgres_changes',{event:'*',schema:'public',table:'catlak_characters'},()=>sync('character'))
    .on('postgres_changes',{event:'*',schema:'public',table:'catlak_inventory'},()=>sync('inventory'))
    .on('postgres_changes',{event:'*',schema:'public',table:'catlak_character_conditions'},()=>sync('conditions'))
    .on('postgres_changes',{event:'*',schema:'public',table:'catlak_character_abilities'},()=>sync('abilities'))
    .on('postgres_changes',{event:'*',schema:'public',table:'catlak_abilities'},()=>sync('abilities'))
    .on('postgres_changes',{event:'*',schema:'public',table:'catlak_combatants'},()=>sync('combat'))
    .on('postgres_changes',{event:'*',schema:'public',table:'catlak_combat_state'},()=>sync('combat'))
    .on('postgres_changes',{event:'*',schema:'public',table:'catlak_party_visual'},()=>sync('visual'))
    .subscribe();
}
setTimeout(()=>{ensureRaceNav();if(!ready())schedule(true,0)},80);
setTimeout(()=>{if(!ready())schedule(true,0)},900);
realtime();
window.__catlakPlayerSheetHardRecovery={recover:()=>recover(true),refresh:refreshStable,ready,ensureRaceNav,setRaceView,cache:cacheSheet,restore:restoreCachedSheet,cached:()=>!!cachedSheetHtml};
})();