(function(){
'use strict';
if(window.__catlakGmLivePlayerStateV4)return;
window.__catlakGmLivePlayerStateV4=true;
const APP=document.getElementById('app'),S=window.__catlakSupabase;if(!APP||!S)return;
const txt=e=>String(e?.textContent||'').trim();
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const isGM=()=>txt(APP.querySelector('.role'))==='GM';
const active=()=>isGM()&&APP.querySelector('.nav [data-tab="gm"].on');
let busy=false,timer=0,last='';

if(!document.getElementById('glps-style-v4')){
 const st=document.createElement('style');st.id='glps-style-v4';st.textContent=`
 #app .glps-player-table{display:flex!important;flex-direction:column!important;gap:0!important;border:1px solid #284254!important;border-radius:10px!important;overflow:hidden!important;background:#071018!important;width:100%!important}
 #app .glps-player-table .cc-simple-player{display:grid!important;grid-template-columns:minmax(180px,1.35fr) minmax(130px,.85fr) minmax(105px,.65fr)!important;gap:12px!important;align-items:center!important;margin:0!important;padding:8px 11px!important;border:0!important;border-bottom:1px solid #172934!important;border-radius:0!important;background:#08131c!important;min-height:0!important;height:auto!important;box-shadow:none!important}
 #app .glps-player-table .cc-simple-player:last-child{border-bottom:0!important}
 #app .glps-player-head{display:grid!important;grid-template-columns:minmax(180px,1.35fr) minmax(130px,.85fr) minmax(105px,.65fr)!important;gap:12px!important;padding:7px 11px!important;background:#0d1d29!important;border-bottom:1px solid #284254!important;color:#7890a2!important;font-size:.63rem!important;font-weight:800!important;letter-spacing:.08em!important;text-transform:uppercase!important}
 #app .glps-char-main,#app .glps-race-main,#app .glps-hp-main{min-width:0!important}
 #app .glps-char-main b{display:block!important;font-size:.82rem!important;line-height:1.2!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;color:#edf6ff!important}
 #app .glps-sub{display:block!important;margin-top:2px!important;font-size:.62rem!important;line-height:1.2!important;color:#7890a2!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
 #app .glps-race-main strong,#app .glps-hp-main strong{display:block!important;font-size:.76rem!important;line-height:1.2!important;color:#dce9f2!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
 #app .glps-conds{display:flex!important;gap:3px!important;flex-wrap:wrap!important;margin-top:3px!important}.glps-cond{display:inline-flex!important;border:1px solid #4b6174!important;border-radius:999px!important;padding:1px 5px!important;font-size:.56rem!important;color:#ffd08a!important;background:#0b1824!important}
 @media(max-width:720px){#app .glps-player-table .cc-simple-player,#app .glps-player-head{grid-template-columns:minmax(130px,1fr) minmax(105px,.8fr)!important}#app .glps-player-head span:last-child,#app .glps-hp-main{display:none!important}}
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
 const parent=cards[0].parentElement;parent?.classList.add('glps-player-table');if(parent&&!parent.querySelector(':scope > .glps-player-head')){const h=document.createElement('div');h.className='glps-player-head';h.innerHTML='<span>Karakter</span><span>Irk</span><span>Can / Durum</span>';parent.insertBefore(h,parent.firstChild)}
 for(const card of cards){
  const originalName=card.dataset.glpsName||txt(card.querySelector('b')),c=byId.get(String(card.dataset.glpsCharId||''))||byName.get(originalName.toLocaleLowerCase('tr-TR'));if(!c)continue;
  card.dataset.glpsCharId=String(c.id);card.dataset.glpsName=String(c.name||originalName);
  const cs=d.conds.filter(x=>String(x.character_id)===String(c.id)),combat=d.combatants.find(x=>String(x.character_id||'')===String(c.id));
  const hpCur=combat?.hp_current!=null?Number(combat.hp_current):Number(c.hp_current||0),hpMax=combat?.hp_max!=null?Number(combat.hp_max):Number(c.hp_max||0);
  card.innerHTML=`<div class="glps-char-main"><b>${esc(c.name||'Karakter')}</b><span class="glps-sub">${esc(c.class_name||'—')} • Sv ${Number(c.level||1)}</span></div>
  <div class="glps-race-main"><strong>${esc(c.species_name||'—')}</strong><span class="glps-sub">AC ${Number(c.base_ac||0)} • Hız ${Number(c.base_speed||0)}</span></div>
  <div class="glps-hp-main"><strong>${hpCur}/${hpMax} HP</strong>${cs.length?`<div class="glps-conds">${cs.map(x=>`<span class="glps-cond">${esc(x.name||'Durum')}${x.remaining_rounds==null?'':' • '+Number(x.remaining_rounds)+'r'}</span>`).join('')}</div>`:'<span class="glps-sub">Durum yok</span>'}</div>`;
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