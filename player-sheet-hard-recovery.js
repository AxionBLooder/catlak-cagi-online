(function(){
'use strict';
if(window.__catlakPlayerSheetHardRecoveryV1)return;
window.__catlakPlayerSheetHardRecoveryV1=true;

const APP=document.getElementById('app');
if(!APP)return;
const STATS=['STR','DEX','CON','INT','WIS','CHA'];
let busy=false,queued=false,lastRun=0,realtimeStarted=false;

const txt=e=>String(e?.textContent||'').trim();
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=x=>Number.isFinite(Number(x))?Number(x):0;
const mod=x=>Math.floor((num(x)-10)/2);
const signed=x=>num(x)>=0?'+'+num(x):String(num(x));
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
  const r=await S.from('catlak_characters').select('*').eq('owner_id',uid).order('created_at',{ascending:true});
  if(r.error)throw r.error;
  if(r.data?.length)return r.data;
  try{
    const snap=await S.rpc('catlak_player_combat_snapshot');
    const id=snap?.data?.character_id;
    if(id){
      const q=await S.from('catlak_characters').select('*').eq('id',id).maybeSingle();
      if(!q.error&&q.data)return [q.data];
    }
  }catch(_){}
  return [];
}
async function safeQuery(promise,fallback=[]){
  try{const r=await promise;return r?.error?fallback:(r?.data||fallback)}catch(_){return fallback}
}
async function extras(S,chars){
  const ids=chars.map(c=>c.id).filter(Boolean);
  const species=[...new Set(chars.map(c=>c.species_name).filter(Boolean))];
  const [inv,items,rolls,powers,paths]=await Promise.all([
    ids.length?safeQuery(S.from('catlak_inventory').select('*').in('character_id',ids).order('granted_at',{ascending:true})):[],
    safeQuery(S.from('catlak_items').select('*').order('created_at',{ascending:true})),
    ids.length?safeQuery(S.from('catlak_rolls').select('*').in('character_id',ids).order('created_at',{ascending:false}).limit(60)):[],
    species.length?safeQuery(S.from('catlak_species_powers').select('*').in('species_name',species).order('unlock_level',{ascending:true})):[],
    species.length?safeQuery(S.from('catlak_special_paths').select('*').in('species_name',species).order('sort_order',{ascending:true})):[]
  ]);
  return {inv,items,rolls,powers,paths};
}
function derived(c,x){
  const stats={...(c.base_stats||{})};
  let ac=num(c.base_ac),speed=num(c.base_speed),hp=num(c.hp_max),armorSets=[],armorBonus=0;
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
  return {...c,ds:stats,ac:ac+armorBonus,speed,hp};
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
        <button type="button" data-a="equip" data-pla-equip-kind="weapon" data-id="${esc(r.id)}" data-v="1">Kuşan</button>
        <button type="button" data-ws-remove="${esc(r.id)}">Çıkar</button>
        <button type="button" data-a="weapon" data-id="${esc(r.id)}" data-k="attack">Saldırı At</button>
        <button type="button" data-a="weapon" data-id="${esc(r.id)}" data-k="damage">${manual?'Hasar • DM Kararı':'Hasar At'}</button>`:armor?`<button type="button" data-a="equip" data-id="${esc(r.id)}" data-v="${r.equipped?'0':'1'}">${r.equipped?'Çıkar':'Kuşan'}</button>`:''}
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
  return `<section class="card vampire"><div class="section-title"><div><div class="eyebrow">VAMPİR • KIRMIZI PUANI</div><h2>KP ${kp}/${max}</h2></div><div class="actions"><button data-a="vkp" data-id="${esc(c.id)}" data-d="-1">KP −</button><button data-a="vkp" data-id="${esc(c.id)}" data-d="1">KP +</button></div></div></section>`;
}
function charHtml(raw,x){
  const c=derived(raw,x),lv=Math.max(1,num(c.level)||1);
  return `<section class="card hero" data-cc-hard-recovery-hero="${esc(c.id)}"><div><div class="eyebrow">CANLI KARAKTER KAĞIDI</div><h1>${esc(c.name||'Karakter')}</h1><p>${esc(c.species_name||'-')} • ${esc(c.class_name||'-')} ${lv} • ${esc(c.background_name||'-')}</p></div>
  <div class="vitals"><div class="vital"><span>HP</span><b>${num(c.hp_current)}/${num(c.hp)}</b><div class="row center"><button class="small" data-a="hp" data-id="${esc(c.id)}" data-d="-1">−</button><button class="small" data-a="hp" data-id="${esc(c.id)}" data-d="1">+</button></div></div><div class="vital"><span>AC</span><b>${num(c.ac)}</b></div><div class="vital"><span>HIZ</span><b>${num(c.speed)}</b></div><div class="vital"><span>SEVİYE</span><b>${lv}</b></div></div></section>
  <section class="card"><div class="section-title"><div><div class="eyebrow">D20 TESTLERİ</div><h2>Statına bas, zarını at</h2></div><span class="live">● CANLI</span></div><div class="stats">${STATS.map(k=>`<button class="stat" data-a="stat" data-id="${esc(c.id)}" data-stat="${k}"><b>${k}</b><strong>${num(c.ds?.[k])}</strong><small>${signed(mod(c.ds?.[k]))} • d20 at</small></button>`).join('')}</div></section>
  ${vampHtml(c)}${pathHtml(c,x)}
  <section class="card"><div class="eyebrow">IRK GÜÇLERİ</div>${powersHtml(c,x)}</section>
  <section class="card"><div class="eyebrow">CANLI ENVANTER</div><h2>Silah • Zırh • Eşya</h2>${inventoryHtml(c,x)}</section>
  <section class="card"><div class="eyebrow">SON ZARLAR</div>${rollsHtml(c,x)}</section>`;
}
function applyLayers(){
  try{window.__catlakPlayerSheetBindFix?.bind?.()}catch(_){}
  try{window.__catlakPlayerSheetTest?.apply?.()}catch(_){}
  try{window.__catlakPlayerSheetSupport?.refresh?.(true)}catch(_){}
  try{window.__catlakPlayerLiveTest?.refresh?.(true)}catch(_){}
  try{window.__catlakPlayerSheetEquipmentAbilitiesTest?.paint?.(true)}catch(_){}
  try{window.__catlakLiveGameEntryGuard?.repairPlayerSheet?.()}catch(_){}
}
function showWaiting(message){
  const m=main();if(!m||!sheetActive())return;
  m.dataset.ccHardSheet='waiting';
  m.innerHTML=`<section class="card"><div class="eyebrow">OYUNCU MASASI</div><h2>Karakter kağıdı hazırlanıyor…</h2><p class="muted">${esc(message||'Davet bağlantısı tamamlandı. Karakter verisi bekleniyor.')}</p><button type="button" data-cc-hard-sheet-retry>Tekrar Dene</button></section>`;
  release();
}
async function recover(force=false){
  queued=false;
  if(!sheetActive()||ready())return ready();
  if(busy)return false;
  const now=Date.now();if(!force&&now-lastRun<180)return false;lastRun=now;busy=true;
  try{
    const S=await getRuntime();if(!S)return false;
    const ses=await getSession(S);if(!ses?.user?.id){showWaiting('Oyuncu oturumu henüz hazır değil.');return false}
    let chars=[];
    for(const wait of [0,100,220,450,800]){
      if(wait)await new Promise(r=>setTimeout(r,wait));
      chars=await ownedRows(S,ses.user.id);
      if(chars.length)break;
      if(!sheetActive())return false;
    }
    if(!chars.length){showWaiting('Karakter hesabına bağlandı ancak kayıt henüz görünür değil. Birkaç saniye içinde otomatik tekrar denenecek.');return false}
    const x=await extras(S,chars);
    if(!sheetActive())return false;
    const m=main();if(!m)return false;
    m.className='';
    m.dataset.ccHardSheet='1';
    delete m.dataset.ccDesk;delete m.dataset.ccPage;
    m.innerHTML=chars.map(c=>charHtml(c,x)).join('');
    try{window.__catlakPlayerSheetBindFix?.bind?.()}catch(_){}
    applyLayers();release();
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
  if(e.target?.closest?.('[data-cc-hard-sheet-retry]')){e.preventDefault();e.stopImmediatePropagation();schedule(true,0);return}
  const b=e.target?.closest?.('#app .nav [data-tab="sheet"]');
  if(b&&isPlayer()){setTimeout(()=>schedule(true,0),40);setTimeout(()=>schedule(true,0),300)}
},true);
window.addEventListener('catlak:player-fast-ready',()=>schedule(true,0));
window.addEventListener('catlak:data-refreshed',()=>{if(sheetActive()&&!ready())schedule(true,30)});
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
    .subscribe();
}
setTimeout(()=>schedule(true,0),180);
setTimeout(()=>schedule(true,0),700);
setTimeout(()=>schedule(true,0),1600);
setTimeout(()=>schedule(true,0),3200);
realtime();
window.__catlakPlayerSheetHardRecovery={recover:()=>recover(true),ready};
})();