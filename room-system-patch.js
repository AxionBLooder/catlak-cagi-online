const CCR_S=window.__catlakSupabase;
const CCR_APP=document.querySelector('#app');
if(!CCR_S||!CCR_APP)throw new Error('Çatlak Çağı oda sistemi başlatılamadı.');

const ccrText=e=>String(e?.textContent||'').trim();
const ccrRole=()=>ccrText(CCR_APP.querySelector('.role'));
const ccrIsGM=()=>ccrRole()==='GM';
const ccrIsPlayer=()=>!!ccrRole()&&!ccrIsGM();
const ccrEsc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
const ccrNum=x=>Number(x||0);
const ccrMod=x=>Math.floor((ccrNum(x)-10)/2);
const ccrSigned=x=>ccrNum(x)>=0?'+'+ccrNum(x):String(ccrNum(x));
const ccrManagedTabs=new Set(['characters','rules','account']);
let ccrHubOpen=false,ccrHubTab='characters',ccrProgrammatic=false;
let ccrBattleOpen=false,ccrBattleBusy=false,ccrBattleGen=0,ccrScheduled=false;

if(!document.querySelector('#ccr-style')){
  const s=document.createElement('style');
  s.id='ccr-style';
  s.textContent=`
    .ccr-managed-hidden{display:none!important}
    .ccr-room-head{position:relative;z-index:2}
    .ccr-room-tabs{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
    .ccr-room-tabs button.on{border-color:var(--gold);color:var(--gold)}
    .ccr-battle-grid{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(320px,.85fr);gap:14px;align-items:start}
    .ccr-order{display:flex;flex-direction:column;gap:8px}
    .ccr-order-row{display:grid;grid-template-columns:52px minmax(0,1fr) auto;gap:10px;align-items:center;padding:10px 12px;border:1px solid var(--line);border-radius:13px;background:#0a1622}
    .ccr-order-row.current{border-color:var(--gold);box-shadow:inset 0 0 0 1px #d6ad5b44}
    .ccr-order-row.self{background:#10212b}
    .ccr-init{font-size:1.3rem;font-weight:900;text-align:center;color:var(--gold)}
    .ccr-pill{display:inline-flex;align-items:center;gap:5px;border:1px solid var(--line);border-radius:999px;padding:4px 8px;font-size:.76rem}
    .ccr-turn{border-color:#5b7848;color:#bde890}
    .ccr-weapons{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    .ccr-weapon{border:1px solid var(--line);border-radius:14px;padding:12px;background:#0a1622}
    .ccr-weapon h3{margin:5px 0}.ccr-weapon .actions{margin-top:9px}
    .ccr-statuses{display:flex;flex-wrap:wrap;gap:8px}
    .ccr-status{border:1px solid #725d34;background:#211d12;border-radius:12px;padding:8px 10px}
    .ccr-status b{color:#f3d58d}
    .ccr-mini-rolls{display:flex;flex-direction:column;gap:8px}
    .ccr-mini-roll{display:grid;grid-template-columns:44px minmax(0,1fr);gap:10px;align-items:center;border:1px solid var(--line);border-radius:12px;padding:9px;background:#0a1622}
    .ccr-mini-roll .die{width:44px;height:44px}.ccr-critical{color:var(--danger);font-weight:900}
    .ccr-room-note{border:1px solid var(--line);border-radius:13px;padding:12px;background:#0a1622}
    @media(max-width:900px){.ccr-battle-grid,.ccr-weapons{grid-template-columns:1fr}}
  `;
  document.head.appendChild(s);
}

function ccrToast(x){
  const t=document.querySelector('#toast');if(!t)return;
  t.textContent=String(x);t.classList.remove('hidden');clearTimeout(ccrToast.t);
  ccrToast.t=setTimeout(()=>t.classList.add('hidden'),3800);
}
function ccrNav(){return CCR_APP.querySelector('.nav')}
function ccrBaseTab(){return ccrNav()?.querySelector('button.on[data-tab]')?.dataset.tab||''}
function ccrSelectOnly(btn){const nav=ccrNav();if(!nav)return;nav.querySelectorAll('button.on').forEach(x=>x.classList.remove('on'));btn?.classList.add('on')}
function ccrCloseRooms(){ccrHubOpen=false;ccrBattleOpen=false;window.__catlakBattleRoomOpen=false;ccrBattleGen++}

function ccrEnsureHub(){
  const nav=ccrNav();if(!nav)return;
  nav.querySelectorAll('[data-tab="characters"],[data-tab="rules"],[data-tab="account"]').forEach(b=>b.classList.toggle('ccr-managed-hidden',ccrIsGM()));
  let room=nav.querySelector('[data-ccr-hub]');
  if(ccrIsGM()){
    if(!room){
      room=document.createElement('button');room.type='button';room.dataset.ccrHub='1';room.textContent='Yönetim Odası';
      const races=nav.querySelector('[data-tab="races"]');races?races.before(room):nav.appendChild(room);
    }
    room.classList.toggle('on',ccrHubOpen&&ccrManagedTabs.has(ccrBaseTab()));
  }else room?.remove();
}
function ccrHubHeader(){
  const active=ccrBaseTab();
  return `<section class="card ccr-room-head" data-ccr-hub-head>
    <div class="eyebrow">GM • YÖNETİM ODASI</div><h1>Hesap & Hazır İçerik</h1>
    <p class="muted">Hazır Karakterler, Kaynaklar ve Hesap tek odada. Alttaki içerik mevcut çalışan sayfanın aynısıdır.</p>
    <div class="ccr-room-tabs">
      <button type="button" data-ccr-hub-tab="characters" class="${active==='characters'?'on':''}">Hazır Karakterler</button>
      <button type="button" data-ccr-hub-tab="rules" class="${active==='rules'?'on':''}">Kaynaklar</button>
      <button type="button" data-ccr-hub-tab="account" class="${active==='account'?'on':''}">Hesap</button>
    </div>
  </section>`;
}
function ccrDecorateHub(){
  if(!ccrHubOpen||!ccrIsGM()||!ccrManagedTabs.has(ccrBaseTab()))return;
  const main=CCR_APP.querySelector('main');if(!main||main.querySelector('[data-ccr-hub-head]'))return;
  main.insertAdjacentHTML('afterbegin',ccrHubHeader());
  ccrNav()?.querySelector('[data-ccr-hub]')?.classList.add('on');
}
function ccrSwitchHub(tab){
  if(!ccrManagedTabs.has(tab))return;
  ccrHubOpen=true;ccrHubTab=tab;ccrBattleOpen=false;window.__catlakBattleRoomOpen=false;ccrBattleGen++;
  const b=ccrNav()?.querySelector(`[data-tab="${tab}"]`);if(!b)return;
  ccrProgrammatic=true;
  try{b.click()}finally{ccrProgrammatic=false}
  requestAnimationFrame(()=>{ccrEnsureHub();ccrDecorateHub()});
}

function ccrEnsureBattleNav(){
  const nav=ccrNav();if(!nav)return;
  let b=nav.querySelector('[data-ccr-battle]');
  if(ccrIsPlayer()){
    if(!b){
      b=document.createElement('button');b.type='button';b.dataset.ccrBattle='1';b.textContent='⚔ Savaş Odası';
      const sheet=nav.querySelector('[data-tab="sheet"]');sheet?sheet.after(b):nav.prepend(b);
    }
    if(ccrBattleOpen)ccrSelectOnly(b);
  }else b?.remove();
}
function ccrDerived(c,inv,items){
  const stats={...(c?.base_stats||{})};let ac=ccrNum(c?.base_ac),hp=ccrNum(c?.hp_max),speed=ccrNum(c?.base_speed),sets=[],bonus=0;
  const map=new Map((items||[]).map(i=>[i.id,i]));
  for(const r of (inv||[]).filter(x=>x.equipped)){
    const i=map.get(r.item_id);if(!i)continue;const fx=i.effects||{};
    for(const a of ['STR','DEX','CON','INT','WIS','CHA'])stats[a]=ccrNum(stats[a])+ccrNum(fx[a]);
    speed+=ccrNum(fx.speed);hp+=ccrNum(fx.hp_max);
    if(i.item_type==='armor'){
      if(i.ac_mode==='set')sets.push(ccrNum(i.ac_value));
      if(i.ac_mode==='bonus')bonus+=ccrNum(i.ac_value);
    }
  }
  if(sets.length)ac=Math.max(ac,...sets);
  return{stats,ac:ac+bonus,hp,speed};
}
async function ccrBattleData(){
  const snap=await CCR_S.rpc('catlak_player_combat_snapshot');if(snap.error)throw snap.error;const s=snap.data||{};
  const chars=await CCR_S.from('catlak_characters').select('id,name,hp_current,hp_max,base_ac,base_speed,base_stats,data,play_status').eq('play_status','active').order('created_at',{ascending:true});
  if(chars.error)throw chars.error;
  const c=(chars.data||[]).find(x=>x.id===s.character_id)||(chars.data||[])[0]||null;
  if(!c)return{snap:s,char:null,inv:[],items:[],conditions:[],rolls:[],derived:null};
  const [ir,kr,rr]=await Promise.all([
    CCR_S.from('catlak_inventory').select('id,character_id,item_id,quantity,equipped,equipped_slot,player_note').eq('character_id',c.id).order('granted_at',{ascending:true}),
    CCR_S.from('catlak_character_conditions').select('id,name,note,remaining_rounds,active,created_at').eq('character_id',c.id).eq('active',true).order('created_at',{ascending:true}),
    CCR_S.from('catlak_rolls').select('id,character_id,label,roll_kind,formula,modifier,total,created_at').eq('character_id',c.id).order('created_at',{ascending:false}).limit(12)
  ]);
  for(const r of [ir,kr,rr])if(r.error)throw r.error;
  const ids=[...new Set((ir.data||[]).map(x=>x.item_id))];let itemRows=[];
  if(ids.length){
    const qr=await CCR_S.from('catlak_items').select('id,name,item_type,description,attack_stat,attack_bonus,attack_formula,damage_formula,damage_type,effects,ac_mode,ac_value').in('id',ids);
    if(qr.error)throw qr.error;itemRows=qr.data||[];
  }
  return{snap:s,char:c,inv:ir.data||[],items:itemRows,conditions:kr.data||[],rolls:rr.data||[],derived:ccrDerived(c,ir.data||[],itemRows)};
}
function ccrOrderHtml(s){
  return (s.order||[]).map(x=>`<div class="ccr-order-row ${x.is_current?'current':''} ${x.is_self?'self':''}">
    <div class="ccr-init">${ccrNum(x.initiative)}</div>
    <div><b>${ccrEsc(x.name)}</b><div class="muted mini">${x.kind==='enemy'?'DÜŞMAN':'OYUNCU'}${x.is_self?' • SEN':''}</div></div>
    ${x.is_current?'<span class="ccr-pill ccr-turn">SIRA</span>':''}
  </div>`).join('');
}
function ccrConditionsHtml(rows){
  if(!rows.length)return'<div class="muted">Aktif durum etkisi yok.</div>';
  return `<div class="ccr-statuses">${rows.map(x=>`<div class="ccr-status"><b>${ccrEsc(x.name)}</b><div class="mini">${x.remaining_rounds==null?'Süresiz':ccrNum(x.remaining_rounds)+' round'}${x.note?' • '+ccrEsc(x.note):''}</div></div>`).join('')}</div>`;
}
function ccrWeaponsHtml(d){
  const map=new Map(d.items.map(i=>[i.id,i]));
  const rows=d.inv.filter(r=>r.equipped&&['main_weapon','off_weapon'].includes(r.equipped_slot)&&map.get(r.item_id)?.item_type==='weapon');
  if(!rows.length)return'<div class="muted">Takılı silah yok. Karakter kağıdından silah kuşanabilirsin.</div>';
  return `<div class="ccr-weapons">${rows.map(r=>{const i=map.get(r.item_id);return`<article class="ccr-weapon">
    <div class="eyebrow">${r.equipped_slot==='main_weapon'?'ANA SİLAH':'İKİNCİ SİLAH'}</div><h3>${ccrEsc(i.name)}</h3>
    <div class="muted mini">Saldırı: ${ccrEsc(i.attack_formula||'1d20')} ${i.attack_stat&&i.attack_stat!=='NONE'?'• '+ccrEsc(i.attack_stat):''}${ccrNum(i.attack_bonus)?' • '+ccrSigned(i.attack_bonus):''}</div>
    ${i.damage_formula?`<div class="muted mini">Hasar: ${ccrEsc(i.damage_formula)} ${ccrEsc(i.damage_type||'')}</div>`:''}
    <div class="actions"><button type="button" class="primary" data-ccr-weapon="${r.id}" data-kind="attack">Saldırı At</button><button type="button" data-ccr-weapon="${r.id}" data-kind="damage">Hasar At</button></div>
  </article>`}).join('')}</div>`;
}
function ccrRecentHtml(rows){
  if(!rows.length)return'<div class="muted">Henüz savaş zarı yok.</div>';
  return `<div class="ccr-mini-rolls">${rows.map(r=>`<div class="ccr-mini-roll"><div class="die">${r.total==null?'?':r.total}</div><div><b>${ccrEsc(r.label||r.roll_kind||'Zar')}</b><div class="mini muted">${ccrEsc(r.formula||'')} ${r.modifier?ccrSigned(r.modifier):''}</div>${r.total!=null&&Number(r.total)===0?'<div class="ccr-critical">KRİTİK BAŞARISIZLIK</div>':''}</div></div>`).join('')}</div>`;
}
function ccrBattleHtml(d){
  if(!d.char)return`<section class="card"><div class="eyebrow">⚔ SAVAŞ ODASI</div><h1>Karakter bulunamadı</h1><p class="muted">Aktif bir karakter bağlandığında Savaş Odası hazır olacak.</p></section>`;
  const s=d.snap||{},der=d.derived||{stats:d.char.base_stats||{},ac:d.char.base_ac,hp:d.char.hp_max};
  if(!s.active)return`<section class="card hero"><div><div class="eyebrow">⚔ OYUNCU • SAVAŞ ODASI</div><h1>Savaş Hazır</h1><p class="muted">Şu anda aktif bir savaş yok. GM savaşı başlattığında bu oda otomatik güncellenecek.</p></div><div class="vitals"><div class="vital"><span>HP</span><b>${ccrNum(d.char.hp_current)}/${ccrNum(der.hp)}</b></div><div class="vital"><span>AC</span><b>${ccrNum(der.ac)}</b></div></div></section>`;
  const order=ccrOrderHtml(s);
  if(!s.in_combat)return`<section class="card hero"><div><div class="eyebrow">⚔ OYUNCU • SAVAŞ ODASI</div><h1>${ccrEsc(s.battle_name||'Savaş')}</h1><p class="muted">Savaş başladı; GM henüz karakterini karşılaşmaya eklemedi.</p></div><div class="vitals"><div class="vital"><span>HP</span><b>${ccrNum(d.char.hp_current)}/${ccrNum(der.hp)}</b></div><div class="vital"><span>AC</span><b>${ccrNum(der.ac)}</b></div></div></section><section class="card"><div class="eyebrow">TUR SIRASI</div><h2>Round ${ccrNum(s.round)}</h2><div class="ccr-order">${order||'<div class="muted">Katılımcı yok.</div>'}</div></section>`;
  const quick=['STR','DEX','CON','INT','WIS','CHA'].map(a=>`<button type="button" data-ccr-stat="${a}">${a} ${ccrSigned(ccrMod(der.stats?.[a]))}</button>`).join('');
  return `<section class="card hero"><div><div class="eyebrow">⚔ OYUNCU • SAVAŞ ODASI</div><h1>${ccrEsc(s.battle_name||'Savaş')}</h1><p>${ccrEsc(d.char.name)} • Round ${ccrNum(s.round)} • ${s.is_my_turn?'<b class="gold">SIRA SENDE</b>':`Sıra: <b>${ccrEsc(s.current_name||'—')}</b>`}</p></div><div class="vitals"><div class="vital"><span>HP</span><b>${ccrNum(d.char.hp_current)}/${ccrNum(der.hp)}</b></div><div class="vital"><span>AC</span><b>${ccrNum(der.ac)}</b></div><div class="vital"><span>DURUM</span><b>${s.is_my_turn?'▶':'•'}</b></div></div></section>
  <div class="ccr-battle-grid"><div>
    <section class="card"><div class="eyebrow">TUR SIRASI</div><h2>Round ${ccrNum(s.round)}</h2><div class="ccr-order">${order||'<div class="muted">Katılımcı yok.</div>'}</div></section>
    <section class="card"><div class="eyebrow">TAKILI SİLAHLAR</div><h2>Saldırı & Hasar</h2>${ccrWeaponsHtml(d)}</section>
    <section class="card"><div class="eyebrow">HIZLI D20</div><div class="actions">${quick}</div></section>
  </div><aside>
    <section class="card"><div class="eyebrow">AKTİF DURUMLAR</div><h2>Üzerindeki Etkiler</h2>${ccrConditionsHtml(d.conditions)}</section>
    <section class="card"><div class="eyebrow">SON ZARLARIN</div>${ccrRecentHtml(d.rolls)}</section>
  </aside></div>`;
}
async function ccrBattleRender(force=false){
  if(!ccrBattleOpen||!ccrIsPlayer()||ccrBattleBusy)return;
  const main=CCR_APP.querySelector('main');if(!main)return;
  if(!force&&main.dataset.ccrBattle==='1')return;
  const gen=++ccrBattleGen,oldY=window.scrollY;ccrBattleBusy=true;
  try{
    const d=await ccrBattleData();
    if(!ccrBattleOpen||gen!==ccrBattleGen||CCR_APP.querySelector('main')!==main)return;
    ccrEnsureBattleNav();main.innerHTML=ccrBattleHtml(d);main.dataset.ccrBattle='1';
    requestAnimationFrame(()=>window.scrollTo(0,oldY));
  }catch(e){ccrToast('Savaş Odası yüklenemedi: '+(e?.message||String(e)))}finally{ccrBattleBusy=false}
}
async function ccrBattleRollWeapon(invId,kind){
  const r=await CCR_S.rpc('catlak_roll_weapon',{p_inventory_id:invId,p_action:kind});if(r.error)throw r.error;
  ccrToast(r.data?.total==null?`${r.data?.label||'Zar'}: GM Kararı`:`${r.data?.label||'Zar'}: ${r.data.total}`);
  await ccrBattleRender(true);
}
async function ccrBattleRollStat(stat){
  const s=await CCR_S.rpc('catlak_player_combat_snapshot');if(s.error)throw s.error;const id=s.data?.character_id;if(!id)throw new Error('Aktif karakter bulunamadı');
  const r=await CCR_S.rpc('catlak_roll_stat',{p_character_id:id,p_stat:stat});if(r.error)throw r.error;
  ccrToast(`${r.data?.label||stat}: ${r.data?.total}`);await ccrBattleRender(true);
}
function ccrOpenBattle(){
  ccrHubOpen=false;ccrBattleOpen=true;window.__catlakBattleRoomOpen=true;
  const b=ccrNav()?.querySelector('[data-ccr-battle]');ccrSelectOnly(b);
  const main=CCR_APP.querySelector('main');if(main)delete main.dataset.ccrBattle;
  ccrBattleRender(true);
}

function ccrEnsure(){ccrEnsureHub();ccrEnsureBattleNav();ccrDecorateHub();if(ccrBattleOpen)ccrBattleRender()}
function ccrSchedule(){if(ccrScheduled)return;ccrScheduled=true;requestAnimationFrame(()=>{ccrScheduled=false;ccrEnsure()})}

// Capture-phase delegation: oda butonları mevcut APP/zar handler'larından önce güvenilir biçimde ayrılır.
document.addEventListener('click',e=>{
  const hub=e.target.closest?.('[data-ccr-hub]');
  if(hub){e.preventDefault();e.stopImmediatePropagation();ccrHubOpen=true;ccrBattleOpen=false;window.__catlakBattleRoomOpen=false;ccrSwitchHub(ccrManagedTabs.has(ccrBaseTab())?ccrBaseTab():ccrHubTab);return}
  const ht=e.target.closest?.('[data-ccr-hub-tab]');
  if(ht){e.preventDefault();e.stopImmediatePropagation();ccrSwitchHub(ht.dataset.ccrHubTab);return}
  const battle=e.target.closest?.('[data-ccr-battle]');
  if(battle){e.preventDefault();e.stopImmediatePropagation();ccrOpenBattle();return}
  const wr=e.target.closest?.('[data-ccr-weapon]');
  if(wr&&ccrBattleOpen){e.preventDefault();e.stopImmediatePropagation();ccrBattleRollWeapon(wr.dataset.ccrWeapon,wr.dataset.kind).catch(x=>ccrToast(x?.message||x));return}
  const sr=e.target.closest?.('[data-ccr-stat]');
  if(sr&&ccrBattleOpen){e.preventDefault();e.stopImmediatePropagation();ccrBattleRollStat(sr.dataset.ccrStat).catch(x=>ccrToast(x?.message||x));return}
  const navButton=e.target.closest?.('#app .nav button');
  if(navButton&&!ccrProgrammatic)ccrCloseRooms();
},true);

new MutationObserver(ccrSchedule).observe(CCR_APP,{childList:true,subtree:true});
setInterval(()=>{if(ccrBattleOpen)ccrBattleRender(true)},2500);
window.__catlakRoomSystemTest={openBattle:ccrOpenBattle,renderBattle:ccrBattleRender,managedTabs:[...ccrManagedTabs]};
ccrEnsure();
