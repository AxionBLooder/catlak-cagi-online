const BR3_S=window.__catlakSupabase;
const BR3_APP=document.querySelector('#app');
if(!BR3_S||!BR3_APP)throw new Error('Çatlak Çağı Savaş Odası v3 başlatılamadı.');
if(window.__catlakRuntimeOwnership&&!window.__catlakRuntimeOwnership.claim('player-battle','battle-room-v3'))throw new Error('Savaş Odası sahipliği çakıştı.');
window.__catlakBattleRoomV4=true;
window.__catlakBattleRoomV3=true;

const br3Txt=e=>String(e?.textContent||'').trim();
const br3Esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const br3Num=(x,f=0)=>Number.isFinite(Number(x))?Number(x):f;
const br3IsGM=()=>br3Txt(BR3_APP.querySelector('.role'))==='GM';
const br3IsPlayer=()=>!!br3Txt(BR3_APP.querySelector('.role'))&&!br3IsGM();
const br3BattleView=()=>{
  const main=BR3_APP.querySelector('main');
  const btn=BR3_APP.querySelector('.nav [data-ccr-battle]');
  return window.__catlakBattleRoomOpen===true||btn?.classList.contains('on')||main?.dataset.ccrBattle==='1';
};
const br3Toast=x=>{const t=document.querySelector('#toast');if(!t)return;t.textContent=String(x);t.classList.remove('hidden');clearTimeout(br3Toast.t);br3Toast.t=setTimeout(()=>t.classList.add('hidden'),4200)};
let br3Busy=false,br3Queued=false,br3Timer=null,br3Sig='',br3TargetId='',br3LastResult=null,br3LastSnap=null,br3LastData=null,br3Gen=0,br3ActionBusy=false,br3AutoEndBusy=false,br3CachedHtml='',br3Preload=null,br3PreloadAt=0,br3PreloadBusy=null,br3InteractionUntil=0,br3BoundCharacterId='';
function br3HoldInteraction(ms=1300){br3InteractionUntil=Math.max(br3InteractionUntil,Date.now()+ms);window.__catlakBattleInteractionUntil=Math.max(Number(window.__catlakBattleInteractionUntil||0),br3InteractionUntil)}
function br3InteractionLocked(){const a=document.activeElement;return Date.now()<br3InteractionUntil||!!(a&&BR3_APP.contains(a)&&a.matches?.('[data-br3-hp-amount]'))}

if(!document.querySelector('#br3-style')){
  const s=document.createElement('style');s.id='br3-style';s.textContent=`
  #app main.br3-live-layout{width:100%!important;max-width:none!important;min-width:0!important;box-sizing:border-box!important}
  #app main.br3-live-layout .ccr-battle-grid{width:100%!important;max-width:none!important;min-width:0!important}
  #app main [data-bcc-creatures],#app main [data-apb-player],#app main [data-cex-turn],#app main [data-cex-log],#app main [data-bcc-weapon-actions]{display:none!important}
  .br3-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(225px,1fr));gap:10px}.br3-card{border:1px solid var(--line);border-radius:14px;padding:12px;background:#0a1622}.br3-card.current{border-color:var(--gold);box-shadow:inset 0 0 0 1px #d6ad5b44}.br3-card.selected{border-color:var(--cyan);box-shadow:inset 0 0 0 1px #69d7ff55}.br3-card.dead{opacity:.58}.br3-card h3{margin:4px 0 7px}.br3-pills{display:flex;gap:6px;flex-wrap:wrap;margin:7px 0}.br3-pill{font-size:.74rem;border:1px solid var(--line);border-radius:999px;padding:3px 7px}.br3-note{white-space:pre-wrap;color:var(--muted);font-size:.84rem}.br3-target-line{margin:8px 0;padding:8px 10px;border:1px solid var(--line);border-radius:10px;background:#07111d;font-size:.82rem}.br3-target-line b{color:var(--cyan)}
  .br3-turn{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}.br3-turn.ready{border-color:var(--gold)}.br3-turn button{min-width:150px}.br3-result{margin-top:10px;border:1px solid var(--line);border-radius:11px;padding:10px;background:#09131e}.br3-result.good{border-color:#4f7b4e}.br3-result.bad{border-color:#8b3f46;background:#1d1116}.br3-result.bad b{color:#ffb2b8}.br3-ability.spell .eyebrow{color:#bba7ff}.br3-ability.skill .eyebrow{color:#8fd4ff}.br3-ability.special .eyebrow{color:#f1c36f}.br3-gm-clear{margin-top:10px}.br3-warning{margin-top:8px;padding:8px 10px;border:1px solid #725d34;border-radius:10px;background:#211d12;color:#f3d58d;font-size:.78rem}
  @media(min-width:1050px){
    #app main.br3-live-layout .ccr-battle-grid>div:first-child{display:grid!important;grid-template-columns:1fr!important;gap:12px!important;align-items:start!important}
    #app main.br3-live-layout [data-br3-turn],#app main.br3-live-layout .br3-order-section,#app main.br3-live-layout [data-br3-creatures],#app main.br3-live-layout .br3-weapons-section{grid-column:1!important;margin:0!important}
    #app main.br3-live-layout .ccr-battle-grid>aside{display:flex!important;flex-direction:column!important;gap:12px!important}
    #app main.br3-live-layout [data-br3-abilities]{margin:0!important}
  }
  .br3-hero-hp{display:grid!important;grid-template-columns:auto 58px auto auto!important;gap:6px!important;align-items:center!important;min-width:285px!important;padding:8px 10px!important}
  .br3-hero-hp>span{font-size:.64rem!important;letter-spacing:.08em!important;color:var(--muted)!important;font-weight:800!important}.br3-hero-hp input{width:58px!important;min-width:0!important;padding:6px!important;margin:0!important;text-align:center!important;pointer-events:auto!important;position:relative!important;z-index:4!important;background:#07111a!important;border:1px solid #36536a!important;color:var(--text)!important;user-select:text!important}.br3-hero-hp button{min-height:30px!important;padding:5px 8px!important;font-size:.68rem!important}
  @media(max-width:700px){.br3-turn{align-items:stretch}.br3-turn button{width:100%}.br3-hero-hp{grid-template-columns:1fr 58px!important}.br3-hero-hp button{width:100%!important}}
  `;document.head.appendChild(s)
}

const br3AbilityType=x=>x==='spell'?'BÜYÜ':x==='special'?'ÖZEL':'YETENEK';
const br3Effect=x=>x==='heal'?'İYİLEŞTİRME':x==='utility'?'DESTEK':'HASAR';
const br3TargetLabel=x=>x==='self'?'KENDİ':x==='ally'?'MÜTTEFİK':'DÜŞMAN';
function br3AbilityRule(a){const raw=String(a?.description||''),m=raw.match(/\[\[CC_FIXED_AC:(\d+)\]\]/i);return{fixed:m?Math.max(1,br3Num(m[1])):0,description:raw.replace(/\s*\[\[CC_FIXED_AC:\d+\]\]\s*/ig,' ').trim()}}
function br3Enemies(s){return (s?.order||[]).filter(x=>x.kind==='enemy')}
function br3LivingEnemies(s){return br3Enemies(s).filter(x=>x.hp_current==null||br3Num(x.hp_current)>0)}
function br3NormalizeTarget(s){const live=br3LivingEnemies(s);if(br3TargetId&&!live.some(x=>String(x.id)===String(br3TargetId)))br3TargetId='';return live}

async function br3Fetch(){
  const [sr,ar]=await Promise.allSettled([
    BR3_S.rpc('catlak_player_combat_snapshot'),
    BR3_S.rpc('catlak_player_abilities')
  ]);
  const snapRes=sr.status==='fulfilled'?sr.value:null;
  if(!snapRes)throw sr.reason||new Error('Savaş verisi alınamadı.');
  if(snapRes.error)throw snapRes.error;
  const abilityRes=ar.status==='fulfilled'?ar.value:null;
  const warnings=[];
  if(!abilityRes||abilityRes.error)warnings.push('Yetenek listesi geçici olarak alınamadı.');
  return{snap:snapRes.data||{},abilities:abilityRes&&!abilityRes.error?(abilityRes.data||[]):[],warnings};
}
async function br3PreloadData(){
  if(br3PreloadBusy)return br3PreloadBusy;
  br3PreloadBusy=br3Fetch().then(d=>{br3Preload=d;br3PreloadAt=Date.now();return d}).catch(()=>null).finally(()=>{br3PreloadBusy=null});
  return br3PreloadBusy;
}
async function br3Load(){
  if(br3Preload&&Date.now()-br3PreloadAt<2500){const d=br3Preload;br3Preload=null;return d}
  return br3Fetch();
}
function br3NormalizeMain(main){
  if(!main)return null;
  main.className='ccr-battle-surface br3-live-layout';
  main.dataset.ccrBattle='1';
  delete main.dataset.ccHardSheet;delete main.dataset.ccHardWait;delete main.dataset.ccDesk;delete main.dataset.ccPage;delete main.dataset.ccBindFallback;delete main.dataset.ccViewMount;
  return main
}
function br3CreatureCard(x){
  const hp=br3Num(x.hp_current),max=br3Num(x.hp_max),dead=max>0&&hp<=0,selected=String(x.id)===String(br3TargetId);
  return `<article class="br3-card ${x.is_current?'current':''} ${selected?'selected':''} ${dead?'dead':''}">
    <div class="eyebrow">${br3Esc(x.creature_type||'YARATIK')}</div><h3>${br3Esc(x.name||'Yaratık')}</h3>
    <div class="br3-pills"><span class="br3-pill">AC ${br3Num(x.ac)}</span></div>
    <div class="actions" style="margin-top:9px">${dead?'<button type="button" disabled>Düştü</button>':`<button type="button" class="${selected?'on':''}" data-br3-target="${br3Esc(x.id)}">${selected?'✓ Hedef Seçildi':'Hedef Seç'}</button>`}</div>
  </article>`;
}
function br3CreaturesSection(s){if(!s?.active)return'';const enemies=br3Enemies(s);return `<section class="card" data-br3-creatures><div class="eyebrow">KARŞILAŞMADAKİ YARATIKLAR</div>${enemies.length?`<div class="br3-grid" style="margin-top:10px">${enemies.map(br3CreatureCard).join('')}</div>`:'<div class="muted" style="margin-top:10px">Karşılaşmaya yaratık eklenmedi.</div>'}</section>`}
function br3AbilityTargets(a,s){const rows=s.order||[];if(a.target_type==='enemy')return rows.filter(x=>x.kind==='enemy'&&(x.hp_current==null||br3Num(x.hp_current)>0));if(a.target_type==='ally')return rows.filter(x=>x.kind==='player'&&br3Num(x.hp_current)>0);return[]}
function br3AbilityCard(a,s){
  const rule=br3AbilityRule(a),targets=br3AbilityTargets(a,s),uses=a.uses_per_combat==null?'∞':br3Num(a.uses_remaining)+'/'+br3Num(a.uses_per_combat),out=a.uses_remaining!=null&&br3Num(a.uses_remaining)<=0;
  const isEnemy=a.target_type==='enemy',isAlly=a.target_type==='ally',selectedEnemy=isEnemy?targets.find(x=>String(x.id)===String(br3TargetId)):null;
  const targetReady=!isEnemy&&!isAlly?true:isEnemy?!!selectedEnemy:targets.length>0;
  const canUse=!!s.active&&!!s.in_combat&&!!s.is_my_turn&&!out&&targetReady;
  const opts=targets.map(x=>`<option value="${br3Esc(x.id)}">${br3Esc(x.name)}${a.requires_attack?' • AC '+br3Num(x.ac):''}</option>`).join('');
  let targetHtml='';
  if(isEnemy){
    targetHtml=`<div class="br3-target-line">Hedef: <b>${br3Esc(selectedEnemy?.name||'Seçilmedi')}</b>${selectedEnemy&&a.requires_attack?' • AC '+br3Num(selectedEnemy.ac):''}</div>`;
  }else if(isAlly){
    targetHtml=`<label style="margin-top:9px">Hedef<select data-br3-ability-target="${br3Esc(a.assignment_id)}">${opts||'<option value="">Uygun hedef yok</option>'}</select></label>`;
  }
  const button=out?'Kullanım Hakkı Bitti':!s.active?'Savaş Başlamadı':!s.in_combat?'Karşılaşmaya Eklenmedin':!s.is_my_turn?'Sıra Sende Değil':isEnemy&&!selectedEnemy?'Önce Hedef Seç':selectedEnemy?`Kullan → ${selectedEnemy.name}`:'Kullan';
  return `<article class="br3-card br3-ability ${br3Esc(a.ability_type||'skill')}" data-br3-ability-card="${br3Esc(a.assignment_id)}" data-br3-ability-kind="${br3Esc(a.target_type||'self')}"><div class="eyebrow">${br3AbilityType(a.ability_type)} • ${br3Effect(a.effect_type)}</div><h3>${br3Esc(a.name)}</h3><div class="br3-pills"><span class="br3-pill">Hedef: ${br3TargetLabel(a.target_type)}</span>${a.formula?`<span class="br3-pill">${br3Esc(a.formula)}</span>`:''}<span class="br3-pill">Kullanım: ${uses}</span>${rule.fixed?`<span class="br3-pill">Sabit AC: d20${br3Num(a.attack_bonus)>=0?'+':''}${br3Num(a.attack_bonus)} &gt; ${rule.fixed}</span>`:(a.requires_attack?`<span class="br3-pill">Hedef AC: d20${br3Num(a.attack_bonus)>=0?'+':''}${br3Num(a.attack_bonus)} ≥ hedef AC</span>`:'')}</div>${rule.description?`<div class="br3-note">${br3Esc(rule.description)}</div>`:''}${targetHtml}<button type="button" class="primary widebtn" data-br3-use="${br3Esc(a.assignment_id)}" data-br3-use-kind="${br3Esc(a.target_type||'self')}" ${canUse?'':'disabled'}>${br3Esc(button)}</button></article>`;
}
function br3AbilitiesSection(d){const warning=d.warnings?.some(x=>x.includes('Yetenek'))?'<div class="br3-warning">Yetenek listesi şu anda alınamadı; yaratık hedefleme çalışmaya devam eder.</div>':'';return `<section class="card" data-br3-abilities><div class="eyebrow">YETENEKLER & BÜYÜLER</div><h2>${d.abilities.length?'Aksiyon':'Henüz Yetenek Yok'}</h2><p class="muted">GM Merkezi → Yetenek bölümünden karakterine verilen büyü ve özel yetenekler burada görünür ve sıra sendeyken kullanılır.</p>${warning}${d.abilities.length?`<div class="br3-grid">${d.abilities.map(a=>br3AbilityCard(a,d.snap)).join('')}</div>`:'<div class="muted">Bu karaktere henüz bir yetenek atanmadı.</div>'}${br3ResultHtml(br3LastResult)}</section>`}
function br3ResultHtml(r){
  if(!r)return'';
  const bad=r.hit===false,hasAc=r.attack_total!=null&&r.target_ac!=null;
  const check=hasAc?`Saldırı ${br3Num(r.attack_total)} / AC ${br3Num(r.target_ac)}`:'';
  let text='Kullanıldı';
  if(bad)text=(check?check+' • ':'')+'ISKA • kullanım hakkı harcandı • hasar uygulanmadı';
  else if(r.effect_type==='damage')text=(check?check+' • İSABET • ':'')+br3Num(r.amount)+' hasar';
  else if(r.effect_type==='heal')text=br3Num(r.amount)+' iyileştirme';
  return `<div class="br3-result ${bad?'bad':'good'}"><div class="eyebrow">SON AKSİYON</div><b>${br3Esc(r.ability||'Yetenek')} → ${br3Esc(r.target_name||'')}</b><div>${br3Esc(text)}</div></div>`
}
function br3OrderRows(s){
  return (s?.order||[]).map(x=>`<div class="ccr-order-row ${x.is_current?'current':''} ${x.is_self?'self':''}"><div class="ccr-init">${br3Num(x.initiative)}</div><div><b>${br3Esc(x.name)}</b><div class="muted mini">${x.kind==='enemy'?'DÜŞMAN':'OYUNCU'}${x.is_self?' • SEN':''}</div></div>${x.is_current?'<span class="ccr-pill ccr-turn">SIRA</span>':''}</div>`).join('');
}
function br3OrderSection(s){
  return `<section class="card br3-order-section" data-br3-base-order><div class="eyebrow">TUR SIRASI</div><h2>Round ${br3Num(s?.round)}</h2><div class="ccr-order">${br3OrderRows(s)||'<div class="muted">Katılımcı yok.</div>'}</div></section>`;
}
function br3SyncBattleShell(s){
  const main=BR3_APP.querySelector('main');if(!main)return;
  const active=!!s?.active;
  main.dataset.br3CombatActive=active?'1':'0';
  const hero=main.querySelector('section.hero');
  if(hero){
    const h1=hero.querySelector('h1'),p=hero.querySelector('p');
    if(h1)h1.textContent=active?(s.battle_name||'Karşılaşma'):'Karşılaşma';
    if(p){
      if(!active){p.classList.add('muted');p.innerHTML='Henüz aktif savaş yok. Aksiyonların, silahların ve durumların burada hazır kalır.'}
      else{p.classList.remove('muted');p.innerHTML=(s.in_combat?('Round '+br3Num(s.round)+' • '+(s.is_my_turn?'<b class="gold">SIRA SENDE</b>':'Sıra: <b>'+br3Esc(s.current_name||'—')+'</b>')):'Savaş başladı; GM henüz karakterini karşılaşmaya eklemedi.')}
    }
    const status=[...hero.querySelectorAll('.vital')].find(v=>br3Txt(v.querySelector('span')).toUpperCase()==='DURUM')?.querySelector('b');
    if(status)status.textContent=active?(s.is_my_turn?'▶':'•'):'—';
  }
  const left=main.querySelector('.ccr-battle-grid')?.firstElementChild;
  let order=main.querySelector('[data-br3-base-order]')||main.querySelector('.ccr-order')?.closest('section.card');
  if(active){
    const next=br3Node(br3OrderSection(s));
    if(order)br3ReplaceIfChanged(order,next);
    else if(left){
      const weapons=[...left.querySelectorAll('section.card')].find(x=>br3Txt(x.querySelector('.eyebrow'))==='TAKILI SİLAHLAR');
      weapons?weapons.before(next):left.appendChild(next);
    }
  }else if(order)order.remove();
}
function br3TurnSection(s){if(!s?.active)return'';const title=s.is_my_turn?'Sıra Sende':'Sıra: '+br3Esc(s.current_name||'—'),detail=s.in_combat?'Round '+br3Num(s.round):'Karakterin henüz karşılaşmaya eklenmedi.';return `<section class="card br3-turn ${s.is_my_turn?'ready':''}" data-br3-turn><div><div class="eyebrow">TUR KONTROLÜ</div><h2>${title}</h2><div class="mini muted">${detail}</div></div><button type="button" class="primary" data-br3-end-turn ${s.is_my_turn?'':'disabled'}>Turumu Bitir ▶</button></section>`}
function br3HpControl(){return `<div class="vital br3-hero-hp" data-br3-hp><span>CAN DEĞİŞİMİ</span><input type="number" min="1" step="1" value="1" data-br3-hp-amount aria-label="Can değişim miktarı"><button type="button" class="danger" data-br3-hp-change="damage">− Hasar</button><button type="button" data-br3-hp-change="heal">+ İyileştir</button></div>`}

function br3EnhanceWeapons(s){
  const live=br3NormalizeTarget(s),target=live.find(x=>String(x.id)===String(br3TargetId))||null;
  BR3_APP.querySelectorAll('main .ccr-weapon').forEach(card=>{
    let invId=card.dataset.br3Inv||card.dataset.bccInv||card.querySelector('[data-ccr-weapon]')?.dataset.ccrWeapon||'';
    if(invId)card.dataset.br3Inv=invId;
    card.querySelectorAll('[data-ccr-weapon]').forEach(x=>x.remove());
    let box=card.querySelector('[data-br3-weapon-actions]');
    if(!box){box=document.createElement('div');box.dataset.br3WeaponActions='1';card.appendChild(box)}
    const targetName=target?target.name:'Seçilmedi',inactive=!s.active,waiting=!inactive&&!s.is_my_turn;
    const state=JSON.stringify([invId,target?.id||'',targetName,waiting,inactive]);
    if(box.dataset.br3State!==state){
      box.dataset.br3State=state;
      const stateText=inactive?'Savaş başlamadı':waiting?'Sıra sende değil':'';
      box.innerHTML=`<div class="br3-target-line">Hedef: <b>${br3Esc(targetName)}</b>${stateText?' • <span class="muted">'+stateText+'</span>':''}</div><div class="actions"><button type="button" class="primary" data-br3-strike="${br3Esc(invId)}" ${!invId||!target||waiting||inactive?'disabled':''}>${inactive?'Savaş Başlamadı':'⚔ Hedefe Vur'}</button></div>`;
    }
  });
}
function br3HeroHpReadout(){
  const hero=BR3_APP.querySelector('main section.hero');if(!hero)return null;
  const vital=[...hero.querySelectorAll('.vital')].find(v=>br3Txt(v.querySelector('span')).toUpperCase()==='HP');
  const b=vital?.querySelector('b');if(!b)return null;
  const m=String(b.textContent||'').match(/(-?\d+)\s*\/\s*(-?\d+)/);
  if(!m)return {node:b,current:null,max:null};
  return {node:b,current:br3Num(m[1]),max:Math.max(1,br3Num(m[2],1))};
}
async function br3ResolveHpCharacter(snap){
  const self=(snap?.order||[]).find(x=>x.is_self);
  const directId=String(snap?.character_id||self?.character_id||br3BoundCharacterId||'');
  const readout=br3HeroHpReadout();
  if(directId&&self){
    br3BoundCharacterId=directId;
    return {id:directId,name:self.name||'',current:br3Num(self.hp_current),max:Math.max(1,br3Num(self.hp_max,readout?.max||1)),self,readout};
  }
  const ses=(await BR3_S.auth.getSession()).data?.session,uid=ses?.user?.id;
  if(!uid)throw new Error('Oyuncu oturumu bulunamadı.');
  const qr=await BR3_S.from('catlak_characters')
    .select('id,name,hp_current,hp_max,data,play_status')
    .eq('owner_id',uid).eq('play_status','active').order('created_at',{ascending:true});
  if(qr.error)throw qr.error;
  const party=(qr.data||[]).filter(x=>x.data?.cc_party_member===true);
  const row=party.find(x=>String(x.id)===directId)||party[0]||null;
  if(!row)throw new Error('Partiye bağlı aktif karakter bulunamadı.');
  br3BoundCharacterId=String(row.id);
  const current=readout?.current!=null?readout.current:br3Num(row.hp_current);
  const max=readout?.max!=null?readout.max:Math.max(1,br3Num(row.hp_max,1));
  return {id:String(row.id),name:row.name||'',current,max,self:self||null,readout};
}
function br3SyncHeroVitals(s){
  const hero=BR3_APP.querySelector('main section.hero'),self=(s?.order||[]).find(x=>x.is_self);if(!hero)return;
  hero.querySelectorAll('.vital').forEach(v=>{
    const label=br3Txt(v.querySelector('span')).toUpperCase(),b=v.querySelector('b');
    if(!b)return;
    if(label==='HP'&&self)b.textContent=br3Num(self.hp_current)+'/'+br3Num(self.hp_max);
    else if(label==='AC'&&self?.ac!=null)b.textContent=String(br3Num(self.ac));
  });
}
function br3CacheCurrent(){
  const main=BR3_APP.querySelector('main');
  if(!main||!br3BattleView()||!main.querySelector('[data-br3-abilities]'))return false;
  br3CachedHtml=main.innerHTML;
  try{window.__catlakViewRuntime?.cache?.('player-battle',br3CachedHtml)}catch(_){}
  return true;
}
function br3RestoreCached(){
  if(!br3IsPlayer())return false;
  const main=br3NormalizeMain(BR3_APP.querySelector('main'));if(!main)return false;
  let restored=false;
  if(br3CachedHtml){main.innerHTML=br3CachedHtml;restored=true}
  else try{restored=!!window.__catlakViewRuntime?.restore?.('player-battle',main)}catch(_){}
  if(!restored)return false;
  br3NormalizeMain(main);main.classList.remove('ccr-base-building');
  document.documentElement.classList.remove('cc-battle-entry-pending');
  try{window.__catlakActionStability?.finishBattleEntry?.()}catch(_){}
  try{window.__catlakViewRuntime?.ready?.('player-battle')}catch(_){}
  requestAnimationFrame(()=>br3Render(false));
  return true;
}
function br3WaitReady(ms=1800){
  const start=Date.now();
  return new Promise(resolve=>{
    const tick=()=>{
      const main=BR3_APP.querySelector('main');
      if(!br3Busy&&main?.querySelector('[data-br3-abilities]')&&(main.dataset.br3CombatActive==='0'||main.querySelector('[data-br3-turn]')))return resolve(true);
      if(Date.now()-start>=ms)return resolve(false);
      setTimeout(tick,20);
    };
    tick();
  });
}
function br3Node(html){if(!html)return null;const h=document.createElement('div');h.innerHTML=html;return h.firstElementChild}
function br3ReplaceIfChanged(current,next){
  if(!current)return next;
  if(current.outerHTML===next.outerHTML)return current;
  const y=window.scrollY;current.replaceWith(next);requestAnimationFrame(()=>{if(Math.abs(window.scrollY-y)>2)window.scrollTo({top:y,left:0,behavior:'auto'})});return next;
}
function br3Insert(d){
  const main=br3NormalizeMain(BR3_APP.querySelector('main'));if(!main)return;
  [...main.querySelectorAll('section.card')].forEach(sec=>{
    const eye=br3Txt(sec.querySelector('.eyebrow')).toUpperCase();
    const title=br3Txt(sec.querySelector('h2')).toUpperCase();
    if(eye==='HIZLI D20'||eye==='SON ZARLARIN'||eye==='SAVAŞ GÜNLÜĞÜ'||title==='CANLI AKIŞ')sec.remove();
  });
  const grid=main.querySelector('.ccr-battle-grid'),left=grid?.firstElementChild,aside=grid?.querySelector('aside');
  br3SyncBattleShell(d.snap);
  let turn=main.querySelector('[data-br3-turn]'),creatures=main.querySelector('[data-br3-creatures]'),abilities=main.querySelector('[data-br3-abilities]');
  const nextTurn=br3Node(br3TurnSection(d.snap)),nextCreatures=br3Node(br3CreaturesSection(d.snap)),nextAbilities=br3Node(br3AbilitiesSection(d));
  if(nextTurn){if(turn)turn=br3ReplaceIfChanged(turn,nextTurn);else{turn=nextTurn;left?left.insertBefore(turn,left.firstChild):main.appendChild(turn)}}else if(turn)turn.remove();
  if(nextCreatures){
    if(creatures)creatures=br3ReplaceIfChanged(creatures,nextCreatures);
    else{creatures=nextCreatures;const order=main.querySelector('[data-br3-base-order]')||main.querySelector('.ccr-order')?.closest('section.card');order?order.insertAdjacentElement('afterend',creatures):(left?left.appendChild(creatures):main.appendChild(creatures))}
  }else if(creatures)creatures.remove();
  if(abilities)abilities=br3ReplaceIfChanged(abilities,nextAbilities);else abilities=nextAbilities;
  const weapons=[...main.querySelectorAll('section.card')].find(x=>br3Txt(x.querySelector('.eyebrow'))==='TAKILI SİLAHLAR');if(weapons)weapons.classList.add('br3-weapons-section');
  const baseOrder=main.querySelector('[data-br3-base-order]')||main.querySelector('.ccr-order')?.closest('section.card');if(baseOrder){baseOrder.classList.add('br3-order-section');baseOrder.dataset.br3BaseOrder='1'}
  const heroVitals=main.querySelector('section.hero .vitals');
  let hp=main.querySelector('[data-br3-hp]'),nextHp=br3Node(br3HpControl(d.snap));
  if(hp&&!hp.classList.contains('br3-hero-hp')){hp.remove();hp=null}
  if(hp)hp=br3ReplaceIfChanged(hp,nextHp);else if(heroVitals)heroVitals.insertBefore(nextHp,heroVitals.firstElementChild);else main.prepend(nextHp);
  const conditions=[...main.querySelectorAll('section.card')].find(x=>br3Txt(x.querySelector('.eyebrow'))==='AKTİF DURUMLAR');
  if(aside){
    if(conditions)conditions.insertAdjacentElement('afterend',abilities);else aside.appendChild(abilities);
  }else main.appendChild(abilities);
  main.querySelectorAll('[data-br3-log]').forEach(x=>x.remove());
  br3SyncHeroVitals(d.snap);
  br3EnhanceWeapons(d.snap);
  br3CacheCurrent();
  main.classList.remove('ccr-base-building');
  document.documentElement.classList.remove('cc-battle-entry-pending');
  try{window.__catlakActionStability?.finishBattleEntry?.()}catch(_){}
  try{window.__catlakViewRuntime?.ready?.('player-battle')}catch(_){}
}
async function br3Render(force=false){
  if(!br3IsPlayer()||!br3BattleView())return false;
  if(br3InteractionLocked()&&BR3_APP.querySelector('main [data-br3-turn]')){br3Queued=true;return false}
  if(br3Busy){br3Queued=true;return br3WaitReady()}
  const main=BR3_APP.querySelector('main');if(!main)return false;const gen=++br3Gen;br3Busy=true;
  try{
    const d=await br3Load();
    if(gen!==br3Gen||BR3_APP.querySelector('main')!==main||!br3BattleView())return;
    br3NormalizeTarget(d.snap);br3LastSnap=d.snap;br3LastData=d;
    const sig=JSON.stringify([d.snap?.active,d.snap?.round,d.snap?.current_combatant_id,d.snap?.in_combat,d.snap?.is_my_turn,(d.snap?.order||[]).map(x=>[x.id,x.name,x.kind,x.hp_current,x.hp_max,x.ac,x.is_current,x.creature_type]),d.abilities.map(a=>[a.assignment_id,a.name,a.ability_type,a.effect_type,a.target_type,a.formula,a.requires_attack,a.attack_bonus,a.uses_per_combat,a.uses_remaining,a.description]),d.warnings]);
    if(!force&&sig===br3Sig&&main.querySelector('[data-br3-abilities]')&&(d.snap?.active?main.querySelector('[data-br3-creatures]'):main.dataset.br3CombatActive==='0')){br3SyncBattleShell(d.snap);br3SyncHeroVitals(d.snap);br3EnhanceWeapons(d.snap);br3SyncEnemyAbilityTargets();return}
    br3Sig=sig;br3Insert(d);return true;
  }catch(e){if(force)br3Toast('Savaş Odası yüklenemedi: '+(e?.message||String(e)));return false}finally{br3Busy=false;if(br3Queued){br3Queued=false;setTimeout(()=>br3Render(false),0)}}
}
async function br3MaybeAutoEndCombat(beforeSnap){
  if(br3AutoEndBusy||!beforeSnap?.active||!br3Enemies(beforeSnap).length)return false;
  const q=await BR3_S.rpc('catlak_player_combat_snapshot');if(q.error)return false;
  const snap=q.data||{},enemies=br3Enemies(snap);
  if(!snap.active||!enemies.length)return false;
  if(enemies.some(x=>x.hp_current==null||br3Num(x.hp_current)>0))return false;
  br3AutoEndBusy=true;
  try{
    const end=await BR3_S.rpc('catlak_gm_combat_end');
    if(end.error)return false;
    br3Toast('Tüm yaratıklar düştü • savaş sona erdi.');
    br3TargetId='';br3Sig='';await br3Render(true);return true;
  }catch(_){return false}finally{br3AutoEndBusy=false}
}
async function br3Strike(btn){if(br3ActionBusy)return;if(!br3TargetId)throw new Error('Önce bir yaratık hedefle.');const invId=btn.dataset.br3Strike;if(!invId)throw new Error('Silah bulunamadı.');const before=br3LastSnap;br3ActionBusy=true;try{const r=await BR3_S.rpc('catlak_player_weapon_strike',{p_inventory_id:invId,p_target_id:br3TargetId});if(r.error)throw r.error;const d=r.data||{};window.__catlakRealtimeSync?.emit?.('combat',{action:'weapon-strike'});br3Toast(d.hit?`${d.target_name}: ${d.critical?'KRİTİK İSABET':'İSABET'} • ${d.damage_total} hasar`:`${d.target_name}: ISKA (${d.attack_total})`);if(br3Num(d.target_hp)<=0)br3TargetId='';if(!(await br3MaybeAutoEndCombat(before)))await br3Render(false)}finally{br3ActionBusy=false}}
async function br3Use(btn){
 if(br3ActionBusy)return;
 const id=btn.dataset.br3Use,kind=btn.dataset.br3UseKind||'self',sel=BR3_APP.querySelector(`[data-br3-ability-target="${CSS.escape(id)}"]`),target=kind==='enemy'?(br3TargetId||null):(sel?.value||null),before=br3LastSnap;
 const ability=br3LastData?.abilities?.find(a=>String(a.assignment_id)===String(id)),rule=br3AbilityRule(ability);
 br3ActionBusy=true;
 try{
  let fixedRoll=null;
  if(rule.fixed&&ability?.effect_type==='damage'){
    const die=1+Math.floor(Math.random()*20),total=die+br3Num(ability.attack_bonus);
    fixedRoll={die,total,ac:rule.fixed,hit:total>rule.fixed};
    if(!fixedRoll.hit){
      if(ability.uses_per_combat!=null){
        const next=Math.max(0,br3Num(ability.uses_remaining)-1);
        const spend=await BR3_S.from('catlak_character_abilities').update({uses_remaining:next}).eq('id',id);
        if(spend.error)throw new Error('Kullanım hakkı azaltılamadı: '+spend.error.message);
        ability.uses_remaining=next;
      }
      const targetRow=(br3LastSnap?.order||[]).find(x=>String(x.id)===String(target));
      br3LastResult={ability:ability?.name||'Yetenek',target_name:targetRow?.name||'',effect_type:'damage',hit:false,attack_total:total,target_ac:rule.fixed,amount:0,fixed_ac:true};
      window.__catlakRealtimeSync?.emit?.('ability',{action:'used-fixed-miss'});
      br3Toast((ability?.name||'Yetenek')+': ISKA • '+total+' / Sabit AC '+rule.fixed+' • kullanım harcandı • hasar yok');
      await br3Render(false);return
    }
  }
  const r=await BR3_S.rpc('catlak_player_use_ability',{p_assignment_id:id,p_target_id:target});if(r.error)throw r.error;
  const d=r.data||{};
  br3LastResult=fixedRoll?{...d,hit:true,attack_total:fixedRoll.total,target_ac:fixedRoll.ac,fixed_ac:true}:d;
  window.__catlakRealtimeSync?.emit?.('combat',{action:'ability-use'});window.__catlakRealtimeSync?.emit?.('ability',{action:'used'});
  let msg=d.ability||ability?.name||'Yetenek',check=fixedRoll?(' • Sabit AC '+fixedRoll.total+' > '+fixedRoll.ac):(d.attack_total!=null&&d.target_ac!=null?` • Saldırı ${br3Num(d.attack_total)} / AC ${br3Num(d.target_ac)}`:'');
  if(d.hit===false&&!fixedRoll)msg+=`: ISKA${check} • kullanım hakkı harcandı • hasar yok`;else if(d.effect_type==='damage')msg+=`: İSABET${check} • ${br3Num(d.amount)} hasar`;else if(d.effect_type==='heal')msg+=`: ${br3Num(d.amount)} iyileştirme`;else msg+=' kullanıldı';
  br3Toast(msg);if(!(d.effect_type==='damage'&&await br3MaybeAutoEndCombat(before)))await br3Render(false)
 }finally{br3ActionBusy=false}
}
async function br3HpChange(btn){
  if(br3ActionBusy)return;
  br3ActionBusy=true;br3HoldInteraction(1800);
  try{
    const input=BR3_APP.querySelector('[data-br3-hp-amount]');
    const amount=Math.max(1,Math.abs(br3Num(input?.value,1)));
    const d=br3LastData||await br3Load(),bound=await br3ResolveHpCharacter(d.snap||{});
    const delta=btn.dataset.br3HpChange==='heal'?amount:-amount;
    const next=Math.max(0,Math.min(bound.max,bound.current+delta));
    const r=await BR3_S.rpc('catlak_update_my_hp',{p_character_id:bound.id,p_hp:next});if(r.error)throw r.error;
    if(input){input.value=String(amount);input.focus({preventScroll:true});input.select?.()}
    if(bound.self)bound.self.hp_current=next;
    if(d.snap)d.snap.character_id=bound.id;
    if(br3LastSnap){
      br3LastSnap.character_id=bound.id;
      const mine=(br3LastSnap.order||[]).find(x=>x.is_self);if(mine)mine.hp_current=next;
    }
    const readout=br3HeroHpReadout();if(readout?.node)readout.node.textContent=next+'/'+bound.max;
    br3SyncHeroVitals(d.snap);br3Sig='';br3CacheCurrent();
    window.__catlakRealtimeSync?.emit?.('character',{action:'hp-adjust',character_id:bound.id});
    window.__catlakRealtimeSync?.emit?.('combat',{action:'player-hp',character_id:bound.id});
    br3Toast((btn.dataset.br3HpChange==='heal'?'+':'−')+amount+' HP • '+next+'/'+bound.max);
    setTimeout(()=>{if(!br3InteractionLocked())br3Render(false)},220);
  }finally{br3ActionBusy=false}
}
async function br3EndTurn(){if(br3ActionBusy)return;br3ActionBusy=true;try{const r=await BR3_S.rpc('catlak_player_end_turn');if(r.error)throw r.error;window.__catlakRealtimeSync?.emit?.('combat',{action:'end-turn'});br3Toast('Tur bitti. Sıradaki: '+(r.data?.current_name||'—'));await br3Render(false)}finally{br3ActionBusy=false}}
async function br3ClearBattleLog(){if(br3ActionBusy)return;br3ActionBusy=true;try{const r=await BR3_S.rpc('catlak_gm_clear_battle_log');if(r.error)throw r.error;br3Toast(`Canlı akış temizlendi${r.data!=null?' • '+r.data+' kayıt':''}.`)}finally{br3ActionBusy=false}}
function br3EnsureGmClear(){
  if(!br3IsGM())return;const panel=BR3_APP.querySelector('main [data-cex-gm-panel]');if(!panel||panel.querySelector('[data-br3-clear-log]'))return;const sub=panel.querySelector('.cex-sub')||panel;const wrap=document.createElement('div');wrap.className='actions br3-gm-clear';wrap.innerHTML='<button type="button" class="danger" data-br3-clear-log>🧹 Canlı Akışı Temizle</button>';sub.appendChild(wrap)
}
function br3Soon(force=false,ms=60){clearTimeout(br3Timer);br3Timer=setTimeout(()=>{if(br3IsGM())br3EnsureGmClear();else br3Render(force)},ms)}
function br3SyncEnemyAbilityTargets(){
  const main=BR3_APP.querySelector('main'),snap=br3LastSnap;if(!main||!snap)return;
  const live=br3LivingEnemies(snap),target=live.find(x=>String(x.id)===String(br3TargetId))||null;
  main.querySelectorAll('[data-br3-ability-card][data-br3-ability-kind="enemy"]').forEach(card=>{
    const id=card.dataset.br3AbilityCard;
    const a=br3LastData?.abilities?.find(x=>String(x.assignment_id)===String(id));
    if(!a)return;
    let line=card.querySelector('.br3-target-line');
    if(!line){line=document.createElement('div');line.className='br3-target-line';const use=card.querySelector('[data-br3-use]');use?.before(line)}
    const rule=br3AbilityRule(a);line.innerHTML='Hedef: <b>'+br3Esc(target?.name||'Seçilmedi')+'</b>'+(rule.fixed?' • Sabit AC '+rule.fixed:(target&&a.requires_attack?' • Hedef AC '+br3Num(target.ac):''));
    const use=card.querySelector('[data-br3-use]');
    if(!use)return;
    const out=a.uses_remaining!=null&&br3Num(a.uses_remaining)<=0;
    const canUse=!!snap.active&&!!snap.in_combat&&!!snap.is_my_turn&&!out&&!!target;
    use.disabled=!canUse;
    use.textContent=out?'Kullanım Hakkı Bitti':!snap.in_combat?'Önce Savaşa Eklenmelisin':!snap.is_my_turn?'Sıra Sende Değil':!target?'Önce Hedef Seç':'Kullan → '+target.name;
  });
}
function br3SelectTarget(id){
  br3TargetId=String(id||'');
  const main=BR3_APP.querySelector('main');
  main?.querySelectorAll('[data-br3-target]').forEach(btn=>{
    const on=String(btn.dataset.br3Target||'')===br3TargetId;
    btn.classList.toggle('on',on);btn.textContent=on?'✓ Hedef Seçildi':'Hedef Seç';
    btn.closest('.br3-card')?.classList.toggle('selected',on);
  });
  if(br3LastSnap)br3EnhanceWeapons(br3LastSnap);
  br3SyncEnemyAbilityTargets();
  br3CacheCurrent();
}
const BR3_ACTION_SEL='[data-br3-target],[data-br3-strike],[data-br3-use],[data-br3-hp-change],[data-br3-end-turn],[data-br3-clear-log]';
let br3PressKey='',br3PressUntil=0;
function br3ActionKey(el){
  if(!el)return'';
  if(el.dataset.br3Target)return'target:'+el.dataset.br3Target;
  if(el.dataset.br3Strike)return'strike:'+el.dataset.br3Strike;
  if(el.dataset.br3Use)return'use:'+el.dataset.br3Use;
  if(el.dataset.br3HpChange)return'hp:'+el.dataset.br3HpChange;
  if(el.hasAttribute('data-br3-end-turn'))return'end-turn';
  if(el.hasAttribute('data-br3-clear-log'))return'clear-log';
  return'';
}
function br3DispatchAction(el){
  if(!el)return false;
  if(el.dataset.br3Target!=null){br3SelectTarget(el.dataset.br3Target);return true}
  if(el.dataset.br3Strike!=null){br3Strike(el).catch(x=>br3Toast('Saldırı başarısız: '+(x?.message||String(x))));return true}
  if(el.dataset.br3Use!=null){br3Use(el).catch(x=>br3Toast(x?.message||String(x)));return true}
  if(el.dataset.br3HpChange!=null){br3HpChange(el).catch(x=>br3Toast('HP güncellenemedi: '+(x?.message||String(x))));return true}
  if(el.hasAttribute('data-br3-end-turn')){br3EndTurn().catch(x=>br3Toast(x?.message||String(x)));return true}
  if(el.hasAttribute('data-br3-clear-log')){if(confirm('Savaş Canlı Akışı temizlensin mi?'))br3ClearBattleLog().catch(x=>br3Toast(x?.message||String(x)));return true}
  return false;
}
document.addEventListener('pointerdown',e=>{
  if(e.target?.matches?.('[data-br3-hp-amount]')){br3HoldInteraction(1800);e.stopPropagation();return}
  if(e.button!=null&&e.button!==0)return;
  const a=e.target.closest?.(BR3_ACTION_SEL);if(!a)return;
  e.preventDefault();e.stopImmediatePropagation();
  const key=br3ActionKey(a);br3PressKey=key;br3PressUntil=Date.now()+950;
  br3DispatchAction(a);
},true);
document.addEventListener('focusin',e=>{if(e.target?.matches?.('[data-br3-hp-amount]'))br3HoldInteraction(1800)},true);
document.addEventListener('click',e=>{
  const a=e.target.closest?.(BR3_ACTION_SEL);if(!a)return;
  e.preventDefault();e.stopImmediatePropagation();
  const key=br3ActionKey(a);
  if(key&&key===br3PressKey&&Date.now()<br3PressUntil)return;
  br3PressKey='';br3PressUntil=0;
  br3DispatchAction(a);
},true);
new MutationObserver(rs=>{
  const main=BR3_APP.querySelector('main'),nav=BR3_APP.querySelector('.nav');
  const structural=rs.some(r=>{
    if(r.target===BR3_APP)return true;
    if(nav&&(r.target===nav||nav.contains(r.target)))return true;
    return [...r.addedNodes].some(n=>n.nodeType===1&&(n.matches?.('main,.nav,.role,[data-cex-gm-panel]')||n.querySelector?.('main,.nav,.role,[data-cex-gm-panel]')));
  });
  if(br3IsGM()){if(structural)br3Soon(false,80);return}
  if(!br3BattleView())return;
  const active=main?.dataset.br3CombatActive==='1';
  if(!structural&&main?.querySelector('[data-br3-abilities]')&&(!active||main.querySelector('[data-br3-turn]')&&main.querySelector('[data-br3-creatures]')))return;
  if(!main?.querySelector('[data-br3-abilities]')||(active&&(!main.querySelector('[data-br3-turn]')||!main.querySelector('[data-br3-creatures]'))))br3Soon(false,25);
}).observe(BR3_APP,{childList:true,subtree:true});
window.addEventListener('catlak:realtime-sync',e=>{const kind=String(e.detail?.kind||'');if(!['combat','ability','party','character'].includes(kind))return;br3Preload=null;const action=String(e.detail?.action||''),stateFlip=kind==='combat'&&(action==='combat-start'||action==='catlak_gm_combat_end'||action==='combat-end');const delay=Math.max(90,Number(window.__catlakBattleInteractionUntil||0)-Date.now()+80);if(br3BattleView())br3Soon(stateFlip,delay)});
BR3_S.channel('cc-battle-room-v4-abilities')
 .on('postgres_changes',{event:'*',schema:'public',table:'catlak_character_abilities'},()=>br3Soon(false,90))
 .on('postgres_changes',{event:'*',schema:'public',table:'catlak_abilities'},()=>br3Soon(false,90))
 .subscribe();
function br3RepairIfNeeded(){
  if(br3IsGM()){br3EnsureGmClear();return}
  if(!br3BattleView())return;
  const main=BR3_APP.querySelector('main');
  const active=main?.dataset.br3CombatActive==='1';if(!main?.querySelector('[data-br3-abilities]')||(active&&(!main.querySelector('[data-br3-turn]')||!main.querySelector('[data-br3-creatures]'))))br3Soon(false,0);
}
window.addEventListener('focus',()=>{br3RepairIfNeeded();br3VerifyCombatState()});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){br3RepairIfNeeded();br3VerifyCombatState()}});
setTimeout(()=>{if(br3BattleView())br3Soon(true,0)},80);
window.addEventListener('catlak:player-fast-ready',()=>{
  const run=()=>{if(!br3BattleView())br3PreloadData()};
  if('requestIdleCallback'in window)requestIdleCallback(run,{timeout:1200});else setTimeout(run,180);
});
let br3StateCheckBusy=false;
async function br3VerifyCombatState(){
  if(br3StateCheckBusy||!br3BattleView()||document.visibilityState!=='visible'||br3ActionBusy||br3InteractionLocked())return;
  br3StateCheckBusy=true;
  try{
    const r=await BR3_S.rpc('catlak_player_combat_snapshot');if(r.error)return;
    const active=!!r.data?.active,last=!!br3LastSnap?.active;
    if(active!==last){br3Preload=null;br3Sig='';br3Soon(true,0)}
  }catch(_){}
  finally{br3StateCheckBusy=false}
}
window.addEventListener('catlak:realtime-status',e=>{if(String(e.detail?.status||'').toUpperCase()==='SUBSCRIBED'&&br3BattleView()){br3Soon(true,0);setTimeout(br3VerifyCombatState,120)}});
window.__catlakBattleRoomV3Test={render:br3Render,restore:br3RestoreCached,cache:br3CacheCurrent,preload:br3PreloadData,target:br3SelectTarget,clearLog:br3ClearBattleLog,isBattleView:br3BattleView,selectedTarget:()=>br3TargetId,actionBusy:()=>br3ActionBusy};