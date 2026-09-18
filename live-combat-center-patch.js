(function(){
'use strict';
if(window.__catlakLiveCombatCenterV2)return;
window.__catlakLiveCombatCenterV2=true;
const APP=document.querySelector('#app');
const S=window.__catlakSupabase;
if(!APP||!S)return;
if(window.__catlakRuntimeOwnership&&!window.__catlakRuntimeOwnership.claim('gm-live-table','live-combat-center'))return;

const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const txt=e=>String(e?.textContent||'').trim();
const num=x=>Number(x||0);
const isGM=()=>txt(APP.querySelector('.role'))==='GM';
const liveActive=()=>isGM()&&APP.querySelector('.nav [data-tab="gm"].on');
const toast=m=>{const t=document.querySelector('#toast');if(!t)return;t.textContent=String(m);t.classList.remove('hidden');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.add('hidden'),3800)};
let busy=false,actionBusy=false,queued=false,refreshQueued=false,toolsWrapped=false,hubWrapped=false,autoEndBusy=false,hadEnemyInCurrentCombat=false,cachedBoardHtml='',preloadBusy=null,deferredRender=false,interactionUntil=0,liveSig='',selectedTargetId='',lastAttackResult=null;

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
 #app .lcc-hp-edit{display:grid;grid-template-columns:minmax(70px,90px) auto auto;gap:6px;align-items:end;margin-top:8px}
 #app .lcc-hp-edit label{font-size:.7rem;color:var(--muted)}
 #app .lcc-hp-edit input{width:100%;min-width:0}
 @media(max-width:520px){#app .lcc-hp-edit{grid-template-columns:1fr 1fr}#app .lcc-hp-edit label{grid-column:1/-1}}
 #app .lcc-combatant{border:1px solid var(--line);border-radius:12px;padding:10px;margin-top:8px;background:#08131e}
 #app .lcc-combatant.current{border-color:var(--gold);box-shadow:inset 3px 0 var(--gold)}
 #app .lcc-combatant.targeted{border-color:var(--cyan);box-shadow:inset 3px 0 var(--cyan)}
 #app .lcc-target-note{margin-top:7px;padding:7px 8px;border:1px solid #28475b;border-radius:8px;background:#071722;color:#8fdcff;font-size:.72rem;font-weight:800}
 #app .lcc-attack-box{margin-top:8px;padding:8px;border:1px solid #4b3d28;border-radius:9px;background:#17130d}
 #app .lcc-attack-box .lcc-mini{margin-bottom:6px}
 #app .lcc-attack-result{margin-top:7px;padding:7px 8px;border:1px solid var(--line);border-radius:8px;background:#07111a;font-size:.73rem}
 #app .lcc-attack-result.hit{border-color:#3d7249}.lcc-attack-result.miss{border-color:#743e46}
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
 try{window.__catlakViewRuntime?.begin?.('gm-live')}catch(_){}
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
 const [sr,br,cr,kr,tr]=await Promise.all([
  S.from('catlak_combat_state').select('*').eq('id',1).maybeSingle(),
  S.from('catlak_combatants').select('*').order('initiative',{ascending:false}).order('created_at',{ascending:true}),
  S.from('catlak_characters').select('id,name,hp_current,hp_max,base_ac,base_stats,play_status,data,created_at').eq('play_status','active').order('created_at',{ascending:true}),
  S.from('catlak_character_conditions').select('*').eq('active',true).order('created_at',{ascending:true}),
  S.from('catlak_creature_templates').select('id,name,creature_type,hp,ac,attack_name,attack_formula,damage_formula').order('name',{ascending:true})
 ]);
 for(const r of [sr,br,cr,kr,tr])if(r.error)throw r.error;
 return {state:sr.data||{id:1,active:false,name:'Savaş',round:1,current_combatant_id:null},combatants:br.data||[],chars:cr.data||[],conditions:kr.data||[],templates:tr.data||[]};
}
async function preloadBoard(){
 if(preloadBusy)return preloadBusy;
 preloadBusy=loadData().then(async d=>{await autoEndClearedCombat(d);cachedBoardHtml=boardHtml(d);return cachedBoardHtml}).catch(()=>cachedBoardHtml).finally(()=>{preloadBusy=null});
 return preloadBusy;
}
function restoreCachedBoard(main){
 if(!main||!cachedBoardHtml||main.querySelector('[data-lcc-board]'))return false;
 main.insertAdjacentHTML('beforeend',cachedBoardHtml);
 try{window.__catlakViewRuntime?.ready?.('gm-live')}catch(_){}
 return true;
}
function combatantHtml(x,current,all){
 const kind=x.kind==='player'?'OYUNCU':'DÜŞMAN';
 const id=String(x.id||''),isPlayer=x.kind==='player',isCurrent=id===String(current||''),alive=x.hp_current==null||num(x.hp_current)>0;
 const target=(all||[]).find(y=>y.kind==='player'&&String(y.id)===String(selectedTargetId)&&(y.hp_current==null||num(y.hp_current)>0))||null;
 const targeted=isPlayer&&id===String(selectedTargetId);
 const attackName=String(x.attack_name||'Saldırı').trim()||'Saldırı';
 const attackFormula=String(x.attack_formula||'').trim();
 const damageFormula=String(x.damage_formula||'').trim();
 const configured=!!attackFormula;
 const result=!isPlayer&&lastAttackResult&&String(lastAttackResult.creature_id||'')===id?lastAttackResult:null;
 const targetAction=isPlayer&&alive?`<button type="button" class="${targeted?'primary':''}" data-lcc-target="${esc(id)}">${targeted?'✓ HEDEF SEÇİLDİ':'🎯 Hedef Seç'}</button>`:'';
 const attackBox=!isPlayer?`<div class="lcc-attack-box"><div class="lcc-mini"><b>${esc(attackName)}</b> • Saldırı ${esc(attackFormula||'tanımsız')} • Hasar ${esc(damageFormula||'—')}</div><button type="button" class="primary wide" data-lcc-creature-attack="${esc(id)}" ${isCurrent&&alive&&target&&configured?'':'disabled'}>${!alive?'Yaratık Düştü':!isCurrent?'Sırası Değil':!configured?'Saldırı Zarı Tanımlı Değil':!target?'Önce Oyuncu Hedef Seç':'⚔ '+esc(target.name)+' → Saldır ve Turu Bitir'}</button>${result?`<div class="lcc-attack-result ${result.hit?'hit':'miss'}"><b>${esc(result.creature_name||x.name||'Yaratık')} → ${esc(result.target_name||'Hedef')}</b><div>Saldırı ${num(result.attack_total)} • ${result.hit?(result.critical?'KRİTİK İSABET':'İSABET'):'ISKA'}${result.hit?' • '+num(result.damage_total)+' hasar • HP '+num(result.target_hp)+'/'+num(result.target_hp_max):''}</div></div>`:''}</div>`:'';
 return `<article class="lcc-combatant ${isCurrent?'current':''} ${targeted?'targeted':''}"><div class="lcc-combatant-top"><div class="lcc-init">${num(x.initiative)}</div><div><b>${esc(x.name||'Savaşçı')}</b><div class="lcc-mini">${kind} • AC ${x.ac??'?'}${isCurrent?' • SIRA BUNDA':''}</div><div class="lcc-hp">HP ${x.hp_current??'?'} / ${x.hp_max??'?'}</div></div><button type="button" class="danger small" data-lcc-remove="${esc(id)}">Çıkar</button></div><div class="lcc-hp-edit"><label>HP Miktarı<input type="number" min="1" step="1" value="1" data-lcc-hp-amount="${esc(id)}" aria-label="${esc(x.name||'Savaşçı')} HP miktarı"></label><button type="button" class="danger" data-lcc-hp-apply="${esc(id)}" data-mode="damage">− Hasar</button><button type="button" data-lcc-hp-apply="${esc(id)}" data-mode="heal">+ İyileştir</button></div><div class="lcc-actions"><button type="button" data-lcc-init="${esc(id)}">İnisiyatif At</button>${targetAction}</div>${targeted?'<div class="lcc-target-note">🎯 YARATIK HEDEFİ • Sonraki yaratık saldırısı bu oyuncuya gider.</div>':''}${attackBox}</article>`;
}
function boardHtml(d){
 const s=d.state||{},active=!!s.active,cs=d.combatants||[],current=s.current_combatant_id;
 const livingPlayers=cs.filter(x=>x.kind==='player'&&(x.hp_current==null||num(x.hp_current)>0));
 if(selectedTargetId&&!livingPlayers.some(x=>String(x.id)===String(selectedTargetId)))selectedTargetId='';
 const partyChars=(d.chars||[]).filter(c=>c.data?.cc_party_member===true);
 const available=partyChars.filter(c=>!cs.some(x=>String(x.character_id)===String(c.id)));
 const charOptions=available.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');
 const condOptions=partyChars.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');
 const conditions=(d.conditions||[]).filter(x=>partyChars.some(c=>String(c.id)===String(x.character_id))).map(x=>{const c=partyChars.find(y=>String(y.id)===String(x.character_id));return `<div class="lcc-cond"><div><b>${esc(c?.name||'Karakter')} • ${esc(x.name)}</b><div class="lcc-mini">${x.remaining_rounds==null?'Süresiz':x.remaining_rounds+' round'}${x.note?' • '+esc(x.note):''}</div></div><button type="button" class="danger small" data-lcc-cond-remove="${esc(x.id)}">Kaldır</button></div>`}).join('');
 const creatureOptions=(d.templates||[]).map(t=>`<option value="${esc(t.id)}" data-name="${esc(t.name)}" data-type="${esc(t.creature_type||'')}" data-hp="${num(t.hp)||1}" data-ac="${num(t.ac)||10}" data-attack-name="${esc(t.attack_name||'')}" data-attack="${esc(t.attack_formula||'')}" data-damage="${esc(t.damage_formula||'')}">${esc(t.name)} • HP ${num(t.hp)||1} • AC ${num(t.ac)||10}${t.attack_formula?' • '+esc(t.attack_formula):''}</option>`).join('');
 return `<section class="lcc-board" data-lcc-board><div class="lcc-columns"><section class="card lcc-col"><div class="lcc-head"><div><div class="eyebrow">SAVAŞ KONTROLÜ</div><h2>${active?esc(s.name||'Savaş'):'Savaş Hazır'}</h2><div class="lcc-mini">${active?`Round ${num(s.round)||1} • ${cs.length} katılımcı`:'Savaş başlatınca tur ve durum kontrolleri burada çalışır.'}</div></div><span class="lcc-status ${active?'on':''}">${active?'● AKTİF':'BEKLEMEDE'}</span></div>${active?`<div class="lcc-actions"><button type="button" class="primary" data-lcc-next>Sonraki Tur ▶</button><button type="button" class="danger" data-lcc-end>Savaşı Bitir</button></div><hr><div class="eyebrow">OYUNCU EKLE</div><div class="lcc-toolbar"><label class="wide">Karakter<select id="lcc-add-char">${charOptions||'<option value="">Tüm canlı karakterler eklendi</option>'}</select></label><label>İnisiyatif<input id="lcc-char-init" type="number" placeholder="boş = otomatik"></label><button type="button" data-lcc-add-char>Oyuncu Ekle</button></div><hr><div class="eyebrow">DÜŞMAN EKLE</div><div class="lcc-toolbar"><label class="wide">Yaratık Kütüphanesi<select id="lcc-enemy-template"><option value="">Elle oluştur</option>${creatureOptions}</select></label><label class="wide">Ad<input id="lcc-enemy-name" placeholder="Örn. Çatlak Avcısı"></label><label>Tür<input id="lcc-enemy-type" placeholder="Örn. Goblinoid"></label><label>HP<input id="lcc-enemy-hp" type="number" min="1" value="10"></label><label>AC<input id="lcc-enemy-ac" type="number" value="10"></label><label>Saldırı adı<input id="lcc-enemy-attack-name" placeholder="Örn. Pençe"></label><label>Saldırı zarı<input id="lcc-enemy-attack" placeholder="Örn. 1d20+5"></label><label>Hasar zarı<input id="lcc-enemy-damage" placeholder="Örn. 1d4"></label><label>Sayı<input id="lcc-enemy-count" type="number" min="1" max="20" value="1"></label><label>İnisiyatif<input id="lcc-enemy-init" type="number" placeholder="boş = her biri d20"></label><button type="button" class="primary" data-lcc-add-enemy>Düşman Ekle</button></div>`:`<div class="lcc-toolbar"><label class="wide">Savaş Adı<input id="lcc-combat-name" value="Karşılaşma"></label><button type="button" class="primary wide" data-lcc-start>Savaşı Başlat</button></div>`}</section><section class="card lcc-col"><div class="eyebrow">TUR SIRASI</div><h2>İnisiyatif</h2>${active?(cs.length?cs.map(x=>combatantHtml(x,current,cs)).join(''):'<div class="lcc-empty">Henüz katılımcı eklenmedi.</div>'):'<div class="lcc-empty">Savaş başlatıldığında tur sırası burada görünür.</div>'}</section><section class="card lcc-col lcc-conditions"><div class="eyebrow">DURUM ETKİLERİ</div><h2>Karakter Durumları</h2><div class="lcc-toolbar"><label class="wide">Karakter<select id="lcc-cond-char">${condOptions||'<option value="">Canlı karakter yok</option>'}</select></label><label class="wide">Hazır Durum<select id="lcc-cond-preset"><option>Zehirli</option><option>Sersemlemiş</option><option>Yanıyor</option><option>Kanıyor</option><option>Kör</option><option>Lanetli</option><option>Korkmuş</option><option>Yavaşlamış</option><option value="">Özel / Elle Yaz</option></select></label><label class="wide">Özel ad<input id="lcc-cond-name" placeholder="Hazır durum seçiliyse boş bırak"></label><label>Round<input id="lcc-cond-rounds" type="number" min="0" max="99" value="0" title="0 = süresiz"></label><label class="wide">Oyuncuya görünen not<textarea id="lcc-cond-note" placeholder="Örn. Saldırı zarlarına -1"></textarea></label><button type="button" class="primary wide" data-lcc-cond-add>Durum Ekle</button></div><hr>${conditions||'<div class="lcc-empty">Aktif durum etkisi yok.</div>'}</section></div></section>`;
}
async function autoEndClearedCombat(d){
 const state=d?.state||{},enemies=(d?.combatants||[]).filter(x=>x.kind==='enemy');
 if(!state.active){hadEnemyInCurrentCombat=false;return false}
 if(enemies.length)hadEnemyInCurrentCombat=true;
 if(!hadEnemyInCurrentCombat)return false;
 if(enemies.some(x=>num(x.hp_current)>0))return false;
 if(autoEndBusy)return false;
 autoEndBusy=true;
 try{
  const r=await S.rpc('catlak_gm_combat_end');if(r.error)throw r.error;
  d.state={...state,active:false,current_combatant_id:null};
  toast('Tüm yaratıklar düştü • savaş otomatik sona erdi.');
  hadEnemyInCurrentCombat=false;
  return true;
 }catch(e){console.warn('LCC_AUTO_END',e);return false}
 finally{autoEndBusy=false}
}
function formInteractionActive(){
 const a=document.activeElement;
 return !!(a&&APP.contains(a)&&a.closest?.('[data-lcc-board]')&&a.matches?.('select,input,textarea'));
}
function formInteractionLocked(){
 return Date.now()<interactionUntil||formInteractionActive();
}
function holdFormInteraction(ms=1800){
 interactionUntil=Math.max(interactionUntil,Date.now()+ms);
}
async function render(force=false){
 wrapOldCombatRoute();
 if(!liveActive())return false;
 const main=APP.querySelector('main');if(!main)return false;
 if(main.querySelector('[data-lcc-board]')&&formInteractionLocked()&&!actionBusy){deferredRender=true;return true}
 const restored=restoreCachedBoard(main);
 if(restored&&!force){setTimeout(()=>render(true),0);return true}
 if(!force&&main.querySelector('[data-lcc-board]'))return true;
 if(busy)return false;
 busy=true;
 try{
  const d=await loadData();
  if(!liveActive()||APP.querySelector('main')!==main)return false;
  await autoEndClearedCombat(d);
  const nextHtml=boardHtml(d),sig=JSON.stringify([selectedTargetId,d.state?.active,d.state?.name,d.state?.round,d.state?.current_combatant_id,(d.combatants||[]).map(x=>[x.id,x.character_id,x.kind,x.name,x.initiative,x.hp_current,x.hp_max,x.ac,x.attack_name,x.attack_formula,x.damage_formula]),(d.conditions||[]).map(x=>[x.id,x.character_id,x.name,x.remaining_rounds,x.note]),(d.chars||[]).map(x=>[x.id,x.name,x.hp_current,x.hp_max,x.data?.cc_party_member]),(d.templates||[]).map(x=>[x.id,x.name,x.hp,x.ac])]);
  cachedBoardHtml=nextHtml;
  if(main.querySelector('[data-lcc-board]')&&sig===liveSig){try{window.__catlakViewRuntime?.ready?.('gm-live')}catch(_){};return true}
  liveSig=sig;
  const anchor=main.querySelector('.cc-live-two');
  main.querySelector('[data-lcc-board]')?.remove();
  if(anchor?.parentNode)anchor.insertAdjacentHTML('afterend',cachedBoardHtml);
  else main.insertAdjacentHTML('beforeend',cachedBoardHtml);
  try{window.__catlakViewRuntime?.ready?.('gm-live')}catch(_){}
  return true;
 }catch(e){console.error('LCC render',e);toast('Savaş masası yüklenemedi: '+(e?.message||String(e)));return false}finally{busy=false}
}
async function rpc(name,args,msg){
 if(actionBusy)return false;actionBusy=true;
 try{const r=await S.rpc(name,args||{});if(r.error)throw r.error;toast(typeof msg==='function'?msg(r.data):msg);return true}
 catch(e){toast('İşlem başarısız: '+(e?.message||String(e)));return false}
 finally{actionBusy=false;setTimeout(()=>render(true),20)}
}
async function addEnemies(){
 if(actionBusy)return;
 const count=Math.max(1,Math.min(20,Math.trunc(num(APP.querySelector('#lcc-enemy-count')?.value)||1)));
 const templateId=String(APP.querySelector('#lcc-enemy-template')?.value||'').trim();
 const name=String(APP.querySelector('#lcc-enemy-name')?.value||'').trim();
 const type=String(APP.querySelector('#lcc-enemy-type')?.value||'').trim();
 const hp=Math.max(1,num(APP.querySelector('#lcc-enemy-hp')?.value)||1);
 const ac=num(APP.querySelector('#lcc-enemy-ac')?.value)||10;
 const attackName=String(APP.querySelector('#lcc-enemy-attack-name')?.value||'').trim();
 const attackFormula=String(APP.querySelector('#lcc-enemy-attack')?.value||'').trim();
 const damageFormula=String(APP.querySelector('#lcc-enemy-damage')?.value||'').trim();
 const raw=APP.querySelector('#lcc-enemy-init')?.value;
 if(!templateId&&!name)return toast('Düşman adı gerekli.');
 if(!templateId&&!attackFormula)return toast('Saldırı zarı gerekli. Örn. 1d20+5');
 actionBusy=true;
 let added=0;
 try{
  for(let i=0;i<count;i++){
   let r;
   if(templateId){
    r=await S.rpc('catlak_gm_combat_add_template',{p_template_id:templateId,p_initiative:raw===''?null:Number(raw)});
   }else{
    const display=count>1?`${name} ${i+1}`:name;
    r=await S.rpc('catlak_gm_combat_add_creature',{
      p_name:display,p_hp:hp,p_ac:ac,p_initiative:raw===''?null:Number(raw),
      p_creature_type:type,p_attack_name:attackName,p_attack_formula:attackFormula,
      p_damage_formula:damageFormula,p_note:''
    });
   }
   if(r.error)throw r.error;
   added++;
  }
  toast(added+' yaratık savaşa eklendi • saldırı ve hasar zarları hazır.');
 }catch(e){
  toast('Yaratık eklenemedi'+(added?' • '+added+' tanesi eklendi':'')+': '+(e?.message||String(e)));
 }finally{
  actionBusy=false;
  cachedBoardHtml='';liveSig='';
  setTimeout(()=>render(true),20);
 }
}

async function creatureAttack(creatureId){
 if(actionBusy)return;
 if(!selectedTargetId)return toast('Önce Savaş Odası’ndan hedef oyuncuyu seç.');
 actionBusy=true;
 try{
  const r=await S.rpc('catlak_gm_creature_attack',{p_creature_id:creatureId,p_target_combatant_id:selectedTargetId});
  if(r.error)throw r.error;
  const d=r.data||{};
  lastAttackResult={...d,creature_id:creatureId,target_combatant_id:selectedTargetId};
  let nextName='';
  const n=await S.rpc('catlak_gm_combat_next_turn',{});
  if(n.error){
   toast((d.hit?`${d.creature_name}: ${d.damage_total} hasar`:`${d.creature_name}: ISKA`)+' • saldırı işlendi fakat tur otomatik geçirilemedi: '+n.error.message);
  }else{
   nextName=n.data?.name||n.data?.current_name||'—';
   toast((d.hit?`${d.creature_name}: ${d.critical?'KRİTİK • ':''}${d.damage_total} hasar`:`${d.creature_name}: ISKA`)+' • Tur → '+nextName);
  }
 }catch(e){
  toast('Yaratık saldırısı başarısız: '+(e?.message||String(e)));
 }finally{
  actionBusy=false;
  cachedBoardHtml='';liveSig='';
  setTimeout(()=>render(true),20);
 }
}
async function startCombat(){
 if(actionBusy)return;actionBusy=true;
 try{
  const snap=await S.from('catlak_character_abilities').select('id,uses_remaining,uses_per_combat');
  if(snap.error)throw new Error('Yetenek kullanım hakları okunamadı; savaş güvenli biçimde başlatılmadı: '+snap.error.message);
  const before=new Map((snap.data||[]).map(x=>[String(x.id),x.uses_remaining]));
  const start=await S.rpc('catlak_gm_combat_start',{p_name:APP.querySelector('#lcc-combat-name')?.value||'Savaş'});
  if(start.error)throw start.error;
  const after=await S.from('catlak_character_abilities').select('id,uses_remaining');
  if(after.error)throw after.error;
  const changed=(after.data||[]).filter(x=>before.has(String(x.id))&&before.get(String(x.id))!==x.uses_remaining);
  if(changed.length){
   const restored=await Promise.all(changed.map(x=>S.from('catlak_character_abilities').update({uses_remaining:before.get(String(x.id))}).eq('id',x.id)));
   const bad=restored.find(x=>x.error);if(bad?.error)throw new Error('Savaş başladı ancak yetenek hakları korunamadı: '+bad.error.message)
  }
  const [partyR,combatR]=await Promise.all([
   S.from('catlak_characters').select('id,name,data,play_status').eq('play_status','active').order('created_at',{ascending:true}),
   S.from('catlak_combatants').select('id,character_id,kind')
  ]);
  if(partyR.error)throw partyR.error;if(combatR.error)throw combatR.error;
  const existing=new Set((combatR.data||[]).filter(x=>x.kind==='player').map(x=>String(x.character_id||'')));
  const party=(partyR.data||[]).filter(c=>c.data?.cc_party_member===true);
  let added=0;
  for(const c of party){
    if(existing.has(String(c.id)))continue;
    const a=await S.rpc('catlak_gm_combat_add_character',{p_character_id:c.id,p_initiative:null});
    if(a.error)throw a.error;added++;
  }
  toast('Savaş başlatıldı • '+party.length+' parti üyesi hazır'+(added?' • '+added+' otomatik eklendi':'')+'.');
 }catch(e){toast('Savaş başlatılamadı: '+(e?.message||String(e)))}
 finally{actionBusy=false;setTimeout(()=>render(true),20)}
}

APP.addEventListener('click',e=>{
 if(!isGM())return;
 const start=e.target.closest?.('[data-lcc-start]');if(start){e.preventDefault();e.stopImmediatePropagation();startCombat();return}
 if(e.target.closest?.('[data-lcc-end]')){e.preventDefault();e.stopImmediatePropagation();if(confirm('Savaş sona erdirilsin mi?'))rpc('catlak_gm_combat_end',{},'Savaş sona erdi.');return}
 if(e.target.closest?.('[data-lcc-next]')){e.preventDefault();e.stopImmediatePropagation();rpc('catlak_gm_combat_next_turn',{},d=>`Sıra: ${d?.name||'?'} • Round ${d?.round||1}`);return}
 if(e.target.closest?.('[data-lcc-add-char]')){e.preventDefault();e.stopImmediatePropagation();const cid=APP.querySelector('#lcc-add-char')?.value,raw=APP.querySelector('#lcc-char-init')?.value;if(!cid)return toast('Eklenecek oyuncu yok.');rpc('catlak_gm_combat_add_character',{p_character_id:cid,p_initiative:raw===''?null:Number(raw)},'Oyuncu savaşa eklendi.');return}
 if(e.target.closest?.('[data-lcc-add-enemy]')){e.preventDefault();e.stopImmediatePropagation();addEnemies();return}
 const target=e.target.closest?.('[data-lcc-target]');if(target){e.preventDefault();e.stopImmediatePropagation();selectedTargetId=String(target.dataset.lccTarget||'');lastAttackResult=null;cachedBoardHtml='';liveSig='';render(true);return}
 const creatureAtk=e.target.closest?.('[data-lcc-creature-attack]');if(creatureAtk){e.preventDefault();e.stopImmediatePropagation();creatureAttack(creatureAtk.dataset.lccCreatureAttack);return}
 const rm=e.target.closest?.('[data-lcc-remove]');if(rm){e.preventDefault();e.stopImmediatePropagation();rpc('catlak_gm_combat_remove',{p_combatant_id:rm.dataset.lccRemove},'Savaşçı çıkarıldı.');return}
 const hp=e.target.closest?.('[data-lcc-hp-apply]');if(hp){e.preventDefault();e.stopImmediatePropagation();const id=String(hp.dataset.lccHpApply||''),input=APP.querySelector(`[data-lcc-hp-amount="${CSS.escape(id)}"]`),amount=Math.max(1,Math.trunc(Math.abs(num(input?.value)||1))),delta=hp.dataset.mode==='heal'?amount:-amount;rpc('catlak_gm_combat_adjust_hp',{p_combatant_id:id,p_delta:delta},d=>(delta<0?'Hasar uygulandı • ':'İyileştirme uygulandı • ')+'HP: '+d);return}
 const ini=e.target.closest?.('[data-lcc-init]');if(ini){e.preventDefault();e.stopImmediatePropagation();rpc('catlak_gm_combat_roll_initiative',{p_combatant_id:ini.dataset.lccInit},d=>'İnisiyatif: '+d);return}
 if(e.target.closest?.('[data-lcc-cond-add]')){e.preventDefault();e.stopImmediatePropagation();const cid=APP.querySelector('#lcc-cond-char')?.value,preset=APP.querySelector('#lcc-cond-preset')?.value||'',custom=APP.querySelector('#lcc-cond-name')?.value.trim()||'',name=custom||preset,note=APP.querySelector('#lcc-cond-note')?.value||'',rounds=num(APP.querySelector('#lcc-cond-rounds')?.value)||0;if(!cid||!name)return toast('Karakter ve durum adı gerekli.');rpc('catlak_gm_add_condition',{p_character_id:cid,p_name:name,p_note:note,p_rounds:rounds||null},'Durum oyuncuya gönderildi.');return}
 const cr=e.target.closest?.('[data-lcc-cond-remove]');if(cr){e.preventDefault();e.stopImmediatePropagation();rpc('catlak_gm_remove_condition',{p_condition_id:cr.dataset.lccCondRemove},'Durum kaldırıldı.');return}
},true);
APP.addEventListener('pointerdown',e=>{
 const field=e.target?.closest?.('[data-lcc-board] select,[data-lcc-board] input,[data-lcc-board] textarea');
 if(field)holdFormInteraction(field.tagName==='SELECT'?2600:1600);
},true);
APP.addEventListener('focusin',e=>{
 if(e.target?.matches?.('[data-lcc-board] select,[data-lcc-board] input,[data-lcc-board] textarea'))holdFormInteraction(1800);
},true);
APP.addEventListener('change',e=>{
 if(!isGM()||e.target?.id!=='lcc-enemy-template')return;
 holdFormInteraction(1400);
 const o=e.target.selectedOptions?.[0];if(!o||!o.value)return;
 const name=APP.querySelector('#lcc-enemy-name'),type=APP.querySelector('#lcc-enemy-type'),hp=APP.querySelector('#lcc-enemy-hp'),ac=APP.querySelector('#lcc-enemy-ac'),attackName=APP.querySelector('#lcc-enemy-attack-name'),attack=APP.querySelector('#lcc-enemy-attack'),damage=APP.querySelector('#lcc-enemy-damage');
 if(name)name.value=o.dataset.name||o.textContent.split(' • ')[0]||'';
 if(type)type.value=o.dataset.type||'';
 if(hp)hp.value=String(num(o.dataset.hp)||1);
 if(ac)ac.value=String(num(o.dataset.ac)||10);
 if(attackName)attackName.value=o.dataset.attackName||'';
 if(attack)attack.value=o.dataset.attack||'';
 if(damage)damage.value=o.dataset.damage||'';
},true);
APP.addEventListener('focusout',e=>{
 if(!e.target?.closest?.('[data-lcc-board]'))return;
 setTimeout(()=>{
   if(!formInteractionActive()&&Date.now()>=interactionUntil&&deferredRender){
     deferredRender=false;render(true)
   }
 },220);
},true);

function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;wrapOldCombatRoute();if(liveActive()){const main=APP.querySelector('main');if(!main?.querySelector('[data-lcc-board]'))try{window.__catlakViewRuntime?.begin?.('gm-live')}catch(_){}restoreCachedBoard(main);render(false)}else APP.querySelector('[data-lcc-board]')?.remove()})}
new MutationObserver(rs=>{
 const nav=APP.querySelector('.nav'),main=APP.querySelector('main');
 const structural=rs.some(r=>{
  if(r.target===APP||r.target===main)return true;
  if(nav&&(r.target===nav||nav.contains(r.target)))return true;
  return [...r.addedNodes].some(n=>n.nodeType===1&&(n.matches?.('main,.nav,.role,.cc-live-two')||n.querySelector?.('main,.nav,.role,.cc-live-two')));
 });
 if(structural||liveActive()&&!main?.querySelector('[data-lcc-board]'))schedule();
}).observe(APP,{childList:true,subtree:true});
const refresh=()=>{if(refreshQueued)return;refreshQueued=true;setTimeout(()=>{refreshQueued=false;if(actionBusy)return;if(liveActive()){if(formInteractionLocked()){deferredRender=true;return}render(true)}else preloadBoard()},45)};
S.channel('cc-live-combat-center').on('postgres_changes',{event:'*',schema:'public',table:'catlak_combat_state'},refresh).on('postgres_changes',{event:'*',schema:'public',table:'catlak_combatants'},refresh).on('postgres_changes',{event:'*',schema:'public',table:'catlak_character_conditions'},refresh).on('postgres_changes',{event:'*',schema:'public',table:'catlak_characters'},refresh).on('postgres_changes',{event:'*',schema:'public',table:'catlak_creature_templates'},refresh).subscribe();
if(liveActive())setTimeout(()=>preloadBoard(),0);
else if('requestIdleCallback'in window)requestIdleCallback(()=>preloadBoard(),{timeout:1600});
else setTimeout(()=>preloadBoard(),900);
setTimeout(schedule,100);setTimeout(schedule,850);
window.__catlakLiveCombatCenter={render:()=>render(true),restore:()=>restoreCachedBoard(APP.querySelector('main')),preload:preloadBoard,open:openLive,removeLegacy:removeOldCombatEntry,start:startCombat,addEnemies,attack:creatureAttack,selectedTarget:()=>selectedTargetId,actionBusy:()=>actionBusy};
})();