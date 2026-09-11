const BR3_S=window.__catlakSupabase;
const BR3_APP=document.querySelector('#app');
if(!BR3_S||!BR3_APP)throw new Error('Çatlak Çağı Savaş Odası v3 başlatılamadı.');
window.__catlakBattleRoomV3=true;

const br3Txt=e=>String(e?.textContent||'').trim();
const br3Esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const br3Num=(x,f=0)=>Number.isFinite(Number(x))?Number(x):f;
const br3IsGM=()=>br3Txt(BR3_APP.querySelector('.role'))==='GM';
const br3IsPlayer=()=>!!br3Txt(BR3_APP.querySelector('.role'))&&!br3IsGM();
const br3Toast=x=>{const t=document.querySelector('#toast');if(!t)return;t.textContent=String(x);t.classList.remove('hidden');clearTimeout(br3Toast.t);br3Toast.t=setTimeout(()=>t.classList.add('hidden'),4200)};
const br3Time=x=>{try{return new Date(x).toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'})}catch{return''}};
let br3Busy=false,br3Queued=false,br3Timer=null,br3Sig='',br3TargetId='',br3LastResult=null,br3Gen=0,br3ActionBusy=false;

if(!document.querySelector('#br3-style')){
  const s=document.createElement('style');s.id='br3-style';s.textContent=`
  #app main [data-bcc-creatures],#app main [data-apb-player],#app main [data-cex-turn],#app main [data-cex-log],#app main [data-bcc-weapon-actions]{display:none!important}
  .br3-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(225px,1fr));gap:10px}.br3-card{border:1px solid var(--line);border-radius:14px;padding:12px;background:#0a1622}.br3-card.current{border-color:var(--gold);box-shadow:inset 0 0 0 1px #d6ad5b44}.br3-card.selected{border-color:var(--cyan);box-shadow:inset 0 0 0 1px #69d7ff55}.br3-card.dead{opacity:.58}.br3-card h3{margin:4px 0 7px}.br3-pills{display:flex;gap:6px;flex-wrap:wrap;margin:7px 0}.br3-pill{font-size:.74rem;border:1px solid var(--line);border-radius:999px;padding:3px 7px}.br3-note{white-space:pre-wrap;color:var(--muted);font-size:.84rem}.br3-target-line{margin:8px 0;padding:8px 10px;border:1px solid var(--line);border-radius:10px;background:#07111d;font-size:.82rem}.br3-target-line b{color:var(--cyan)}
  .br3-turn{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}.br3-turn.ready{border-color:var(--gold)}.br3-turn button{min-width:150px}.br3-log{display:flex;flex-direction:column;gap:7px}.br3-log-row{display:grid;grid-template-columns:50px minmax(0,1fr);gap:8px;padding:7px 0;border-bottom:1px solid var(--line)}.br3-log-row:last-child{border-bottom:0}.br3-log-row time{font-size:.72rem;color:var(--muted)}.br3-result{margin-top:10px;border:1px solid var(--line);border-radius:11px;padding:9px;background:#09131e}.br3-result.good{border-color:#4f7b4e}.br3-result.bad{border-color:#784c4c}.br3-ability.spell .eyebrow{color:#bba7ff}.br3-ability.skill .eyebrow{color:#8fd4ff}.br3-ability.special .eyebrow{color:#f1c36f}.br3-gm-clear{margin-top:10px}
  @media(max-width:700px){.br3-turn{align-items:stretch}.br3-turn button{width:100%}}
  `;document.head.appendChild(s)
}

const br3AbilityType=x=>x==='spell'?'BÜYÜ':x==='special'?'ÖZEL':'YETENEK';
const br3Effect=x=>x==='heal'?'İYİLEŞTİRME':x==='utility'?'DESTEK':'HASAR';
const br3TargetLabel=x=>x==='self'?'KENDİ':x==='ally'?'MÜTTEFİK':'DÜŞMAN';
function br3Enemies(s){return (s?.order||[]).filter(x=>x.kind==='enemy')}
function br3LivingEnemies(s){return br3Enemies(s).filter(x=>br3Num(x.hp_current)>0)}
function br3NormalizeTarget(s){const live=br3LivingEnemies(s);if(br3TargetId&&!live.some(x=>String(x.id)===String(br3TargetId)))br3TargetId='';return live}

async function br3Load(){
  const [sr,ar,lr]=await Promise.all([
    BR3_S.rpc('catlak_player_combat_snapshot'),
    BR3_S.rpc('catlak_player_abilities'),
    BR3_S.rpc('catlak_player_battle_log',{p_limit:24})
  ]);
  if(sr.error)throw sr.error;if(ar.error)throw ar.error;if(lr.error)throw lr.error;
  return{snap:sr.data||{},abilities:ar.data||[],logs:lr.data||[]};
}
function br3CreatureCard(x){
  const hp=br3Num(x.hp_current),max=br3Num(x.hp_max),dead=max>0&&hp<=0,selected=String(x.id)===String(br3TargetId);
  return `<article class="br3-card ${x.is_current?'current':''} ${selected?'selected':''} ${dead?'dead':''}">
    <div class="eyebrow">${br3Esc(x.creature_type||'YARATIK')}</div><h3>${br3Esc(x.name||'Yaratık')}</h3>
    <div class="br3-pills"><span class="br3-pill">HP ${hp}/${max}</span><span class="br3-pill">AC ${br3Num(x.ac)}</span><span class="br3-pill">İnisiyatif ${br3Num(x.initiative)}</span>${x.is_current?'<span class="br3-pill">SIRA</span>':''}</div>
    ${x.attack_name||x.attack_formula?`<div class="mini"><b>${br3Esc(x.attack_name||'Saldırı')}</b>${x.attack_formula?' • '+br3Esc(x.attack_formula):''}${x.damage_formula?' • Hasar '+br3Esc(x.damage_formula):''}</div>`:''}
    ${x.public_note?`<div class="br3-note">${br3Esc(x.public_note)}</div>`:''}
    <div class="actions" style="margin-top:9px">${dead?'<button type="button" disabled>Düştü</button>':`<button type="button" class="${selected?'on':''}" data-br3-target="${br3Esc(x.id)}">${selected?'✓ Hedef Seçildi':'Hedef Seç'}</button>`}</div>
  </article>`;
}
function br3CreaturesSection(s){const enemies=br3Enemies(s);return `<section class="card" data-br3-creatures><div class="eyebrow">KARŞILAŞMADAKİ YARATIKLAR</div><h2>${enemies.length?enemies.length+' Yaratık':'Henüz Yaratık Yok'}</h2><p class="muted">GM savaşa yaratık eklediğinde burada anında görünür. Silahla vurmak için önce hedef seç.</p>${enemies.length?`<div class="br3-grid">${enemies.map(br3CreatureCard).join('')}</div>`:'<div class="muted">GM henüz bu savaşa yaratık eklemedi.</div>'}</section>`}
function br3AbilityTargets(a,s){const rows=s.order||[];if(a.target_type==='enemy')return rows.filter(x=>x.kind==='enemy'&&br3Num(x.hp_current)>0);if(a.target_type==='ally')return rows.filter(x=>x.kind==='player'&&br3Num(x.hp_current)>0);return[]}
function br3AbilityCard(a,s){
  const targets=br3AbilityTargets(a,s),uses=a.uses_per_combat==null?'∞':br3Num(a.uses_remaining)+'/'+br3Num(a.uses_per_combat),out=a.uses_remaining!=null&&br3Num(a.uses_remaining)<=0,needsTarget=a.target_type!=='self',canUse=!!s.active&&!!s.in_combat&&!!s.is_my_turn&&!out&&(!needsTarget||targets.length>0);
  const opts=targets.map(x=>`<option value="${br3Esc(x.id)}">${br3Esc(x.name)} • HP ${br3Num(x.hp_current)}/${br3Num(x.hp_max)}</option>`).join('');
  const button=out?'Kullanım Hakkı Bitti':!s.in_combat?'Önce Savaşa Eklenmelisin':s.is_my_turn?'Kullan':'Sıra Sende Değil';
  return `<article class="br3-card br3-ability ${br3Esc(a.ability_type||'skill')}"><div class="eyebrow">${br3AbilityType(a.ability_type)} • ${br3Effect(a.effect_type)}</div><h3>${br3Esc(a.name)}</h3><div class="br3-pills"><span class="br3-pill">Hedef: ${br3TargetLabel(a.target_type)}</span>${a.formula?`<span class="br3-pill">${br3Esc(a.formula)}</span>`:''}<span class="br3-pill">Kullanım: ${uses}</span>${a.requires_attack?`<span class="br3-pill">Saldırı ${br3Num(a.attack_bonus)>=0?'+':''}${br3Num(a.attack_bonus)}</span>`:''}</div>${a.description?`<div class="br3-note">${br3Esc(a.description)}</div>`:''}${needsTarget?`<label style="margin-top:9px">Hedef<select data-br3-ability-target="${br3Esc(a.assignment_id)}">${opts||'<option value="">Uygun hedef yok</option>'}</select></label>`:''}<button type="button" class="primary widebtn" data-br3-use="${br3Esc(a.assignment_id)}" ${canUse?'':'disabled'}>${button}</button></article>`;
}
function br3AbilitiesSection(d){return `<section class="card" data-br3-abilities><div class="eyebrow">YETENEKLER & BÜYÜLER</div><h2>${d.abilities.length?d.abilities.length+' Aksiyon':'Henüz Yetenek Yok'}</h2><p class="muted">GM Merkezi → Yetenek bölümünden karakterine verilen büyü ve özel yetenekler burada görünür ve sıra sendeyken kullanılır.</p>${d.abilities.length?`<div class="br3-grid">${d.abilities.map(a=>br3AbilityCard(a,d.snap)).join('')}</div>`:'<div class="muted">Bu karaktere henüz bir yetenek atanmadı.</div>'}${br3ResultHtml(br3LastResult)}</section>`}
function br3ResultHtml(r){if(!r)return'';let text='Kullanıldı',bad=r.hit===false;if(bad)text='ISKA';else if(r.effect_type==='damage')text=br3Num(r.amount)+' hasar';else if(r.effect_type==='heal')text=br3Num(r.amount)+' iyileştirme';const hp=r.target_hp_max!=null?' • HP '+br3Num(r.target_hp)+'/'+br3Num(r.target_hp_max):'';return `<div class="br3-result ${bad?'bad':'good'}"><div class="eyebrow">SON AKSİYON</div><b>${br3Esc(r.ability||'Yetenek')} → ${br3Esc(r.target_name||'')}</b><div>${br3Esc(text+hp)}</div></div>`}
function br3TurnSection(s){return `<section class="card br3-turn ${s.is_my_turn?'ready':''}" data-br3-turn><div><div class="eyebrow">TUR KONTROLÜ</div><h2>${s.is_my_turn?'Sıra Sende':'Sıra: '+br3Esc(s.current_name||'—')}</h2><div class="mini muted">${s.in_combat?'Round '+br3Num(s.round):'Karakterin henüz karşılaşmaya eklenmedi.'}</div></div><button type="button" class="primary" data-br3-end-turn ${s.is_my_turn?'':'disabled'}>Turumu Bitir ▶</button></section>`}
function br3LogSection(rows){return `<section class="card" data-br3-log><div class="eyebrow">SAVAŞ GÜNLÜĞÜ</div><h2>Canlı Akış</h2>${rows.length?`<div class="br3-log">${rows.map(x=>`<div class="br3-log-row"><time>${br3Time(x.created_at)}</time><div><b>${x.kind==='turn'?'TUR':'SAVAŞ'}</b><div class="mini">${br3Esc(x.message)}</div></div></div>`).join('')}</div>`:'<div class="muted">Canlı akış temiz veya henüz savaş kaydı yok.</div>'}</section>`}

function br3EnhanceWeapons(s){
  const live=br3NormalizeTarget(s),target=live.find(x=>String(x.id)===String(br3TargetId))||null;
  BR3_APP.querySelectorAll('main .ccr-weapon').forEach(card=>{
    let invId=card.dataset.br3Inv||card.dataset.bccInv||card.querySelector('[data-ccr-weapon]')?.dataset.ccrWeapon||'';
    if(invId)card.dataset.br3Inv=invId;
    card.querySelectorAll('[data-ccr-weapon]').forEach(x=>x.remove());
    card.querySelector('[data-br3-weapon-actions]')?.remove();
    const box=document.createElement('div');box.dataset.br3WeaponActions='1';box.innerHTML=`<div class="br3-target-line">Hedef: <b>${target?br3Esc(target.name):'Seçilmedi'}</b>${!s.is_my_turn?' • <span class="muted">Sıra sende değil</span>':''}</div><div class="actions"><button type="button" class="primary" data-br3-strike="${br3Esc(invId)}" ${!invId||!target||!s.is_my_turn?'disabled':''}>⚔ Hedefe Vur</button></div>`;card.appendChild(box);
  });
}
function br3Insert(d){
  const main=BR3_APP.querySelector('main');if(!main)return;
  main.querySelectorAll('[data-br3-creatures],[data-br3-abilities],[data-br3-turn],[data-br3-log]').forEach(x=>x.remove());
  const holder=document.createElement('div');holder.innerHTML=br3TurnSection(d.snap);const turn=holder.firstElementChild;
  const grid=main.querySelector('.ccr-battle-grid'),left=grid?.firstElementChild,aside=grid?.querySelector('aside');
  if(left)left.insertBefore(turn,left.firstChild);else main.appendChild(turn);
  const h1=document.createElement('div');h1.innerHTML=br3CreaturesSection(d.snap);const creatures=h1.firstElementChild;
  const order=main.querySelector('.ccr-order')?.closest('section.card');order?order.insertAdjacentElement('afterend',creatures):(left?left.appendChild(creatures):main.appendChild(creatures));
  const h2=document.createElement('div');h2.innerHTML=br3AbilitiesSection(d);const abilities=h2.firstElementChild;
  const weapons=[...main.querySelectorAll('section.card')].find(s=>br3Txt(s.querySelector('.eyebrow'))==='TAKILI SİLAHLAR');weapons?weapons.insertAdjacentElement('afterend',abilities):(left?left.appendChild(abilities):main.appendChild(abilities));
  const h3=document.createElement('div');h3.innerHTML=br3LogSection(d.logs);const log=h3.firstElementChild;aside?aside.appendChild(log):main.appendChild(log);
  br3EnhanceWeapons(d.snap);
}
async function br3Render(force=false){
  if(!br3IsPlayer()||window.__catlakBattleRoomOpen!==true)return;if(br3Busy){br3Queued=true;return}const main=BR3_APP.querySelector('main');if(!main)return;const gen=++br3Gen;br3Busy=true;
  try{const d=await br3Load();if(gen!==br3Gen||BR3_APP.querySelector('main')!==main||window.__catlakBattleRoomOpen!==true)return;br3NormalizeTarget(d.snap);const sig=JSON.stringify([d.snap?.active,d.snap?.round,d.snap?.current_combatant_id,d.snap?.in_combat,d.snap?.is_my_turn,(d.snap?.order||[]).map(x=>[x.id,x.name,x.kind,x.hp_current,x.hp_max,x.ac,x.initiative,x.is_current,x.creature_type,x.attack_name,x.attack_formula,x.damage_formula,x.public_note]),d.abilities.map(a=>[a.assignment_id,a.name,a.ability_type,a.effect_type,a.target_type,a.formula,a.requires_attack,a.attack_bonus,a.uses_per_combat,a.uses_remaining,a.description]),d.logs.map(x=>[x.id,x.kind,x.message,x.created_at]),br3TargetId]);if(!force&&sig===br3Sig&&main.querySelector('[data-br3-creatures]')&&main.querySelector('[data-br3-abilities]')){br3EnhanceWeapons(d.snap);return}br3Sig=sig;br3Insert(d)}catch(e){if(force)br3Toast('Savaş Odası v3 yüklenemedi: '+(e?.message||String(e)))}finally{br3Busy=false;if(br3Queued){br3Queued=false;setTimeout(()=>br3Render(true),0)}}
}
async function br3Strike(btn){if(br3ActionBusy)return;if(!br3TargetId)throw new Error('Önce bir yaratık hedefle.');const invId=btn.dataset.br3Strike;if(!invId)throw new Error('Silah bulunamadı.');br3ActionBusy=true;try{const r=await BR3_S.rpc('catlak_player_weapon_strike',{p_inventory_id:invId,p_target_id:br3TargetId});if(r.error)throw r.error;const d=r.data||{};br3Toast(d.hit?`${d.target_name}: ${d.critical?'KRİTİK İSABET':'İSABET'} • ${d.damage_total} hasar`:`${d.target_name}: ISKA (${d.attack_total})`);if(br3Num(d.target_hp)<=0)br3TargetId='';br3Sig='';await window.__catlakRoomSystemTest?.renderBattle?.(true);await br3Render(true)}finally{br3ActionBusy=false}}
async function br3Use(btn){if(br3ActionBusy)return;const id=btn.dataset.br3Use,sel=BR3_APP.querySelector(`[data-br3-ability-target="${CSS.escape(id)}"]`),target=sel?.value||null;br3ActionBusy=true;try{const r=await BR3_S.rpc('catlak_player_use_ability',{p_assignment_id:id,p_target_id:target});if(r.error)throw r.error;br3LastResult=r.data||null;const d=r.data||{};let msg=d.ability||'Yetenek';if(d.hit===false)msg+=': ISKA';else if(d.effect_type==='damage')msg+=`: ${d.amount} hasar`;else if(d.effect_type==='heal')msg+=`: ${d.amount} iyileştirme`;else msg+=' kullanıldı';br3Toast(msg);br3Sig='';await window.__catlakRoomSystemTest?.renderBattle?.(true);await br3Render(true)}finally{br3ActionBusy=false}}
async function br3EndTurn(){if(br3ActionBusy)return;br3ActionBusy=true;try{const r=await BR3_S.rpc('catlak_player_end_turn');if(r.error)throw r.error;br3Toast('Tur bitti. Sıradaki: '+(r.data?.current_name||'—'));br3Sig='';await window.__catlakRoomSystemTest?.renderBattle?.(true);await br3Render(true)}finally{br3ActionBusy=false}}
async function br3ClearBattleLog(){if(br3ActionBusy)return;br3ActionBusy=true;try{const r=await BR3_S.rpc('catlak_gm_clear_battle_log');if(r.error)throw r.error;br3Toast(`Canlı akış temizlendi${r.data!=null?' • '+r.data+' kayıt':''}.`)}finally{br3ActionBusy=false}}
function br3EnsureGmClear(){
  if(!br3IsGM())return;const panel=BR3_APP.querySelector('main [data-cex-gm-panel]');if(!panel||panel.querySelector('[data-br3-clear-log]'))return;const sub=panel.querySelector('.cex-sub')||panel;const wrap=document.createElement('div');wrap.className='actions br3-gm-clear';wrap.innerHTML='<button type="button" class="danger" data-br3-clear-log>🧹 Canlı Akışı Temizle</button>';sub.appendChild(wrap)
}
function br3Soon(force=false,ms=60){clearTimeout(br3Timer);br3Timer=setTimeout(()=>{if(br3IsGM())br3EnsureGmClear();else br3Render(force)},ms)}
document.addEventListener('click',e=>{
  const t=e.target.closest?.('[data-br3-target]');if(t){e.preventDefault();e.stopImmediatePropagation();br3TargetId=String(t.dataset.br3Target||'');br3Sig='';br3Soon(true,0);return}
  const s=e.target.closest?.('[data-br3-strike]');if(s){e.preventDefault();e.stopImmediatePropagation();br3Strike(s).catch(x=>br3Toast('Saldırı başarısız: '+(x?.message||String(x))));return}
  const u=e.target.closest?.('[data-br3-use]');if(u){e.preventDefault();e.stopImmediatePropagation();br3Use(u).catch(x=>br3Toast(x?.message||String(x)));return}
  if(e.target.closest?.('[data-br3-end-turn]')){e.preventDefault();e.stopImmediatePropagation();br3EndTurn().catch(x=>br3Toast(x?.message||String(x)));return}
  if(e.target.closest?.('[data-br3-clear-log]')){e.preventDefault();e.stopImmediatePropagation();if(confirm('Savaş Canlı Akışı temizlensin mi?'))br3ClearBattleLog().catch(x=>br3Toast(x?.message||String(x)));return}
},true);
new MutationObserver(()=>{if(br3IsGM())br3Soon(false,50);else if(window.__catlakBattleRoomOpen===true)br3Soon(false,50)}).observe(BR3_APP,{childList:true,subtree:true});
BR3_S.channel('cc-battle-room-v3-live')
 .on('postgres_changes',{event:'*',schema:'public',table:'catlak_combatants'},()=>{br3Sig='';br3Soon(true,20)})
 .on('postgres_changes',{event:'*',schema:'public',table:'catlak_combat_state'},()=>{br3Sig='';br3Soon(true,20)})
 .on('postgres_changes',{event:'*',schema:'public',table:'catlak_character_abilities'},()=>{br3Sig='';br3Soon(true,20)})
 .on('postgres_changes',{event:'*',schema:'public',table:'catlak_abilities'},()=>{br3Sig='';br3Soon(true,20)})
 .subscribe();
setInterval(()=>{if(br3IsGM())br3EnsureGmClear();else if(window.__catlakBattleRoomOpen===true)br3Soon(false,0)},1700);
setTimeout(()=>br3Soon(true,0),260);
window.__catlakBattleRoomV3Test={render:br3Render,target:id=>{br3TargetId=id;br3Sig='';br3Soon(true,0)},clearLog:br3ClearBattleLog};