(function(){
'use strict';
if(window.__catlakSessionLogDeleteFixV1)return;
window.__catlakSessionLogDeleteFixV1=true;
const APP=document.querySelector('#app');
const S=window.__catlakSupabase;
if(!APP||!S)return;
const txt=e=>String(e?.textContent||'').trim();
const isGM=()=>txt(APP.querySelector('.role'))==='GM';
const toast=m=>{const t=document.querySelector('#toast');if(!t)return;t.textContent=String(m);t.classList.remove('hidden');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.add('hidden'),3800)};
let busy=false,timer=0;

if(!document.querySelector('#sldf-style')){const st=document.createElement('style');st.id='sldf-style';st.textContent=`
#app .gmt-log{position:relative;padding-right:72px}.sldf-delete{position:absolute;right:0;top:8px}.sldf-busy{opacity:.55;pointer-events:none}
`;document.head.appendChild(st)}
function logsOpen(){const m=APP.querySelector('main');return isGM()&&(m?.dataset.gmtSub==='logs'||String(window.__catlakGmCenterSelectedRoute||'')==='logs')&&!!m?.querySelector('.gmt-log, [data-gmt-log-clear]')}
async function rows(limit=120){const r=await S.from('catlak_session_log').select('id,kind,message,created_at').order('created_at',{ascending:false}).limit(limit);if(r.error)throw r.error;return r.data||[]}
async function enhance(){
 if(!logsOpen()||busy)return;const nodes=[...APP.querySelectorAll('main .gmt-log')];if(!nodes.length||nodes.every(x=>x.querySelector('[data-sldf-delete]')))return;
 try{const data=await rows(Math.max(120,nodes.length));if(!logsOpen())return;nodes.forEach((n,i)=>{const r=data[i];if(!r||n.querySelector('[data-sldf-delete]'))return;n.dataset.sldfId=String(r.id);const b=document.createElement('button');b.type='button';b.className='danger small sldf-delete';b.dataset.sldfDelete=String(r.id);b.textContent='Sil';n.appendChild(b)})}catch(e){console.warn('SLDF enhance',e)}
}
function schedule(ms=60){clearTimeout(timer);timer=setTimeout(enhance,ms)}
async function refresh(){try{await window.__catlakGmTools?.render?.(true)}catch(_){ }schedule(80)}
async function deleteOne(id){
 if(busy)return;busy=true;APP.querySelector('main')?.classList.add('sldf-busy');
 try{
  const d=await S.from('catlak_session_log').delete().eq('id',id).select('id');if(d.error)throw d.error;
  const v=await S.from('catlak_session_log').select('id').eq('id',id).limit(1);if(v.error)throw v.error;if((v.data||[]).length)throw new Error('Kayıt veritabanından silinmedi. Yetki/politika işlemi engelliyor.');
  APP.querySelector(`[data-sldf-id="${CSS.escape(String(id))}"]`)?.remove();toast('Günlük kaydı silindi.');await refresh();
 }finally{busy=false;APP.querySelector('main')?.classList.remove('sldf-busy')}
}
async function directClear(){
 let total=0;
 for(let i=0;i<8;i++){
  const batch=await rows(200);if(!batch.length)break;
  const ids=batch.map(x=>x.id);const d=await S.from('catlak_session_log').delete().in('id',ids).select('id');if(d.error)throw d.error;total+=(d.data||[]).length;
  if(!(d.data||[]).length)break;
 }
 return total;
}
async function clearAll(){
 if(busy)return;busy=true;APP.querySelector('main')?.classList.add('sldf-busy');
 try{
  const before=await rows(200);let reported=0;
  const r=await S.rpc('catlak_gm_clear_session_log',{});if(!r.error)reported=Number(r.data||0);
  let check=await S.from('catlak_session_log').select('id').limit(1);if(check.error)throw check.error;
  if((check.data||[]).length){const fallback=await directClear();reported=Math.max(reported,fallback,before.length)}
  check=await S.from('catlak_session_log').select('id').limit(1);if(check.error)throw check.error;if((check.data||[]).length)throw new Error('Günlük tamamen temizlenemedi.');
  toast(`${reported||before.length||0} günlük kaydı temizlendi.`);await refresh();
 }finally{busy=false;APP.querySelector('main')?.classList.remove('sldf-busy')}
}
function stop(e){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation()}
window.addEventListener('click',e=>{
 if(!isGM())return;
 const d=e.target?.closest?.('[data-sldf-delete]');if(d){stop(e);if(confirm('Bu günlük kaydı silinsin mi?'))deleteOne(d.dataset.sldfDelete).catch(x=>toast('Silinemedi: '+(x?.message||String(x))));return}
 const c=e.target?.closest?.('[data-gmt-log-clear]');if(c){stop(e);if(confirm('Oturum günlüğü tamamen temizlensin mi?'))clearAll().catch(x=>toast('Günlük temizlenemedi: '+(x?.message||String(x))));return}
},true);
new MutationObserver(()=>schedule(70)).observe(APP,{childList:true,subtree:true});
S.channel('sldf-session-log').on('postgres_changes',{event:'*',schema:'public',table:'catlak_session_log'},()=>schedule(100)).subscribe();
setTimeout(()=>schedule(0),600);
window.__catlakSessionLogDeleteFix={enhance,clearAll,deleteOne};
})();