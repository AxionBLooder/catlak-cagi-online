from pathlib import Path
import sys

root=Path(sys.argv[1] if len(sys.argv)>1 else '_site')

def must_replace(text,old,new,label):
    if old not in text:
        raise SystemExit(f'{label}: beklenen parça bulunamadı')
    return text.replace(old,new,1)

# IRK GÜÇLERİ ana kolonda, envanterin hemen altında kalsın.
p=root/'player-sheet-patch.js'
s=p.read_text(encoding='utf-8')
css_anchor=""".ps-player-sheet .ps-lore-card{padding:15px!important;background:#08131e!important;border-color:#293e50!important}\n"""
css_extra=""".ps-player-sheet .ps-race-powers-card{padding:15px!important;border-color:#344b61!important;background:linear-gradient(180deg,#0c1825,#09131e)!important}
.ps-player-sheet .ps-race-powers-card>.grid{grid-template-columns:repeat(auto-fit,minmax(220px,1fr))!important;gap:9px!important}
.ps-player-sheet .ps-race-powers-card .power{margin:0!important;min-width:0}
"""
s=must_replace(s,css_anchor,css_anchor+css_extra,'race powers balanced style')
s=must_replace(s,"""  if(e==='ÖZEL YOL'||e==='IRK GÜÇLERİ')return'detail';""","""  if(e==='IRK GÜÇLERİ')return'main-powers';
  if(e==='ÖZEL YOL')return'detail';""",'race powers classification')
s=must_replace(s,"""  const ordered={hero:[],stats:[],visual:[],inventory:[],note:[],status:[],combat:[],rolls:[],detail:[],other:[]};""","""  const ordered={hero:[],stats:[],powers:[],visual:[],inventory:[],note:[],status:[],combat:[],rolls:[],detail:[],other:[]};""",'race powers ordered bucket')
s=must_replace(s,"""else if(k==='main-inventory'){sec.classList.add('ps-inventory-card');ordered.inventory.push(sec)}else if(k==='side-note')""","""else if(k==='main-powers'){sec.classList.add('ps-race-powers-card');ordered.powers.push(sec)}else if(k==='main-inventory'){sec.classList.add('ps-inventory-card');ordered.inventory.push(sec)}else if(k==='side-note')""",'race powers class assignment')
s=must_replace(s,"""  psPlace(main,[...ordered.hero,...ordered.stats,...ordered.visual,...ordered.inventory]);""","""  psPlace(main,[...ordered.hero,...ordered.stats,...ordered.visual,...ordered.inventory,...ordered.powers]);""",'race powers below inventory placement')
p.write_text(s,encoding='utf-8')

# Tarayıcı mevcut temel dosyaları eski cache'den almasın. Workflow'un sabit
# playerlive-v8 / weaponslot-v8 metin kontrolleri korunur.
p=root/'index.html'
s=p.read_text(encoding='utf-8')
s=s.replace('./player-live-actions-patch.js?v=playerlive-v8','./player-live-actions-patch.js?v=playerlive-v8&legacy-passive-v1')
s=s.replace('./weapon-slot-patch.js?v=weaponslot-v8','./weapon-slot-patch.js?v=weaponslot-v8&legacy-passive-v1')
s=s.replace('./player-sheet-patch.js?v=sheet-v3','./player-sheet-patch.js?v=sheet-v3&race-layout-v4')
p.write_text(s,encoding='utf-8')

# ÖNEMLİ: weapon-live-actions-patch.js ve player-sheet-theme-v2-patch.js artık
# slot-sync-hotfix.js içine eklenmiyor. Yeni player-sheet-live-runtime.js silah
# durumunun tek canlı sahibidir; eski katmanların DOM'u geri boyaması engellenir.

# slot-sync yalnız tek-seferlik güvenli stabilizer olarak kalır.
p=root/'battle-ready-clean-patch.js'
s=p.read_text(encoding='utf-8')
s=s.replace('./slot-sync-hotfix.js?v=slotfix-v3&live-sheet-v2','./slot-sync-hotfix.js?v=slotfix-v3&single-owner-v1')
p.write_text(s,encoding='utf-8')
