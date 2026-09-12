from pathlib import Path
import re
import sys

root = Path(sys.argv[1] if len(sys.argv) > 1 else '_site')


def must_replace(text, old, new, label):
    if old not in text:
        raise SystemExit(f'{label}: beklenen parça bulunamadı')
    return text.replace(old, new, 1)


def must_sub(text, pattern, repl, label):
    out, count = re.subn(pattern, repl, text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f'{label}: beklenen blok bulunamadı ({count})')
    return out


# Oyuncu envanteri: silah için ayrı Kuşan + Çıkar yerine tek toggle düğme.
# Zırhın boş durum etiketi de oyuncu dilinde "Giy" olarak kalır.
p = root / 'player-live-actions-patch.js'
s = p.read_text(encoding='utf-8')
s = must_replace(
    s,
    '''    const equipAction=`<button type="button" data-a="equip" data-pla-equip-kind="weapon" data-id="${r.id}" data-v="1">Kuşan</button><button type="button" data-ws-remove="${r.id}">Çıkar</button>`;''',
    '''    const equipAction=`<button type="button" data-a="equip" data-pla-equip-kind="weapon" data-id="${r.id}" data-v="${r.equipped?'0':'1'}">${r.equipped?'Çıkar':'Kuşan'}</button>`;''',
    'single weapon equip toggle'
)
s = must_replace(
    s,
    '''    actions=`<button type="button" data-a="equip" data-id="${r.id}" data-v="${r.equipped?'0':'1'}">${r.equipped?'Çıkar':'Kuşan'}</button>`;''',
    '''    actions=`<button type="button" data-a="equip" data-id="${r.id}" data-v="${r.equipped?'0':'1'}">${r.equipped?'Çıkar':'Giy'}</button>`;''',
    'armor giy toggle label'
)
s = must_replace(
    s,
    "  const tag=plaTxt(card.querySelector('.tag')),off=tag==='EŞYA'?'Tak':'Kuşan';",
    "  const tag=plaTxt(card.querySelector('.tag')),off=tag==='EŞYA'?'Tak':tag==='ZIRH'?'Giy':'Kuşan';",
    'optimistic equip off label'
)
p.write_text(s, encoding='utf-8')


# Slot katmanı: silah kartında ikinci Çıkar düğmesi üretme.
# Aynı equip düğmesini slot durumuna göre Kuşan <-> Çıkar olarak güncelle.
p = root / 'weapon-slot-patch.js'
s = p.read_text(encoding='utf-8')
new_sync = r'''function wsSyncEquipAction(card,equipped){
  const actions=card?.querySelector('.actions');if(!actions)return;
  const id=card.dataset.plaInvRow||'';
  const controls=actions.querySelector('[data-ws-controls]');
  actions.querySelectorAll('[data-ws-remove]').forEach(x=>x.remove());
  let equip=actions.querySelector('button[data-a="equip"][data-pla-equip-kind="weapon"]');
  if(!equip){
    equip=document.createElement('button');equip.type='button';equip.dataset.a='equip';equip.dataset.plaEquipKind='weapon';
    controls?controls.insertAdjacentElement('afterend',equip):actions.prepend(equip);
  }
  equip.dataset.id=id;equip.dataset.v=equipped?'0':'1';equip.textContent=equipped?'Çıkar':'Kuşan';
  card.classList.toggle('on',equipped);
}'''
s = must_sub(
    s,
    r"function wsSyncEquipAction\(card,equipped\)\{.*?\n\}\nasync function wsSet",
    new_sync + '\nasync function wsSet',
    'single slot equip toggle'
)
# Eski ayrı Çıkar handler'ı artık görünür düğme üretmediği için gereksiz; tamamen kaldır.
s = must_sub(
    s,
    r"const wsRemoveActed=new WeakMap\(\);.*?document\.addEventListener\('click',wsRemoveCapture,true\);\n\n",
    '',
    'remove legacy dedicated remove handler'
)
p.write_text(s, encoding='utf-8')


# Cache bust: eski çift düğmeli JS tarayıcı cache'inden geri gelmesin.
p = root / 'index.html'
s = p.read_text(encoding='utf-8')
s = s.replace('player-live-actions-patch.js?v=playerlive-v9&dual-actions-v4',
              'player-live-actions-patch.js?v=playerlive-v9&single-toggle-v1')
s = s.replace('weapon-slot-patch.js?v=weaponslot-v8&dual-actions-v4',
              'weapon-slot-patch.js?v=weaponslot-v8&single-toggle-v1')
p.write_text(s, encoding='utf-8')
