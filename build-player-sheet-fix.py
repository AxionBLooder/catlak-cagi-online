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

# Yeşil oyuncu "Canlı Durum" kartını kaldır; GM presence takibi çalışmaya devam etsin.
p=root/'presence-patch.js'
s=p.read_text(encoding='utf-8')
s=must_sub(
    s,
    r"function ccPrRenderPlayer\(\)\{.*?\n\}\n\nasync function ccPrStopPresence",
    """function ccPrRenderPlayer(){
  if(ccPrIsGM()||ccPrTab()!=='sheet')return;
  const main=CC_PRES_APP.querySelector('main');if(!main)return;
  main.querySelectorAll('[data-cc-player-live-card]').forEach(x=>x.remove());
  ccPrLastPlayerSig='';
}

async function ccPrStopPresence""",
    'presence player card removal'
)
p.write_text(s,encoding='utf-8')

# Envanter değişince Teçhizat panelini silme; mevcut paneli yerinde güncelle.
p=root/'player-live-actions-patch.js'
s=p.read_text(encoding='utf-8')
marker="function plaSignature(rows,fields){return JSON.stringify(rows.map(r=>fields.map(k=>r?.[k]??null)))}"
helper=r'''
function plaSyncEquipmentPanel(stack,rows){
  const panel=stack?.querySelector('[data-gmt-player-panel]');if(!panel)return;
  const equip=[...panel.querySelectorAll('.gmt-player-two>div')].find(x=>plaTxt(x.querySelector(':scope > .eyebrow'))==='TAKILI TEÇHİZAT');if(!equip)return;
  const byLabel={
    'Ana Silah':'main_weapon','İkinci Silah':'off_weapon','Zırh':'armor','Aksesuar 1':'accessory_1','Aksesuar 2':'accessory_2'
  };
  equip.querySelectorAll('.gmt-slot').forEach(slot=>{
    const key=byLabel[plaTxt(slot.querySelector('b'))];if(!key)return;
    const hit=rows.find(x=>x.r?.equipped&&String(x.r?.equipped_slot||'')===key);
    let value=slot.querySelector(':scope > span');
    if(!value){value=document.createElement('span');slot.appendChild(value)}
    value.textContent=hit?.i?.name||'Boş';value.classList.toggle('muted',!hit);
  });
}
'''
s=must_replace(s,marker,marker+helper,'player equipment panel sync helper')
s=must_replace(
    s,
    "const sec=plaInventorySection(stack),rows=inv.filter(x=>x.character_id===cid).map(r=>({r,i:itemMap.get(r.item_id)})).filter(x=>x.i&&x.i.is_active!==false);",
    "const sec=plaInventorySection(stack),rows=inv.filter(x=>x.character_id===cid).map(r=>({r,i:itemMap.get(r.item_id)})).filter(x=>x.i&&x.i.is_active!==false);plaSyncEquipmentPanel(stack,rows);",
    'sync panel during inventory refresh'
)
s=s.replace("    if(equipmentDirty)PLA_APP.querySelectorAll('[data-gmt-player-panel]').forEach(x=>x.remove());\n","")
s=s.replace("PLA_APP.querySelectorAll('[data-gmt-player-panel]').forEach(x=>x.remove());plaRefreshSoon(true,10);","plaRefreshSoon(true,10);")
s=s.replace(".on('postgres_changes',{event:'*',schema:'public',table:'catlak_inventory'},()=>{PLA_APP.querySelectorAll('[data-gmt-player-panel]').forEach(x=>x.remove());plaRefreshSoon(true,20)})",".on('postgres_changes',{event:'*',schema:'public',table:'catlak_inventory'},()=>plaRefreshSoon(true,20))")
p.write_text(s,encoding='utf-8')

# Yeni dosyalar tarayıcı cache'ine takılmasın.
p=root/'index.html'
s=p.read_text(encoding='utf-8')
s=s.replace('./presence-patch.js?v=presence-v3','./presence-patch.js?v=presence-v4')
s=s.replace('./player-live-actions-patch.js?v=playerlive-v5','./player-live-actions-patch.js?v=playerlive-v6')
s=s.replace('./weapon-slot-patch.js?v=weaponslot-v2','./weapon-slot-patch.js?v=weaponslot-v3')
p.write_text(s,encoding='utf-8')
