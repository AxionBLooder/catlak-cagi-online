(function(){
'use strict';
if(window.__catlakInviteJoinRepairV1)return;
window.__catlakInviteJoinRepairV1=true;

const KEY='cc_pending_join_v1';
const DONE='cc_pending_join_done_v1';
const ENDPOINT='https://ygbereitlhjvoqgqlwfe.supabase.co/functions/v1/catlak-guest-join';
const APP=()=>document.getElementById('app');
let running=false,timer=0,lastError='',attempts=0;

function queryToken(){
  try{return new URLSearchParams(location.search).get('join')||''}catch(_){return''}
}
function pending(){
  try{return sessionStorage.getItem(KEY)||''}catch(_){return''}
}
function remember(){
  const token=queryToken();
  if(!token)return pending();
  try{sessionStorage.setItem(KEY,token);sessionStorage.removeItem(DONE)}catch(_){}
  document.documentElement.classList.add('cc-invite-join-pending');
  return token;
}
function clearPending(){
  try{sessionStorage.removeItem(KEY);sessionStorage.setItem(DONE,String(Date.now()))}catch(_){}
  document.documentElement.classList.remove('cc-invite-join-pending');
}
function toast(msg){
  const t=document.getElementById('toast');if(!t)return;
  t.textContent=String(msg);t.classList.remove('hidden');
  clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.add('hidden'),5200);
}
function role(){
  return String(APP()?.querySelector('.role')?.textContent||'').trim().toLowerCase();
}
function sheetButton(){return APP()?.querySelector('.nav [data-tab="sheet"]')||null}
function sheetReady(){
  return !!APP()?.querySelector('main .cc-character-stack section.hero,main section.hero [data-a="hp"][data-id]');
}
async function sleep(ms){return new Promise(r=>setTimeout(r,ms))}
async function runtime(){
  for(let i=0;i<160;i++){
    if(window.__catlakSupabase)return window.__catlakSupabase;
    await sleep(50);
  }
  return null;
}
async function session(S){
  try{return (await S.auth.getSession()).data?.session||null}catch(_){return null}
}
async function owned(S,userId){
  if(!userId)return[];
  const r=await S.from('catlak_characters')
    .select('id,name,owner_id,play_status,created_at')
    .eq('owner_id',userId)
    .order('created_at',{ascending:true});
  if(r.error)throw r.error;
  return r.data||[];
}
function openSheet(){
  const b=sheetButton();if(!b)return false;
  if(!b.classList.contains('on'))b.click();
  else b.classList.add('on');
  try{window.__catlakPlayerSheetBindFix?.repair?.()}catch(_){}
  try{window.__catlakLiveGameEntryGuard?.repairPlayerSheet?.()}catch(_){}
  return true;
}
async function waitForSheet(S,ses){
  const uid=ses?.user?.id;if(!uid)return false;
  for(let i=0;i<28;i++){
    let rows=[];
    try{rows=await owned(S,uid)}catch(e){lastError=e?.message||String(e)}
    if(rows.length){
      openSheet();
      for(let j=0;j<20;j++){
        if(sheetReady()){
          clearPending();
          return true;
        }
        try{window.__catlakPlayerSheetBindFix?.repair?.()}catch(_){}
        await sleep(120);
      }
      // Character ownership is the source of truth. Keep trying the sheet binder,
      // but the invite itself is already accepted and must never be re-consumed.
      clearPending();
      return true;
    }
    await sleep(i<8?180:350);
  }
  return false;
}
async function guestJoin(S,token){
  const res=await fetch(ENDPOINT,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({token})
  });
  let body={};
  try{body=await res.json()}catch(_){}
  if(!res.ok)throw new Error(body.detail||body.error||'Davet bağlantısı açılamadı.');
  if(!body.access_token||!body.refresh_token)throw new Error('Davet oturumu üretilemedi.');
  const set=await S.auth.setSession({access_token:body.access_token,refresh_token:body.refresh_token});
  if(set.error)throw set.error;
  return (await S.auth.getSession()).data?.session||set.data?.session||null;
}
async function consumeForExistingPlayer(S,ses,token){
  if(!ses?.user?.id)return null;
  const rr=await S.from('catlak_roles').select('role').eq('user_id',ses.user.id).maybeSingle();
  if(rr.error)throw rr.error;
  if(rr.data?.role==='gm')throw new Error('GM oturumunda oyuncu daveti açılamaz. Davet linkini oyuncu tarayıcısında aç.');
  const before=await owned(S,ses.user.id);
  if(before.length)return ses;
  const claim=await S.rpc('catlak_claim_character',{p_code:token});
  if(!claim.error)return ses;
  // Reconnect links may need the guest-join gateway even when an unrelated
  // player session exists. Only switch sessions after normal claim failed.
  return await guestJoin(S,token);
}
async function repair(force=false){
  const token=remember()||pending();
  if(!token)return false;
  if(running&&!force)return false;
  running=true;attempts++;
  try{
    const S=await runtime();if(!S)throw new Error('Oyuncu bağlantısı henüz hazır değil.');
    let ses=await session(S);

    // Give the native invite flow first chance to finish. This avoids double
    // consumption when browser-app.js is already processing the same token.
    for(let i=0;i<12;i++){
      if(ses?.user?.id){
        try{
          const rows=await owned(S,ses.user.id);
          if(rows.length){
            openSheet();
            const ok=await waitForSheet(S,ses);
            if(ok)return true;
          }
        }catch(_){}
      }
      await sleep(180);
      ses=await session(S);
    }

    ses=ses?.user?.id
      ? await consumeForExistingPlayer(S,ses,token)
      : await guestJoin(S,token);

    if(!ses?.user?.id)throw new Error('Oyuncu oturumu kurulamadı.');
    const ok=await waitForSheet(S,ses);
    if(!ok)throw new Error('Karakter daveti kabul edildi ancak karakter kağıdı henüz yüklenemedi. Sayfayı yenilemeden birkaç saniye bekle.');
    return true;
  }catch(e){
    lastError=e?.message||String(e);
    console.warn('CATLAK_INVITE_JOIN_REPAIR',lastError);
    // Invalid/expired links should not destroy the current site state and
    // should not erase the token silently.
    if(attempts>=2)toast(lastError);
    return false;
  }finally{
    running=false;
  }
}
function schedule(ms=0){
  clearTimeout(timer);
  timer=setTimeout(()=>repair(false),Math.max(0,ms));
}

remember();
window.addEventListener('catlak:data-refreshed',()=>{if(pending())schedule(30)});
window.addEventListener('load',()=>{if(pending()){schedule(500);setTimeout(()=>schedule(0),1800);setTimeout(()=>schedule(0),4200)}});
setTimeout(()=>{if(pending())schedule(0)},800);
setTimeout(()=>{if(pending())schedule(0)},2600);
setTimeout(()=>{if(pending())schedule(0)},6500);

window.__catlakInviteJoinRepair={
  repair:()=>repair(true),
  pending:()=>!!pending(),
  token:()=>pending(),
  clear:clearPending,
  lastError:()=>lastError,
  openSheet
};
})();