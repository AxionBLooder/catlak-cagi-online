const CCR_S=window.__catlakSupabase;
const CCR_APP=document.querySelector('#app');
if(!CCR_S||!CCR_APP)throw new Error('Çatlak Çağı oda sistemi başlatılamadı.');
if(window.__catlakRuntimeOwnership&&!window.__catlakRuntimeOwnership.claim('player-room-router','room-system'))throw new Error('Oyuncu oda yönlendirmesi sahipliği çakıştı.');

const ccrText=e=>String(e?.textContent||'').trim();
const ccrRole=()=>ccrText(CCR_APP.querySelector('.role'));
const ccrIsGM=()=>ccrRole()==='GM';
const ccrIsPlayer=()=>!!ccrRole()&&!ccrIsGM();
const ccrEsc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
const ccrNum=x=>Number(x||0);
const ccrMod=x=>Math.floor((ccrNum(x)-10)/2);
const ccrSigned=x=>ccrNum(x)>=0?'+'+ccrNum(x):String(ccrNum(x));
const ccrManagedTabs=new Set(['characters','rules','account']);
const CCR_PKEY='cc_party_member';
let ccrHubOpen=false,ccrHubTab='characters',ccrProgrammatic=false;
let ccrBattleOpen=false,ccrBattleBusy=false,ccrBattleGen=0,ccrScheduled=false;
let ccrPartyKnown=false,ccrPartyMember=false,ccrPartyBusy=false;

if(!document.querySelector('#ccr-style')){
  const s=document.createElement('style');
  s.id='ccr-style';
  s.textContent=`
    html.cc-battle-entry-pending #app main>*,#app main.ccr-base-building>*{visibility:hidden!important}
    html.cc-battle-entry-pending #app main::before,#app main.ccr-base-building::before{content:'Savaş Odası hazırlanıyor…';display:block;visibility:visible!important;margin:20px auto;max-width:980px;padding:18px;border:1px solid #284254;border-radius:12px;background:#08131c;color:#91a7bb;font-weight:700}
    #app main.ccr-battle-surface{width:100%!important;max-width:none!important;min-width:0!important;box-sizing:border-box!important;margin-left:auto!important;margin-right:auto!important}
    #app main.ccr-battle-surface>*{min-width:0!important;box-sizing:border-box!important}
    #app main.ccr-battle-surface .ccr-battle-grid{width:100%!important;max-width:none!important;min-width:0!important}
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

function ccrPrepareBattleMain(main){
  if(!main)return null;
  main.className='ccr-battle-surface';
  delete main.dataset.ccHardSheet;delete main.dataset.ccHardWait;delete main.dataset.ccDesk;delete main.dataset.ccPage;delete main.dataset.ccBindFallback;delete main.dataset.ccViewMount;
  return main
}
function ccrToast(x){
  const t=document.querySelector('#toast');if(!t)return;
  t.textContent=String(x);t.classList.remove('hidden');clearTimeout(ccrToast.t);
  ccrToast.t=setTimeout(()=>t.classList.add('hidden'),3800);
}
function ccrNav(){return CCR_APP.querySelector('.nav')}
function ccrBaseTab(){return ccrNav()?.querySelector('button.on[data-tab]')?.dataset.tab||''}
function ccrSelectOnly(btn){const nav=ccrNav();if(!nav)return;nav.querySelectorAll('button.on').forEach(x=>x.classList.remove('on'));btn?.classList.add('on')}
function ccrCloseRooms(){ccrHubOpen=false;ccrBattleOpen=false;window.__catlakBattleRoomOpen=false;ccrBattleGen++;document.documentElement.classList.remove('cc-battle-entry-pending');const main=CCR_APP.querySelector('main');if(main){delete main.dataset.ccrBattle;main.classList.remove('ccr-base-building','br3-live-layout','ccr-battle-surface')}try{window.__catlakViewRuntime?.ready?.('player-battle')}catch(_){}}
function ccrCloseBattle(){
  ccrBattleOpen=false;window.__catlakBattleRoomOpen=false;ccrBattleGen++;
  document.documentElement.classList.remove('cc-battle-entry-pending');
  const main=CCR_APP.querySelector('main');
  if(main){delete main.dataset.ccrBattle;main.classList.remove('br3-live-layout','ccr-base-building','ccr-battle-surface')}
  ccrNav()?.querySelector('[data-ccr-battle]')?.classList.remove('on');
  try{window.__catlakViewRuntime?.ready?.('player-battle')}catch(_){}
  return true
}

function ccrEnsureHub(){
  const nav=ccrNav();if(!nav)return;
  nav.querySelectorAll('[data-tab="characters"],[data-tab="rules"],[data-tab="account"]').forEach(b=>b.classList.toggle('ccr-managed-hidden',ccrIsGM()));
  const room=nav.querySelector('[data-ccr-hub]');
  if(ccrIsGM()){
    ccrHubOpen=false;
    room?.remove();
    return;
  }
  room?.remove();
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
  const allowed=ccrIsPlayer()&&ccrPartyKnown&&ccrPartyMember;
  if(allowed){
    if(!b){
      b=document.createElement('button');b.type='button';b.dataset.ccrBattle='1';b.textContent='⚔ Savaş Odası';
      const race=nav.querySelector('[data-cc-hard-race-nav]'),sheet=nav.querySelector('[data-tab="sheet"]');
      race?race.before(b):sheet?sheet.after(b):nav.prepend(b);
    }
    const race=nav.querySelector('[data-cc-hard-race-nav]');
    if(b&&race&&b.nextElementSibling!==race)race.before(b);
    if(ccrBattleOpen)ccrSelectOnly(b);
  }else{
    b?.remove();
    if(ccrIsPlayer()&&!ccrPartyMember){
      nav.querySelectorAll('[data-cc-map-tab],[data-cc-world-tab]').forEach(x=>x.remove());
      CCR_APP.querySelectorAll('[data-cc-party-visual-card]').forEach(x=>x.remove());
    }
  }
}
async function ccrRefreshPartyAccess(force=false){
  if(!ccrIsPlayer()){ccrPartyKnown=true;ccrPartyMember=false;ccrEnsureBattleNav();return false}
  if(!force&&typeof window.__catlakPlayerPartyAllowedEarly==='boolean'){
    ccrPartyMember=window.__catlakPlayerPartyAllowedEarly;ccrPartyKnown=true;
    delete window.__catlakPlayerPartyAllowedEarly;
    ccrEnsureBattleNav();
    if(ccrPartyMember)try{window.__catlakBattleRoomV3Test?.preload?.()}catch(_){}
    return ccrPartyMember;
  }
  if(ccrPartyBusy)return ccrPartyMember;ccrPartyBusy=true;
  try{
    const ses=(await CCR_S.auth.getSession()).data?.session,uid=ses?.user?.id;
    if(!uid){ccrPartyKnown=true;ccrPartyMember=false;return false}
    const r=await CCR_S.from('catlak_characters').select('id,data,play_status').eq('owner_id',uid).eq('play_status','active');
    if(r.error)throw r.error;
    ccrPartyMember=(r.data||[]).some(c=>c.data?.[CCR_PKEY]===true);ccrPartyKnown=true;if(ccrPartyMember)try{window.__catlakBattleRoomV3Test?.preload?.()}catch(_){}
    if(!ccrPartyMember&&ccrBattleOpen){
      ccrCloseRooms();
      const sheet=ccrNav()?.querySelector('[data-tab="sheet"]');ccrSelectOnly(sheet);
      requestAnimationFrame(()=>{try{sheet?.click()}catch(_){}});
    }
    return ccrPartyMember;
  }catch(e){
    console.warn('CCR_PARTY_ACCESS',e);
    ccrPartyKnown=true;
    if(!ccrBattleOpen)ccrPartyMember=false;
    return ccrPartyMember
  }
  finally{ccrPartyBusy=false;ccrEnsureBattleNav()}
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
  if(!ccrPartyKnown)await ccrRefreshPartyAccess();
  if(!ccrPartyMember)throw new Error('Savaş Odası yalnız aktif parti üyelerine açık.');
  const snap=await CCR_S.rpc('catlak_player_combat_snapshot');if(snap.error)throw snap.error;const s=snap.data||{};
  const ses=(await CCR_S.auth.getSession()).data?.session,uid=ses?.user?.id;if(!uid)throw new Error('Oyuncu oturumu bulunamadı.');
  const chars=await CCR_S.from('catlak_characters').select('id,name,hp_current,hp_max,base_ac,base_speed,base_stats,data,play_status').eq('owner_id',uid).eq('play_status','active').order('created_at',{ascending:true});
  if(chars.error)throw chars.error;
  const own=(chars.data||[]).filter(x=>x.data?.[CCR_PKEY]===true);
  const c=own.find(x=>x.id===s.character_id)||own[0]||null;
  if(!c)return{snap:s,char:null,inv:[],items:[],conditions:[],derived:null};
  const [ir,kr]=await Promise.all([
    CCR_S.from('catlak_inventory').select('id,character_id,item_id,quantity,equipped,equipped_slot,player_note').eq('character_id',c.id).order('granted_at',{ascending:true}),
    CCR_S.from('catlak_character_conditions').select('id,name,note,remaining_rounds,active,created_at').eq('character_id',c.id).eq('active',true).order('created_at',{ascending:true})
  ]);
  for(const r of [ir,kr])if(r.error)throw r.error;
  const ids=[...new Set((ir.data||[]).map(x=>x.item_id))];let itemRows=[];
  if(ids.length){
    const qr=await CCR_S.from('catlak_items').select('id,name,item_type,description,attack_stat,attack_bonus,attack_formula,damage_formula,damage_type,effects,ac_mode,ac_value').in('id',ids);
    if(qr.error)throw qr.error;itemRows=qr.data||[];
  }
  return{snap:s,char:c,inv:ir.data||[],items:itemRows,conditions:kr.data||[],derived:ccrDerived(c,ir.data||[],itemRows)};
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
  const active=!!s.active,inCombat=!!s.in_combat;
  const order=ccrOrderHtml(s);
  const title=active?ccrEsc(s.battle_name||'Karşılaşma'):'Karşılaşma';
  const heroText=!active
    ?'Henüz aktif savaş yok. Aksiyonların, silahların ve durumların burada hazır kalır.'
    :!inCombat
      ?'Savaş başladı; GM henüz karakterini karşılaşmaya eklemedi.'
      :ccrEsc(d.char.name)+' • Round '+ccrNum(s.round)+' • '+(s.is_my_turn?'<b class="gold">SIRA SENDE</b>':'Sıra: <b>'+ccrEsc(s.current_name||'—')+'</b>');
  const orderSection=active?`<section class="card br3-order-section" data-br3-base-order><div class="eyebrow">TUR SIRASI</div><h2>Round ${ccrNum(s.round)}</h2><div class="ccr-order">${order||'<div class="muted">Katılımcı yok.</div>'}</div></section>`:'';
  return `<section class="card hero"><div><div class="eyebrow">⚔ OYUNCU • SAVAŞ ODASI</div><h1>${title}</h1><p class="${active?'':'muted'}">${heroText}</p></div><div class="vitals"><div class="vital"><span>HP</span><b>${ccrNum(d.char.hp_current)}/${ccrNum(der.hp)}</b></div><div class="vital"><span>AC</span><b>${ccrNum(der.ac)}</b></div><div class="vital"><span>DURUM</span><b>${active?(s.is_my_turn?'▶':'•'):'—'}</b></div></div></section>
  <div class="ccr-battle-grid"><div>
    ${orderSection}
    <section class="card"><div class="eyebrow">TAKILI SİLAHLAR</div><h2>Saldırı & Hasar</h2>${ccrWeaponsHtml(d)}</section>
  </div><aside>
    <section class="card"><div class="eyebrow">AKTİF DURUMLAR</div><h2>Üzerindeki Etkiler</h2>${ccrConditionsHtml(d.conditions)}</section>
  </aside></div>`;
}
function ccrBattleEnhancedReady(main){
  if(!main?.querySelector('[data-br3-abilities]'))return false;
  if(main.dataset.br3CombatActive==='0')return true;
  return !!main.querySelector('[data-br3-turn]');
}
async function ccrBattleRender(force=false){
  if(!ccrBattleOpen||!ccrIsPlayer()||ccrBattleBusy)return;
  const main=ccrPrepareBattleMain(CCR_APP.querySelector('main'));if(!main)return;
  // Once canonical BR3 owns the room, Room System may never replace the full <main>.
  // All subsequent refreshes (including legacy force=true callers) are delegated.
  if(main.dataset.ccrBattle==='1'&&main.querySelector('[data-br3-abilities]')&&window.__catlakBattleRoomV3Test?.render){
    return await window.__catlakBattleRoomV3Test.render(!!force)
  }
  if(!force&&main.dataset.ccrBattle==='1')return;
  const gen=++ccrBattleGen,oldY=window.scrollY;ccrBattleBusy=true;
  try{
    const d=await ccrBattleData();
    if(!ccrBattleOpen||gen!==ccrBattleGen||CCR_APP.querySelector('main')!==main)return;
    ccrEnsureBattleNav();main.classList.add('ccr-base-building');main.innerHTML=ccrBattleHtml(d);main.dataset.ccrBattle='1';
    if(document.documentElement.classList.contains('cc-battle-entry-pending')){
      for(let i=0;i<60&&!window.__catlakBattleRoomV3Test?.render;i++)await new Promise(r=>setTimeout(r,10));
      let enhanced=false;
      for(let attempt=0;attempt<3&&!enhanced;attempt++){
        if(window.__catlakBattleRoomV3Test?.render)await window.__catlakBattleRoomV3Test.render(true);
        for(let i=0;i<40;i++){
          enhanced=ccrBattleEnhancedReady(main);
          if(enhanced)break;
          await new Promise(r=>setTimeout(r,15));
        }
      }
      if(enhanced){
        document.documentElement.classList.remove('cc-battle-entry-pending');
        main.classList.remove('ccr-base-building');
        try{window.__catlakActionStability?.finishBattleEntry?.()}catch(_){}
        try{window.__catlakViewRuntime?.ready?.('player-battle')}catch(_){}
      }else{
        main.classList.remove('ccr-base-building');
        document.documentElement.classList.remove('cc-battle-entry-pending');
        main.innerHTML='<section class="card"><div class="eyebrow">⚔ SAVAŞ ODASI</div><h2>Savaş Odası yeniden hazırlanıyor</h2><p class="muted">Görünüm tamamlanamadı. Bir kez daha açmayı dene.</p><button type="button" data-ccr-battle-retry>Yeniden Dene</button></section>';
      }
    }else if(ccrBattleEnhancedReady(main)){
      main.classList.remove('ccr-base-building');
      document.documentElement.classList.remove('cc-battle-entry-pending');
      try{window.__catlakActionStability?.finishBattleEntry?.()}catch(_){}
      try{window.__catlakViewRuntime?.ready?.('player-battle')}catch(_){}
    }
    requestAnimationFrame(()=>window.scrollTo(0,oldY));
  }catch(e){
    document.documentElement.classList.remove('cc-battle-entry-pending');
    main.classList.remove('ccr-base-building');
    try{window.__catlakActionStability?.finishBattleEntry?.()}catch(_){}
    try{window.__catlakViewRuntime?.ready?.('player-battle')}catch(_){}
    if(ccrBattleOpen&&CCR_APP.querySelector('main')===main){
      main.innerHTML='<section class="card"><div class="eyebrow">⚔ SAVAŞ ODASI</div><h2>Savaş Odası yüklenemedi</h2><p class="muted">'+ccrEsc(e?.message||String(e))+'</p><button type="button" data-ccr-battle-retry>Yeniden Dene</button></section>';
    }
    ccrToast('Savaş Odası yüklenemedi: '+(e?.message||String(e)))
  }finally{ccrBattleBusy=false}
}
async function ccrBattleRollWeapon(invId,kind){
  const r=await CCR_S.rpc('catlak_roll_weapon',{p_inventory_id:invId,p_action:kind});if(r.error)throw r.error;
  ccrToast(r.data?.total==null?(String(r.data?.label||'Zar')+': GM Kararı'):(String(r.data?.label||'Zar')+': '+r.data.total));
  if(window.__catlakBattleRoomV3Test?.render)await window.__catlakBattleRoomV3Test.render(false);
  else await ccrBattleRender(true);
}
async function ccrBattleRollStat(stat){
  const s=await CCR_S.rpc('catlak_player_combat_snapshot');if(s.error)throw s.error;const id=s.data?.character_id;if(!id)throw new Error('Aktif karakter bulunamadı');
  const r=await CCR_S.rpc('catlak_roll_stat',{p_character_id:id,p_stat:stat});if(r.error)throw r.error;
  ccrToast(String(r.data?.label||stat)+': '+r.data?.total);
  if(window.__catlakBattleRoomV3Test?.render)await window.__catlakBattleRoomV3Test.render(false);
  else await ccrBattleRender(true);
}
function ccrOpenBattle(){
  if(!ccrPartyKnown||!ccrPartyMember){ccrRefreshPartyAccess();ccrToast('Savaş Odası yalnız partiye alınmış oyunculara açıktır.');return}
  ccrHubOpen=false;ccrBattleOpen=true;window.__catlakBattleRoomOpen=true;
  try{window.__catlakViewRuntime?.begin?.('player-battle')}catch(_){}
  document.documentElement.classList.add('cc-battle-entry-pending');
  const b=ccrNav()?.querySelector('[data-ccr-battle]');ccrSelectOnly(b);
  const main=ccrPrepareBattleMain(CCR_APP.querySelector('main'));
  if(main){delete main.dataset.ccrBattle;main.replaceChildren()}
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
  const retry=e.target.closest?.('[data-ccr-battle-retry]');
  if(retry){e.preventDefault();e.stopImmediatePropagation();document.documentElement.classList.add('cc-battle-entry-pending');const main=CCR_APP.querySelector('main');if(main)delete main.dataset.ccrBattle;ccrBattleRender(true);return}
  const wr=e.target.closest?.('[data-ccr-weapon]');
  if(wr&&ccrBattleOpen){e.preventDefault();e.stopImmediatePropagation();ccrBattleRollWeapon(wr.dataset.ccrWeapon,wr.dataset.kind).catch(x=>ccrToast(x?.message||x));return}
  const sr=e.target.closest?.('[data-ccr-stat]');
  if(sr&&ccrBattleOpen){e.preventDefault();e.stopImmediatePropagation();ccrBattleRollStat(sr.dataset.ccrStat).catch(x=>ccrToast(x?.message||x));return}
  const navButton=e.target.closest?.('#app .nav button');
  if(navButton&&!ccrProgrammatic)ccrCloseRooms();
},true);

let ccrConditionRefreshBusy=false;
async function ccrRefreshConditionsOnly(){
  if(!ccrBattleOpen||ccrConditionRefreshBusy)return;
  ccrConditionRefreshBusy=true;
  try{
    const snap=await CCR_S.rpc('catlak_player_combat_snapshot');if(snap.error)throw snap.error;
    const id=snap.data?.character_id;if(!id)return;
    const kr=await CCR_S.from('catlak_character_conditions').select('*').eq('character_id',id).eq('active',true).order('created_at',{ascending:true});if(kr.error)throw kr.error;
    const main=CCR_APP.querySelector('main');if(!main||!ccrBattleOpen)return;
    const sec=[...main.querySelectorAll('section.card')].find(x=>ccrText(x.querySelector('.eyebrow')).toUpperCase()==='AKTİF DURUMLAR');
    if(sec)sec.innerHTML='<div class="eyebrow">AKTİF DURUMLAR</div><h2>Üzerindeki Etkiler</h2>'+ccrConditionsHtml(kr.data||[]);
  }catch(e){console.warn('CCR_CONDITION_REFRESH',e)}
  finally{ccrConditionRefreshBusy=false}
}
let ccrRealtimeTimer=0,ccrRealtimeFull=false,ccrRealtimeConditions=false;
function ccrFlushRealtime(){
  ccrRealtimeTimer=0;
  const lockUntil=Number(window.__catlakBattleInteractionUntil||0);if(lockUntil>Date.now()){ccrRealtimeTimer=setTimeout(ccrFlushRealtime,Math.max(80,lockUntil-Date.now()+80));return}
  if(!ccrBattleOpen){ccrRealtimeFull=false;ccrRealtimeConditions=false;return}
  if(window.__catlakBattleRoomV3Test?.render){
    const conditions=ccrRealtimeConditions;
    ccrRealtimeFull=false;ccrRealtimeConditions=false;
    window.__catlakBattleRoomV3Test.render(false);
    if(conditions)ccrRefreshConditionsOnly();
    return
  }
  if(ccrRealtimeFull){
    ccrRealtimeFull=false;ccrRealtimeConditions=false;
    const main=CCR_APP.querySelector('main');if(main)delete main.dataset.ccrBattle;
    ccrBattleRender(true);return
  }
  if(ccrRealtimeConditions)ccrRefreshConditionsOnly();
  ccrRealtimeConditions=false;
}
function ccrQueueRealtime(full=false,conditions=false){
  if(!ccrBattleOpen)return;
  ccrRealtimeFull=ccrRealtimeFull||!!full;ccrRealtimeConditions=ccrRealtimeConditions||!!conditions;
  clearTimeout(ccrRealtimeTimer);ccrRealtimeTimer=setTimeout(ccrFlushRealtime,75);
}
function ccrRealtimeRefresh(full=false){ccrQueueRealtime(full,false)}
new MutationObserver(rs=>{
  const nav=ccrNav(),main=CCR_APP.querySelector('main');
  const structural=rs.some(r=>{
    if(r.target===CCR_APP)return true;
    if(nav&&(r.target===nav||nav.contains(r.target)))return true;
    return [...r.addedNodes].some(n=>n.nodeType===1&&(n.matches?.('main,.nav,.role')||n.querySelector?.('main,.nav,.role')));
  });
  if(structural||ccrBattleOpen&&!main?.dataset.ccrBattle)ccrSchedule();
}).observe(CCR_APP,{childList:true,subtree:true});
window.addEventListener('catlak:realtime-sync',e=>{
  const k=String(e.detail?.kind||'');
  if(k==='party')ccrRefreshPartyAccess(true);
  if(['combat','ability','party','character'].includes(k))ccrQueueRealtime(false,k==='character')
});
window.addEventListener('catlak:party-membership-changed',()=>ccrRefreshPartyAccess(true));
if(typeof CCR_S.channel==='function')CCR_S.channel('ccr-battle-live-v2').on('postgres_changes',{event:'*',schema:'public',table:'catlak_combat_state'},()=>ccrQueueRealtime(false,false)).on('postgres_changes',{event:'*',schema:'public',table:'catlak_combatants'},()=>ccrQueueRealtime(false,false)).on('postgres_changes',{event:'*',schema:'public',table:'catlak_characters'},()=>ccrQueueRealtime(false,false)).on('postgres_changes',{event:'*',schema:'public',table:'catlak_character_conditions'},()=>ccrQueueRealtime(false,true)).on('postgres_changes',{event:'*',schema:'public',table:'catlak_inventory'},()=>ccrQueueRealtime(true,false)).on('postgres_changes',{event:'*',schema:'public',table:'catlak_items'},()=>ccrQueueRealtime(true,false)).subscribe();
window.__catlakRoomSystemTest={openBattle:ccrOpenBattle,closeBattle:ccrCloseBattle,renderBattle:ccrBattleRender,managedTabs:[...ccrManagedTabs],realtimeRefresh:ccrRealtimeRefresh,refreshPartyAccess:ccrRefreshPartyAccess,partyAllowed:()=>ccrPartyMember};
ccrEnsure();ccrRefreshPartyAccess();
