const BCC_S=window.__catlakSupabase;
const BCC_APP=document.querySelector('#app');
if(!BCC_S||!BCC_APP)throw new Error('Çatlak Çağı yaratık savaş katmanı başlatılamadı.');

const bccText=e=>String(e?.textContent||'').trim();
const bccIsGM=()=>bccText(BCC_APP.querySelector('.role'))==='GM';
const bccEsc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const bccNum=(x,f=0)=>Number.isFinite(Number(x))?Number(x):f;
const bccToast=x=>{const t=document.querySelector('#toast');if(!t)return;t.textContent=String(x);t.classList.remove('hidden');clearTimeout(bccToast.t);bccToast.t=setTimeout(()=>t.classList.add('hidden'),4200)};
let bccBusy=false,bccTimer=null,bccPlayerGen=0,bccLastSig='',bccTargetId='',bccLastResult=null;

if(!document.querySelector('#bcc-style')){
  const s=document.createElement('style');s.id='bcc-style';s.textContent=`
  .bcc-gm-form{width:100%;display:grid!important;grid-template-columns:repeat(4,minmax(120px,1fr));gap:10px!important;align-items:end}
  .bcc-gm-form .bcc-wide{grid-column:span 2}.bcc-gm-form textarea{min-height:70px}
  .bcc-creature-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:10px}
  .bcc-creature{border:1px solid var(--line);border-radius:14px;padding:13px;background:#0a1622;position:relative;overflow:hidden;transition:.15s ease}
  .bcc-creature.current{border-color:var(--gold);box-shadow:inset 0 0 0 1px #d6ad5b55}
  .bcc-creature.selected{border-color:var(--cyan);box-shadow:0 0 0 2px #69d7ff22,inset 0 0 0 1px #69d7ff55}
  .bcc-creature.dead{opacity:.62}.bcc-creature h3{margin:4px 0 7px}.bcc-creature-top{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}
  .bcc-creature-vitals{display:flex;gap:7px;flex-wrap:wrap;margin:8px 0}.bcc-creature-vitals span{border:1px solid var(--line);border-radius:999px;padding:4px 8px;font-size:.76rem}
  .bcc-creature-attack{margin-top:8px;padding:8px 9px;border:1px solid #4a3e27;border-radius:10px;background:#17150f}
  .bcc-creature-note{margin-top:8px;color:var(--muted);white-space:pre-wrap;font-size:.84rem}
  .bcc-target-actions{display:flex;justify-content:flex-end;margin-top:10px}.bcc-target-actions button.on{border-color:var(--cyan);color:var(--cyan)}
  .bcc-weapon-target{margin:8px 0;padding:8px 10px;border:1px solid var(--line);border-radius:10px;background:#07111d;font-size:.82rem}.bcc-weapon-target b{color:var(--cyan)}
  .bcc-strike-result{border:1px solid var(--line);border-radius:14px;padding:12px;margin-top:10px;background:#0a1622}.bcc-strike-result.hit{border-color:#4f7b4e}.bcc-strike-result.miss{border-color:#784c4c}.bcc-strike-result .bcc-big{font-size:1.25rem;font-weight:900}.bcc-strike-result .hitword{color:#bde890}.bcc-strike-result .missword{color:#ff9d9d}
  @media(max-width:900px){.bcc-gm-form{grid-template-columns:1fr 1fr}.bcc-gm-form .bcc-wide{grid-column:span 2}}
  @media(max-width:560px){.bcc-gm-form{grid-template-columns:1fr}.bcc-gm-form .bcc-wide{grid-column:span 1}}
  `;document.head.appendChild(s);
}

function bccEnsureGMForm(){
  if(!bccIsGM())return;
  const old=BCC_APP.querySelector('main [data-gmt-add-enemy]');
  if(!old)return;
  const row=old.closest('.gmt-toolbar');if(!row)return;
  row.classList.add('bcc-gm-form');
  row.innerHTML=`
    <label>Yaratık adı<input id="bcc-name" placeholder="Örn. Goblin"></label>
    <label>Tür<input id="bcc-type" placeholder="Örn. Goblinoid"></label>
    <label>HP<input id="bcc-hp" type="number" min="1" value="10"></label>
    <label>AC<input id="bcc-ac" type="number" min="0" value="10"></label>
    <label>İnisiyatif<input id="bcc-init" type="number" placeholder="boş = 20 at"></label>
    <label>Saldırı adı<input id="bcc-attack-name" placeholder="Örn. Kısa Kılıç"></label>
    <label>Saldırı zarı<input id="bcc-attack-formula" placeholder="Örn. 20+4"></label>
    <label>Hasar<input id="bcc-damage-formula" placeholder="Örn. 1d6+2"></label>
    <label class="bcc-wide">Oyuncuya görünen açıklama<textarea id="bcc-note" placeholder="Örn. Küçük, çevik ve saldırgan bir yaratık."></textarea></label>
    <button type="button" class="primary" data-bcc-add-creature>Yaratık Ekle</button>`;
  const eyebrow=row.closest('section.card')?.querySelector('.eyebrow');
  if(eyebrow&&bccText(eyebrow)==='KATILIMCI EKLE')eyebrow.textContent='OYUNCU / YARATIK EKLE';
}

async function bccAddCreature(btn){
  if(bccBusy||!bccIsGM())return;bccBusy=true;btn.disabled=true;
  try{
    const name=BCC_APP.querySelector('#bcc-name')?.value.trim()||'';
    if(!name)throw new Error('Yaratık adı gerekli.');
    const rawInit=BCC_APP.querySelector('#bcc-init')?.value.trim()||'';
    const args={
      p_name:name,
      p_hp:Math.max(1,bccNum(BCC_APP.querySelector('#bcc-hp')?.value,10)),
      p_ac:Math.max(0,bccNum(BCC_APP.querySelector('#bcc-ac')?.value,10)),
      p_initiative:rawInit===''?null:bccNum(rawInit,0),
      p_creature_type:BCC_APP.querySelector('#bcc-type')?.value.trim()||'',
      p_attack_name:BCC_APP.querySelector('#bcc-attack-name')?.value.trim()||'',
      p_attack_formula:BCC_APP.querySelector('#bcc-attack-formula')?.value.trim()||'',
      p_damage_formula:BCC_APP.querySelector('#bcc-damage-formula')?.value.trim()||'',
      p_note:BCC_APP.querySelector('#bcc-note')?.value.trim()||''
    };
    const r=await BCC_S.rpc('catlak_gm_combat_add_creature',args);if(r.error)throw r.error;
    bccToast(`${name} savaşa eklendi; oyuncu Savaş Odası'na yansıtıldı.`);
    ['#bcc-name','#bcc-type','#bcc-attack-name','#bcc-attack-formula','#bcc-damage-formula','#bcc-note','#bcc-init'].forEach(q=>{const e=BCC_APP.querySelector(q);if(e)e.value=''});
  }catch(e){bccToast('Yaratık eklenemedi: '+(e?.message||String(e)))}finally{bccBusy=false;btn.disabled=false}
}

function bccCreatureCard(x){
  const hp=bccNum(x.hp_current),max=bccNum(x.hp_max),dead=max>0&&hp<=0,selected=String(x.id)===String(bccTargetId);
  const attack=[x.attack_name,x.attack_formula].filter(Boolean).map(bccEsc).join(' • ');
  return `<article class="bcc-creature ${x.is_current?'current':''} ${selected?'selected':''} ${dead?'dead':''}" data-bcc-creature-card="${bccEsc(x.id)}">
    <div class="bcc-creature-top"><div><div class="eyebrow">${bccEsc(x.creature_type||'YARATIK')}</div><h3>${bccEsc(x.name||'Yaratık')}</h3></div>${x.is_current?'<span class="ccr-pill ccr-turn">SIRA</span>':dead?'<span class="ccr-pill">DÜŞTÜ</span>':''}</div>
    <div class="bcc-creature-vitals"><span><b>HP</b> ${hp}/${max}</span><span><b>AC</b> ${bccNum(x.ac)}</span><span><b>İnisiyatif</b> ${bccNum(x.initiative)}</span></div>
    ${attack||x.damage_formula?`<div class="bcc-creature-attack"><b>${attack||'Saldırı'}</b>${x.damage_formula?`<div class="mini muted">Hasar: ${bccEsc(x.damage_formula)}</div>`:''}</div>`:''}
    ${x.public_note?`<div class="bcc-creature-note">${bccEsc(x.public_note)}</div>`:''}
    <div class="bcc-target-actions">${dead?'<button type="button" disabled>Düştü</button>':`<button type="button" class="${selected?'on':''}" data-bcc-target="${bccEsc(x.id)}">${selected?'✓ Hedef Seçildi':'Hedef Seç'}</button>`}</div>
  </article>`;
}

function bccResultHtml(r){
  if(!r)return'';
  const hit=!!r.hit,crit=!!r.critical;
  return `<div class="bcc-strike-result ${hit?'hit':'miss'}" data-bcc-result>
    <div class="eyebrow">SON SALDIRI • ${bccEsc(r.target_name||'Hedef')}</div>
    <div class="bcc-big">Saldırı ${bccNum(r.attack_total)} → <span class="${hit?'hitword':'missword'}">${hit?(crit?'KRİTİK İSABET':'İSABET'):'ISKA'}</span></div>
    ${hit?`<div><b>${bccNum(r.damage_total)} hasar</b> • Hedef HP ${bccNum(r.target_hp)}/${bccNum(r.target_hp_max)}</div>`:`<div class="muted">Hedef AC ${bccNum(r.target_ac)}</div>`}
  </div>`;
}

function bccEnhanceWeapons(snapshot){
  if(bccIsGM()||window.__catlakBattleRoomOpen!==true)return;
  const enemies=(snapshot?.order||[]).filter(x=>x.kind==='enemy'&&bccNum(x.hp_current)>0);
  if(bccTargetId&&!enemies.some(x=>String(x.id)===String(bccTargetId)))bccTargetId='';
  const target=enemies.find(x=>String(x.id)===String(bccTargetId))||null;
  BCC_APP.querySelectorAll('main .ccr-weapon').forEach(card=>{
    const old=[...card.querySelectorAll('[data-ccr-weapon]')];
    const invId=old[0]?.dataset.ccrWeapon||card.dataset.bccInv||'';
    if(invId)card.dataset.bccInv=invId;
    old.forEach(x=>x.remove());
    card.querySelector('[data-bcc-weapon-actions]')?.remove();
    const box=document.createElement('div');box.dataset.bccWeaponActions='1';
    box.innerHTML=`<div class="bcc-weapon-target">Hedef: <b>${target?bccEsc(target.name):'Seçilmedi'}</b>${!snapshot?.is_my_turn?' • <span class="muted">Sıra sende değil</span>':''}</div><div class="actions"><button type="button" class="primary" data-bcc-strike="${bccEsc(invId)}" ${!invId||!target||!snapshot?.is_my_turn?'disabled':''}>⚔ Hedefe Vur</button></div>`;
    card.appendChild(box);
  });
  const weaponSection=[...BCC_APP.querySelectorAll('main section.card')].find(s=>bccText(s.querySelector('.eyebrow'))==='TAKILI SİLAHLAR');
  if(weaponSection){
    weaponSection.querySelector('[data-bcc-result]')?.remove();
    if(bccLastResult)weaponSection.insertAdjacentHTML('beforeend',bccResultHtml(bccLastResult));
  }
}

async function bccStrike(btn){
  if(bccBusy)return;
  const invId=btn.dataset.bccStrike;if(!invId)throw new Error('Silah bulunamadı.');
  if(!bccTargetId)throw new Error('Önce bir yaratık hedefle.');
  bccBusy=true;btn.disabled=true;btn.textContent='Atılıyor…';
  try{
    const r=await BCC_S.rpc('catlak_player_weapon_strike',{p_inventory_id:invId,p_target_id:bccTargetId});
    if(r.error)throw r.error;
    bccLastResult=r.data||null;bccLastSig='';
    const d=r.data||{};
    bccToast(d.hit?`${d.target_name}: ${d.critical?'KRİTİK İSABET':'İSABET'} • ${d.damage_total} hasar`:`${d.target_name}: ISKA (${d.attack_total})`);
    if(bccNum(d.target_hp)<=0)bccTargetId='';
    if(window.__catlakRoomSystemTest?.renderBattle)await window.__catlakRoomSystemTest.renderBattle(true);
    await bccPaintPlayer(true);
  }finally{bccBusy=false;btn.disabled=false;btn.textContent='⚔ Hedefe Vur'}
}

async function bccPaintPlayer(force=false){
  if(bccIsGM()||window.__catlakBattleRoomOpen!==true)return;
  const main=BCC_APP.querySelector('main');if(!main)return;
  const gen=++bccPlayerGen;
  try{
    const r=await BCC_S.rpc('catlak_player_combat_snapshot');if(r.error)throw r.error;
    if(gen!==bccPlayerGen||bccIsGM()||window.__catlakBattleRoomOpen!==true||BCC_APP.querySelector('main')!==main)return;
    const s=r.data||{},enemies=(s.order||[]).filter(x=>x.kind==='enemy');
    if(bccTargetId&&!enemies.some(x=>String(x.id)===String(bccTargetId)&&bccNum(x.hp_current)>0))bccTargetId='';
    const sig=JSON.stringify(enemies.map(x=>[x.id,x.hp_current,x.hp_max,x.ac,x.initiative,x.name,x.creature_type,x.attack_name,x.attack_formula,x.damage_formula,x.public_note,x.is_current,String(x.id)===String(bccTargetId),s.is_my_turn]));
    if(!force&&sig===bccLastSig&&main.querySelector('[data-bcc-creatures]')){bccEnhanceWeapons(s);return}bccLastSig=sig;
    main.querySelector('[data-bcc-creatures]')?.remove();
    if(s.active&&enemies.length){
      const sec=document.createElement('section');sec.className='card';sec.dataset.bccCreatures='1';
      sec.innerHTML=`<div class="eyebrow">KARŞILAŞMADAKİ YARATIKLAR</div><h2>${enemies.length} Yaratık</h2><p class="muted">Önce hedefini seç, sonra aşağıdaki kuşanılmış silahlarından biriyle vur.</p><div class="bcc-creature-grid">${enemies.map(bccCreatureCard).join('')}</div>`;
      const order=main.querySelector('.ccr-order')?.closest('section.card');
      if(order)order.insertAdjacentElement('afterend',sec);else main.appendChild(sec);
    }
    bccEnhanceWeapons(s);
  }catch(e){if(force)bccToast('Savaş bilgisi yüklenemedi: '+(e?.message||String(e)))}
}

function bccInstall(){bccEnsureGMForm();if(!bccIsGM()&&window.__catlakBattleRoomOpen===true)bccPaintPlayer()}
function bccSoon(delay=70){clearTimeout(bccTimer);bccTimer=setTimeout(bccInstall,delay)}

document.addEventListener('click',e=>{
  const add=e.target.closest?.('[data-bcc-add-creature]');
  if(add){e.preventDefault();e.stopImmediatePropagation();bccAddCreature(add);return}
  const target=e.target.closest?.('[data-bcc-target]');
  if(target){e.preventDefault();e.stopImmediatePropagation();bccTargetId=target.dataset.bccTarget||'';bccLastSig='';bccPaintPlayer(true);return}
  const strike=e.target.closest?.('[data-bcc-strike]');
  if(strike){e.preventDefault();e.stopImmediatePropagation();bccStrike(strike).catch(x=>bccToast('Saldırı başarısız: '+(x?.message||String(x))));return}
},true);

new MutationObserver(()=>bccSoon()).observe(BCC_APP,{childList:true,subtree:true});
BCC_S.channel('cc-battle-creatures-live').on('postgres_changes',{event:'*',schema:'public',table:'catlak_combatants'},()=>{bccLastSig='';bccSoon(80)}).on('postgres_changes',{event:'*',schema:'public',table:'catlak_combat_state'},()=>{bccLastSig='';bccSoon(80)}).subscribe();
setInterval(()=>{bccInstall()},1800);
setTimeout(()=>bccInstall(),220);
window.__catlakBattleCreatureTest={install:bccInstall,paint:bccPaintPlayer,strike:bccStrike};
