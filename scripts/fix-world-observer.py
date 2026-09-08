from pathlib import Path

p=Path('simple-world-upload-patch.js')
s=p.read_text(encoding='utf-8')
old="const swObs=new MutationObserver(()=>{swEnsureNav();if(swActive){const b=SW_APP.querySelector('[data-cc-world-tab]');if(b&&!b.classList.contains('on'))swSelectNav(b)}});swObs.observe(SW_APP,{childList:true,subtree:true});swEnsureNav();"
new="// Navigasyonun tek sahibi nav-lite-patch.js. Burada MutationObserver kullanma; aksi halde\n// nav textContent yazımı kendi childList olayını yeniden tetikleyip sonsuz DOM döngüsü oluşturabilir.\nswEnsureNav();"
if old not in s:
    raise SystemExit('world observer block not found')
s=s.replace(old,new,1)
# Defensive: textContent'i gereksiz yere yeniden yazma.
s=s.replace("const b=nav.querySelector('[data-cc-world-tab]');if(b)b.textContent='Görsel Arşivi';","const b=nav.querySelector('[data-cc-world-tab]');if(b&&swTxt(b)!=='Görsel Arşivi')b.textContent='Görsel Arşivi';",1)
p.write_text(s,encoding='utf-8')
print('world observer loop removed')
# trigger
