(function(){
'use strict';
if(window.__catlakPresenceV6)return;
window.__catlakPresenceV6=true;
const S=window.__catlakSupabase,APP=document.getElementById('app');
if(!S||!APP)return;
const txt=e=>String(e?.textContent||'').trim();
const isGM=()=>txt(APP.querySelector('.role'))==='GM';
let channel=null,uid=null,myChars=[],online=new Set(),refreshBusy=false;

if(!document.getElementById('cc-presence-style')){
  const st=document.createElement('style');st.id='cc-presence-style';st.textContent=
  '.cc-online,.cc-offline{display:inline-flex;align-items:center;gap:5px;border-radius:999px;padding:4px 7px;font-size:.66rem;font-weight:900;white-space:nowrap}.cc-online{color:#a7f3c8;border:1px solid #357a58;background:#0c2b20}.cc-offline{color:#aeb8c5;border:1px solid #485563;background:#141a22}';
  document.head.appendChild(st);
}
function emit(){
  window.dispatchEvent(new CustomEvent('catlak:presence-changed',{detail:{online:[...online]}}));
}
function collect(){
  const next=new Set(),state=channel?.presenceState?.()||{};
  for(const entries of Object.values(state))for(const p of (entries||[])){
    if(p?.type!=='player')continue;
    for(const id of (Array.isArray(p.character_ids)?p.character_ids:[]))next.add(String(id));
  }
  const a=[...online].sort().join('|'),b=[...next].sort().join('|');
  online=next;if(a!==b)emit();
}
async function loadMyChars(){
  if(!uid||isGM()){myChars=[];return}
  const r=await S.from('catlak_characters').select('id').eq('owner_id',uid).eq('play_status','active');
  if(r.error)throw r.error;
  myChars=r.data||[];
}
async function track(){
  if(!channel||isGM()||!myChars.length)return;
  try{await channel.track({type:'player',user_id:uid,character_ids:myChars.map(c=>String(c.id)),online_at:new Date().toISOString()})}catch(_){}
}
async function stop(){
  if(!channel)return;
  try{await channel.untrack()}catch(_){}
  try{S.removeChannel(channel)}catch(_){}
  channel=null;online=new Set();emit();
}
async function start(force=false){
  if(refreshBusy)return;refreshBusy=true;
  try{
    const session=(await S.auth.getSession()).data?.session,nextUid=session?.user?.id||null;
    if(!nextUid){uid=null;myChars=[];await stop();return}
    if(!force&&uid===nextUid&&channel)return;
    await stop();uid=nextUid;
    await loadMyChars();
    channel=S.channel('catlak-online-presence',{config:{presence:{key:String(uid)}}});
    channel.on('presence',{event:'sync'},collect).on('presence',{event:'join'},collect).on('presence',{event:'leave'},collect);
    channel.subscribe(async status=>{if(status==='SUBSCRIBED'){await track();collect()}});
  }catch(e){console.warn('CC_PRES_START',e)}
  finally{refreshBusy=false}
}
async function refreshPlayerTracking(){
  if(!uid||isGM()||!channel)return;
  try{await loadMyChars();await track()}catch(e){console.warn('CC_PRES_TRACK',e)}
}
S.auth.onAuthStateChange(()=>setTimeout(()=>start(true),0));
S.channel('cc-presence-character-watch')
 .on('postgres_changes',{event:'*',schema:'public',table:'catlak_characters'},()=>{if(!isGM())setTimeout(refreshPlayerTracking,40)})
 .subscribe();
window.addEventListener('beforeunload',()=>{try{channel?.untrack()}catch(_){}});
window.addEventListener('pageshow',()=>start(false));
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')start(false)});
window.__catlakPresence={
  isOnline:id=>online.has(String(id)),
  onlineIds:()=>[...online],
  refresh:()=>{collect();return start(false)}
};
start(false);
})();