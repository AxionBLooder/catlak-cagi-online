(function(){
'use strict';
if(window.__catlakRealtimeGameSyncV1)return;
window.__catlakRealtimeGameSyncV1=true;
const S=window.__catlakSupabase;
if(!S||typeof S.channel!=='function')return;
const clientId=globalThis.crypto?.randomUUID?.()||('rt-'+Date.now()+'-'+Math.random().toString(36).slice(2));
let status='CONNECTING',pending=[];
const channel=S.channel('catlak-game-state-v1',{config:{broadcast:{self:false}}});
channel.on('broadcast',{event:'state'},msg=>{
  const detail=msg?.payload||msg||{};
  window.dispatchEvent(new CustomEvent('catlak:realtime-sync',{detail}));
});
async function flushPending(){
  if(status.toUpperCase()!=='SUBSCRIBED'||!pending.length)return;
  const queue=pending.splice(0,pending.length);
  for(const payload of queue){try{await channel.send({type:'broadcast',event:'state',payload})}catch(e){pending.unshift(payload);break}}
}
channel.subscribe(next=>{
  status=String(next||'');
  window.dispatchEvent(new CustomEvent('catlak:realtime-status',{detail:{status}}));
  if(status.toUpperCase()==='SUBSCRIBED')flushPending();
});
async function emit(kind,detail){
  const payload={
    id:globalThis.crypto?.randomUUID?.()||('msg-'+Date.now()+'-'+Math.random().toString(36).slice(2)),
    origin:clientId,kind:String(kind||'state'),at:Date.now(),
    ...(detail&&typeof detail==='object'?detail:{})
  };
  if(status.toUpperCase()!=='SUBSCRIBED'){pending.push(payload);if(pending.length>24)pending=pending.slice(-24);return null}
  try{return await channel.send({type:'broadcast',event:'state',payload})}
  catch(e){pending.push(payload);if(pending.length>24)pending=pending.slice(-24);console.warn('CATLAK_REALTIME_BROADCAST',e);return null}
}
window.__catlakRealtimeSync={emit,status:()=>status,channel:()=>channel,clientId,pending:()=>pending.length};
})();