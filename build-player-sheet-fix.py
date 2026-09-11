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
    'Ana Silah':'main_weapon','İkinci Silah':'off_weapon','1. Silah':'main_weapon','2. Silah':'off_weapon','Zırh':'armor','Aksesuar 1':'accessory_1','Aksesuar 2':'accessory_2'
  };
  equip.querySelectorAll('.gmt-slot').forEach(slot=>{
    const key=slot.dataset.gmtSlot||byLabel[plaTxt(slot.querySelector('b'))];if(!key)return;
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

# Üst Takılı Teçhizat panelini kalıcı yap. GM veya oyuncu silah atadığında paneli
# silip yeniden oluşturmak yerine 1./2. Silah değerlerini yerinde güncelle.
p=root/'gm-tools-patch.js'
s=p.read_text(encoding='utf-8')
s=must_sub(
    s,
    r"function gmtSlotName\(k\)\{return \(\{.*?\}\)\[k\]\|\|k\}",
    "function gmtSlotName(k){return ({main_weapon:'1. Silah',off_weapon:'2. Silah',armor:'Zırh',accessory_1:'Aksesuar 1',accessory_2:'Aksesuar 2'})[k]||k}",
    'stable equipment slot labels'
)
new_player_panels=r'''async function gmtRenderPlayerPanels(){
  if(gmtIsGM()||gmtBaseTab()!=='sheet'||gmtPlayerBusy)return;
  const main=GMT_APP.querySelector('main');if(!main)return;
  gmtPlayerBusy=true;
  try{
    const [cr,kr,vr,ir]=await Promise.all([
      GMT_S.from('catlak_characters').select('id,name').order('created_at',{ascending:true}),
      GMT_S.from('catlak_character_conditions').select('*').eq('active',true).order('created_at',{ascending:true}),
      GMT_S.from('catlak_inventory').select('id,character_id,item_id,equipped,equipped_slot,quantity').order('granted_at',{ascending:true}),
      GMT_S.from('catlak_items').select('id,name,is_active')
    ]);
    for(const r of [cr,kr,vr,ir])if(r.error)throw r.error;
    const chars=cr.data||[],conds=kr.data||[],inv=vr.data||[],items=ir.data||[];
    const itemMap=new Map(items.map(i=>[String(i.id),i]));
    const labelKey={'Ana Silah':'main_weapon','İkinci Silah':'off_weapon','1. Silah':'main_weapon','2. Silah':'off_weapon','Zırh':'armor','Aksesuar 1':'accessory_1','Aksesuar 2':'accessory_2'};
    const slots=['main_weapon','off_weapon','armor','accessory_1','accessory_2'];
    for(const hero of [...main.querySelectorAll('.hero')]){
      const name=gmtTxt(hero.querySelector('h1')),c=chars.find(x=>x.name===name);if(!c)continue;
      let sec=main.querySelector(`[data-gmt-player-panel="${c.id}"]`);
      if(!sec){
        sec=document.createElement('section');sec.className='card gmt-player-panel';sec.dataset.gmtPlayerPanel=c.id;sec.dataset.gmtStableEquipment='1';
        sec.innerHTML='<div class="gmt-player-two"><div data-gmt-status-pane><div class="eyebrow">AKTİF DURUMLAR</div><h2>Durum Etkileri</h2><div data-gmt-status-list></div></div><div data-gmt-equip-pane><div class="eyebrow">TAKILI TEÇHİZAT</div><h2>Slotlar</h2><p class="gmt-mini">Silah, zırh ve aksesuarı Envanter bölümündeki Kuşan/Tak düğmeleriyle yerleştirebilirsin.</p></div></div>';
        hero.insertAdjacentElement('afterend',sec);
      }else sec.dataset.gmtStableEquipment='1';

      const two=sec.querySelector('.gmt-player-two');if(!two)continue;
      const panes=[...two.children];
      let status=sec.querySelector('[data-gmt-status-pane]')||panes.find(x=>gmtTxt(x.querySelector(':scope > .eyebrow'))==='AKTİF DURUMLAR')||panes[0];
      let equip=sec.querySelector('[data-gmt-equip-pane]')||panes.find(x=>gmtTxt(x.querySelector(':scope > .eyebrow'))==='TAKILI TEÇHİZAT')||panes[1];
      if(!status||!equip)continue;status.dataset.gmtStatusPane='1';equip.dataset.gmtEquipPane='1';

      let statusList=status.querySelector('[data-gmt-status-list]');
      if(!statusList){
        statusList=document.createElement('div');statusList.dataset.gmtStatusList='1';
        status.querySelectorAll(':scope > .gmt-status-pill,:scope > p.muted').forEach(x=>x.remove());status.appendChild(statusList);
      }
      const cc=conds.filter(x=>String(x.character_id)===String(c.id));
      const statusSig=JSON.stringify(cc.map(x=>[x.id,x.name,x.remaining_rounds,x.note]));
      if(statusList.dataset.gmtSig!==statusSig){
        statusList.dataset.gmtSig=statusSig;
        statusList.innerHTML=cc.length?cc.map(x=>`<span class="gmt-status-pill"><b>${gmtH(x.name)}</b>${x.remaining_rounds==null?'':' • '+x.remaining_rounds+' round'}${x.note?' • '+gmtH(x.note):''}</span>`).join(''):'<p class="muted">Aktif durum etkisi yok.</p>';
      }

      const ci=inv.filter(x=>String(x.character_id)===String(c.id)&&x.equipped);
      const existing=[...equip.querySelectorAll('.gmt-slot')];
      existing.forEach(slot=>{const key=slot.dataset.gmtSlot||labelKey[gmtTxt(slot.querySelector('b'))];if(key)slot.dataset.gmtSlot=key});
      const grid=equip.querySelector('[data-psea-equipment-grid]');
      const mini=equip.querySelector(':scope > .gmt-mini');
      for(const key of slots){
        let slot=equip.querySelector(`[data-gmt-slot="${key}"]`);
        if(!slot){
          slot=document.createElement('div');slot.className='gmt-slot';slot.dataset.gmtSlot=key;slot.innerHTML='<b></b><span></span>';
          if(grid)grid.appendChild(slot);else if(mini)equip.insertBefore(slot,mini);else equip.appendChild(slot);
        }
        let label=slot.querySelector('b');if(!label){label=document.createElement('b');slot.prepend(label)}label.textContent=gmtSlotName(key);
        let value=slot.querySelector(':scope > span');if(!value){value=document.createElement('span');slot.appendChild(value)}
        const row=ci.find(x=>x.equipped_slot===key),item=row&&itemMap.get(String(row.item_id));
        value.textContent=item&&item.is_active!==false?item.name:'Boş';value.classList.toggle('muted',!(item&&item.is_active!==false));
      }
    }
  }catch(e){console.warn('GMT_PLAYER_PANEL_SYNC',e)}finally{gmtPlayerBusy=false}
}
function gmtInvalidatePlayer(){setTimeout(()=>gmtRenderPlayerPanels(),30)}'''
s=must_sub(
    s,
    r"async function gmtRenderPlayerPanels\(\)\{.*?\n\}\nfunction gmtInvalidatePlayer\(\)\{.*?\}",
    new_player_panels,
    'stable player equipment panels'
)
p.write_text(s,encoding='utf-8')

# Yeni dosyalar tarayıcı cache'ine takılmasın.
p=root/'index.html'
s=p.read_text(encoding='utf-8')
s=s.replace('./presence-patch.js?v=presence-v3','./presence-patch.js?v=presence-v4')
s=s.replace('./player-live-actions-patch.js?v=playerlive-v5','./player-live-actions-patch.js?v=playerlive-v6')
s=s.replace('./weapon-slot-patch.js?v=weaponslot-v2','./weapon-slot-patch.js?v=weaponslot-v6')
s=s.replace('./gm-tools-patch.js?v=gmtools-v6','./gm-tools-patch.js?v=gmtools-v7')
p.write_text(s,encoding='utf-8')
