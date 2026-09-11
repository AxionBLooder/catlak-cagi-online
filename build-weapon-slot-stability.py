from pathlib import Path
import re
import sys

root=Path(sys.argv[1] if len(sys.argv)>1 else '_site')

def must_replace(text,old,new,label):
    if old not in text:
        raise SystemExit(f'{label}: beklenen parça bulunamadı')
    return text.replace(old,new,1)

def must_sub(text,pattern,repl,label):
    out,count=re.subn(pattern,repl,text,count=1,flags=re.S)
    if count!=1:
        raise SystemExit(f'{label}: beklenen blok bulunamadı ({count})')
    return out

# Silah kartı ilk çizildiği anda yuva düğmelerini de üret.
# Böylece slot katmanının sonradan DOM'a düğme eklemesine gerek kalmaz.
p=root/'player-live-actions-patch.js'
s=p.read_text(encoding='utf-8')
old='''    actions=`<button type="button" data-a="equip" data-id="${r.id}" data-v="${r.equipped?'0':'1'}">${r.equipped?'Çıkar':'Kuşan'}</button><button type="button" class="primary" data-a="weapon" data-id="${r.id}" data-k="attack">Saldırı At</button><button type="button" data-a="weapon" data-id="${r.id}" data-k="damage">Hasar Vur</button>`;'''
new='''    const mainOn=!!r.equipped&&String(r.equipped_slot||'')==='main_weapon',offOn=!!r.equipped&&String(r.equipped_slot||'')==='off_weapon';
    actions=`<div class="ws-slot-controls" data-ws-controls="1"><button type="button" class="${mainOn?'ws-active':''}" data-ws-slot="main_weapon">${mainOn?'✓ 1. Yuvaya Atandı':'1. Yuvaya Ata'}</button><button type="button" class="${offOn?'ws-active':''}" data-ws-slot="off_weapon">${offOn?'✓ 2. Yuvaya Atandı':'2. Yuvaya Ata'}</button></div><button type="button" data-a="equip" data-id="${r.id}" data-v="${r.equipped?'0':'1'}">${r.equipped?'Çıkar':'Kuşan'}</button><button type="button" class="primary" data-a="weapon" data-id="${r.id}" data-k="attack">Saldırı At</button><button type="button" data-a="weapon" data-id="${r.id}" data-k="damage">Hasar Vur</button>`;'''
s=must_replace(s,old,new,'weapon card permanent slot controls')
p.write_text(s,encoding='utf-8')

# Slot boyama tamamen idempotent olsun. Aynı durumdayken hiçbir node silinip
# yeniden eklenmesin; özellikle rozet remove/add döngüsü MutationObserver'ları tetiklemesin.
p=root/'weapon-slot-patch.js'
s=p.read_text(encoding='utf-8')
new_paint=r'''function wsPaintCard(card,row){
  const actions=card.querySelector('.actions');if(!actions)return;
  const equip=actions.querySelector('button[data-a="equip"]');
  let controls=actions.querySelector('[data-ws-controls]');
  if(!controls){
    controls=document.createElement('div');controls.className='ws-slot-controls';controls.dataset.wsControls='1';
    equip?actions.insertBefore(controls,equip):actions.prepend(controls);
  }else if(equip&&controls.nextElementSibling!==equip){actions.insertBefore(controls,equip)}
  const current=row?.equipped?String(row.equipped_slot||''):'';
  for(const slot of ['main_weapon','off_weapon']){
    let b=controls.querySelector(`[data-ws-slot="${slot}"]`);
    if(!b){b=document.createElement('button');b.type='button';b.dataset.wsSlot=slot;controls.appendChild(b)}
    const active=current===slot,name=slot==='main_weapon'?'1. Yuvaya':'2. Yuvaya',label=active?`✓ ${name} Atandı`:`${name} Ata`;
    if(b.textContent!==label)b.textContent=label;
    b.classList.toggle('ws-active',active);
  }
  let badge=card.querySelector('.ws-slot-badge');
  if(current==='main_weapon'||current==='off_weapon'){
    const label=current==='main_weapon'?'1. YUVA':'2. YUVA';
    if(!badge){badge=document.createElement('span');badge.className='tag ws-slot-badge';card.querySelector('.tag')?.after(badge)}
    if(badge&&badge.textContent!==label)badge.textContent=label;
  }else badge?.remove();
}'''
s=must_sub(s,r"function wsPaintCard\(card,row\)\{.*?\n\}\nfunction wsRemoveDuplicateBoard",new_paint+'\nfunction wsRemoveDuplicateBoard','idempotent weapon slot paint')
p.write_text(s,encoding='utf-8')

# Eski QOL katmanı Envanter içine ayrı 1./2. silah panosu ekliyordu.
# Weapon slot katmanı bu panoyu kaldırdığı için iki script sonsuz ekle/sil döngüsüne giriyordu.
# Artık QOL sadece eski panoyu temizler ve gerçek silah kartlarını gerektiğinde bir kez boyatır.
p=root/'quality-of-life-patch.js'
s=p.read_text(encoding='utf-8')
new_slots=r'''function qolSlots(){
  if(!qolSheet())return;
  QOL_APP.querySelectorAll('[data-ws-slot-board]').forEach(x=>x.remove());
  const ids=[...QOL_APP.querySelectorAll('main .iw-player-item[data-pla-inv-row]')].map(x=>x.dataset.plaInvRow).filter(Boolean).sort().join('|');
  if(ids!==qolWeaponSig){qolWeaponSig=ids;setTimeout(()=>window.__catlakWeaponSlotTest?.paint?.(true),0)}
}'''
s=must_sub(s,r"function qolSlots\(\)\{.*?\n\}\nfunction qolCompact",new_slots+'\nfunction qolCompact','remove legacy qol weapon board')
p.write_text(s,encoding='utf-8')

# Eski hotfix'in sürekli MutationObserver + repaint döngüsünü kaldır.
# Yalnız ilk açılışta eksik üst paneli ve slot durumunu bir kez senkronla.
p=root/'slot-sync-hotfix.js'
p.write_text("""(()=>{\n  const A=document.querySelector('#app');if(!A)return;\n  const txt=e=>String(e?.textContent||'').trim();\n  const isSheet=()=>txt(A.querySelector('.role'))!=='GM'&&A.querySelector('.nav button.on[data-tab]')?.dataset.tab==='sheet';\n  function ensure(){if(!isSheet())return;if(!A.querySelector('main [data-gmt-player-panel]'))window.gmtRenderPlayerPanels?.();window.__catlakWeaponSlotTest?.paint?.(false)}\n  setTimeout(ensure,160);\n  window.__catlakSlotSyncHotfix={ensure,queue:ensure};\n})();\n""",encoding='utf-8')

# Cache bust: tarayıcı eski döngülü dosyaları kullanmasın.
p=root/'battle-ready-clean-patch.js'
s=p.read_text(encoding='utf-8').replace('./slot-sync-hotfix.js?v=slotfix-v2','./slot-sync-hotfix.js?v=slotfix-v3')
p.write_text(s,encoding='utf-8')

p=root/'index.html'
s=p.read_text(encoding='utf-8')
s=s.replace('./player-live-actions-patch.js?v=playerlive-v6','./player-live-actions-patch.js?v=playerlive-v7')
s=s.replace('./weapon-slot-patch.js?v=weaponslot-v6','./weapon-slot-patch.js?v=weaponslot-v7')
s=s.replace('./battle-ready-clean-patch.js?v=battleready-v2','./battle-ready-clean-patch.js?v=battleready-v3')
s=s.replace('./quality-of-life-patch.js?v=qol-v2','./quality-of-life-patch.js?v=qol-v3')
p.write_text(s,encoding='utf-8')
