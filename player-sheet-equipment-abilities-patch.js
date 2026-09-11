const PSEA_S=window.__catlakSupabase;
const PSEA_APP=document.querySelector('#app');
if(!PSEA_S||!PSEA_APP)throw new Error('Oyuncu kağıdı ekipman/yetenek düzeni başlatılamadı.');

const pseaTxt=e=>String(e?.textContent||'').trim();
const pseaEsc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pseaIsGM=()=>pseaTxt(PSEA_APP.querySelector('.role'))==='GM';
const pseaTab=()=>PSEA_APP.querySelector('.nav button.on[data-tab]')?.dataset.tab||'';
const pseaIsSheet=()=>!pseaIsGM()&&pseaTab()==='sheet';
let pseaBusy=false,pseaTimer=null,pseaAbilities=[],pseaSig='';

if(!document.querySelector('#psea-style')){
  const s=document.createElement('style');s.id='psea-style';s.textContent=`
  .ps-player-sheet [data-gmt-player-panel] .psea-equipment-grid{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:8px;margin:8px 0 10px}
  .ps-player-sheet [data-gmt-player-panel] .psea-equipment-grid .gmt-slot{display:block!important;border:1px solid #304354!important;border-radius:11px;padding:10px!important;background:#07131e;min-width:0}
  .ps-player-sheet [data-gmt-player-panel] .psea-equipment-grid .gmt-slot b{display:block;color:#d7b86f!important;font-size:.68rem;letter-spacing:.08em;margin-bottom:4px}
  .ps-player-sheet [data-gmt-player-panel] .psea-equipment-grid .gmt-slot span{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .ps-player-sheet [data-gmt-player-panel] .psea-equipment-grid .gmt-slot:nth-child(5){grid-column:1/-1!important}
  .psea-abilities{margin-top:14px;padding-top:13px;border-top:1px solid var(--line)}
  .psea-abilities-head{display:flex;justify-content:space-between;gap:10px;align-items:end;margin-bottom:8px}.psea-abilities-head h3{margin:.15rem 0}
  .psea-ability-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.psea-ability{border:1px solid #304354;border-radius:11px;padding:10px;background:#07131e;min-width:0}.psea-ability h4{margin:3px 0 5px;font-size:.92rem}.psea-ability-meta{font-size:.72rem;color:var(--muted);line-height:1.45}.psea-ability-type{font-size:.63rem;letter-spacing:.1em;font-weight:900;color:#bba7ff}.psea-empty{font-size:.8rem;color:var(--muted);padding:8px 0}
  @media(max-width:620px){
    .ps-player-sheet [data-gmt-player-panel] .psea-equipment-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:6px!important}
    .ps-player-sheet [data-gmt-player-panel] .psea-equipment-grid .gmt-slot{padding:8px!important}
    .ps-player-sheet [data-gmt-player-panel] .psea-equipment-grid .gmt-slot b{font-size:.6rem!important}
    .ps-player-sheet [data-gmt-player-panel] .psea-equipment-grid .gmt-slot span{font-size:.78rem!important}
    .ps-player-sheet [data-gmt-player-panel] .psea-equipment-grid .gmt-slot:nth-child(5){grid-column:1/-1!important}
    .psea-ability-list{grid-template-columns:1fr}
  }
  `;document.head.appendChild(s)
}

function pseaType(x){return x==='spell'?'BÜYÜ':x==='special'?'ÖZEL YETENEK':'YETENEK'}
function pseaEffect(x){return x==='heal'?'İyileştirme':x==='utility'?'Destek':'Hasar'}
function pseaTarget(x){return x==='self'?'Kendi':x==='ally'?'Müttefik':'Düşman'}
function pseaArrangePanel(panel){
  const two=panel.querySelector('.gmt-player-two');if(!two)return;
  const panes=[...two.children];const equip=panes.find(x=>pseaTxt(x.querySelector('.eyebrow'))==='TAKILI TEÇHİZAT')||panes[1];if(!equip)return;
  let grid=equip.querySelector('[data-psea-equipment-grid]');
  const slots=[...equip.querySelectorAll(':scope > .gmt-slot')];
  if(!grid&&slots.length){grid=document.createElement('div');grid.className='psea-equipment-grid';grid.dataset.pseaEquipmentGrid='1';equip.insertBefore(grid,slots[0]);slots.forEach(x=>grid.appendChild(x))}
  else if(grid){[...equip.querySelectorAll(':scope > .gmt-slot')].forEach(x=>grid.appendChild(x))}
  let ab=equip.querySelector('[data-psea-abilities]');if(!ab){ab=document.createElement('div');ab.className='psea-abilities';ab.dataset.pseaAbilities='1';equip.appendChild(ab)}
  pseaRenderAbilities(ab);
}
function pseaRenderAbilities(box){
  const sig=JSON.stringify(pseaAbilities.map(a=>[a.assignment_id,a.name,a.ability_type,a.effect_type,a.target_type,a.formula,a.uses_per_combat,a.uses_remaining]));
  if(box.dataset.pseaSig===sig)return;box.dataset.pseaSig=sig;
  const cards=pseaAbilities.map(a=>{const uses=a.uses_per_combat==null?'Sınırsız':`${Number(a.uses_remaining||0)}/${Number(a.uses_per_combat||0)} kaldı`;return `<article class="psea-ability"><div class="psea-ability-type">${pseaType(a.ability_type)}</div><h4>${pseaEsc(a.name)}</h4><div class="psea-ability-meta">${pseaEffect(a.effect_type)} • Hedef: ${pseaTarget(a.target_type)}${a.formula?`<br>${pseaEsc(a.formula)}`:''}<br>Kullanım: ${pseaEsc(uses)}</div></article>`}).join('');
  box.innerHTML=`<div class="psea-abilities-head"><div><div class="eyebrow">YETENEKLER & BÜYÜLER</div><h3>Karakter Yetenekleri</h3></div><span class="tag">${pseaAbilities.length}</span></div>${cards?`<div class="psea-ability-list">${cards}</div>`:'<div class="psea-empty">GM henüz bu karaktere bir yetenek atamadı.</div>'}`;
}
async function pseaLoadAbilities(force=false){
  if(!pseaIsSheet()||pseaBusy)return;pseaBusy=true;
  try{const r=await PSEA_S.rpc('catlak_player_abilities');if(r.error)throw r.error;const next=r.data||[],sig=JSON.stringify(next.map(a=>[a.assignment_id,a.name,a.uses_remaining,a.uses_per_combat]));if(force||sig!==pseaSig){pseaAbilities=next;pseaSig=sig;PSEA_APP.querySelectorAll('[data-psea-abilities]').forEach(x=>x.dataset.pseaSig='')}}catch(e){console.warn('PSEA_ABILITIES',e)}finally{pseaBusy=false}
}
async function pseaPaint(force=false){
  if(!pseaIsSheet())return;await pseaLoadAbilities(force);if(!pseaIsSheet())return;
  PSEA_APP.querySelectorAll('main [data-gmt-player-panel]').forEach(pseaArrangePanel)
}
function pseaSoon(force=false,ms=70){clearTimeout(pseaTimer);pseaTimer=setTimeout(()=>pseaPaint(force),ms)}
new MutationObserver(()=>pseaSoon(false,70)).observe(PSEA_APP,{childList:true,subtree:true});
PSEA_S.channel('cc-player-sheet-ability-summary').on('postgres_changes',{event:'*',schema:'public',table:'catlak_character_abilities'},()=>pseaSoon(true,30)).on('postgres_changes',{event:'*',schema:'public',table:'catlak_abilities'},()=>pseaSoon(true,30)).on('postgres_changes',{event:'*',schema:'public',table:'catlak_inventory'},()=>pseaSoon(false,60)).subscribe();
setInterval(()=>pseaSoon(false,0),2600);setTimeout(()=>pseaSoon(true,0),260);
window.__catlakPlayerSheetEquipmentAbilitiesTest={paint:pseaPaint,arrange:pseaArrangePanel};