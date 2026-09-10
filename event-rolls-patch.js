const ER_S=window.__catlakSupabase;
const ER_APP=document.querySelector('#app');
if(!ER_S||!ER_APP)throw new Error('Çatlak Çağı olay zarları katmanı başlatılamadı.');

const erTxt=e=>String(e?.textContent||'').trim();
const erIsGM=()=>erTxt(ER_APP.querySelector('.role'))==='GM';
const erTab=()=>ER_APP.querySelector('.nav button.on[data-tab]')?.dataset.tab||'';
const erH=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const erToast=x=>{const t=document.querySelector('#toast');if(!t)return;t.textContent=String(x);t.classList.remove('hidden');clearTimeout(erToast.t);erToast.t=setTimeout(()=>t.classList.add('hidden'),4300)};
let erBusy=false,erRendering=false,erStamp='';

const erCss=`
.er-wrap{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(360px,.95fr);gap:16px;align-items:start}.er-stack{display:flex;flex-direction:column;gap:14px}.er-sub{border:1px solid var(--line);border-radius:14px;padding:14px;background:#091522}.er-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;margin-bottom:10px}.er-head h2,.er-head h3{margin:3px 0 0}.er-quick{display:grid;grid-template-columns:1fr 1fr;gap:10px}.er-roll-btn,.er-event-btn{width:100%;font-weight:900}.er-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}.er-chip{display:inline-flex;align-items:center;gap:5px;border:1px solid var(--line);border-radius:999px;padding:5px 8px;background:#07121d}.er-chip b{font-size:1.05rem}.er-roll-row{display:grid;grid-template-columns:58px minmax(0,1fr);gap:10px;align-items:center;padding:9px 0;border-bottom:1px solid var(--line)}.er-roll-row:last-child{border-bottom:0}.er-total{font-size:1.35rem;font-weight:900;color:var(--gold);text-align:center}.er-critical{display:inline-flex;margin-top:4px;padding:3px 7px;border-radius:999px;border:1px solid #8b3948;background:#2b1118;color:#ffb7c2;font-size:.68rem;font-weight:900}.er-events{display:grid;grid-template-columns:1fr 1fr;gap:10px}.er-event{border:1px solid var(--line);border-radius:13px;padding:11px;background:#0b1723}.er-event h3{margin:3px 0 7px}.er-rules{font-size:.8rem;color:var(--muted);line-height:1.45;min-height:58px}.er-history{display:flex;flex-direction:column;gap:8px}.er-result{border:1px solid var(--line);border-radius:12px;padding:10px;background:#07121d}.er-result-top{display:flex;justify-content:space-between;gap:10px;align-items:center}.er-result strong{font-size:1.2rem;color:var(--gold)}.er-outcome{margin-top:5px;font-weight:800}.er-empty{text-align:center;color:var(--muted);padding:18px}.er-private{font-size:.76rem;color:var(--muted);margin-top:8px}
@media(max-width:900px){.er-wrap{grid-template-columns:1fr}.er-events{grid-template-columns:1fr 1fr}}@media(max-width:560px){.er-events,.er-quick{grid-template-columns:1fr}}
`;
if(!document.querySelector('#er-style')){const s=document.createElement('style');s.id='er-style';s.textContent=erCss;document.head.appendChild(s)}

function erTime(x){try{return new Date(x).toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'})}catch{return''}}
function erEventName(kind){return ({gm_event_d6:'d6',gm_event_d20:'d20',gm_event_d100:'d100',gm_event_d200:'d200'})[kind]||'Olay'}
function erOutcomeFor(kind,n){n=Number(n);if(kind==='d6')return ['','Tehlike','Garip NPC','Canavar','Hazine','Eski Dünya kalıntısı','Tamamen saçma bir olay'][n]||'';if(kind==='d20')return n>10?'Kötü şeyler':'İyi şeyler';if(kind==='d100')return n<50?'İyi şeyler olur':'Belirsiz öğeler ve eşyalar';if(kind==='d200')return n>100?'Mitik eşya':'Konuşan silahlar';return''}

function erPlayerRow(r,chars){const c=chars.find(x=>x.id===r.character_id);const total=r.total==null?'?':r.total;return `<div class="er-roll-row"><div class="er-total">${total}</div><div><b>${erH(c?.name||r.label||'Oyuncu')}</b><br><span>${erH(r.label||r.roll_kind||'Zar')}</span><br><small class="muted">${erH(r.formula||'')} ${erTime(r.created_at)}</small>${Number(r.total)===0?'<div class="er-critical">KRİTİK BAŞARISIZLIK</div>':''}</div></div>`}
function erPrivateChips(rows,kind){const xs=rows.filter(r=>r.roll_kind===kind).slice(0,8);return xs.length?xs.map(r=>`<span class="er-chip"><b>${r.total??'?'}</b><small>${erTime(r.created_at)}</small></span>`).join(''):'<small class="muted">Henüz zar yok.</small>'}
function erEventCard(kind,title,rules){return `<div class="er-event"><div class="eyebrow">${erH(title)}</div><h3>${erH(kind.toUpperCase())}</h3><div class="er-rules">${rules}</div><button type="button" class="primary er-event-btn" data-er-event="${kind}">🎲 ${erH(kind)} At</button></div>`}
function erEventResult(r){const kind=String(r.roll_kind||'').replace('gm_event_','');const result=r.dm_ruling||erOutcomeFor(kind,r.total);return `<div class="er-result"><div class="er-result-top"><b>${erH(erEventName(r.roll_kind))}</b><strong>${r.total??'?'}</strong></div><div class="er-outcome">${erH(result)}</div><small class="muted">${erTime(r.created_at)}</small></div>`}

async function erLoad(){
  const [rr,cr]=await Promise.all([
    ER_S.from('catlak_rolls').select('id,character_id,roll_kind,label,formula,dice,modifier,total,dm_ruling,created_at').order('created_at',{ascending:false}).limit(180),
    ER_S.from('catlak_characters').select('id,name').eq('play_status','active')
  ]);
  if(rr.error)throw rr.error;if(cr.error)throw cr.error;
  return {rolls:rr.data||[],chars:cr.data||[]};
}
async function erRender(force=false){
  if(!erIsGM()||erTab()!=='rolls'||erRendering)return;
  const main=ER_APP.querySelector('main');if(!main)return;
  if(!force&&main.dataset.erRollCenter==='1')return;
  erRendering=true;
  try{
    const {rolls,chars}=await erLoad();
    if(!erIsGM()||erTab()!=='rolls'||ER_APP.querySelector('main')!==main)return;
    const player=rolls.filter(r=>r.character_id!=null).slice(0,40);
    const priv=rolls.filter(r=>r.roll_kind==='gm_d20'||r.roll_kind==='gm_d100');
    const events=rolls.filter(r=>/^gm_event_d(6|20|100|200)$/.test(r.roll_kind)).slice(0,30);
    const stamp=[player[0]?.id||0,priv[0]?.id||0,events[0]?.id||0,player.length,priv.length,events.length].join('|');
    if(!force&&main.dataset.erRollCenter==='1'&&erStamp===stamp)return;
    erStamp=stamp;
    main.innerHTML=`<section class="card"><div class="eyebrow">GM • ZAR AKIŞI</div><h1>Zarlar & Olaylar</h1><p class="muted">Solda zarlar, sağda yalnız GM'nin görebildiği olay tabloları bulunur.</p></section><div class="er-wrap"><div class="er-stack"><section class="card"><div class="er-head"><div><div class="eyebrow">GM ÖZEL ZARLARI</div><h2>d20 & d100</h2></div><button type="button" class="danger small" data-er-clear="private">GM Zarlarını Temizle</button></div><div class="er-quick"><div class="er-sub"><button type="button" class="primary er-roll-btn" data-er-private="d20">🎲 d20 At</button><div class="er-chips">${erPrivateChips(priv,'gm_d20')}</div></div><div class="er-sub"><button type="button" class="primary er-roll-btn" data-er-private="d100">🎲 d100 At</button><div class="er-chips">${erPrivateChips(priv,'gm_d100')}</div></div></div><div class="er-private">Bu sonuçlar oyunculara görünmez.</div></section><section class="card"><div class="er-head"><div><div class="eyebrow">OYUNCU ZARLARI</div><h2>Son Atışlar</h2></div><button type="button" class="danger small" data-er-clear="player">Oyuncu Zarlarını Temizle</button></div>${player.length?player.map(r=>erPlayerRow(r,chars)).join(''):'<div class="er-empty">Henüz oyuncu zarı yok.</div>'}</section></div><section class="card"><div class="er-head"><div><div class="eyebrow">GM • OLAY ZARLARI</div><h2>Rastgele Olaylar</h2></div><button type="button" class="danger small" data-er-clear="events">Olay Geçmişini Temizle</button></div><div class="er-events">${erEventCard('d6','Yolculuk / Karşılaşma','1 Tehlike · 2 Garip NPC · 3 Canavar · 4 Hazine · 5 Eski Dünya kalıntısı · 6 Tamamen saçma bir olay')}${erEventCard('d20','İyi / Kötü Sonuç','1–10 İyi şeyler · 11–20 Kötü şeyler')}${erEventCard('d100','Belirsiz Olay / Eşya','1–49 İyi şeyler olur · 50–100 Belirsiz öğeler ve eşyalar')}${erEventCard('d200','Nadir / Özel Ödül','1–100 Konuşan silahlar · 101–200 Mitik eşya')}</div><hr><div class="eyebrow">OLAY GEÇMİŞİ</div><div class="er-history">${events.length?events.map(erEventResult).join(''):'<div class="er-empty">Henüz olay zarı atılmadı.</div>'}</div><div class="er-private">Olay sonuçları yalnız GM hesabında görünür ve oyuncu zar geçmişine düşmez.</div></section></div>`;
    main.dataset.erRollCenter='1';
  }catch(e){erToast('Zar Akışı yüklenemedi: '+(e?.message||String(e)))}finally{erRendering=false}
}

async function erPrivateRoll(kind){
  if(erBusy||!erIsGM())return;erBusy=true;
  try{const fn=kind==='d100'?'catlak_gm_roll_d100':'catlak_gm_roll_d20';const {data,error}=await ER_S.rpc(fn);if(error)throw error;erToast(`GM ${kind}: ${data?.total??'?'}`);await erRender(true)}catch(e){erToast('GM zarı atılamadı: '+(e?.message||String(e)))}finally{erBusy=false}
}
async function erEventRoll(kind){
  if(erBusy||!erIsGM())return;erBusy=true;
  try{const {data,error}=await ER_S.rpc('catlak_gm_roll_event',{p_table:kind});if(error)throw error;erToast(`${kind}: ${data?.total??'?'} • ${data?.dm_ruling||erOutcomeFor(kind,data?.total)}`);await erRender(true)}catch(e){erToast('Olay zarı atılamadı: '+(e?.message||String(e)))}finally{erBusy=false}
}
async function erClear(scope){
  if(erBusy||!erIsGM())return;
  const labels={private:'GM özel zarları',player:'oyuncu zar geçmişi',events:'olay geçmişi'};if(!confirm(`${labels[scope]||'Zarlar'} topluca silinsin mi?`))return;
  erBusy=true;
  try{const fn=scope==='private'?'catlak_gm_clear_private_rolls':scope==='player'?'catlak_gm_clear_player_rolls':'catlak_gm_clear_event_rolls';const {data,error}=await ER_S.rpc(fn);if(error)throw error;erToast(`${Number(data)||0} kayıt temizlendi.`);await erRender(true)}catch(e){erToast('Toplu silme başarısız: '+(e?.message||String(e)))}finally{erBusy=false}
}

document.addEventListener('click',e=>{
  const p=e.target.closest('[data-er-private]');if(p&&erIsGM()){e.preventDefault();e.stopImmediatePropagation();erPrivateRoll(p.dataset.erPrivate);return}
  const o=e.target.closest('[data-er-event]');if(o&&erIsGM()){e.preventDefault();e.stopImmediatePropagation();erEventRoll(o.dataset.erEvent);return}
  const c=e.target.closest('[data-er-clear]');if(c&&erIsGM()){e.preventDefault();e.stopImmediatePropagation();erClear(c.dataset.erClear);return}
},true);

setInterval(()=>{if(erIsGM()&&erTab()==='rolls'){const main=ER_APP.querySelector('main');if(main&&!main.dataset.erRollCenter)erRender()}},450);
ER_S.channel('cc-event-rolls-live').on('postgres_changes',{event:'*',schema:'public',table:'catlak_rolls'},()=>{const main=ER_APP.querySelector('main');if(main)main.dataset.erRollCenter='';setTimeout(()=>erRender(true),80)}).subscribe();
setTimeout(()=>erRender(),80);
window.__catlakEventRollsTest={outcome:erOutcomeFor,eventName:erEventName};
