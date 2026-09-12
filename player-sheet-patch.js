const PS_S=window.__catlakSupabase;
const PS_APP=document.querySelector('#app');
if(!PS_S||!PS_APP)throw new Error('Çatlak Çağı oyuncu kağıdı katmanı başlatılamadı.');

const psTxt=e=>String(e?.textContent||'').trim();
const psEsc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const psIsGM=()=>psTxt(PS_APP.querySelector('.role'))==='GM';
const psTab=()=>PS_APP.querySelector('.nav button.on[data-tab]')?.dataset.tab||'';
let psScheduled=false,psApplying=false,psCombatBusy=false,psCombatCache=null,psCombatAt=0;

const PS_CSS=`
main.ps-player-sheet{max-width:1540px;padding-top:18px}
main.ps-player-sheet>.cc-desk-intro{display:none!important}
.ps-player-sheet .cc-character-stack:not([data-ps-sheet="1"]){visibility:hidden}
.ps-player-sheet .cc-character-stack{padding:0!important;border:0!important;background:transparent!important;box-shadow:none!important;margin:0 0 24px!important}
.ps-player-sheet .cc-character-stack,.ps-player-sheet .card,.ps-player-sheet .roll{animation:none!important;transition:none!important}
.ps-player-sheet .card,.ps-player-sheet .roll,.ps-player-sheet .roll>div:last-child,.ps-player-sheet .gmt-slot{min-width:0;overflow-wrap:anywhere}
.ps-player-sheet .cc-character-label{display:none!important}
.ps-sheet-grid{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(320px,.72fr);gap:16px;align-items:start}
.ps-main-column,.ps-side-column,.ps-detail-column{min-width:0}
.ps-main-column,.ps-side-column{display:flex;flex-direction:column;gap:14px}
.ps-detail-column{grid-column:1/-1;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-top:2px}
.ps-detail-column>.card{margin:0!important}
.ps-player-sheet .ps-main-column>.card,.ps-player-sheet .ps-side-column>.card{margin:0!important}
.ps-player-sheet section.hero{display:grid!important;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:18px;padding:22px!important;border-color:#6b5731!important;border-radius:18px!important;background:linear-gradient(135deg,#0d1b29,#0a1420 58%,#17131c)!important;box-shadow:0 20px 60px #0007!important}
.ps-player-sheet section.hero h1{font-size:clamp(2rem,4vw,3.25rem);margin:.08em 0 .18em;letter-spacing:.01em}
.ps-player-sheet section.hero>div:first-child p{font-size:1rem;margin:.2rem 0;color:#b6c7d5}
.ps-player-sheet section.hero .vitals{display:grid!important;grid-template-columns:repeat(2,minmax(112px,1fr));gap:9px;min-width:280px}
.ps-player-sheet section.hero .vital{padding:12px!important;border-color:#334b60!important;background:#07131f!important;border-radius:13px!important;min-width:0!important}
.ps-player-sheet section.hero .vital span{font-size:.67rem;letter-spacing:.12em}
.ps-player-sheet section.hero .vital b{font-size:1.55rem}
.ps-kp-vital{border-color:#68343d!important;background:linear-gradient(180deg,#211018,#100d13)!important}
.ps-kp-vital b{color:#ff9ead}
.ps-player-sheet .ps-stat-card{padding:15px!important;border-color:#344b61!important;background:linear-gradient(180deg,#0c1825,#09131e)!important}
.ps-player-sheet .ps-stat-card .section-title{margin-bottom:10px!important}
.ps-player-sheet .ps-stat-card h2{font-size:1.1rem;margin:.15rem 0}
.ps-player-sheet .stats{gap:8px!important}
.ps-player-sheet .stat{min-height:104px;border-radius:13px!important;background:#081522!important;border-color:#2b4358!important}
.ps-player-sheet .stat:hover{border-color:#7b6235!important;box-shadow:inset 0 0 0 1px #d7ae5940}
.ps-player-sheet .stat strong{font-size:1.72rem}
.ps-player-sheet [data-cc-party-visual-card]{order:5;padding:15px!important;border-color:#6e5a35!important;background:linear-gradient(180deg,#15171b,#0b1119)!important}
.ps-player-sheet [data-cc-party-visual-card] .eyebrow:before{content:'▣ ';color:var(--gold)}
.ps-player-sheet [data-cc-party-visual-card] .cc-party-mini>img{width:100%!important;height:auto!important;max-height:62vh!important;min-height:260px!important;object-fit:contain!important;background:#03070c!important;border-radius:14px!important;margin:9px 0 12px!important}
.ps-player-sheet [data-cc-party-visual-card] h2{font-size:1.2rem!important;margin:.2rem 0!important}
.ps-player-sheet [data-gmt-player-panel]{padding:14px!important;border-color:#394c5c!important;background:#09131e!important}
.ps-player-sheet [data-gmt-player-panel] .gmt-player-two{display:flex!important;flex-direction:column!important;gap:11px!important}
.ps-player-sheet [data-gmt-player-panel] .gmt-player-two>div{padding:12px;border:1px solid #263b4c;border-radius:12px;background:#07111b}
.ps-player-sheet [data-gmt-player-panel] h2{font-size:1.05rem;margin:.2rem 0 .55rem}
.ps-player-sheet [data-gmt-player-panel] .gmt-slot{grid-template-columns:100px minmax(0,1fr)!important;font-size:.83rem}
.ps-player-sheet .cc-player-gm-note{padding:14px!important;margin:0!important}
.ps-player-sheet .cc-player-gm-note h2{font-size:1.05rem;margin:.25rem 0 .45rem}
.ps-combat-card{border-color:#705b32!important;background:linear-gradient(135deg,#18150d,#101723)!important;padding:14px!important}
.ps-combat-card .ps-combat-row{display:flex;justify-content:space-between;gap:10px;align-items:center}
.ps-combat-card h2{font-size:1.1rem;margin:.2rem 0}
.ps-combat-card .ps-turn-self{color:#f2d284;font-weight:900}
.ps-combat-card .ps-turn-other{color:var(--muted)}
.ps-combat-card button{white-space:nowrap}
.ps-player-sheet .ps-roll-card{padding:14px!important}
.ps-player-sheet .ps-roll-card .rolls{gap:7px!important}
.ps-player-sheet .ps-roll-card .roll{padding:9px!important;border-radius:11px!important;background:#07121c!important;grid-template-columns:40px minmax(0,1fr)!important}
.ps-player-sheet .ps-roll-card .die{width:40px;height:40px;font-size:1rem}
.ps-player-sheet .ps-inventory-card{padding:15px!important}
.ps-player-sheet .ps-inventory-card .iw-player-grid{grid-template-columns:repeat(auto-fit,minmax(220px,1fr))!important;gap:9px!important}
.ps-player-sheet .ps-inventory-card .iw-player-item{padding:12px!important;background:#07131e!important}
.ps-player-sheet .ps-inventory-card .iw-player-item h3{font-size:1rem}
.ps-player-sheet .ps-lore-card{padding:15px!important;background:#08131e!important;border-color:#293e50!important}
.ps-player-sheet .ps-race-powers-card{padding:15px!important;border-color:#344b61!important;background:linear-gradient(180deg,#0c1825,#09131e)!important}
.ps-player-sheet .ps-race-powers-card>.grid{grid-template-columns:repeat(auto-fit,minmax(220px,1fr))!important;gap:9px!important}
.ps-player-sheet .ps-race-powers-card .power{margin:0!important;min-width:0}
.ps-player-sheet .ps-lore-card>h2,.ps-player-sheet .ps-lore-card>.section-title h2{font-size:1.15rem}
.ps-player-sheet section.vampire.ps-lore-card{border-color:#5a303b!important;background:linear-gradient(135deg,#1b0d14,#09131e)!important}
.ps-sheet-empty{padding:24px;border:1px dashed var(--line);border-radius:14px;color:var(--muted);text-align:center}
@media(max-width:1050px){.ps-sheet-grid{grid-template-columns:1fr}.ps-detail-column{grid-template-columns:1fr}.ps-player-sheet section.hero{grid-template-columns:1fr}.ps-player-sheet section.hero .vitals{min-width:0;width:100%;grid-template-columns:repeat(4,minmax(0,1fr))}}
@media(max-width:700px){main.ps-player-sheet{padding:10px}.ps-sheet-grid{gap:10px}.ps-main-column,.ps-side-column{gap:10px}.ps-player-sheet section.hero{padding:15px!important}.ps-player-sheet section.hero .vitals{grid-template-columns:repeat(2,minmax(0,1fr))}.ps-player-sheet .stats{grid-template-columns:repeat(3,1fr)!important}.ps-player-sheet .stat{min-height:90px;padding:10px!important}.ps-player-sheet [data-cc-party-visual-card] .cc-party-mini>img{min-height:180px!important;max-height:55vh!important}.ps-player-sheet .ps-inventory-card .iw-player-grid{grid-template-columns:1fr!important}}
`;
if(!document.querySelector('#ps-player-sheet-style')){const s=document.createElement('style');s.id='ps-player-sheet-style';s.textContent=PS_CSS;document.head.appendChild(s)}

function psEyebrow(sec){return psTxt(sec?.querySelector(':scope > .eyebrow, :scope > .section-title .eyebrow'))}
function psCharId(stack){return stack?.querySelector('section.hero [data-a="hp"][data-id]')?.dataset.id||''}
function psEnsureGrid(stack){
  let grid=stack.querySelector(':scope > .ps-sheet-grid');
  if(grid)return grid;
  grid=document.createElement('div');grid.className='ps-sheet-grid';
  grid.innerHTML='<div class="ps-main-column"></div><aside class="ps-side-column"></aside><div class="ps-detail-column"></div>';
  stack.appendChild(grid);return grid;
}
function psClassify(sec){
  if(sec.matches('section.hero'))return'main-hero';
  if(sec.hasAttribute('data-gmt-player-panel'))return'side-status';
  if(sec.hasAttribute('data-cc-player-note-for'))return'side-note';
  if(sec.hasAttribute('data-cc-party-visual-card'))return'main-visual';
  if(sec.classList.contains('vampire'))return'detail';
  const e=psEyebrow(sec);
  if(e==='D20 TESTLERİ')return'main-stats';
  if(e==='CANLI ENVANTER')return'main-inventory';
  if(e==='SON ZARLAR')return'side-rolls';
  if(e==='IRK GÜÇLERİ')return'main-powers';
  if(e==='ÖZEL YOL')return'detail';
  return'other';
}
function psPlace(target,items){
  if(!target)return;const wanted=items.filter(Boolean),current=[...target.children].filter(x=>wanted.includes(x));
  const same=current.length===wanted.length&&current.every((x,i)=>x===wanted[i])&&wanted.every(x=>x.parentElement===target);
  if(same)return;wanted.forEach(x=>target.appendChild(x));
}
function psAddKpTile(stack){
  const hero=stack.querySelector('section.hero'),vamp=stack.querySelector('section.vampire');if(!hero)return;
  let tile=hero.querySelector('[data-ps-kp]');
  if(!vamp){tile?.remove();return}
  const m=(psTxt(vamp.querySelector('h2')).match(/KP\s*(\d+)\s*\/\s*(\d+)/i)||[]);
  if(!m[1])return;
  const vitals=hero.querySelector('.vitals');if(!vitals)return;
  if(!tile){tile=document.createElement('div');tile.className='vital ps-kp-vital';tile.dataset.psKp='1';vitals.appendChild(tile)}
  const next=`<span>KAN PUANI</span><b>${psEsc(m[1])}/${psEsc(m[2])}</b>`;if(tile.innerHTML!==next)tile.innerHTML=next;
}
function psArrangeStack(stack){
  if(!stack||!stack.isConnected)return;
  const grid=psEnsureGrid(stack),main=grid.querySelector('.ps-main-column'),side=grid.querySelector('.ps-side-column'),detail=grid.querySelector('.ps-detail-column');
  const cards=[...stack.querySelectorAll(':scope > section.card, :scope > .ps-sheet-grid > .ps-main-column > section.card, :scope > .ps-sheet-grid > .ps-side-column > section.card, :scope > .ps-sheet-grid > .ps-detail-column > section.card')];
  const ordered={hero:[],stats:[],powers:[],visual:[],inventory:[],note:[],status:[],combat:[],rolls:[],detail:[],other:[]};
  for(const sec of cards){
    if(sec.hasAttribute('data-ps-combat-card')){ordered.combat.push(sec);continue}
    const k=psClassify(sec);
    if(k==='main-hero')ordered.hero.push(sec);else if(k==='main-stats'){sec.classList.add('ps-stat-card');ordered.stats.push(sec)}else if(k==='main-visual')ordered.visual.push(sec);else if(k==='main-powers'){sec.classList.add('ps-race-powers-card');ordered.powers.push(sec)}else if(k==='main-inventory'){sec.classList.add('ps-inventory-card');ordered.inventory.push(sec)}else if(k==='side-note')ordered.note.push(sec);else if(k==='side-status')ordered.status.push(sec);else if(k==='side-rolls'){sec.classList.add('ps-roll-card');ordered.rolls.push(sec)}else if(k==='detail'){sec.classList.add('ps-lore-card');ordered.detail.push(sec)}else ordered.other.push(sec)
  }
  psPlace(main,[...ordered.hero,...ordered.stats,...ordered.visual,...ordered.inventory,...ordered.powers]);
  psPlace(side,[...ordered.note,...ordered.status,...ordered.combat,...ordered.rolls]);
  psPlace(detail,[...ordered.detail,...ordered.other]);
  psAddKpTile(stack);
  stack.dataset.psSheet='1';
}
function psMovePartyVisual(main){
  const v=main.querySelector(':scope > [data-cc-party-visual-card]');if(!v)return;
  const first=main.querySelector('.cc-character-stack');if(!first)return;
  const grid=psEnsureGrid(first),col=grid.querySelector('.ps-main-column');
  v.classList.add('ps-party-visual');
  const inv=col.querySelector('.ps-inventory-card');
  if(inv){if(v.parentElement!==col||v.nextElementSibling!==inv)col.insertBefore(v,inv)}
  else if(v.parentElement!==col||v!==col.lastElementChild)col.appendChild(v);
}
function psOpenBattle(){PS_APP.querySelector('.nav [data-ccr-battle]')?.click()}
async function psRefreshCombat(force=false){
  if(psCombatBusy||psIsGM()||psTab()!=='sheet')return;
  if(!force&&psCombatCache&&Date.now()-psCombatAt<3500){psRenderCombat(psCombatCache);return}
  psCombatBusy=true;
  try{const r=await PS_S.rpc('catlak_player_combat_snapshot');if(r.error)throw r.error;psCombatCache=r.data||{};psCombatAt=Date.now();psRenderCombat(psCombatCache)}catch(e){console.warn('PS_COMBAT_SNAPSHOT',e)}finally{psCombatBusy=false}
}
function psRenderCombat(s){
  if(psIsGM()||psTab()!=='sheet')return;
  const stacks=[...PS_APP.querySelectorAll('main .cc-character-stack')];
  if(!s?.active){stacks.forEach(st=>st.querySelectorAll('[data-ps-combat-card]').forEach(x=>x.remove()));return}
  const current=(s.order||[]).find(x=>x.is_current),selfCurrent=!!current?.is_self;
  for(const stack of stacks){
    const cid=psCharId(stack),matches=!s.character_id||!cid||String(s.character_id)===String(cid);
    const old=stack.querySelector('[data-ps-combat-card]');
    if(!matches){old?.remove();continue}
    const sig=[String(cid||'1'),Number(s.round||1),String(current?.name||''),selfCurrent?'1':'0'].join('|');
    const grid=psEnsureGrid(stack),side=grid.querySelector('.ps-side-column');
    if(old?.dataset.psCombatSig===sig){const rolls=side.querySelector('.ps-roll-card');if(rolls&&old.nextElementSibling!==rolls)side.insertBefore(old,rolls);continue}
    const card=old||document.createElement('section');
    card.className='card ps-combat-card';card.dataset.psCombatCard=cid||'1';card.dataset.psCombatSig=sig;
    card.innerHTML=`<div class="ps-combat-row"><div><div class="eyebrow">⚔ AKTİF SAVAŞ</div><h2>Round ${Number(s.round||1)}</h2><div class="${selfCurrent?'ps-turn-self':'ps-turn-other'}">${selfCurrent?'SIRA SENDE!':`Sıra: ${psEsc(current?.name||'—')}`}</div></div><button type="button" class="primary" data-ps-open-battle>Savaş Odasına Gir →</button></div>`;
    const rolls=side.querySelector('.ps-roll-card');rolls?side.insertBefore(card,rolls):side.appendChild(card);
  }
}
function psApply(){
  psScheduled=false;if(psApplying)return;psApplying=true;
  try{
    const main=PS_APP.querySelector('main');if(!main)return;
    if(psIsGM()||psTab()!=='sheet'){main.classList.remove('ps-player-sheet');return}
    main.classList.add('ps-player-sheet');
    [...main.querySelectorAll('.cc-character-stack')].forEach(psArrangeStack);
    psMovePartyVisual(main);
    psRefreshCombat(false);
  }finally{psApplying=false}
}
function psSchedule(){if(psScheduled)return;psScheduled=true;requestAnimationFrame(psApply)}

document.addEventListener('click',e=>{const b=e.target.closest('[data-ps-open-battle]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();psOpenBattle()},true);
new MutationObserver(psSchedule).observe(PS_APP,{childList:true,subtree:true});
PS_S.channel('ps-player-sheet-live').on('postgres_changes',{event:'*',schema:'public',table:'catlak_combat_state'},()=>{psCombatCache=null;psSchedule()}).on('postgres_changes',{event:'*',schema:'public',table:'catlak_combatants'},()=>{psCombatCache=null;psSchedule()}).on('postgres_changes',{event:'*',schema:'public',table:'catlak_character_conditions'},()=>{psCombatCache=null;psSchedule()}).subscribe();
setInterval(()=>{if(!psIsGM()&&psTab()==='sheet')psRefreshCombat(true)},5000);
psSchedule();
window.__catlakPlayerSheetTest={apply:psApply,classify:psClassify,refreshCombat:psRefreshCombat};
