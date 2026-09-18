(function(){
'use strict';
if(window.__catlakUnifiedRollFlowV1)return;
window.__catlakUnifiedRollFlowV1=true;

const S=window.__catlakSupabase,APP=document.getElementById('app');
if(!S||!APP)return;
if(window.__catlakRuntimeOwnership&&!window.__catlakRuntimeOwnership.claim('gm-roll-flow','event-rolls-patch'))return;

const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const txt=e=>String(e?.textContent||'').trim();
const isGM=()=>txt(APP.querySelector('.role'))==='GM';
const active=()=>!!APP.querySelector('.nav [data-tab="rolls"].on');
const toast=m=>{const t=document.querySelector('#toast');if(!t)return;t.textContent=String(m);t.classList.remove('hidden');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.add('hidden'),4200)};
const time=x=>{try{return new Date(x).toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}catch{return''}};
const signed=x=>Number(x)>0?'+'+Number(x):Number(x)<0?String(Number(x)):'';
let busy=false,rendering=false,queued=false,cache=null,cacheAt=0;

if(!document.getElementById('cc-unified-roll-style')){
 const st=document.createElement('style');st.id='cc-unified-roll-style';st.textContent=`
 html.cc-roll-entry-pending #app main{visibility:hidden!important}
 #app main[data-cc-roll-flow="1"]{max-width:1380px!important;margin:0 auto!important;padding:18px 22px 32px!important}
 .ccrf-hero{display:flex;align-items:flex-start;justify-content:space-between;gap:18px}
 .ccrf-hero h1{margin:.12em 0 .2em}.ccrf-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}
 .ccrf-quick{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
 .ccrf-feed{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:14px}
 .ccrf-roll{display:grid;grid-template-columns:96px minmax(0,1fr);gap:15px;align-items:center;padding:15px;border:1px solid var(--line);border-radius:16px;background:linear-gradient(135deg,#091522,#07101b)}
 .ccrf-total{width:82px;height:82px;display:grid;place-items:center;border:1px solid #3f6d88;border-radius:15px;background:#06111c;font-size:2.15rem;font-weight:950;color:var(--text);box-shadow:inset 0 0 0 1px rgba(143,215,255,.05)}
 .ccrf-meta{min-width:0}.ccrf-meta h3{margin:2px 0 4px;font-size:1.05rem}.ccrf-meta p{margin:0;color:var(--muted);font-size:.84rem}.ccrf-label{color:#8fd7ff!important;font-weight:800!important}
 .ccrf-tag{display:inline-flex;padding:3px 7px;border:1px solid var(--line);border-radius:999px;font-size:.65rem;font-weight:900;letter-spacing:.08em;color:var(--muted)}
 .ccrf-event{border-color:#6b5930}.ccrf-event .ccrf-total{border-color:#806934;color:var(--gold)}
 .ccrf-gm{border-color:#394c69}.ccrf-player{border-color:#31516e}
 .ccrf-flash{position:fixed;right:18px;bottom:18px;z-index:120;min-width:240px;max-width:360px;padding:14px 16px;border:1px solid #3f6d88;border-radius:13px;background:rgba(7,18,28,.97);box-shadow:0 16px 42px rgba(0,0,0,.42);pointer-events:none}
 .ccrf-flash b{display:block;font-size:.78rem;color:var(--muted);letter-spacing:.07em}.ccrf-flash strong{display:block;margin-top:3px;font-size:2rem;color:var(--text)}.ccrf-flash span{display:block;margin-top:3px;color:#8fd7ff}
 .ccrf-empty{padding:32px;border:1px dashed var(--line);border-radius:15px;text-align:center;color:var(--muted)}
 @media(max-width:900px){.ccrf-feed{grid-template-columns:1fr}.ccrf-hero{flex-direction:column}.ccrf-actions{justify-content:flex-start}}
 @media(max-width:520px){#app main[data-cc-roll-flow="1"]{padding:12px}.ccrf-roll{grid-template-columns:72px 1fr}.ccrf-total{width:64px;height:64px;font-size:1.75rem}}
 `;document.head.appendChild(st)
}

function showFlash(label,data){
 APP.querySelector('.ccrf-flash')?.remove();
 const box=document.createElement('div');box.className='ccrf-flash';
 box.innerHTML=`<b>${esc(label||'Zar')}</b><strong>${data?.total==null?'?':esc(data.total)}</strong><span>${esc(data?.dm_ruling||'')}</span>`;
 APP.appendChild(box);clearTimeout(showFlash.t);showFlash.t=setTimeout(()=>box.remove(),2200);
}
function source(r){
 const kind=String(r.roll_kind||'');
 if(r.character_id!=null)return['OYUNCU','player'];
 if(/^gm_event_d/i.test(kind))return['OLAY','event'];
 return['GM','gm'];
}
function eventName(kind){
 return ({gm_event_d6:'Olay d6',gm_event_d20:'Olay d20',gm_event_d100:'Olay d100',gm_event_d200:'Olay d200',gm_d20:'GM d20',gm_d100:'GM d100'})[kind]||kind||'Zar';
}
function row(r,names){
 const [tag,cls]=source(r),name=r.character_id!=null?(names.get(String(r.character_id))||r.label||'Oyuncu'):'GM';
 const label=r.label||eventName(r.roll_kind),detail=[r.formula||'',r.modifier?signed(r.modifier):'',time(r.created_at)].filter(Boolean).join(' • ');
 const ruling=r.dm_ruling?'<p class="gold">'+esc(r.dm_ruling)+'</p>':'';
 return `<article class="ccrf-roll ccrf-${cls}" data-ccrf-roll="${esc(r.id)}"><div class="ccrf-total">${r.total==null?'?':esc(r.total)}</div><div class="ccrf-meta"><span class="ccrf-tag">${tag}</span><h3>${esc(name)}</h3><p class="ccrf-label">${esc(label)}</p><p>${esc(detail)}</p>${ruling}</div></article>`;
}
async function load(force=false){
 if(!force&&cache&&Date.now()-cacheAt<2200)return cache;
 const [rr,cr]=await Promise.all([
  S.from('catlak_rolls').select('id,character_id,roll_kind,label,formula,dice,modifier,total,dm_ruling,created_at').order('created_at',{ascending:false}).limit(200),
  S.from('catlak_characters').select('id,name')
 ]);
 if(rr.error)throw rr.error;if(cr.error)throw cr.error;
 cache={rolls:rr.data||[],names:new Map((cr.data||[]).map(c=>[String(c.id),c.name]))};cacheAt=Date.now();return cache;
}
function reorderNav(){
 if(!isGM())return;
 const nav=APP.querySelector('.nav'),live=nav?.querySelector('[data-tab="gm"]'),rolls=nav?.querySelector('[data-tab="rolls"]');
 if(!nav||!live||!rolls)return;
 rolls.textContent='Zar Akışı';
 if(live.nextElementSibling!==rolls)live.after(rolls);
}
async function render(force=false){
 reorderNav();
 if(!isGM()||!active()||rendering)return false;
 const main=APP.querySelector('main');if(!main)return false;
 if(!force&&main.dataset.ccRollFlow==='1'){document.documentElement.classList.remove('cc-roll-entry-pending');return true}
 rendering=true;
 try{
  const d=await load(force);
  if(!isGM()||!active()||APP.querySelector('main')!==main)return false;
  main.innerHTML=`<section class="card ccrf-hero"><div><div class="eyebrow">GM • ZAR AKIŞI</div><h1>Tüm Zarlar</h1><p class="muted">Oyuncu Kağıdı, GM zarları ve olay zarları tek kronolojik akışta görünür.</p><div class="ccrf-quick"><button type="button" data-ccrf-private="d20">🎲 GM d20</button><button type="button" data-ccrf-private="d100">🎲 GM d100</button><button type="button" data-ccrf-event="d6">Olay d6</button><button type="button" data-ccrf-event="d20">Olay d20</button><button type="button" data-ccrf-event="d100">Olay d100</button><button type="button" data-ccrf-event="d200">Olay d200</button></div></div><div class="ccrf-actions"><span class="tag">${d.rolls.length} KAYIT</span><button type="button" class="danger" data-ccrf-clear-all>Tüm Zarları Sil</button></div></section><section class="card"><div class="eyebrow">AKIŞ</div>${d.rolls.length?'<div class="ccrf-feed">'+d.rolls.map(r=>row(r,d.names)).join('')+'</div>':'<div class="ccrf-empty">Henüz zar atılmadı.</div>'}</section>`;
  main.dataset.ccRollFlow='1';
  document.documentElement.classList.remove('cc-roll-entry-pending');
  return true;
 }catch(e){toast('Zar Akışı yüklenemedi: '+(e?.message||String(e)));window.__catlakReportError?.('gm-roll-flow-render',e);return false}
 finally{rendering=false}
}
async function privateRoll(kind){
 if(busy)return;busy=true;
 try{const fn=kind==='d100'?'catlak_gm_roll_d100':'catlak_gm_roll_d20',r=await S.rpc(fn);if(r.error)throw r.error;showFlash('GM '+kind,r.data);cacheAt=0;await render(true)}
 catch(e){toast('GM zarı atılamadı: '+(e?.message||String(e)))}finally{busy=false}
}
async function eventRoll(kind){
 if(busy)return;busy=true;
 try{const r=await S.rpc('catlak_gm_roll_event',{p_table:kind});if(r.error)throw r.error;showFlash('Olay '+kind,r.data);cacheAt=0;await render(true)}
 catch(e){toast('Olay zarı atılamadı: '+(e?.message||String(e)))}finally{busy=false}
}
async function clearAll(){
 if(busy||!confirm('Tüm zar kayıtları silinsin mi? Oyuncu Kağıdı dahil bütün oyuncu, GM ve olay zarları temizlenecek.'))return;
 busy=true;
 try{
  const r=await S.rpc('catlak_clear_roll_log');if(r.error)throw r.error;
  cache={rolls:[],names:cache?.names||new Map()};cacheAt=Date.now();
  toast((Number(r.data)||0)+' zar kaydı her yerden silindi.');
  await render(true);
 }catch(e){toast('Tüm zarlar silinemedi: '+(e?.message||String(e)))}finally{busy=false}
}

window.addEventListener('pointerdown',e=>{
 const b=e.target?.closest?.('#app .nav [data-tab="rolls"]');
 if(b&&isGM()&&!b.classList.contains('on'))document.documentElement.classList.add('cc-roll-entry-pending');
},true);
document.addEventListener('click',e=>{
 const p=e.target.closest?.('[data-ccrf-private]');if(p&&isGM()){e.preventDefault();e.stopImmediatePropagation();privateRoll(p.dataset.ccrfPrivate);return}
 const v=e.target.closest?.('[data-ccrf-event]');if(v&&isGM()){e.preventDefault();e.stopImmediatePropagation();eventRoll(v.dataset.ccrfEvent);return}
 const c=e.target.closest?.('[data-ccrf-clear-all]');if(c&&isGM()){e.preventDefault();e.stopImmediatePropagation();clearAll();return}
 if(e.target.closest?.('#app .nav [data-tab="rolls"]'))setTimeout(()=>render(true),0);
},true);

new MutationObserver(rs=>{
 const nav=APP.querySelector('.nav'),main=APP.querySelector('main');
 const relevant=rs.some(r=>r.target===nav||r.target===main||[...r.addedNodes].some(n=>n.nodeType===1&&(n.matches?.('.nav,main')||n.querySelector?.('.nav,main'))));
 if(!relevant)return;
 reorderNav();
 if(active()&&main?.dataset.ccRollFlow!=='1'&&!rendering)queueMicrotask(()=>render(false));
}).observe(APP,{childList:true,subtree:true});

S.channel('cc-unified-roll-flow').on('postgres_changes',{event:'*',schema:'public',table:'catlak_rolls'},()=>{
 cacheAt=0;if(active()){if(queued)return;queued=true;setTimeout(()=>{queued=false;render(true)},55)}
}).subscribe();

reorderNav();
setTimeout(()=>{reorderNav();render(false)},80);
window.__catlakRollFlow={render,clearAll,reorderNav};
})();