(function(){
'use strict';
if(window.__catlakUnifiedRollFlowV2)return;
window.__catlakUnifiedRollFlowV2=true;

const ER_S=window.__catlakSupabase;
const ER_APP=document.querySelector('#app');
if(!ER_S||!ER_APP)return;
if(window.__catlakRuntimeOwnership&&!window.__catlakRuntimeOwnership.claim('gm-roll-flow','event-rolls-patch'))return;

const erTxt=e=>String(e?.textContent||'').trim();
const erIsGM=()=>erTxt(ER_APP.querySelector('.role'))==='GM';
const erTab=()=>ER_APP.querySelector('.nav button.on[data-tab]')?.dataset.tab||'';
const erH=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const erToast=x=>{const t=document.querySelector('#toast');if(!t)return;t.textContent=String(x);t.classList.remove('hidden');clearTimeout(erToast.t);erToast.t=setTimeout(()=>t.classList.add('hidden'),4300)};
let erBusy=false,erRendering=false,erStamp='';

const erCss=`
html.cc-roll-entry-pending #app main{visibility:hidden!important}
#app main[data-er-roll-center="1"]{max-width:1420px!important;margin:0 auto!important;padding:18px 22px 32px!important}
.er-top{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}.er-top h1{margin:.12em 0 .24em}.er-top-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:flex-end}
.er-wrap{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(360px,.95fr);gap:16px;align-items:start}.er-stack{display:flex;flex-direction:column;gap:14px}.er-sub{border:1px solid var(--line);border-radius:14px;padding:14px;background:#091522}.er-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;margin-bottom:10px}.er-head h2,.er-head h3{margin:3px 0 0}.er-quick{display:grid;grid-template-columns:1fr 1fr;gap:10px}.er-roll-btn,.er-event-btn{width:100%;font-weight:950;font-size:1.18rem}.er-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}.er-chip{display:inline-flex;align-items:center;gap:5px;border:1px solid var(--line);border-radius:999px;padding:5px 8px;background:#07121d}.er-chip b{font-size:1.05rem}
.er-roll-row{display:grid;grid-template-columns:82px minmax(0,1fr);gap:12px;align-items:center;padding:11px 0;border-bottom:1px solid var(--line)}.er-roll-row:last-child{border-bottom:0}.er-total{width:68px;height:68px;display:grid;place-items:center;border:1px solid #3f6d88;border-radius:13px;background:#06111c;font-size:1.7rem;font-weight:950;color:var(--text)}.er-critical{display:inline-flex;margin-top:4px;padding:3px 7px;border-radius:999px;border:1px solid #8b3948;background:#2b1118;color:#ffb7c2;font-size:.68rem;font-weight:900}
.er-events{display:grid;grid-template-columns:1fr 1fr;gap:10px}.er-event{border:1px solid var(--line);border-radius:13px;padding:11px;background:#0b1723}.er-event h3{margin:3px 0 7px;font-size:1.55rem;color:var(--gold)}.er-rules{font-size:.8rem;color:var(--muted);line-height:1.45;min-height:58px}.er-history{display:flex;flex-direction:column;gap:8px}.er-result{border:1px solid var(--line);border-radius:12px;padding:10px;background:#07121d}.er-result-top{display:flex;justify-content:space-between;gap:10px;align-items:center}.er-result strong{font-size:1.2rem;color:var(--gold)}.er-outcome{margin-top:5px;font-weight:800}.er-empty{text-align:center;color:var(--muted);padding:18px}.er-private{font-size:.76rem;color:var(--muted);margin-top:8px}
.er-flash{position:fixed;right:18px;bottom:18px;z-index:120;min-width:250px;max-width:360px;padding:14px 16px;border:1px solid #3f6d88;border-radius:13px;background:rgba(7,18,28,.98);box-shadow:0 16px 42px rgba(0,0,0,.45);pointer-events:none}.er-flash b{display:block;font-size:.76rem;color:var(--muted);letter-spacing:.08em}.er-flash strong{display:block;margin-top:3px;font-size:2.15rem;color:var(--text)}.er-flash span{display:block;margin-top:4px;color:#8fd7ff}
@media(max-width:900px){.er-wrap{grid-template-columns:1fr}.er-events{grid-template-columns:1fr 1fr}.er-top{flex-direction:column}.er-top-actions{justify-content:flex-start}}@media(max-width:560px){.er-events,.er-quick{grid-template-columns:1fr}#app main[data-er-roll-center="1"]{padding:12px}}
`;
if(!document.querySelector('#er-style')){const st=document.createElement('style');st.id='er-style';st.textContent=erCss;document.head.appendChild(st)}

function erTime(x){try{return new Date(x).toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'})}catch{return''}}
function erDieNumber(kind){return String(kind||'').replace(/^d/i,'')}
function erEventName(kind){return ({gm_event_d6:'6',gm_event_d20:'20',gm_event_d100:'100',gm_event_d200:'200'})[kind]||'Olay'}
function erOutcomeFor(kind,n){n=Number(n);if(kind==='d6')return ['','Tehlike','Garip NPC','Canavar','Hazine','Eski Dünya kalıntısı','Tamamen saçma bir olay'][n]||'';if(kind==='d20')return n>10?'Kötü şeyler':'İyi şeyler';if(kind==='d100')return n<50?'İyi şeyler olur':'Belirsiz öğeler ve eşyalar';if(kind==='d200')return n>100?'Mitik eşya':'Konuşan silahlar';return''}
function erNavLabel(){if(!erIsGM())return;const b=ER_APP.querySelector('.nav button[data-tab="rolls"]');if(b&&b.textContent!=='Zar Akışı')b.textContent='Zar Akışı'}
function erFlash(label,data){
 ER_APP.querySelector('.er-flash')?.remove();
 const el=document.createElement('div');el.className='er-flash';
 el.innerHTML=`<b>${erH(label||'Zar')}</b><strong>${data?.total==null?'?':erH(data.total)}</strong><span>${erH(data?.dm_ruling||'')}</span>`;
 ER_APP.appendChild(el);clearTimeout(erFlash.t);erFlash.t=setTimeout(()=>el.remove(),2200);
}

function erPlayerRow(r,chars){const c=chars.find(x=>String(x.id)===String(r.character_id));const total=r.total==null?'?':r.total;return `<div class="er-roll-row"><div class="er-total">${erH(total)}</div><div><b>${erH(c?.name||r.label||'Oyuncu')}</b><br><span>${erH(r.label||r.roll_kind||'Zar')}</span><br><small class="muted">${erH(r.formula||'')} ${erTime(r.created_at)}</small>${Number(r.total)===0?'<div class="er-critical">KRİTİK BAŞARISIZLIK</div>':''}</div></div>`}
function erPrivateChips(rows,kind){const xs=rows.filter(r=>r.roll_kind===kind).slice(0,8);return xs.length?xs.map(r=>`<span class="er-chip"><b>${r.total??'?'}</b><small>${erTime(r.created_at)}</small></span>`).join(''):'<small class="muted">Henüz zar yok.</small>'}
function erEventCard(kind,title,rules){const number=erDieNumber(kind);return `<div class="er-event"><div class="eyebrow">${erH(title)}</div><h3>${erH(number)}</h3><div class="er-rules">${rules}</div><button type="button" class="primary er-event-btn" data-er-event="${kind}">🎲 ${erH(number)}</button></div>`}
function erEventResult(r){const kind=String(r.roll_kind||'').replace('gm_event_','');const result=r.dm_ruling||erOutcomeFor(kind,r.total);return `<div class="er-result"><div class="er-result-top"><b>${erH(erEventName(r.roll_kind))}</b><strong>${r.total??'?'}</strong></div><div class="er-outcome">${erH(result)}</div><small class="muted">${erTime(r.created_at)}</small></div>`}

async function erLoad(){
 const [rr,cr]=await Promise.all([
   ER_S.from('catlak_rolls').select('id,character_id,roll_kind,label,formula,dice,modifier,total,dm_ruling,created_at').order('created_at',{ascending:false}).limit(200),
   ER_S.from('catlak_characters').select('id,name')
 ]);
 if(rr.error)throw rr.error;if(cr.error)throw cr.error;
 return {rolls:rr.data||[],chars:cr.data||[]};
}
async function erRender(force=false){
 erNavLabel();
 if(!erIsGM()||erTab()!=='rolls'||erRendering)return false;
 const main=ER_APP.querySelector('main');if(!main)return false;
 if(!force&&main.dataset.erRollCenter==='1'){document.documentElement.classList.remove('cc-roll-entry-pending');return true}
 erRendering=true;
 try{
  const {rolls,chars}=await erLoad();
  if(!erIsGM()||erTab()!=='rolls'||ER_APP.querySelector('main')!==main)return false;
  const player=rolls.filter(r=>r.character_id!=null).slice(0,60);
  const priv=rolls.filter(r=>r.roll_kind==='gm_d20'||r.roll_kind==='gm_d100');
  const events=rolls.filter(r=>/^gm_event_d(6|20|100|200)$/.test(r.roll_kind)).slice(0,40);
  const stamp=[player[0]?.id||0,priv[0]?.id||0,events[0]?.id||0,player.length,priv.length,events.length].join('|');
  if(!force&&main.dataset.erRollCenter==='1'&&erStamp===stamp)return true;
  erStamp=stamp;
  const html=`<section class="card er-top"><div><div class="eyebrow">GM • ZAR AKIŞI</div><h1>Zarlar & Olaylar</h1><p class="muted">Eski zar masası düzeni korunur. Oyuncu Kağıdı zarları, GM zarları ve olay zarları aynı akışta takip edilir.</p></div><div class="er-top-actions"><span class="tag">${rolls.length} KAYIT</span><button type="button" class="danger" data-er-clear-all>Tüm Zarları Sil</button></div></section><div class="er-wrap"><div class="er-stack"><section class="card"><div class="er-head"><div><div class="eyebrow">GM ÖZEL ZARLARI</div><h2>20 & 100</h2></div></div><div class="er-quick"><div class="er-sub"><button type="button" class="primary er-roll-btn" data-er-private="d20">🎲 20</button><div class="er-chips">${erPrivateChips(priv,'gm_d20')}</div></div><div class="er-sub"><button type="button" class="primary er-roll-btn" data-er-private="d100">🎲 100</button><div class="er-chips">${erPrivateChips(priv,'gm_d100')}</div></div></div><div class="er-private">Bu sonuçlar oyunculara görünmez.</div></section><section class="card"><div class="er-head"><div><div class="eyebrow">OYUNCU ZARLARI</div><h2>Son Atışlar</h2></div></div>${player.length?player.map(r=>erPlayerRow(r,chars)).join(''):'<div class="er-empty">Henüz oyuncu zarı yok.</div>'}</section></div><section class="card"><div class="er-head"><div><div class="eyebrow">GM • OLAY ZARLARI</div><h2>Rastgele Olaylar</h2></div></div><div class="er-events">${erEventCard('d6','Yolculuk / Karşılaşma','1 Tehlike · 2 Garip NPC · 3 Canavar · 4 Hazine · 5 Eski Dünya kalıntısı · 6 Tamamen saçma bir olay')}${erEventCard('d20','İyi / Kötü Sonuç','1–10 İyi şeyler · 11–20 Kötü şeyler')}${erEventCard('d100','Belirsiz Olay / Eşya','1–49 İyi şeyler olur · 50–100 Belirsiz öğeler ve eşyalar')}${erEventCard('d200','Nadir / Özel Ödül','1–100 Konuşan silahlar · 101–200 Mitik eşya')}</div><hr><div class="eyebrow">OLAY GEÇMİŞİ</div><div class="er-history">${events.length?events.map(erEventResult).join(''):'<div class="er-empty">Henüz olay zarı atılmadı.</div>'}</div><div class="er-private">Olay sonuçları yalnız GM hesabında görünür.</div></section></div>`;
  if(!window.__catlakViewRuntime?.mount?.('gm-rolls',main,html))main.innerHTML=html;
  main.dataset.erRollCenter='1';main.dataset.ccRollFlow='1';
  document.documentElement.classList.remove('cc-roll-entry-pending');
  try{window.__catlakViewRuntime?.ready?.('gm-rolls')}catch(_){}
  return true;
 }catch(e){erToast('Zar Akışı yüklenemedi: '+(e?.message||String(e)));window.__catlakReportError?.('gm-roll-flow-render',e);try{window.__catlakViewRuntime?.ready?.('gm-rolls')}catch(_){}return false}
 finally{erRendering=false}
}

async function erPrivateRoll(kind){
 if(erBusy||!erIsGM())return;erBusy=true;
 try{const fn=kind==='d100'?'catlak_gm_roll_d100':'catlak_gm_roll_d20';const {data,error}=await ER_S.rpc(fn);if(error)throw error;erFlash('GM '+kind,data);await erRender(true)}catch(e){erToast('GM zarı atılamadı: '+(e?.message||String(e)))}finally{erBusy=false}
}
async function erEventRoll(kind){
 if(erBusy||!erIsGM())return;erBusy=true;
 try{const {data,error}=await ER_S.rpc('catlak_gm_roll_event',{p_table:kind});if(error)throw error;erFlash('Olay '+kind,data);await erRender(true)}catch(e){erToast('Olay zarı atılamadı: '+(e?.message||String(e)))}finally{erBusy=false}
}
async function erClearAll(){
 if(erBusy||!erIsGM())return;
 if(!confirm('Tüm zar kayıtları silinsin mi? Oyuncu Kağıdı dahil bütün oyuncu, GM ve olay zarları temizlenecek.'))return;
 erBusy=true;
 try{const {data,error}=await ER_S.rpc('catlak_clear_roll_log');if(error)throw error;erToast(`${Number(data)||0} zar kaydı her yerden silindi.`);await erRender(true)}catch(e){erToast('Tüm zarlar silinemedi: '+(e?.message||String(e)))}finally{erBusy=false}
}

window.addEventListener('pointerdown',e=>{
 const b=e.target?.closest?.('#app .nav [data-tab="rolls"]');
 if(b&&erIsGM()&&!b.classList.contains('on')){try{window.__catlakViewRuntime?.begin?.('gm-rolls')}catch(_){}document.documentElement.classList.add('cc-roll-entry-pending')}
},true);

document.addEventListener('click',e=>{
 const p=e.target.closest('[data-er-private]');if(p&&erIsGM()){e.preventDefault();e.stopImmediatePropagation();erPrivateRoll(p.dataset.erPrivate);return}
 const o=e.target.closest('[data-er-event]');if(o&&erIsGM()){e.preventDefault();e.stopImmediatePropagation();erEventRoll(o.dataset.erEvent);return}
 const c=e.target.closest('[data-er-clear-all]');if(c&&erIsGM()){e.preventDefault();e.stopImmediatePropagation();erClearAll();return}
 if(e.target.closest?.('.nav button[data-tab="rolls"]'))setTimeout(()=>{erNavLabel();erRender(true)},0);
},true);

new MutationObserver(rs=>{
 const nav=ER_APP.querySelector('.nav'),main=ER_APP.querySelector('main');
 const relevant=rs.some(r=>r.target===nav||r.target===main||[...r.addedNodes].some(n=>n.nodeType===1&&(n.matches?.('.nav,main')||n.querySelector?.('.nav,main'))));
 if(!relevant)return;
 erNavLabel();
 if(erTab()==='rolls'&&main?.dataset.erRollCenter!=='1'&&!erRendering)queueMicrotask(()=>erRender(false));
}).observe(ER_APP,{childList:true,subtree:true});

ER_S.channel('cc-event-rolls-live-v2').on('postgres_changes',{event:'*',schema:'public',table:'catlak_rolls'},()=>{
 const main=ER_APP.querySelector('main');if(main)main.dataset.erRollCenter='';
 if(erTab()==='rolls')setTimeout(()=>erRender(true),60);
}).subscribe();

erNavLabel();
setTimeout(()=>erRender(false),80);
window.__catlakRollFlow={render:erRender,clearAll:erClearAll,reorderNav:erNavLabel};
window.__catlakEventRollsTest={outcome:erOutcomeFor,eventName:erEventName,playerRow:erPlayerRow,dieNumber:erDieNumber};
})();