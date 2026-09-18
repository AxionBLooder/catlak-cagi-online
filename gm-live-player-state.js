(function(){
'use strict';
if(window.__catlakGmLivePlayerStateV2)return;
window.__catlakGmLivePlayerStateV2=true;
const APP=document.getElementById('app'),S=window.__catlakSupabase;if(!APP||!S)return;
const txt=e=>String(e?.textContent||'').trim();
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const isGM=()=>txt(APP.querySelector('.role'))==='GM';
const active=()=>isGM()&&APP.querySelector('.nav [data-tab="gm"].on');
let busy=false,timer=0,last='';

if(!document.getElementById('glps-style')){
 const st=document.createElement('style');st.id='glps-style';st.textContent=`
 #app .cc-simple-player .glps-state{display:block;margin-top:4px;font-size:.76rem;color:#b9c9d6}
 #app .cc-simple-player .glps-hp{font-weight:900;color:#edf6ff}
 #app .cc-simple-player .glps-conds{display:flex;gap:4px;flex-wrap:wrap;margin-top:5px}
 #app .cc-simple-player .glps-cond{display:inline-flex;border:1px solid #4b6174;border-radius:999px;padding:2px 6px;font-size:.66rem;color:#ffd08a;background:#0b1824}
 `;document.head.appendChild(st)
}
async function load(){
 const [cr,kr,br]=await Promise.all([
  S.from('catlak_characters').select('id,name,hp_current,hp_max,base_ac,play_status').eq('play_status','active').order('created_at',{ascending:true}),
  S.from('catlak_character_conditions').select('id,character_id,name,remaining_rounds,note,active').eq('active',true).order('created_at',{ascending:true}),
  S.from('catlak_combatants').select('id,character_id,kind,hp_current,hp_max').eq('kind','player')
 ]);
 for(const r of [cr,kr,br])if(r.error)throw r.error;
 return {chars:cr.data||[],conds:kr.data||[],combatants:br.data||[]};
}
function paint(d){
 if(!active())return false;
 const cards=[...APP.querySelectorAll('main[data-cc-simple-live="1"] .cc-simple-player')];
 if(!cards.length)return false;
 const byName=new Map(d.chars.map(c=>[String(c.name||'').trim().toLocaleLowerCase('tr-TR'),c]));
 for(const card of cards){
  const name=txt(card.querySelector('b')),c=byName.get(name.toLocaleLowerCase('tr-TR'));if(!c)continue;
  let box=card.querySelector('.glps-state');if(!box){box=document.createElement('div');box.className='glps-state';card.appendChild(box)}
  const cs=d.conds.filter(x=>String(x.character_id)===String(c.id)),combat=d.combatants.find(x=>String(x.character_id||'')===String(c.id));
  const hpCur=combat?.hp_current!=null?Number(combat.hp_current):Number(c.hp_current||0),hpMax=combat?.hp_max!=null?Number(combat.hp_max):Number(c.hp_max||0);
  box.innerHTML=`<span class="glps-hp">HP ${hpCur}/${hpMax}</span> • AC ${Number(c.base_ac||0)}${cs.length?`<div class="glps-conds">${cs.map(x=>`<span class="glps-cond">${esc(x.name||'Durum')}${x.remaining_rounds==null?'':' • '+Number(x.remaining_rounds)+'r'}</span>`).join('')}</div>`:''}`;
 }
 return true;
}
async function refresh(force=false){
 if(!active()||busy)return false;busy=true;
 try{const d=await load();const sig=JSON.stringify([d.chars.map(c=>[c.id,c.hp_current,c.hp_max,c.base_ac]),d.conds.map(c=>[c.id,c.character_id,c.name,c.remaining_rounds,c.active]),d.combatants.map(c=>[c.id,c.character_id,c.hp_current,c.hp_max])]);if(force||sig!==last){last=sig;paint(d)}return true}catch(e){console.warn('GLPS_REFRESH',e);return false}finally{busy=false}
}
function schedule(ms=30){clearTimeout(timer);timer=setTimeout(()=>refresh(true),ms)}
new MutationObserver(()=>{if(active())schedule(70)}).observe(APP,{childList:true,subtree:true});
S.channel('cc-gm-live-player-state-v1')
 .on('postgres_changes',{event:'*',schema:'public',table:'catlak_characters'},()=>schedule(20))
 .on('postgres_changes',{event:'*',schema:'public',table:'catlak_character_conditions'},()=>schedule(20))
 .on('postgres_changes',{event:'*',schema:'public',table:'catlak_combatants'},()=>schedule(20))
 .subscribe();
setInterval(()=>{if(active())refresh(false)},1200);
setTimeout(()=>schedule(0),180);
window.__catlakGmLivePlayerState={refresh,schedule,paint};
})();