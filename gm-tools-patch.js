const GMT_S=window.__catlakSupabase;
const GMT_APP=document.querySelector('#app');
if(!GMT_S||!GMT_APP)throw new Error('Çatlak Çağı GM araçları başlatılamadı.');

const gmtH=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
const gmtN=x=>Number(x||0);
const gmtTxt=e=>String(e?.textContent||'').trim();
const gmtIsGM=()=>gmtTxt(GMT_APP.querySelector('.role'))==='GM';
const gmtBaseTab=()=>GMT_APP.querySelector('.nav button.on[data-tab]')?.dataset.tab||'';
const gmtToast=x=>{const t=document.querySelector('#toast');if(!t)return;t.textContent=String(x);t.classList.remove('hidden');clearTimeout(gmtToast.t);gmtToast.t=setTimeout(()=>t.classList.add('hidden'),4200)};
let gmtOpen=false,gmtSub='combat',gmtBusy=false,gmtGen=0,gmtRuleCache=null,gmtRuleAt=0,gmtPlayerBusy=false;

const gmtCss=`
.gmt-nav{white-space:nowrap}.gmt-shell{display:flex;flex-direction:column;gap:14px}.gmt-tabs{display:flex;flex-wrap:wrap;gap:8px}.gmt-tabs button.on{border-color:var(--gold);color:var(--gold)}.gmt-grid{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(320px,.8fr);gap:14px;align-items:start}.gmt-stack{display:flex;flex-direction:column;gap:12px}.gmt-toolbar{display:flex;flex-wrap:wrap;gap:8px;align-items:end}.gmt-toolbar label{min-width:130px;flex:1}.gmt-combatant{border:1px solid var(--line);border-radius:14px;padding:12px;background:#0a1622}.gmt-combatant.current{border-color:var(--gold);box-shadow:inset 0 0 0 1px #d6ad5b55}.gmt-combatant-head{display:grid;grid-template-columns:54px minmax(0,1fr) auto;gap:10px;align-items:center}.gmt-init{font-size:1.55rem;font-weight:900;text-align:center;color:var(--gold)}.gmt-hp{font-weight:800}.gmt-mini{font-size:.79rem;color:var(--muted)}.gmt-condition{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:8px 0;border-bottom:1px solid var(--line)}.gmt-condition:last-child{border-bottom:0}.gmt-rule{display:grid;grid-template-columns:90px minmax(0,1fr) auto;gap:8px;align-items:center;padding:9px 0;border-bottom:1px solid var(--line)}.gmt-rule:last-child{border-bottom:0}.gmt-log{padding:10px 0;border-bottom:1px solid var(--line)}.gmt-log:last-child{border-bottom:0}.gmt-log time{font-size:.75rem;color:var(--muted)}.gmt-player-panel{margin-top:12px}.gmt-player-two{display:grid;grid-template-columns:1fr 1fr;gap:12px}.gmt-status-pill{display:inline-flex;border:1px solid var(--line);border-radius:999px;padding:4px 8px;margin:3px 4px 3px 0;font-size:.78rem}.gmt-slot{display:grid;grid-template-columns:115px minmax(0,1fr);gap:8px;padding:7px 0;border-bottom:1px solid var(--line)}.gmt-slot:last-child{border-bottom:0}.gmt-slot b{color:var(--gold)}
@media(max-width:900px){.gmt-grid,.gmt-player-two{grid-template-columns:1fr}.gmt-combatant-head{grid-template-columns:48px minmax(0,1fr)}}
`;
if(!document.querySelector('#gmt-style')){const s=document.createElement('style');s.id='gmt-style';s.textContent=gmtCss;document.head.appendChild(s)}

function gmtInjectNav(){
  if(!gmtIsGM())return;
  const nav=GMT_APP.querySelector('.nav');if(!nav||nav.querySelector('[data-gmt-open]'))return;
  const b=document.createElement('button');b.type='button';b.className='gmt-nav';b.dataset.gmtOpen='1';b.textContent='GM Araçları';nav.appendChild(b);
}
function gmtSetNavOn(){const nav=GMT_APP.querySelector('.nav');if(!nav)return;nav.querySelectorAll('button.on').forEach(x=>x.classList.remove('on'));nav.querySelector('[data-gmt-open]')?.classList.add('on')}
function gmtClose(){if(!gmtOpen)return;gmtOpen=false;gmtGen++;window.__catlakGmToolsOpen=false}
function gmtTime(x){try{return new Date(x).toLocaleString('tr-TR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}catch{return''}}
function gmtRange(r){return r.min_roll===r.max_roll?String(r.min_roll):`${r.min_roll}–${r.max_roll}`}
function gmtRuleText(rows,key){return rows.filter(r=>r.table_key===key).sort((a,b)=>a.sort_order-b.sort_order||a.min_roll-b.min_roll).map(r=>`${gmtRange(r)} ${r.outcome}`).join(' · ')}

async function gmtLoad(){
  const [sr,br,cr,kr,er,lr]=await Promise.all([
    GMT_S.from('catlak_combat_state').select('*').eq('id',1).maybeSingle(),
    GMT_S.from('catlak_combatants').select('*').order('initiative',{ascending:false}).order('created_at',{ascending:true}),
    GMT_S.from('catlak_characters').select('id,name,hp_current,hp_max,base_ac,base_stats,play_status').eq('play_status','active').order('created_at',{ascending:true}),
    GMT_S.from('catlak_character_conditions').select('*').eq('active',true).order('created_at',{ascending:true}),
    GMT_S.from('catlak_event_rules').select('*').order('table_key',{ascending:true}).order('sort_order',{ascending:true}),
    GMT_S.from('catlak_session_log').select('*').order('created_at',{ascending:false}).limit(120)
  ]);
  for(const r of [sr,br,cr,kr,er,lr])if(r.error)throw r.error;
  gmtRuleCache=er.data||[];gmtRuleAt=Date.now();
  return {state:sr.data||{id:1,active:false,name:'Savaş',round:1,current_combatant_id:null},combatants:br.data||[],chars:cr.data||[],conditions:kr.data||[],rules:er.data||[],logs:lr.data||[]};
}

function gmtCombatHtml(d){
  const s=d.state,cs=d.combatants,active=!!s.active,current=s.current_combatant_id;
  const charOptions=d.chars.filter(c=>!cs.some(x=>x.character_id===c.id)).map(c=>`<option value="${c.id}">${gmtH(c.name)}</option>`).join('');
  const conditionRows=d.conditions.map(x=>{const c=d.chars.find(y=>y.id===x.character_id);return `<div class="gmt-condition"><div><b>${gmtH(c?.name||'Karakter')} • ${gmtH(x.name)}</b><div class="gmt-mini">${x.remaining_rounds==null?'Süresiz':x.remaining_rounds+' round'}${x.note?' • '+gmtH(x.note):''}</div></div><button type="button" class="danger small" data-gmt-cond-remove="${x.id}">Kaldır</button></div>`}).join('');
  const order=cs.map((x,i)=>`<article class="gmt-combatant ${x.id===current?'current':''}"><div class="gmt-combatant-head"><div class="gmt-init">${x.initiative}</div><div><b>${gmtH(x.name)}</b><div class="gmt-mini">${x.kind==='player'?'OYUNCU':'DÜŞMAN'} • AC ${x.ac??'?'}${x.id===current?' • SIRA BUNDA':''}</div><div class="gmt-hp">HP ${x.hp_current??'?'} / ${x.hp_max??'?'}</div></div><button type="button" class="danger small" data-gmt-combat-remove="${x.id}">Çıkar</button></div><div class="actions" style="margin-top:9px"><button type="button" data-gmt-hp="${x.id}" data-d="-5">HP −5</button><button type="button" data-gmt-hp="${x.id}" data-d="-1">HP −1</button><button type="button" data-gmt-hp="${x.id}" data-d="1">HP +1</button><button type="button" data-gmt-hp="${x.id}" data-d="5">HP +5</button><button type="button" data-gmt-init="${x.id}">İnisiyatif At</button></div></article>`).join('');
  return `<div class="gmt-grid"><div class="gmt-stack"><section class="card"><div class="section-title"><div><div class="eyebrow">SAVAŞ / İNİSİYATİF</div><h2>${active?gmtH(s.name):'Savaş Hazır Değil'}</h2><p class="muted">${active?`Round ${s.round} • ${cs.length} katılımcı`:'Yeni bir savaş başlat; mevcut karakter kağıtları değişmeden HP senkron çalışır.'}</p></div>${active?'<button type="button" class="danger" data-gmt-combat-end>Savaşı Bitir</button>':''}</div>${active?`<div class="actions"><button type="button" class="primary" data-gmt-next>Sonraki Tur ▶</button></div>`:`<div class="gmt-toolbar"><label>Savaş Adı<input id="gmt-combat-name" value="Karşılaşma"></label><button type="button" class="primary" data-gmt-combat-start>Savaşı Başlat</button></div>`}</section>${active?`<section class="card"><div class="eyebrow">KATILIMCI EKLE</div><div class="gmt-toolbar"><label>Oyuncu<select id="gmt-add-char">${charOptions||'<option value="">Tüm oyuncular eklendi</option>'}</select></label><label>İnisiyatif (boş=otomatik)<input id="gmt-char-init" type="number" placeholder="d20 + DEX"></label><button type="button" data-gmt-add-char>Oyuncu Ekle</button></div><hr><div class="gmt-toolbar"><label>Düşman adı<input id="gmt-enemy-name" placeholder="Örn. Çatlak Avcısı"></label><label>HP<input id="gmt-enemy-hp" type="number" min="1" value="10"></label><label>AC<input id="gmt-enemy-ac" type="number" value="10"></label><label>İnisiyatif<input id="gmt-enemy-init" type="number" placeholder="boş = d20"></label><button type="button" data-gmt-add-enemy>Düşman Ekle</button></div></section><section class="card"><div class="eyebrow">TUR SIRASI</div><div class="gmt-stack">${order||'<div class="muted">Henüz katılımcı yok.</div>'}</div></section>`:''}</div><aside class="gmt-stack"><section class="card"><div class="eyebrow">DURUM ETKİLERİ</div><h2>Karaktere Durum Ver</h2><div class="form"><label>Karakter<select id="gmt-cond-char">${d.chars.map(c=>`<option value="${c.id}">${gmtH(c.name)}</option>`).join('')}</select></label><label>Hazır Durum<select id="gmt-cond-preset"><option>Zehirli</option><option>Sersemlemiş</option><option>Yanıyor</option><option>Kanıyor</option><option>Kör</option><option>Lanetli</option><option>Korkmuş</option><option>Yavaşlamış</option><option value="">Özel / Elle Yaz</option></select></label><label>Özel ad<input id="gmt-cond-name" placeholder="Hazır durum seçiliyse boş bırak"></label><label>Round<input id="gmt-cond-rounds" type="number" min="0" max="99" value="0" title="0 = süresiz"></label><label class="wide">Oyuncuya görünen not<textarea id="gmt-cond-note" placeholder="Örn. Saldırı zarlarına -1"></textarea></label></div><button type="button" class="primary widebtn" data-gmt-cond-add>Durum Ekle</button><hr><div>${conditionRows||'<div class="muted">Aktif durum etkisi yok.</div>'}</div></section></aside></div>`;
}

function gmtEventsHtml(d){
  const groups=['d6','d20','d100','d200'];
  return `<section class="card"><div class="eyebrow">OLAY TABLOSU ATÖLYESİ</div><h2>Olay Sonuçlarını Düzenle</h2><p class="muted">Zar aralıklarını güvenli tutuyoruz; yalnız çıkan olay metnini değiştiriyorsun. Zar Akışı'ndaki d6/d20/d100/d200 aynı anda bu metinleri kullanır.</p></section><div class="gmt-grid">${groups.map(k=>`<section class="card"><div class="eyebrow">${k.toUpperCase()}</div><h2>${k} Olayları</h2>${d.rules.filter(r=>r.table_key===k).map(r=>`<div class="gmt-rule"><b>${gmtRange(r)}</b><input id="gmt-rule-${r.id}" value="${gmtH(r.outcome)}"><button type="button" data-gmt-rule-save="${r.id}">Kaydet</button></div>`).join('')}</section>`).join('')}</div>`;
}
function gmtLogsHtml(d){return `<div class="gmt-grid"><section class="card"><div class="eyebrow">OTURUM GÜNLÜĞÜ</div><h2>GM Kayıt Defteri</h2><p class="muted">Savaş, tur, durum etkileri ve olay zarları otomatik kaydolur. İstersen kendi notunu da ekleyebilirsin.</p><label>Oturum Notu<textarea id="gmt-log-note" placeholder="Örn. Parti eski kulede büyücünün mührünü kırdı."></textarea></label><div class="actions"><button type="button" class="primary" data-gmt-log-add>Not Ekle</button><button type="button" class="danger" data-gmt-log-clear>Günlüğü Temizle</button></div></section><section class="card"><div class="eyebrow">SON KAYITLAR</div>${d.logs.length?d.logs.map(x=>`<div class="gmt-log"><b>${gmtH(x.kind.toUpperCase())}</b><div>${gmtH(x.message)}</div><time>${gmtTime(x.created_at)}</time></div>`).join(''):'<div class="muted">Henüz kayıt yok.</div>'}</section></div>`}

async function gmtRender(force=false){
  if(!gmtOpen||!gmtIsGM()||gmtBusy)return;
  const main=GMT_APP.querySelector('main');if(!main)return;if(!force&&main.dataset.gmtTools==='1')return;
  const gen=++gmtGen;gmtBusy=true;
  try{const d=await gmtLoad();if(!gmtOpen||gen!==gmtGen||GMT_APP.querySelector('main')!==main)return;gmtSetNavOn();main.innerHTML=`<div class="gmt-shell"><section class="card"><div class="eyebrow">GM • GÜVENLİ ARAÇLAR</div><h1>Oyun Yönetimi</h1><div class="gmt-tabs"><button type="button" class="${gmtSub==='combat'?'on':''}" data-gmt-sub="combat">Savaş & Durumlar</button><button type="button" class="${gmtSub==='events'?'on':''}" data-gmt-sub="events">Olay Atölyesi</button><button type="button" class="${gmtSub==='logs'?'on':''}" data-gmt-sub="logs">Oturum Günlüğü</button></div></section>${gmtSub==='combat'?gmtCombatHtml(d):gmtSub==='events'?gmtEventsHtml(d):gmtLogsHtml(d)}</div>`;main.dataset.gmtTools='1'}catch(e){gmtToast('GM Araçları yüklenemedi: '+(e?.message||String(e)))}finally{gmtBusy=false}
}
async function gmtRpc(fn,args={},msg='Tamamlandı'){if(gmtBusy)return;gmtBusy=true;try{const r=await GMT_S.rpc(fn,args);if(r.error)throw r.error;gmtToast(typeof msg==='function'?msg(r.data):msg);gmtBusy=false;await gmtRender(true)}catch(e){gmtBusy=false;gmtToast('İşlem başarısız: '+(e?.message||String(e)))}}

async function gmtSyncEventRules(){
  if(gmtOpen||!gmtIsGM()||gmtBaseTab()!=='rolls')return;
  if(!gmtRuleCache||Date.now()-gmtRuleAt>8000){const r=await GMT_S.from('catlak_event_rules').select('*').order('sort_order',{ascending:true});if(r.error)return;gmtRuleCache=r.data||[];gmtRuleAt=Date.now()}
  for(const k of ['d6','d20','d100','d200']){const b=GMT_APP.querySelector(`[data-er-event="${k}"]`);const rules=b?.closest('.er-event')?.querySelector('.er-rules');if(rules)rules.textContent=gmtRuleText(gmtRuleCache,k)}
}

function gmtSlotName(k){return ({main_weapon:'Ana Silah',off_weapon:'İkinci Silah',armor:'Zırh',accessory_1:'Aksesuar 1',accessory_2:'Aksesuar 2'})[k]||k}
async function gmtRenderPlayerPanels(){
  if(gmtIsGM()||gmtBaseTab()!=='sheet'||gmtPlayerBusy)return;
  const main=GMT_APP.querySelector('main');if(!main||main.querySelector('[data-gmt-player-panel]'))return;
  gmtPlayerBusy=true;
  try{
    const [cr,kr,vr,ir]=await Promise.all([
      GMT_S.from('catlak_characters').select('id,name').order('created_at',{ascending:true}),
      GMT_S.from('catlak_character_conditions').select('*').eq('active',true).order('created_at',{ascending:true}),
      GMT_S.from('catlak_inventory').select('id,character_id,item_id,equipped,equipped_slot,quantity').order('granted_at',{ascending:true}),
      GMT_S.from('catlak_items').select('id,name,item_type,effects')
    ]);
    if(cr.error||kr.error||vr.error||ir.error)return;
    if(gmtIsGM()||gmtBaseTab()!=='sheet'||GMT_APP.querySelector('main')!==main)return;
    const chars=cr.data||[],conds=kr.data||[],inv=vr.data||[],items=ir.data||[];
    const heroes=[...main.querySelectorAll('.hero')];
    for(const hero of heroes){
      const name=gmtTxt(hero.querySelector('h1')),c=chars.find(x=>x.name===name);if(!c||hero.nextElementSibling?.hasAttribute('data-gmt-player-panel'))continue;
      const cc=conds.filter(x=>x.character_id===c.id),ci=inv.filter(x=>x.character_id===c.id&&x.equipped);
      const slots=['main_weapon','off_weapon','armor','accessory_1','accessory_2'];
      const sec=document.createElement('section');sec.className='card gmt-player-panel';sec.dataset.gmtPlayerPanel=c.id;
      sec.innerHTML=`<div class="gmt-player-two"><div><div class="eyebrow">AKTİF DURUMLAR</div><h2>Durum Etkileri</h2>${cc.length?cc.map(x=>`<span class="gmt-status-pill"><b>${gmtH(x.name)}</b>${x.remaining_rounds==null?'':' • '+x.remaining_rounds+' round'}${x.note?' • '+gmtH(x.note):''}</span>`).join(''):'<p class="muted">Aktif durum etkisi yok.</p>'}</div><div><div class="eyebrow">TAKILI TEÇHİZAT</div><h2>Slotlar</h2>${slots.map(k=>{const r=ci.find(x=>x.equipped_slot===k),i=r&&items.find(y=>y.id===r.item_id);return `<div class="gmt-slot"><b>${gmtSlotName(k)}</b><span>${i?gmtH(i.name):'<span class="muted">Boş</span>'}</span></div>`}).join('')}<p class="gmt-mini">Silah, zırh ve aksesuarı Envanter bölümündeki Kuşan/Tak düğmeleriyle yerleştirebilirsin.</p></div></div>`;
      hero.insertAdjacentElement('afterend',sec);
    }
  }finally{gmtPlayerBusy=false}
}
function gmtInvalidatePlayer(){GMT_APP.querySelectorAll('[data-gmt-player-panel]').forEach(x=>x.remove());setTimeout(gmtRenderPlayerPanels,120)}

async function gmtRuleSave(id){const v=document.querySelector('#gmt-rule-'+id)?.value.trim();if(!v)return gmtToast('Olay metni boş olamaz.');await gmtRpc('catlak_gm_update_event_rule',{p_rule_id:Number(id),p_outcome:v},()=>{gmtRuleCache=null;return'Olay kuralı kaydedildi.'})}

document.addEventListener('click',e=>{
  const open=e.target.closest('[data-gmt-open]');if(open){e.preventDefault();e.stopImmediatePropagation();if(!gmtIsGM())return;gmtOpen=true;window.__catlakGmToolsOpen=true;gmtSetNavOn();gmtRender(true);return}
  const base=e.target.closest('.nav button[data-tab]');if(base){gmtClose();return}
  if(!gmtOpen)return;
  const sub=e.target.closest('[data-gmt-sub]');if(sub){e.preventDefault();e.stopImmediatePropagation();gmtSub=sub.dataset.gmtSub;const m=GMT_APP.querySelector('main');if(m)m.dataset.gmtTools='';gmtRender(true);return}
  const start=e.target.closest('[data-gmt-combat-start]');if(start){e.preventDefault();e.stopImmediatePropagation();gmtRpc('catlak_gm_combat_start',{p_name:document.querySelector('#gmt-combat-name')?.value||'Savaş'},'Savaş başlatıldı.');return}
  const end=e.target.closest('[data-gmt-combat-end]');if(end){e.preventDefault();e.stopImmediatePropagation();if(confirm('Savaş sona erdirilsin mi?'))gmtRpc('catlak_gm_combat_end',{},'Savaş sona erdi.');return}
  const next=e.target.closest('[data-gmt-next]');if(next){e.preventDefault();e.stopImmediatePropagation();gmtRpc('catlak_gm_combat_next_turn',{},d=>`Sıra: ${d?.name||'?'} • Round ${d?.round||1}`);return}
  const ac=e.target.closest('[data-gmt-add-char]');if(ac){e.preventDefault();e.stopImmediatePropagation();const cid=document.querySelector('#gmt-add-char')?.value,raw=document.querySelector('#gmt-char-init')?.value; if(!cid)return gmtToast('Eklenecek oyuncu yok.');gmtRpc('catlak_gm_combat_add_character',{p_character_id:cid,p_initiative:raw===''?null:Number(raw)},'Oyuncu savaşa eklendi.');return}
  const ae=e.target.closest('[data-gmt-add-enemy]');if(ae){e.preventDefault();e.stopImmediatePropagation();const name=document.querySelector('#gmt-enemy-name')?.value||'',hp=Math.max(1,gmtN(document.querySelector('#gmt-enemy-hp')?.value)||1),acv=gmtN(document.querySelector('#gmt-enemy-ac')?.value)||10,raw=document.querySelector('#gmt-enemy-init')?.value;gmtRpc('catlak_gm_combat_add_enemy',{p_name:name,p_hp:hp,p_ac:acv,p_initiative:raw===''?null:Number(raw)},'Düşman savaşa eklendi.');return}
  const rm=e.target.closest('[data-gmt-combat-remove]');if(rm){e.preventDefault();e.stopImmediatePropagation();gmtRpc('catlak_gm_combat_remove',{p_combatant_id:rm.dataset.gmtCombatRemove},'Savaşçı çıkarıldı.');return}
  const hp=e.target.closest('[data-gmt-hp]');if(hp){e.preventDefault();e.stopImmediatePropagation();gmtRpc('catlak_gm_combat_adjust_hp',{p_combatant_id:hp.dataset.gmtHp,p_delta:Number(hp.dataset.d)},d=>'HP: '+d);return}
  const ini=e.target.closest('[data-gmt-init]');if(ini){e.preventDefault();e.stopImmediatePropagation();gmtRpc('catlak_gm_combat_roll_initiative',{p_combatant_id:ini.dataset.gmtInit},d=>'İnisiyatif: '+d);return}
  const ca=e.target.closest('[data-gmt-cond-add]');if(ca){e.preventDefault();e.stopImmediatePropagation();const cid=document.querySelector('#gmt-cond-char')?.value,preset=document.querySelector('#gmt-cond-preset')?.value||'',custom=document.querySelector('#gmt-cond-name')?.value.trim()||'',name=custom||preset,note=document.querySelector('#gmt-cond-note')?.value||'',rounds=gmtN(document.querySelector('#gmt-cond-rounds')?.value)||0;if(!cid||!name)return gmtToast('Karakter ve durum adı gerekli.');gmtRpc('catlak_gm_add_condition',{p_character_id:cid,p_name:name,p_note:note,p_rounds:rounds||null},'Durum oyuncuya gönderildi.');return}
  const cr=e.target.closest('[data-gmt-cond-remove]');if(cr){e.preventDefault();e.stopImmediatePropagation();gmtRpc('catlak_gm_remove_condition',{p_condition_id:cr.dataset.gmtCondRemove},'Durum kaldırıldı.');return}
  const rs=e.target.closest('[data-gmt-rule-save]');if(rs){e.preventDefault();e.stopImmediatePropagation();gmtRuleSave(rs.dataset.gmtRuleSave);return}
  const la=e.target.closest('[data-gmt-log-add]');if(la){e.preventDefault();e.stopImmediatePropagation();const v=document.querySelector('#gmt-log-note')?.value.trim();if(!v)return gmtToast('Not boş olamaz.');gmtRpc('catlak_gm_log_note',{p_message:v},'Oturum notu eklendi.');return}
  const lc=e.target.closest('[data-gmt-log-clear]');if(lc){e.preventDefault();e.stopImmediatePropagation();if(confirm('Oturum günlüğü topluca temizlensin mi?'))gmtRpc('catlak_gm_clear_session_log',{},d=>`${d||0} günlük kaydı temizlendi.`);return}
},true);

document.addEventListener('click',e=>{if(!gmtIsGM()&&e.target.closest('[data-a="equip"]'))setTimeout(gmtInvalidatePlayer,420)},false);

GMT_S.channel('cc-gmt-conditions').on('postgres_changes',{event:'*',schema:'public',table:'catlak_character_conditions'},()=>{if(gmtOpen){const m=GMT_APP.querySelector('main');if(m)m.dataset.gmtTools='';setTimeout(()=>gmtRender(true),80)}else gmtInvalidatePlayer()}).subscribe();
GMT_S.channel('cc-gmt-combat').on('postgres_changes',{event:'*',schema:'public',table:'catlak_combatants'},()=>{if(gmtOpen&&gmtSub==='combat'){const m=GMT_APP.querySelector('main');if(m)m.dataset.gmtTools='';setTimeout(()=>gmtRender(true),80)}}).on('postgres_changes',{event:'*',schema:'public',table:'catlak_combat_state'},()=>{if(gmtOpen&&gmtSub==='combat'){const m=GMT_APP.querySelector('main');if(m)m.dataset.gmtTools='';setTimeout(()=>gmtRender(true),80)}}).subscribe();

const gmtObserver=new MutationObserver(()=>{
  gmtInjectNav();
  if(gmtOpen){const m=GMT_APP.querySelector('main');if(m&&!m.dataset.gmtTools)setTimeout(()=>gmtRender(true),30)}
});
gmtObserver.observe(GMT_APP,{childList:true,subtree:true});
setInterval(()=>{gmtInjectNav();if(gmtOpen)gmtRender();else{gmtRenderPlayerPanels();gmtSyncEventRules()}},900);
setTimeout(()=>{gmtInjectNav();gmtRenderPlayerPanels();gmtSyncEventRules()},150);
window.__catlakGmToolsTest={ruleText:gmtRuleText,range:gmtRange,slotName:gmtSlotName};