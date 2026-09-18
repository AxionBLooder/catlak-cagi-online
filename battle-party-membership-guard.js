(function(){
'use strict';
if(window.__catlakBattlePartyGuardV2)return;
window.__catlakBattlePartyGuardV2=true;
const APP=document.querySelector('#app');
const S=window.__catlakSupabase;
if(!APP||!S)return;
const PKEY='cc_party_member',BKEY='cc_battle_member';
const txt=e=>String(e?.textContent||'').trim();
const isGM=()=>txt(APP.querySelector('.role'))==='GM';
const toast=m=>{const t=document.querySelector('#toast');if(!t)return;t.textContent=String(m);t.classList.remove('hidden');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.add('hidden'),3600)};
let eligible=new Set(),loaded=false,busy=false,queued=false,timer=0;

function cardParty(btn){const c=btn?.closest?.('.pptf-card,.prh-card');if(!c)return false;return c.classList.contains('party')||[...c.querySelectorAll('.pptf-flag,.prh-flag')].some(x=>/PARTİDE/i.test(txt(x)))}
function normalizeUi(){
 if(!isGM())return;
 APP.querySelectorAll('[data-pptf-battle],[data-prh-set-battle]').forEach(b=>{
  const adding=String(b.dataset.v||'')==='1',party=cardParty(b);
  if(adding&&!party){b.disabled=true;b.dataset.bpguard='1';b.title='Önce karakteri partiye al.';b.textContent='Önce Partiye Al'}
  else if(b.dataset.bpguard==='1'){b.disabled=false;delete b.dataset.bpguard;b.removeAttribute('title');if(String(b.dataset.v||'')==='1')b.textContent='Savaş Odasına Al'}
 });
 if(loaded){
  for(const sel of APP.querySelectorAll('#lcc-add-char,#gmt-add-char')){
   [...sel.options].forEach(o=>{if(o.value&&!eligible.has(String(o.value)))o.remove()});
   if(!sel.options.length){const o=document.createElement('option');o.value='';o.textContent='Uygun parti üyesi yok';sel.appendChild(o)}
  }
 }
}
async function removeCombatant(id){const r=await S.rpc('catlak_gm_combat_remove',{p_combatant_id:id});if(r.error)throw r.error}
async function addCharacter(id){const r=await S.rpc('catlak_gm_combat_add_character',{p_character_id:id,p_initiative:null});if(r.error)throw r.error}
async function reconcile(){
 if(!isGM()||busy){queued=true;return}busy=true;queued=false;
 try{
  const [cr,br,sr]=await Promise.all([
   S.from('catlak_characters').select('id,name,data,play_status').in('play_status',['prepared','active']).order('created_at',{ascending:true}),
   S.from('catlak_combatants').select('id,character_id,kind'),
   S.from('catlak_combat_state').select('active').eq('id',1).maybeSingle()
  ]);for(const r of[cr,br,sr])if(r.error)throw r.error;
  const chars=cr.data||[],combatants=br.data||[];
  for(const c of chars){if(c.data?.[BKEY]===true&&c.data?.[PKEY]!==true){const data={...(c.data||{}),[BKEY]:false};const u=await S.from('catlak_characters').update({data}).eq('id',c.id).select('id');if(u.error)throw u.error;c.data=data}}
  eligible=new Set(chars.filter(c=>c.play_status==='active'&&c.data?.[PKEY]===true).map(c=>String(c.id)));loaded=true;
  if(sr.data?.active){
   const existing=new Map();
   for(const x of combatants){if(x.kind==='player'&&x.character_id){existing.set(String(x.character_id),x);if(!eligible.has(String(x.character_id)))await removeCombatant(x.id)}}
   for(const id of eligible){if(!existing.has(id))await addCharacter(id)}
  }
  normalizeUi();
 }catch(e){console.warn('BATTLE_PARTY_GUARD',e);toast('Parti / savaş katılımı eşitlenemedi: '+(e?.message||String(e)))}finally{busy=false;if(queued)schedule(180)}
}
function schedule(ms=220){clearTimeout(timer);timer=setTimeout(reconcile,ms)}
function block(e,msg){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();toast(msg)}

window.addEventListener('click',e=>{
 if(!isGM())return;
 const b=e.target?.closest?.('[data-pptf-battle],[data-prh-set-battle]');
 if(b&&String(b.dataset.v||'')==='1'&&!cardParty(b)){block(e,'Önce karakteri partiye al. Parti dışında olan karakter savaşa eklenemez.');return}
 const add=e.target?.closest?.('[data-lcc-add-char],[data-gmt-add-char]');
 if(add&&loaded){const sel=add.matches('[data-lcc-add-char]')?APP.querySelector('#lcc-add-char'):APP.querySelector('#gmt-add-char'),id=String(sel?.value||'');if(id&&!eligible.has(id)){block(e,'Bu karakter aktif partide değil.');return}}
 const party=e.target?.closest?.('[data-pptf-party],[data-prh-set-party]');if(party&&String(party.dataset.v||'')==='0')schedule(420);
 if(b||add||e.target?.closest?.('[data-lcc-start],[data-gmt-combat-start]'))schedule(120);
},true);

new MutationObserver(()=>{normalizeUi()}).observe(APP,{childList:true,subtree:true});
S.channel('battle-party-guard')
 .on('postgres_changes',{event:'*',schema:'public',table:'catlak_characters'},()=>schedule(420))
 .on('postgres_changes',{event:'*',schema:'public',table:'catlak_combatants'},()=>schedule(260))
 .on('postgres_changes',{event:'*',schema:'public',table:'catlak_combat_state'},()=>schedule(320))
 .subscribe();
setTimeout(()=>schedule(0),450);
window.__catlakBattlePartyGuard={reconcile,eligible:()=>new Set(eligible)};
})();