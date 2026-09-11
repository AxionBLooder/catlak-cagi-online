const BAS_S=window.__catlakSupabase;
const BAS_APP=document.querySelector('#app');
if(!BAS_S||!BAS_APP)throw new Error('Çatlak Çağı savaş aksiyon stabilitesi başlatılamadı.');

const basTxt=e=>String(e?.textContent||'').trim();
const basIsGM=()=>basTxt(BAS_APP.querySelector('.role'))==='GM';
const basBattleView=()=>!basIsGM()&&(window.__catlakBattleRoomOpen===true||BAS_APP.querySelector('.nav [data-ccr-battle]')?.classList.contains('on')||BAS_APP.querySelector('main')?.dataset.ccrBattle==='1');
const basToast=x=>{const t=document.querySelector('#toast');if(!t)return;t.textContent=String(x);t.classList.remove('hidden');clearTimeout(basToast.t);basToast.t=setTimeout(()=>t.classList.add('hidden'),4200)};
let basTargetId='',basBusy=false,basHealTimer=null,basBlocked=0,basScrollLockUntil=0,basScrollY=0;

function basFreeze(ms=900,reason='battle-action'){
  basScrollY=window.scrollY;basScrollLockUntil=Date.now()+ms;
  window.__catlakStabilityFreeze?.(ms,reason);
  const restore=()=>{if(Date.now()<=basScrollLockUntil&&Math.abs(window.scrollY-basScrollY)>2)window.scrollTo({top:basScrollY,left:0,behavior:'auto'})};
  requestAnimationFrame(restore);setTimeout(restore,35);setTimeout(restore,120);setTimeout(restore,320);setTimeout(restore,650);
}
function basLooksBaseBattle(v){return typeof v==='string'&&(v.includes('OYUNCU • SAVAŞ ODASI')||v.includes('⚔ SAVAŞ ODASI'))}
function basIsExitBase(v){return typeof v==='string'&&(v.includes('Savaş Hazır')||v.includes('Karakter bulunamadı')||v.includes('GM henüz karakterini karşılaşmaya eklemedi'))}
function basV3Owns(main){return !!main?.querySelector('[data-br3-creatures],[data-br3-abilities],[data-br3-turn]')}

// Eski room-system 2.5 saniyede bir aktif savaş HTML'ini baştan yazıyor.
// V3 aksiyonları ekrana yerleştikten sonra bu taban yazımı artık kabul edilmez.
// Savaşın bitmesi / karakterin savaştan çıkması gibi gerçek ekran geçişleri serbesttir.
if(!window.__catlakBattleActionBaseGuardInstalled){
  const desc=Object.getOwnPropertyDescriptor(Element.prototype,'innerHTML');
  if(desc?.get&&desc?.set){
    Object.defineProperty(Element.prototype,'innerHTML',{
      configurable:desc.configurable,enumerable:desc.enumerable,get:desc.get,
      set:function(value){
        const main=BAS_APP.querySelector('main');
        if(this===main&&basBattleView()&&basV3Owns(main)&&basLooksBaseBattle(value)&&!basIsExitBase(value)){
          basBlocked++;window.__catlakBattleBaseRenderBlocked=basBlocked;return;
        }
        return desc.set.call(this,value);
      }
    });
    window.__catlakBattleActionBaseGuardInstalled=true;
  }
}

async function basSnapshot(){const r=await BAS_S.rpc('catlak_player_combat_snapshot');if(r.error)throw r.error;return r.data||{}}
async function basRequireTurn(){const s=await basSnapshot();if(!s.active)throw new Error('Aktif savaş yok.');if(!s.in_combat)throw new Error('Karakterin savaşa eklenmemiş.');if(!s.is_my_turn)throw new Error(`Sıra sende değil${s.current_name?' • Sıra: '+s.current_name:''}`);return s}
function basSelectedTarget(){return basTargetId||BAS_APP.querySelector('[data-br3-creatures] .br3-card.selected [data-br3-target]')?.dataset.br3Target||''}
function basRefresh(){clearTimeout(basHealTimer);basHealTimer=setTimeout(()=>{if(!basBattleView())return;window.__catlakBattleRoomV3Test?.render?.(true);window.__catlakBattleCompactTest?.arrange?.();window.__catlakBattleActionsLayoutTest?.apply?.()},25)}

async function basStrike(btn){
  if(basBusy)return;const inv=btn.dataset.br3Strike,target=basSelectedTarget();if(!inv)throw new Error('Kuşanılmış silah bulunamadı.');if(!target)throw new Error('Önce bir yaratık hedefle.');
  basBusy=true;basFreeze(1100,'weapon-strike');
  try{await basRequireTurn();const r=await BAS_S.rpc('catlak_player_weapon_strike',{p_inventory_id:inv,p_target_id:target});if(r.error)throw r.error;const d=r.data||{};basToast(d.hit?`${d.target_name||'Hedef'}: ${d.critical?'KRİTİK İSABET':'İSABET'} • ${Number(d.damage_total)||0} hasar`:`${d.target_name||'Hedef'}: ISKA${d.attack_total!=null?' ('+d.attack_total+')':''}`);if(d.defeated||Number(d.target_hp)<=0)basTargetId='';basRefresh()}finally{basBusy=false}
}
async function basUse(btn){
  if(basBusy)return;const id=btn.dataset.br3Use;if(!id)throw new Error('Yetenek bulunamadı.');const sel=BAS_APP.querySelector(`[data-br3-ability-target="${CSS.escape(id)}"]`),target=sel?.value||null;
  basBusy=true;basFreeze(1100,'ability-use');
  try{await basRequireTurn();const r=await BAS_S.rpc('catlak_player_use_ability',{p_assignment_id:id,p_target_id:target});if(r.error)throw r.error;const d=r.data||{};let msg=d.ability||'Yetenek';if(d.hit===false)msg+=': ISKA';else if(d.effect_type==='damage')msg+=`: ${Number(d.amount)||0} hasar`;else if(d.effect_type==='heal')msg+=`: ${Number(d.amount)||0} iyileştirme`;else msg+=' kullanıldı';basToast(msg);if(d.defeated&&String(target)===String(basTargetId))basTargetId='';basRefresh()}finally{basBusy=false}
}
async function basEndTurn(){
  if(basBusy)return;basBusy=true;basFreeze(850,'end-turn');
  try{await basRequireTurn();const r=await BAS_S.rpc('catlak_player_end_turn');if(r.error)throw r.error;basToast('Tur bitti'+(r.data?.name?' • Sıradaki: '+r.data.name:''));basRefresh()}finally{basBusy=false}
}
function basTarget(btn){basTargetId=String(btn.dataset.br3Target||'');basFreeze(500,'target-select');window.__catlakBattleRoomV3Test?.target?.(basTargetId);setTimeout(()=>{window.__catlakBattleCompactTest?.arrange?.();window.__catlakBattleActionsLayoutTest?.apply?.()},30)}

// V3 butonlarını eski/stale disabled durumundan kurtar. Gerçek yetki her aksiyonda RPC öncesi tekrar doğrulanır.
function basHealButtons(){
  if(!basBattleView())return;
  BAS_APP.querySelectorAll('[data-br3-strike],[data-br3-use]').forEach(b=>{if(b.disabled)b.disabled=false;b.setAttribute('aria-live','polite')});
  if(!basV3Owns(BAS_APP.querySelector('main')))basRefresh();
}
function basScheduleHeal(ms=40){clearTimeout(basHealTimer);basHealTimer=setTimeout(basHealButtons,ms)}

// window/capture document'tan önce çalışır; eski document handlerlarının aynı aksiyonu ikinci kez çalıştırmasını engeller.
window.addEventListener('pointerdown',e=>{
  if(!basBattleView()||basIsGM()||(e.button!=null&&e.button!==0))return;
  const target=e.target.closest?.('[data-br3-target]');if(target){e.preventDefault();e.stopImmediatePropagation();basTarget(target);return}
  const strike=e.target.closest?.('[data-br3-strike]');if(strike){e.preventDefault();e.stopImmediatePropagation();basStrike(strike).catch(x=>basToast('Saldırı başarısız: '+(x?.message||String(x))));return}
  const use=e.target.closest?.('[data-br3-use]');if(use){e.preventDefault();e.stopImmediatePropagation();basUse(use).catch(x=>basToast('Yetenek kullanılamadı: '+(x?.message||String(x))));return}
  const end=e.target.closest?.('[data-br3-end-turn]');if(end){e.preventDefault();e.stopImmediatePropagation();basEndTurn().catch(x=>basToast(x?.message||String(x)));return}
},true);
window.addEventListener('click',e=>{if(!basBattleView())return;const b=e.target.closest?.('[data-br3-target],[data-br3-strike],[data-br3-use],[data-br3-end-turn]');if(b){e.preventDefault();e.stopImmediatePropagation()}},true);

new MutationObserver(()=>basScheduleHeal(55)).observe(BAS_APP,{childList:true,subtree:true});
BAS_S.channel('cc-battle-action-stability')
 .on('postgres_changes',{event:'*',schema:'public',table:'catlak_combat_state'},()=>{if(basBattleView())basRefresh()})
 .on('postgres_changes',{event:'*',schema:'public',table:'catlak_combatants'},()=>{if(basBattleView())basRefresh()})
 .on('postgres_changes',{event:'*',schema:'public',table:'catlak_character_abilities'},()=>{if(basBattleView())basRefresh()})
 .subscribe();
setInterval(()=>{if(basBattleView()){basHealButtons();if(!basV3Owns(BAS_APP.querySelector('main')))basRefresh()}},1400);
setTimeout(basHealButtons,180);
window.__catlakBattleActionStabilityTest={heal:basHealButtons,refresh:basRefresh,snapshot:basSnapshot,blocked:()=>window.__catlakBattleBaseRenderBlocked||0,target:()=>basTargetId};
