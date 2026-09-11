from pathlib import Path
import sys

root=Path(sys.argv[1] if len(sys.argv)>1 else '_site')

def must_replace(text,old,new,label):
    if old not in text:
        raise SystemExit(f'{label}: beklenen parça bulunamadı')
    return text.replace(old,new,1)

# Silah kartında kuşanılmış silahın Çıkar düğmesini eski data-a=equip
# sisteminden tamamen ayır. Böylece legacy click handler slotu tekrar kuşanamaz.
p=root/'player-live-actions-patch.js'
s=p.read_text(encoding='utf-8')
old='''    const mainOn=!!r.equipped&&String(r.equipped_slot||'')==='main_weapon',offOn=!!r.equipped&&String(r.equipped_slot||'')==='off_weapon';
    actions=`<div class="ws-slot-controls" data-ws-controls="1"><button type="button" class="${mainOn?'ws-active':''}" data-ws-slot="main_weapon">${mainOn?'✓ 1. Yuvaya Atandı':'1. Yuvaya Ata'}</button><button type="button" class="${offOn?'ws-active':''}" data-ws-slot="off_weapon">${offOn?'✓ 2. Yuvaya Atandı':'2. Yuvaya Ata'}</button></div><button type="button" data-a="equip" data-pla-equip-kind="weapon" data-id="${r.id}" data-v="${r.equipped?'0':'1'}">${r.equipped?'Çıkar':'Kuşan'}</button><button type="button" class="primary" data-a="weapon" data-id="${r.id}" data-k="attack">Saldırı At</button><button type="button" data-a="weapon" data-id="${r.id}" data-k="damage">Hasar Vur</button>`;'''
new='''    const mainOn=!!r.equipped&&String(r.equipped_slot||'')==='main_weapon',offOn=!!r.equipped&&String(r.equipped_slot||'')==='off_weapon';
    const equipAction=r.equipped?`<button type="button" data-ws-remove="${r.id}">Çıkar</button>`:`<button type="button" data-a="equip" data-pla-equip-kind="weapon" data-id="${r.id}" data-v="1">Kuşan</button>`;
    actions=`<div class="ws-slot-controls" data-ws-controls="1"><button type="button" class="${mainOn?'ws-active':''}" data-ws-slot="main_weapon">${mainOn?'✓ 1. Yuvaya Atandı':'1. Yuvaya Ata'}</button><button type="button" class="${offOn?'ws-active':''}" data-ws-slot="off_weapon">${offOn?'✓ 2. Yuvaya Atandı':'2. Yuvaya Ata'}</button></div>${equipAction}<button type="button" class="primary" data-a="weapon" data-id="${r.id}" data-k="attack">Saldırı At</button><button type="button" data-a="weapon" data-id="${r.id}" data-k="damage">Hasar Vur</button>`;'''
s=must_replace(s,old,new,'dedicated weapon remove button')
p.write_text(s,encoding='utf-8')

# Weapon slot katmanı Çıkar düğmesinin tek sahibi olsun.
p=root/'weapon-slot-patch.js'
s=p.read_text(encoding='utf-8')
s=must_replace(
    s,
    '''  const equip=actions.querySelector('button[data-a="equip"]');''',
    '''  const equip=actions.querySelector('[data-ws-remove],button[data-a="equip"]');''',
    'slot controls anchor'
)
anchor="""document.addEventListener('click',e=>{\n  const b=e.target.closest('[data-ws-slot]');if(!b||!wsIsSheet())return;\n  const card=b.closest('.iw-player-item[data-pla-inv-row]');if(!card)return;\n  e.preventDefault();e.stopImmediatePropagation();wsSet(card,b.dataset.wsSlot||null);\n},true);\n"""
handler="""const wsRemoveActed=new WeakMap();
function wsRemoveCapture(e){
  const b=e.target.closest?.('[data-ws-remove]');if(!b||!wsIsSheet())return;
  const card=b.closest('.iw-player-item[data-pla-inv-row]');if(!card)return;
  e.preventDefault();e.stopImmediatePropagation();
  if(e.type==='pointerdown'){
    wsRemoveActed.set(b,Date.now());
    wsSet(card,'');
    return;
  }
  const at=wsRemoveActed.get(b)||0;if(Date.now()-at<900)return;
  wsRemoveActed.set(b,Date.now());wsSet(card,'');
}
document.addEventListener('pointerdown',wsRemoveCapture,true);
document.addEventListener('click',wsRemoveCapture,true);

"""+anchor
s=must_replace(s,anchor,handler,'dedicated weapon remove handler')
p.write_text(s,encoding='utf-8')

# IRK GÜÇLERİ çok aşağıdaki tam genişlik detay alanında kalmasın.
# Ana kolonda statların hemen ardından, görsel/envanterden önce dengeli bir kart olsun.
p=root/'player-sheet-patch.js'
s=p.read_text(encoding='utf-8')
css_anchor=""".ps-player-sheet .ps-lore-card{padding:15px!important;background:#08131e!important;border-color:#293e50!important}\n"""
css_extra=""".ps-player-sheet .ps-race-powers-card{padding:15px!important;border-color:#6e552e!important;background:linear-gradient(135deg,#17150f,#0a1420)!important}
.ps-player-sheet .ps-race-powers-card>.grid{grid-template-columns:repeat(auto-fit,minmax(220px,1fr))!important;gap:9px!important}
.ps-player-sheet .ps-race-powers-card .power{margin:0!important;min-width:0}
"""
s=must_replace(s,css_anchor,css_anchor+css_extra,'race powers balanced style')
s=must_replace(
    s,
    """  if(e==='ÖZEL YOL'||e==='IRK GÜÇLERİ')return'detail';""",
    """  if(e==='IRK GÜÇLERİ')return'main-powers';\n  if(e==='ÖZEL YOL')return'detail';""",
    'race powers classification'
)
s=must_replace(
    s,
    """  const ordered={hero:[],stats:[],visual:[],inventory:[],note:[],status:[],combat:[],rolls:[],detail:[],other:[]};""",
    """  const ordered={hero:[],stats:[],powers:[],visual:[],inventory:[],note:[],status:[],combat:[],rolls:[],detail:[],other:[]};""",
    'race powers ordered bucket'
)
s=must_replace(
    s,
    """else if(k==='main-inventory'){sec.classList.add('ps-inventory-card');ordered.inventory.push(sec)}else if(k==='side-note')""",
    """else if(k==='main-powers'){sec.classList.add('ps-race-powers-card');ordered.powers.push(sec)}else if(k==='main-inventory'){sec.classList.add('ps-inventory-card');ordered.inventory.push(sec)}else if(k==='side-note')""",
    'race powers class assignment'
)
s=must_replace(
    s,
    """  psPlace(main,[...ordered.hero,...ordered.stats,...ordered.visual,...ordered.inventory]);""",
    """  psPlace(main,[...ordered.hero,...ordered.stats,...ordered.powers,...ordered.visual,...ordered.inventory]);""",
    'race powers balanced placement'
)
p.write_text(s,encoding='utf-8')

# Cache bust.
p=root/'index.html'
s=p.read_text(encoding='utf-8')
s=s.replace('./player-live-actions-patch.js?v=playerlive-v8','./player-live-actions-patch.js?v=playerlive-v9')
s=s.replace('./weapon-slot-patch.js?v=weaponslot-v8','./weapon-slot-patch.js?v=weaponslot-v9')
s=s.replace('./player-sheet-patch.js?v=sheet-v3','./player-sheet-patch.js?v=sheet-v4')
p.write_text(s,encoding='utf-8')
