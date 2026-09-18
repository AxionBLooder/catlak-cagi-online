const PSEA_S=window.__catlakSupabase;
const PSEA_APP=document.querySelector('#app');
if(!PSEA_S||!PSEA_APP)throw new Error('Oyuncu kağıdı ekipman/yetenek düzeni başlatılamadı.');

const pseaTxt=e=>String(e?.textContent||'').trim();
const pseaEsc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
const pseaNum=x=>Number(x||0);
const pseaIsGM=()=>pseaTxt(PSEA_APP.querySelector('.role'))==='GM';
const pseaTab=()=>PSEA_APP.querySelector('.nav button.on[data-tab]')?.dataset.tab||'';
const pseaIsSheet=()=>!pseaIsGM()&&pseaTab()==='sheet'&&PSEA_APP.querySelector('main')?.dataset.ccHardSheet!=='1';
const pseaToast=x=>{const t=document.querySelector('#toast');if(!t)return;t.textContent=String(x);t.classList.remove('hidden');clearTimeout(pseaToast.t);pseaToast.t=setTimeout(()=>t.classList.add('hidden'),4200)};
let pseaBusy=false,pseaTimer=null,pseaAbilities=[],pseaSnap={},pseaSig='',pseaActionBusy=false;

if(!document.querySelector('#psea-style')){
  const s=document.createElement('style');s.id='psea-style';s.textContent=`
  .ps-player-sheet [data-gmt-player-panel] .psea-equipment-grid{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:8px;margin:8px 0 10px}
  .ps-player-sheet [data-gmt-player-panel] .psea-equipment-grid .gmt-slot{display:block!important;border:1px solid #304354!important;border-radius:11px;padding:10px!important;background:#07131e;min-width:0}
  .ps-player-sheet [data-gmt-player-panel] .psea-equipment-grid .gmt-slot b{display:block;color:#d7b86f!important;font-size:.68rem;letter-spacing:.08em;margin-bottom:4px}
  .ps-player-sheet [data-gmt-player-panel] .psea-equipment-grid .gmt-slot span{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .ps-player-sheet [data-gmt-player-panel] .psea-equipment-grid .gmt-slot:nth-child(5){grid-column:1/-1!important}
  .psea-abilities{margin-top:14px;padding-top:13px;border-top:1px solid var(--line)}
  .psea-abilities-head{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:8px}.psea-abilities-head h3{margin:.15rem 0}.psea-head-actions{display:flex;gap:7px;align-items:center;flex-wrap:wrap;justify-content:flex-end}
  .psea-ability-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.psea-ability{border:1px solid #304354;border-radius:11px;padding:10px;background:#07131e;min-width:0}.psea-ability.ready{border-color:#547c69}.psea-ability h4{margin:3px 0 5px;font-size:.92rem}.psea-ability-meta{font-size:.72rem;color:var(--muted);line-height:1.45}.psea-ability-type{font-size:.63rem;letter-spacing:.1em;font-weight:900;color:#bba7ff}.psea-empty{font-size:.8rem;color:var(--muted);padding:8px 0}.psea-use-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:6px;margin-top:8px}.psea-use-row select{min-width:0}.psea-use-row button{white-space:nowrap}.psea-rest{border-color:#6f5b34!important;color:#f0d394!important}
  @media(max-width:620px){.ps-player-sheet [data-gmt-player-panel] .psea-equipment-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:6px!important}.ps-player-sheet [data-gmt-player-panel] .psea-equipment-grid .gmt-slot{padding:8px!important}.ps-player-sheet [data-gmt-player-panel] .psea-equipment-grid .gmt-slot b{font-size:.6rem!important}.ps-player-sheet [data-gmt-player-panel] .psea-equipment-grid .gmt-slot span{font-size:.78rem!important}.psea-ability-list{grid-template-columns:1fr}.psea-use-row{grid-template-columns:1fr}}
  `;document.head.appendChild(s)
}

function pseaType(x){return x==='spell'?'BÜYÜ':x==='special'?'ÖZEL YETENEK':'YETENEK'}
function pseaEffect(x){return x==='heal'?'İyileştirme':x==='utility'?'Destek':'Hasar'}
function pseaTarget(x){return x==='self'?'Kendi':x==='ally'?'Müttefik':'Düşman'}
function pseaTargets(a){const rows=pseaSnap?.order||[];if(a.target_type==='enemy')return rows.filter(x=>x.kind==='enemy'&&pseaNum(x.hp_current)>0);if(a.target_type==='ally')return rows.filter(x=>x.kind==='player'&&pseaNum(x.hp_current)>0);return[]}
function pseaCanUse(a){if(a.uses_remaining!=null&&pseaNum(a.uses_remaining)<=0)return false;if(!pseaSnap?.active)return a.target_type==='self';if(!pseaSnap?.is_my_turn)return false;if(a.target_type==='self')return true;return pseaTargets(a).length>0}
function pseaArrangePanel(panel){
  const two=panel.querySelector('.gmt-player-two');if(!two)return;
  const panes=[...two.children],equip=panes.find(x=>pseaTxt(x.querySelector('.eyebrow'))==='TAKILI TEÇHİZAT')||panes[1];if(!equip)return;
  let grid=equip.querySelector('[data-psea-equipment-grid]');
  const slots=[...equip.querySelectorAll(':scope > .gmt-slot')];
  if(!grid&&slots.length){grid=document.createElement('div');grid.className='psea-equipment-grid';grid.dataset.pseaEquipmentGrid='1';equip.insertBefore(grid,slots[0]);slots.forEach(x=>grid.appendChild(x))}
  else if(grid){[...equip.querySelectorAll(':scope > .gmt-slot')].forEach(x=>grid.appendChild(x))}
  let ab=equip.querySelector('[data-psea-abilities]');if(!ab){ab=document.createElement('div');ab.className='psea-abilities';ab.dataset.pseaAbilities='1';equip.appendChild(ab)}
  pseaRenderAbilities(ab);
}
function pseaRenderAbilities(box){
  const sig=JSON.stringify([pseaSnap?.active,pseaSnap?.is_my_turn,(pseaSnap?.order||[]).map(x=>[x.id,x.hp_current]),pseaAbilities.map(a=>[a.assignment_id,a.name,a.ability_type,a.effect_type,a.target_type,a.formula,a.uses_per_combat,a.uses_remaining])]);
  if(box.dataset.pseaSig===sig)return;box.dataset.pseaSig=sig;
  const cards=pseaAbilities.map(a=>{
    const finite=a.uses_per_combat!=null,uses=finite?`${pseaNum(a.uses_remaining)}/${pseaNum(a.uses_per_combat)} kaldı`:'Sınırsız',targets=pseaTargets(a),can=pseaCanUse(a),needs=a.target_type!=='self';
    let target='';if(needs){const opts=targets.length?targets.map(x=>`<option value="${pseaEsc(x.id)}">${pseaEsc(x.name)} • HP ${pseaNum(x.hp_current)}/${pseaNum(x.hp_max)}</option>`).join(''):'<option value="">Uygun hedef yok</option>';target=`<select data-psea-target="${pseaEsc(a.assignment_id)}">${opts}</select>`}
    const useText=a.uses_remaining!=null&&pseaNum(a.uses_remaining)<=0?'Hak Bitti':(pseaSnap?.active&&!pseaSnap?.is_my_turn?'Sıra Sende Değil':'Kullan');
    return `<article class="psea-ability ${can?'ready':''}"><div class="psea-ability-type">${pseaType(a.ability_type)}</div><h4>${pseaEsc(a.name)}</h4><div class="psea-ability-meta">${pseaEffect(a.effect_type)} • Hedef: ${pseaTarget(a.target_type)}${a.formula?`<br>${pseaEsc(a.formula)}`:''}<br>Kullanım: ${pseaEsc(uses)}</div><div class="psea-use-row">${target||'<span></span>'}<button type="button" class="primary" data-psea-use="${pseaEsc(a.assignment_id)}" ${can?'':'disabled'}>${useText}</button></div></article>`
  }).join('');
  box.innerHTML=`<div class="psea-abilities-head"><div><div class="eyebrow">YETENEKLER & BÜYÜLER</div><h3>Karakter Yetenekleri</h3></div><div class="psea-head-actions"><span class="tag">${pseaAbilities.length}</span><button type="button" class="small psea-rest" data-psea-long-rest>Uzun Dinlenme</button></div></div>${cards?`<div class="psea-ability-list">${cards}</div>`:'<div class="psea-empty">GM henüz bu karaktere bir yetenek atamadı.</div>'}`;
}
async function pseaLoad(force=false){
  if(!pseaIsSheet()||pseaBusy)return;pseaBusy=true;
  try{
    const [ar,sr]=await Promise.all([PSEA_S.rpc('catlak_player_abilities'),PSEA_S.rpc('catlak_player_combat_snapshot')]);
    if(ar.error)throw ar.error;if(sr.error)throw sr.error;
    const next=ar.data||[],snap=sr.data||{},sig=JSON.stringify([snap.active,snap.is_my_turn,(snap.order||[]).map(x=>[x.id,x.hp_current]),next.map(a=>[a.assignment_id,a.name,a.uses_remaining,a.uses_per_combat])]);
    if(force||sig!==pseaSig){pseaAbilities=next;pseaSnap=snap;pseaSig=sig;PSEA_APP.querySelectorAll('[data-psea-abilities]').forEach(x=>x.dataset.pseaSig='')}
  }catch(e){console.warn('PSEA_LOAD',e)}finally{pseaBusy=false}
}
async function pseaPaint(force=false){if(!pseaIsSheet())return;await pseaLoad(force);if(!pseaIsSheet())return;PSEA_APP.querySelectorAll('main [data-gmt-player-panel]').forEach(pseaArrangePanel)}
async function pseaUse(btn){if(pseaActionBusy)return;const id=btn.dataset.pseaUse,target=PSEA_APP.querySelector(`[data-psea-target="${CSS.escape(id)}"]`)?.value||null;pseaActionBusy=true;btn.disabled=true;try{const r=await PSEA_S.rpc('catlak_player_use_ability',{p_assignment_id:id,p_target_id:target});if(r.error)throw r.error;const d=r.data||{};let m=d.ability||'Yetenek';if(d.hit===false)m+=': ISKA';else if(d.effect_type==='damage')m+=`: ${d.amount} hasar`;else if(d.effect_type==='heal')m+=`: ${d.amount} iyileştirme`;else m+=' kullanıldı';pseaToast(m);pseaSig='';await pseaPaint(true);try{window.__catlakPlayerSheetSupport?.refresh?.(true)}catch(_){}}catch(e){pseaToast(e?.message||String(e))}finally{pseaActionBusy=false;if(btn.isConnected)btn.disabled=false}}
function pseaHpInfo(){const hero=PSEA_APP.querySelector('main .cc-character-stack section.hero'),hp=hero?.querySelector('[data-a="hp"][data-id]')?.closest('.vital'),id=hero?.querySelector('[data-a="hp"][data-id]')?.dataset.id||'',m=pseaTxt(hp?.querySelector('b')).match(/(\d+)\s*\/\s*(\d+)/);return{id,current:pseaNum(m?.[1]),max:pseaNum(m?.[2])}}
async function pseaLongRest(btn){if(pseaActionBusy)return;pseaActionBusy=true;btn.disabled=true;try{
  let resetOk=false;
  const rr=await PSEA_S.rpc('catlak_player_long_rest');
  if(!rr.error)resetOk=true;
  else{
    const finite=pseaAbilities.filter(a=>a.uses_per_combat!=null&&a.assignment_id);
    if(finite.length){const results=await Promise.all(finite.map(a=>PSEA_S.from('catlak_character_abilities').update({uses_remaining:pseaNum(a.uses_per_combat)}).eq('id',a.assignment_id)));const bad=results.find(x=>x.error);if(bad)throw rr.error||bad.error;resetOk=true}else resetOk=true;
  }
  const hp=pseaHpInfo();if(hp.id&&hp.max>0&&hp.current<hp.max){const hr=await PSEA_S.rpc('catlak_update_my_hp',{p_character_id:hp.id,p_hp:hp.max});if(hr.error)console.warn('PSEA_LONG_REST_HP',hr.error)}
  if(resetOk){pseaToast('Uzun dinlenme tamamlandı. HP ve sınırlı yetenek kullanımları yenilendi.');pseaSig='';await pseaPaint(true);try{window.__catlakPlayerLiveTest?.refresh?.(true)}catch(_){}}
}catch(e){pseaToast('Uzun dinlenme tamamlanamadı: '+(e?.message||String(e)))}finally{pseaActionBusy=false;if(btn.isConnected)btn.disabled=false}}
function pseaSoon(force=false,ms=25){clearTimeout(pseaTimer);pseaTimer=setTimeout(()=>pseaPaint(force),ms)}

document.addEventListener('click',e=>{const use=e.target.closest?.('[data-psea-use]');if(use){e.preventDefault();e.stopImmediatePropagation();pseaUse(use);return}const rest=e.target.closest?.('[data-psea-long-rest]');if(rest){e.preventDefault();e.stopImmediatePropagation();pseaLongRest(rest)}},true);
new MutationObserver(()=>pseaSoon(false,20)).observe(PSEA_APP,{childList:true,subtree:true});
PSEA_S.channel('cc-player-sheet-ability-summary')
 .on('postgres_changes',{event:'*',schema:'public',table:'catlak_character_abilities'},()=>{pseaSig='';pseaSoon(true,0)})
 .on('postgres_changes',{event:'*',schema:'public',table:'catlak_abilities'},()=>{pseaSig='';pseaSoon(true,0)})
 .on('postgres_changes',{event:'*',schema:'public',table:'catlak_combatants'},()=>{pseaSig='';pseaSoon(true,0)})
 .on('postgres_changes',{event:'*',schema:'public',table:'catlak_combat_state'},()=>{pseaSig='';pseaSoon(true,0)})
 .subscribe();
setInterval(()=>{if(pseaIsSheet())pseaSoon(false,0)},1200);setTimeout(()=>pseaSoon(true,0),40);
window.__catlakPlayerSheetEquipmentAbilitiesTest={paint:pseaPaint,arrange:pseaArrangePanel,use:pseaUse,longRest:pseaLongRest};