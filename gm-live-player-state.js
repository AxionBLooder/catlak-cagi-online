(function(){
'use strict';
if(window.__catlakGmLivePlayerStateV3)return;
window.__catlakGmLivePlayerStateV3=true;
const APP=document.getElementById('app'),S=window.__catlakSupabase;if(!APP||!S)return;
const txt=e=>String(e?.textContent||'').trim();
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const isGM=()=>txt(APP.querySelector('.role'))==='GM';
const active=()=>isGM()&&APP.querySelector('.nav [data-tab="gm"].on');
let busy=false,timer=0,last='';

if(!document.getElementById('glps-style')){
 const st=document.createElement('style');st.id='glps-style';st.textContent=`
 #app .glps-player-table{display:block!important;border:1px solid #223746!important;border-radius:10px!important;overflow:hidden!important;background:#071018!important}
 #app .glps-player-table .cc-simple-player{display:grid!important;grid-template-columns:minmax(150px,1.25fr) minmax(105px,.8fr) minmax(115px,.9fr) 70px 95px 60px 70px minmax(120px,1fr)!important;gap:8px!important;align-items:center!important;margin:0!important;padding:8px 10px!important;border:0!important;border-bottom:1px solid #172934!important;border-radius:0!important;background:#08131c!important;min-height:42px!important}
 #app .glps-player-table .cc-simple-player:last-child{border-bottom:0!important}
 #app .glps-name{min-width:0}.glps-name b{display:block;font-size:.82rem!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.glps-name small{display:block;font-size:.62rem!important;color:#7890a2!important}
 #app .glps-cell{font-size:.72rem;color:#cbd7e0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.glps-cell strong{color:#edf6ff}
 #app .glps-conds{display:flex;gap:4px;flex-wrap:wrap}.glps-cond{display:inline-flex;border:1px solid #4b6174;border-radius:999px;padding:2px 6px;font-size:.62rem;color:#ffd08a;background:#0b1824}
 @media(max-width:1050px){#app .glps-player-table .cc-simple-player{grid-template-columns:minmax(140px,1.3fr) repeat(3,minmax(72px,.7fr)) minmax(120px,1fr)!important}#app .glps-player-table .glps-race,#app .glps-player-table .glps-speed,#app .glps-player-table .glps-ac{display:none!important}}
 @media(max-width:650px){#app .glps-player-table .cc-simple-player{grid-template-columns:minmax(120px,1fr) 72px 72px!important}.glps-class,.glps-race,.glps-speed,.glps-ac,.glps-level,.glps-status{display:none!important}}
 `;document.head.appendChild(st)
}
async function load(){
 const [cr,kr,br,rr]=await Promise.all([
  S.from('catlak_characters').select('id,name,species_name,class_name,level,hp_current,hp_max,base_ac,base_speed,play_status').eq('play_status','active').order('created_at',{ascending:true}),
  S.from('catlak_character_conditions').select('id,character_id,name,remaining_rounds,note,active').eq('active',true).order('created_at',{ascending:true}),
  S.from('catlak_combatants').select('id,character_id,kind,hp_current,hp_max').eq('kind','player'),
  S.from('catlak_rolls').select('*').order('created_at',{ascending:false}).limit(40)
 ]);
 for(const r of [cr,kr,br,rr])if(r.error)throw r.error;
 return {chars:cr.data||[],conds:kr.data||[],combatants:br.data||[],rolls:rr.data||[]};
}
function paint(d){
 if(!active())return false;
 const cards=[...APP.querySelectorAll('main[data-cc-simple-live="1"] .cc-simple-player')];
 if(!cards.length)return false;
 const byName=new Map(d.chars.map(c=>[String(c.name||'').trim().toLocaleLowerCase('tr-TR'),c])),byId=new Map(d.chars.map(c=>[String(c.id),c]));
 cards[0].parentElement?.classList.add('glps-player-table');
 for(const card of cards){
  const originalName=card.dataset.glpsName||txt(card.querySelector('b')),c=byId.get(String(card.dataset.glpsCharId||''))||byName.get(originalName.toLocaleLowerCase('tr-TR'));if(!c)continue;
  card.dataset.glpsCharId=String(c.id);card.dataset.glpsName=String(c.name||originalName);
  const cs=d.conds.filter(x=>String(x.character_id)===String(c.id)),combat=d.combatants.find(x=>String(x.character_id||'')===String(c.id));
  const hpCur=combat?.hp_current!=null?Number(combat.hp_current):Number(c.hp_current||0),hpMax=combat?.hp_max!=null?Number(combat.hp_max):Number(c.hp_max||0);
  card.innerHTML=`<div class="glps-name"><b>${esc(c.name||'Karakter')}</b><small>AKTİF OYUNCU</small></div>
  <div class="glps-cell glps-race">Irk <strong>${esc(c.species_name||'—')}</strong></div>
  <div class="glps-cell glps-class">Sınıf <strong>${esc(c.class_name||'—')}</strong></div>
  <div class="glps-cell glps-level">Sv <strong>${Number(c.level||1)}</strong></div>
  <div class="glps-cell">HP <strong>${hpCur}/${hpMax}</strong></div>
  <div class="glps-cell glps-ac">AC <strong>${Number(c.base_ac||0)}</strong></div>
  <div class="glps-cell glps-speed">Hız <strong>${Number(c.base_speed||0)}</strong></div>
  <div class="glps-status">${cs.length?`<div class="glps-conds">${cs.map(x=>`<span class="glps-cond">${esc(x.name||'Durum')}${x.remaining_rounds==null?'':' • '+Number(x.remaining_rounds)+'r'}</span>`).join('')}</div>`:'<span class="glps-cell">Durum —</span>'}</div>`;
 }
 const wrap=APP.querySelector('main[data-cc-simple-live="1"] .cc-live-two');
 if(wrap){
  const rollCard=[...wrap.children].find(c=>txt(c.querySelector('.eyebrow')).includes('ZAR AKIŞI')||!!c.querySelector('.cc-simple-roll'));
  if(rollCard){
   rollCard.querySelectorAll('.glps-roll-fallback').forEach(x=>x.remove());
   const existing=new Set([...rollCard.querySelectorAll('[data-cc-roll-id]')].map(x=>String(x.dataset.ccRollId||'')));
   const names=new Map(d.chars.map(c=>[String(c.id),c.name]));
   for(const r of d.rolls.slice(0,16)){
    if(existing.has(String(r.id)))continue;
    const row=document.createElement('div');row.className='cc-simple-roll glps-roll-fallback';row.dataset.ccRollId=String(r.id);
    row.innerHTML=`<div class="cc-simple-total">${r.total==null?'?':esc(r.total)}</div><div><b>${esc(names.get(String(r.character_id))||r.label||'Oyuncu')}</b><br><span>${esc(r.label||r.roll_kind||r.formula||'Zar')}</span></div>`;
    rollCard.appendChild(row);
   }
  }
 }
 return true;
}
async function refresh(force=false){
 if(!active()||busy)return false;busy=true;
 try{const d=await load();const sig=JSON.stringify([d.chars.map(c=>[c.id,c.name,c.species_name,c.class_name,c.level,c.hp_current,c.hp_max,c.base_ac,c.base_speed]),d.conds.map(c=>[c.id,c.character_id,c.name,c.remaining_rounds,c.active]),d.combatants.map(c=>[c.id,c.character_id,c.hp_current,c.hp_max]),d.rolls.map(r=>[r.id,r.character_id,r.total,r.label,r.roll_kind])]);if(force||sig!==last){last=sig;paint(d)}return true}catch(e){console.warn('GLPS_REFRESH',e);return false}finally{busy=false}
}
function schedule(ms=30){clearTimeout(timer);timer=setTimeout(()=>refresh(true),ms)}
new MutationObserver(()=>{if(active())schedule(70)}).observe(APP,{childList:true,subtree:true});
S.channel('cc-gm-live-player-state-v1')
 .on('postgres_changes',{event:'*',schema:'public',table:'catlak_characters'},()=>schedule(20))
 .on('postgres_changes',{event:'*',schema:'public',table:'catlak_character_conditions'},()=>schedule(20))
 .on('postgres_changes',{event:'*',schema:'public',table:'catlak_combatants'},()=>schedule(20))
 .on('postgres_changes',{event:'*',schema:'public',table:'catlak_rolls'},()=>schedule(20))
 .subscribe();
setInterval(()=>{if(active())refresh(false)},1200);
setTimeout(()=>schedule(0),180);
window.__catlakGmLivePlayerState={refresh,schedule,paint};
})();