(function(){
'use strict';
if(window.__catlakLiveCombatCenterV1)return;
window.__catlakLiveCombatCenterV1=true;
const APP=document.querySelector('#app');
const S=window.__catlakSupabase;
if(!APP||!S)return;

const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const txt=e=>String(e?.textContent||'').trim();
const num=x=>Number(x||0);
const isGM=()=>txt(APP.querySelector('.role'))==='GM';
const liveActive=()=>isGM()&&APP.querySelector('.nav [data-tab="gm"].on');
const toast=m=>{const t=document.querySelector('#toast');if(!t)return;t.textContent=String(m);t.classList.remove('hidden');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.add('hidden'),3800)};
let busy=false,queued=false,refreshQueued=false,toolsWrapped=false,hubWrapped=false;

if(!document.querySelector('#lcc-style')){
 const st=document.createElement('style');st.id='lcc-style';st.textContent=`
 #app .lcc-board{margin-top:14px}
 #app .lcc-columns{display:grid;grid-template-columns:minmax(300px,.9fr) minmax(360px,1.2fr) minmax(300px,.9fr);gap:14px;align-items:start}
 #app .lcc-col{min-width:0}
 #app .lcc-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;margin-bottom:10px}
 #app .lcc-status{font-size:.7rem;border:1px solid var(--line);border-radius:999px;padding:4px 8px;white-space:nowrap}
 #app .lcc-status.on{color:#9be6b2;border-color:#397151}
 #app .lcc-toolbar{display:grid;grid-template-columns:1fr 1fr;gap:8px;align-items:end}
 #app .lcc-toolbar .wide{grid-column:1/-1}
 #app .lcc-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:9px}
 #app .lcc-combatant{border:1px solid var(--line);border-radius:12px;padding:10px;margin-top:8px;background:#08131e}
 #app .lcc-combatant.current{border-color:var(--gold);box-shadow:inset 3px 0 var(--gold)}
 #app .lcc-combatant-top{display:grid;grid-template-columns:44px minmax(0,1fr) auto;gap:8px;align-items:center}
 #app .lcc-init{font-size:1.35rem;font-weight:900;color:var(--gold);text-align:center}
 #app .lcc-mini{font-size:.76rem;color:var(--muted);line-height:1.35}
 #app .lcc-hp{font-weight:900;margin-top:2px}
 #app .lcc-cond{border-bottom:1px solid var(--line);padding:9px 0;display:flex;justify-content:space-between;gap:10px;align-items:center}
 #app .lcc-cond:last-child{border-bottom:0}
 #app .lcc-empty{color:var(--muted);font-size:.84rem;padding:8px 0}
 @media(max-width:1180px){#app .lcc-columns{grid-template-columns:1fr 1fr}#app .lcc-col.lcc-conditions{grid-column:1/-1}}
 @media(max-width:760px){#app .lcc-columns{grid-template-columns:1fr}#app .lcc-col.lcc-conditions{grid-column:auto}#app .lcc-toolbar{grid-template-columns:1fr}#app .lcc-toolbar .wide{grid-column:auto}#app .lcc-combatant-top{grid-template-columns:40px minmax(0,1fr)}}
 `;document.head.appendChild(st)
}

function removeOldCombatEntry(){
 APP.querySelectorAll('[data-gm2-centerbar] [data-gm2-route="combat"]').forEach(x=>x.remove());
 if(String(window.__catlakGmCenterSelectedRoute||'')==='combat')window.__catlakGmCenterSelectedRoute='';
}
function openLive(){
 const b=APP.querySelector('.nav [data-tab="gm"]');
 if(b&&!b.classList.contains('on'))b.click();
 setTimeout(()=>render(true),80);
 return true;
}
function wrapOldCombatRoute(){
 removeOldCombatEntry();
 const tools=window.__catlakGmTools;
 if(tools&&!toolsWrapped&&typeof tools.open==='function'){
  const original=tools.open.bind(tools);
  tools.open=function(sub){if(String(sub||'')==='combat'){tools.close?.();return openLive()}return original(sub)};
  toolsWrapped=true;
 }
 const hub=window.__catlakGmHubV2Test;
 if(hub&&!hubWrapped&&typeof hub.route==='function'){
  const original=hub.route.bind(hub);
  hub.route=function(route){if(String(route||'')==='combat')return openLive();return original(route)};
  hubWrapped=true;
 }
}

async function loadData(){
 const [sr,br,cr,kr]=await Promise.all([
  S.from('catlak_combat_state').select('*').eq('id',1).maybeSingle(),
  S.from('catlak_combatants').select('*').order('initiative',{ascending:false}).order('created_at',{ascending:true}),
  S.from('catlak_characters').select('id,name,hp_current,hp_max,base_ac,base_stats,play_status,created_at').eq('play_status','active').order('created_at',{ascending:true}),
  S.from('catlak_character_conditions').select('*').eq('active',true).order('created_at',{ascending:true})
 ]);
 for(const r of [sr,br,cr,kr])if(r.error)throw r.error;
 return {state:sr.data||{id:1,active:false,name:'Savaş',round:1,current_combatant_id:null},combatants:br.data||[],chars:cr.data||[],conditions:kr.data||[]};
}
function combatantHtml(x,current){
 const kind=x.kind==='player'?'OYUNCU':'DÜŞMAN';
 return `<article class="lcc-combatant ${x.id===current?'current':''}"><div class="lcc-combatant-top"><div class="lcc-init">${num(x.initiative)}</div><div><b>${esc(x.name||'Savaşçı')}</b><div class="lcc-mini">${kind} • AC ${x.ac??'?'}${x.id===current?' • SIRA BUNDA':''}</div><div class="lcc-hp">HP ${x.hp_current??'?'} / ${x.hp_max??'?'}</div></div><button type="button" class="danger small" data-lcc-remove="${esc(x.id)}">Çıkar</button></div><div class="lcc-actions"><button type="button" data-lcc-hp="${esc(x.id)}" data-d="-5">HP −5</button><button type="button" data-lcc-hp="${esc(x.id)}" data-d="-1">−1</button><button type="button" data-lcc-hp="${esc(x.id)}" data-d="1">+1</button><button type="button" data-lcc-hp="${esc(x.id)}" data-d="5">HP +5</button><button type="button" data-lcc-init="${esc(x.id)}">İnisiyatif</button></div></article>`;
}
function boardHtml(d){
 const s=d.state||{},active=!!s.active,cs=d.combatants||[],current=s.current_combatant_id;
 const available=d.chars.filter(c=>!cs.some(x=>String(x.character_id)===String(c.id)));
 const charOptions=available.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');
 const condOptions=d.chars.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');
 const conditions=d.conditions.map(x=>{const c=d.chars.find(y=>String(y.id)===String(x.character_id));return `<div class="lcc-cond"><div><b>${esc(c?.name||'Karakter')} • ${esc(x.name)}</b><div class="lcc-mini">${x.remaining_rounds==null?'Süresiz':x.remaining_rounds+' round'}${x.note?' • '+esc(x.note):''}</div></div><button type="button" class="danger small" data-lcc-cond-remove="${esc(x.id)}">Kaldır</button></div>`}).join('');
 return `<section class="lcc-board" data-lcc-board><div class="lcc-columns"><section class="card lcc-col"><div class="lcc-head"><div><div class="eyebrow">SAVAŞ KONTROLÜ</div><h2>${active?esc(s.name||'Savaş'):'Savaş Hazır'}</h2><div class="lcc-mini">${active?`Round ${num(s.round)||1} • ${cs.length} katılımcı`:'Savaş başlatınca tur ve durum kontrolleri burada çalışır.'}</div></div><span class="lcc-status ${active?'on':''}">${active?'● AKTİF':'BEKLEMEDE'}</span></div>${active?`<div class="lcc-actions"><button type="button" class="primary" data-lcc-next>Sonraki Tur ▶</button><button type="button" class="danger" data-lcc-end>Savaşı Bitir</button></div><hr><div class="eyebrow">OYUNCU EKLE</div><div class="lcc-toolbar"><label class="wide">Karakter<select id="lcc-add-char">${charOptions||'<option value="">Tüm canlı karakterler eklendi</option>'}</select></label><label>İnisiyatif<input id="lcc-char-init" type="number" placeholder="boş = otomatik"></label><button type="button" data-lcc-add-char>Oyuncu Ekle</button></div><hr><div class="eyebrow">DÜŞMAN EKLE</div><div class="lcc-toolbar"><label class="wide">Ad<input id="lcc-enemy-name" placeholder="Örn. Çatlak Avcısı"></label><label>HP<input id="lcc-enemy-hp" type="number" min="1" value="10"></label><label>AC<input id="lcc-enemy-ac" type="number" value="10"></label><label>İnisiyatif<input id="lcc-enemy-init" type="number" placeholder="boş = d20"></label><button type="button" data-lcc-add-enemy>Düşman Ekle</button></div>`:`<div class="lcc-toolbar"><label class="wide">Savaş Adı<input id="lcc-combat-name" value="Karşılaşma"></label><button type="button" class="primary wide" data-lcc-start>Savaşı Başlat</button></div>`}</section><section class="card lcc-col"><div class="eyebrow">TUR SIRASI</div><h2>İnisiyatif</h2>${active?(cs.length?cs.map(x=>combatantHtml(x,current)).join(''):'<div class="lcc-empty">Henüz katılımcı eklenmedi.</div>'):'<div class="lcc-empty">Savaş başlatıldığında tur sırası burada görünür.</div>'}</section><section class="card lcc-col lcc-conditions"><div class="eyebrow">DURUM ETKİLERİ</div><h2>Karakter Durumları</h2><div class="lcc-toolbar"><label class="wide">Karakter<select id="lcc-cond-char">${condOptions||'<option value="">Canlı karakter yok</option>'}</select></label><label class="wide">Hazır Durum<select id="lcc-cond-preset"><option>Zehirli</option><option>Sersemlemiş</option><option>Yanıyor</option><option>Kanıyor</option><option>Kör</option><option>Lanetli</option><option>Korkmuş</option><option>Yavaşlamış</option><option value="">Özel / Elle Yaz</option></select></label><label class="wide">Özel ad<input id="lcc-cond-name" placeholder="Hazır durum seçiliyse boş bırak"></label><label>Round<input id="lcc-cond-rounds" type="number" min="0" max="99" value="0" title="0 = süresiz"></label><label class="wide">Oyuncuya görünen not<textarea id="lcc-cond-note" placeholder="Örn. Saldırı zarlarına -1"></textarea></label><button type="button" class="primary wide" data-lcc-cond-add>Durum Ekle</button></div><hr>${conditions||'<div class="lcc-empty">Aktif durum etkisi yok.</div>'}</section></div></section>`;
}
async function render(force=false){
 wrapOldCombatRoute();
 if(!liveActive())return;
 const main=APP.querySelector('main');if(!main||busy)return;
 const anchor=main.querySelector('.cc-live-two');if(!anchor){if(force)setTimeout(()=>render(false),80);return}
 if(!force&&main.querySelector('[data-lcc-board]'))return;
 busy=true;
 try{
  const d=await loadData();if(!liveActive()||APP.querySelector('main')!==main)return;
  main.querySelector('[data-lcc-board]')?.remove();
  anchor.insertAdjacentHTML('afterend',boardHtml(d));
 }catch(e){console.error('LCC render',e);toast('Savaş masası yüklenemedi: '+(e?.message||String(e)))}finally{busy=false}
}
async function rpc(name,args,msg){
 if(busy)return;busy=true;
 try{const r=await S.rpc(name,args||{});if(r.error)throw r.error;toast(typeof msg==='function'?msg(r.data):msg);}
 catch(e){toast('İşlem başarısız: '+(e?.message||String(e)))}
 finally{busy=false;setTimeout(()=>render(true),20)}
}

APP.addEventListener('click',e=>{
 if(!isGM())return;
 const start=e.target.closest?.('[data-lcc-start]');if(start){e.preventDefault();e.stopImmediatePropagation();rpc('catlak_gm_combat_start',{p_name:APP.querySelector('#lcc-combat-name')?.value||'Savaş'},'Savaş başlatıldı.');return}
 if(e.target.closest?.('[data-lcc-end]')){e.preventDefault();e.stopImmediatePropagation();if(confirm('Savaş sona erdirilsin mi?'))rpc('catlak_gm_combat_end',{},'Savaş sona erdi.');return}
 if(e.target.closest?.('[data-lcc-next]')){e.preventDefault();e.stopImmediatePropagation();rpc('catlak_gm_combat_next_turn',{},d=>`Sıra: ${d?.name||'?'} • Round ${d?.round||1}`);return}
 if(e.target.closest?.('[data-lcc-add-char]')){e.preventDefault();e.stopImmediatePropagation();const cid=APP.querySelector('#lcc-add-char')?.value,raw=APP.querySelector('#lcc-char-init')?.value;if(!cid)return toast('Eklenecek oyuncu yok.');rpc('catlak_gm_combat_add_character',{p_character_id:cid,p_initiative:raw===''?null:Number(raw)},'Oyuncu savaşa eklendi.');return}
 if(e.target.closest?.('[data-lcc-add-enemy]')){e.preventDefault();e.stopImmediatePropagation();const name=APP.querySelector('#lcc-enemy-name')?.value||'',hp=Math.max(1,num(APP.querySelector('#lcc-enemy-hp')?.value)||1),ac=num(APP.querySelector('#lcc-enemy-ac')?.value)||10,raw=APP.querySelector('#lcc-enemy-init')?.value;rpc('catlak_gm_combat_add_enemy',{p_name:name,p_hp:hp,p_ac:ac,p_initiative:raw===''?null:Number(raw)},'Düşman savaşa eklendi.');return}
 const rm=e.target.closest?.('[data-lcc-remove]');if(rm){e.preventDefault();e.stopImmediatePropagation();rpc('catlak_gm_combat_remove',{p_combatant_id:rm.dataset.lccRemove},'Savaşçı çıkarıldı.');return}
 const hp=e.target.closest?.('[data-lcc-hp]');if(hp){e.preventDefault();e.stopImmediatePropagation();rpc('catlak_gm_combat_adjust_hp',{p_combatant_id:hp.dataset.lccHp,p_delta:Number(hp.dataset.d)},d=>'HP: '+d);return}
 const ini=e.target.closest?.('[data-lcc-init]');if(ini){e.preventDefault();e.stopImmediatePropagation();rpc('catlak_gm_combat_roll_initiative',{p_combatant_id:ini.dataset.lccInit},d=>'İnisiyatif: '+d);return}
 if(e.target.closest?.('[data-lcc-cond-add]')){e.preventDefault();e.stopImmediatePropagation();const cid=APP.querySelector('#lcc-cond-char')?.value,preset=APP.querySelector('#lcc-cond-preset')?.value||'',custom=APP.querySelector('#lcc-cond-name')?.value.trim()||'',name=custom||preset,note=APP.querySelector('#lcc-cond-note')?.value||'',rounds=num(APP.querySelector('#lcc-cond-rounds')?.value)||0;if(!cid||!name)return toast('Karakter ve durum adı gerekli.');rpc('catlak_gm_add_condition',{p_character_id:cid,p_name:name,p_note:note,p_rounds:rounds||null},'Durum oyuncuya gönderildi.');return}
 const cr=e.target.closest?.('[data-lcc-cond-remove]');if(cr){e.preventDefault();e.stopImmediatePropagation();rpc('catlak_gm_remove_condition',{p_condition_id:cr.dataset.lccCondRemove},'Durum kaldırıldı.');return}
},true);

function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;wrapOldCombatRoute();if(liveActive())render(false);else APP.querySelector('[data-lcc-board]')?.remove()})}
new MutationObserver(schedule).observe(APP,{childList:true,subtree:true});
const refresh=()=>{if(refreshQueued)return;refreshQueued=true;setTimeout(()=>{refreshQueued=false;if(liveActive())render(true)},35)};
S.channel('cc-live-combat-center').on('postgres_changes',{event:'*',schema:'public',table:'catlak_combat_state'},refresh).on('postgres_changes',{event:'*',schema:'public',table:'catlak_combatants'},refresh).on('postgres_changes',{event:'*',schema:'public',table:'catlak_character_conditions'},refresh).on('postgres_changes',{event:'*',schema:'public',table:'catlak_characters'},refresh).subscribe();
setTimeout(schedule,120);setTimeout(schedule,700);setTimeout(schedule,1600);
window.__catlakLiveCombatCenter={render:()=>render(true),open:openLive,removeLegacy:removeOldCombatEntry};
})();
