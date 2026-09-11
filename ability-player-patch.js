const APB_S=window.__catlakSupabase;
const APB_APP=document.querySelector('#app');
if(!APB_S||!APB_APP)throw new Error('Çatlak Çağı oyuncu yetenek sistemi başlatılamadı.');

const apbText=e=>String(e?.textContent||'').trim();
const apbEsc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const apbNum=x=>Number(x||0);
const apbIsGM=()=>apbText(APB_APP.querySelector('.role'))==='GM';
const apbToast=x=>{const t=document.querySelector('#toast');if(!t)return;t.textContent=String(x);t.classList.remove('hidden');clearTimeout(apbToast.t);apbToast.t=setTimeout(()=>t.classList.add('hidden'),4200)};
let apbBusy=false,apbQueued=false,apbTimer=null,apbSig='',apbLastResult=null,apbGen=0;

if(!document.querySelector('#apb-style')){
  const s=document.createElement('style');s.id='apb-style';s.textContent=`
  .apb-player-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:10px}.apb-card{border:1px solid var(--line);border-radius:14px;padding:12px;background:#0a1622}.apb-card.ready{border-color:#5c7f98}.apb-card h3{margin:3px 0 8px}.apb-target{margin:9px 0}.apb-pills{display:flex;gap:6px;flex-wrap:wrap;margin:7px 0}.apb-pill{font-size:.74rem;border:1px solid var(--line);border-radius:999px;padding:3px 7px}.apb-result{margin-top:10px;border:1px solid var(--line);border-radius:12px;padding:10px;background:#09131e}.apb-result.good{border-color:#4f7b4e}.apb-result.bad{border-color:#784c4c}.apb-type-spell{color:#bba7ff}.apb-type-skill{color:#8fd4ff}.apb-type-special{color:#f1c36f}
  `;document.head.appendChild(s)
}

const apbType=x=>x==='spell'?'BÜYÜ':x==='special'?'ÖZEL':'YETENEK';
const apbEffect=x=>x==='heal'?'İYİLEŞTİRME':x==='utility'?'DESTEK':'HASAR';
const apbTarget=x=>x==='self'?'KENDİ':x==='ally'?'MÜTTEFİK':'DÜŞMAN';
function apbTargets(a,s){const rows=s.order||[];if(a.target_type==='enemy')return rows.filter(x=>x.kind==='enemy'&&apbNum(x.hp_current)>0);if(a.target_type==='ally')return rows.filter(x=>x.kind==='player'&&apbNum(x.hp_current)>0);return[]}
function apbCard(a,s){
  const targets=apbTargets(a,s),uses=a.uses_per_combat==null?'∞':apbNum(a.uses_remaining)+'/'+apbNum(a.uses_per_combat),out=a.uses_remaining!=null&&apbNum(a.uses_remaining)<=0,canTurn=!!s.is_my_turn,needsTarget=a.target_type!=='self',canUse=canTurn&&!out&&(!needsTarget||targets.length>0);
  const pills=['Hedef: '+apbTarget(a.target_type)];if(a.formula)pills.push(a.formula);pills.push('Kullanım: '+uses);if(a.requires_attack)pills.push('Saldırı '+(a.attack_bonus>=0?'+':'')+apbNum(a.attack_bonus));
  let target='';if(needsTarget){const opts=targets.length?targets.map(x=>`<option value="${apbEsc(x.id)}">${apbEsc(x.name)} • HP ${apbNum(x.hp_current)}/${apbNum(x.hp_max)}</option>`).join(''):'<option value="">Uygun hedef yok</option>';target=`<label class="apb-target">Hedef<select data-apb-target="${apbEsc(a.assignment_id)}">${opts}</select></label>`}
  const button=out?'Kullanım Hakkı Bitti':canTurn?'Kullan':'Sıra Sende Değil';
  return `<article class="apb-card ${canUse?'ready':''}"><div class="eyebrow apb-type-${apbEsc(a.ability_type)}">${apbType(a.ability_type)} • ${apbEffect(a.effect_type)}</div><h3>${apbEsc(a.name)}</h3><div class="apb-pills">${pills.map(x=>`<span class="apb-pill">${apbEsc(x)}</span>`).join('')}</div>${a.description?`<div class="mini muted">${apbEsc(a.description)}</div>`:''}${target}<button type="button" class="primary widebtn" data-apb-use="${apbEsc(a.assignment_id)}" ${canUse?'':'disabled'}>${button}</button></article>`
}
function apbResult(r){if(!r)return'';let msg='Kullanıldı';if(r.hit===false)msg='ISKA';else if(r.effect_type==='damage')msg=apbNum(r.amount)+' hasar';else if(r.effect_type==='heal')msg=apbNum(r.amount)+' iyileştirme';const hp=r.target_hp_max!=null?' • HP '+apbNum(r.target_hp)+'/'+apbNum(r.target_hp_max):'';return `<div class="apb-result ${r.hit===false?'bad':'good'}"><div class="eyebrow">SON YETENEK</div><b>${apbEsc(r.ability||'Yetenek')} → ${apbEsc(r.target_name||'')}</b><div>${apbEsc(msg+hp)}</div></div>`}
async function apbLoad(){const[ar,sr]=await Promise.all([APB_S.rpc('catlak_player_abilities'),APB_S.rpc('catlak_player_combat_snapshot')]);if(ar.error)throw ar.error;if(sr.error)throw sr.error;return{abilities:ar.data||[],snap:sr.data||{}}}
async function apbRender(force=false){
  if(apbIsGM()||window.__catlakBattleRoomOpen!==true)return;if(apbBusy){apbQueued=true;return}const main=APB_APP.querySelector('main');if(!main)return;const gen=++apbGen;apbBusy=true;
  try{const d=await apbLoad();if(gen!==apbGen||APB_APP.querySelector('main')!==main||window.__catlakBattleRoomOpen!==true)return;const sig=JSON.stringify([d.snap?.is_my_turn,d.snap?.current_combatant_id,(d.snap?.order||[]).map(x=>[x.id,x.hp_current,x.hp_max,x.kind,x.is_current]),d.abilities.map(a=>[a.assignment_id,a.uses_remaining,a.uses_per_combat,a.name,a.formula,a.target_type])]);if(!force&&sig===apbSig&&main.querySelector('[data-apb-player]'))return;apbSig=sig;main.querySelector('[data-apb-player]')?.remove();const sec=document.createElement('section');sec.className='card';sec.dataset.apbPlayer='1';const body=d.abilities.length?`<div class="apb-player-grid">${d.abilities.map(a=>apbCard(a,d.snap)).join('')}</div>`:'<div class="muted">GM, Yetenek bölümünden karakterine yetenek verebilir.</div>';sec.innerHTML=`<div class="eyebrow">YETENEKLER & BÜYÜLER</div><h2>${d.abilities.length?d.abilities.length+' Aksiyon':'Henüz Yetenek Yok'}</h2><p class="muted">GM tarafından verilen büyü ve özel yetenekler burada kullanılır.</p>${body}${apbResult(apbLastResult)}`;const weapon=[...main.querySelectorAll('section.card')].find(s=>apbText(s.querySelector('.eyebrow'))==='TAKILI SİLAHLAR');weapon?weapon.insertAdjacentElement('afterend',sec):main.appendChild(sec)}catch(e){if(force)apbToast('Yetenekler yüklenemedi: '+(e?.message||String(e)))}finally{apbBusy=false;if(apbQueued){apbQueued=false;setTimeout(()=>apbRender(true),0)}}
}
async function apbUse(btn){if(apbBusy)return;const id=btn.dataset.apbUse,sel=APB_APP.querySelector(`[data-apb-target="${CSS.escape(id)}"]`),target=sel?.value||null;btn.disabled=true;try{const r=await APB_S.rpc('catlak_player_use_ability',{p_assignment_id:id,p_target_id:target});if(r.error)throw r.error;apbLastResult=r.data||null;apbSig='';const d=r.data||{};let msg=d.ability||'Yetenek';if(d.hit===false)msg+=': ISKA';else if(d.effect_type==='damage')msg+=`: ${d.amount} hasar`;else if(d.effect_type==='heal')msg+=`: ${d.amount} iyileştirme`;else msg+=' kullanıldı';apbToast(msg);if(window.__catlakRoomSystemTest?.renderBattle)await window.__catlakRoomSystemTest.renderBattle(true);await apbRender(true)}catch(e){apbToast(e?.message||String(e))}finally{if(btn.isConnected)btn.disabled=false}}

document.addEventListener('click',e=>{const b=e.target.closest?.('[data-apb-use]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();apbUse(b)},true);
function apbSoon(force=false,ms=70){clearTimeout(apbTimer);apbTimer=setTimeout(()=>apbRender(force),ms)}
new MutationObserver(()=>{if(window.__catlakBattleRoomOpen===true&&!apbIsGM())apbSoon(false,90)}).observe(APB_APP,{childList:true,subtree:true});
APB_S.channel('cc-player-abilities-only')
 .on('postgres_changes',{event:'*',schema:'public',table:'catlak_abilities'},()=>{apbSig='';apbSoon(true,30)})
 .on('postgres_changes',{event:'*',schema:'public',table:'catlak_character_abilities'},()=>{apbSig='';apbSoon(true,30)})
 .on('postgres_changes',{event:'*',schema:'public',table:'catlak_combatants'},()=>{apbSig='';apbSoon(true,30)})
 .on('postgres_changes',{event:'*',schema:'public',table:'catlak_combat_state'},()=>{apbSig='';apbSoon(true,30)})
 .subscribe();
setInterval(()=>{if(window.__catlakBattleRoomOpen===true&&!apbIsGM())apbSoon(false,0)},2800);setTimeout(()=>apbSoon(true,0),300);
window.__catlakAbilityPlayerTest={render:apbRender,use:apbUse};
