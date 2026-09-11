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

# ---------------------------------------------------------------------------
# Oyuncu üst teçhizat paneli: karakter adından değil doğrudan karakter ID'sinden
# eşleşsin. Panel yoksa bir kez oluşturulsun, varsa DOM'dan kaldırılmadan yerinde
# güncellensin. Böylece GM slot ataması ve oyuncu slot ataması aynı üst paneli
# kullanır; yeniden yaratma/hayaletlenme oluşmaz.
# ---------------------------------------------------------------------------
p=root/'gm-tools-patch.js'
s=p.read_text(encoding='utf-8')
new_panels=r'''async function gmtRenderPlayerPanels(){
  if(gmtIsGM()||gmtBaseTab()!=='sheet'||gmtPlayerBusy)return;
  const main=GMT_APP.querySelector('main');if(!main)return;
  const stacks=[...main.querySelectorAll('.cc-character-stack')];if(!stacks.length)return;
  gmtPlayerBusy=true;
  try{
    const [kr,vr,ir]=await Promise.all([
      GMT_S.from('catlak_character_conditions').select('*').eq('active',true).order('created_at',{ascending:true}),
      GMT_S.from('catlak_inventory').select('id,character_id,item_id,equipped,equipped_slot,quantity').order('granted_at',{ascending:true}),
      GMT_S.from('catlak_items').select('id,name,is_active')
    ]);
    for(const r of [kr,vr,ir])if(r.error)throw r.error;
    const conds=kr.data||[],inv=vr.data||[],items=ir.data||[];
    const itemMap=new Map(items.map(i=>[String(i.id),i]));
    const labelKey={'Ana Silah':'main_weapon','İkinci Silah':'off_weapon','1. Silah':'main_weapon','2. Silah':'off_weapon','Zırh':'armor','Aksesuar 1':'accessory_1','Aksesuar 2':'accessory_2'};
    const slots=['main_weapon','off_weapon','armor','accessory_1','accessory_2'];

    for(const stack of stacks){
      const hero=stack.querySelector('section.hero');
      const cid=hero?.querySelector('[data-a="hp"][data-id]')?.dataset.id||'';
      if(!hero||!cid)continue;

      let sec=stack.querySelector('[data-gmt-player-panel]');
      if(!sec){
        sec=document.createElement('section');sec.className='card gmt-player-panel';sec.dataset.gmtPlayerPanel=cid;sec.dataset.gmtStableEquipment='1';
        sec.innerHTML='<div class="gmt-player-two"><div data-gmt-status-pane><div class="eyebrow">AKTİF DURUMLAR</div><h2>Durum Etkileri</h2><div data-gmt-status-list></div></div><div data-gmt-equip-pane><div class="eyebrow">TAKILI TEÇHİZAT</div><h2>Slotlar</h2><p class="gmt-mini">Silah, zırh ve aksesuarı Envanter bölümündeki Kuşan/Tak düğmeleriyle yerleştirebilirsin.</p></div></div>';
        const side=stack.querySelector('.ps-sheet-grid > .ps-side-column');
        if(side)side.prepend(sec);else hero.insertAdjacentElement('afterend',sec);
      }else{
        sec.dataset.gmtPlayerPanel=cid;sec.dataset.gmtStableEquipment='1';
      }

      const two=sec.querySelector('.gmt-player-two');if(!two)continue;
      const panes=[...two.children];
      let status=sec.querySelector('[data-gmt-status-pane]')||panes.find(x=>gmtTxt(x.querySelector(':scope > .eyebrow'))==='AKTİF DURUMLAR')||panes[0];
      let equip=sec.querySelector('[data-gmt-equip-pane]')||panes.find(x=>gmtTxt(x.querySelector(':scope > .eyebrow'))==='TAKILI TEÇHİZAT')||panes[1];
      if(!status||!equip)continue;
      status.dataset.gmtStatusPane='1';equip.dataset.gmtEquipPane='1';

      let statusList=status.querySelector('[data-gmt-status-list]');
      if(!statusList){
        statusList=document.createElement('div');statusList.dataset.gmtStatusList='1';
        status.querySelectorAll(':scope > .gmt-status-pill,:scope > p.muted').forEach(x=>x.remove());status.appendChild(statusList);
      }
      const cc=conds.filter(x=>String(x.character_id)===String(cid));
      const statusSig=JSON.stringify(cc.map(x=>[x.id,x.name,x.remaining_rounds,x.note]));
      if(statusList.dataset.gmtSig!==statusSig){
        statusList.dataset.gmtSig=statusSig;
        statusList.innerHTML=cc.length?cc.map(x=>`<span class="gmt-status-pill"><b>${gmtH(x.name)}</b>${x.remaining_rounds==null?'':' • '+x.remaining_rounds+' round'}${x.note?' • '+gmtH(x.note):''}</span>`).join(''):'<p class="muted">Aktif durum etkisi yok.</p>';
      }

      const ci=inv.filter(x=>String(x.character_id)===String(cid)&&x.equipped);
      [...equip.querySelectorAll('.gmt-slot')].forEach(slot=>{
        const key=slot.dataset.gmtSlot||labelKey[gmtTxt(slot.querySelector('b'))];
        if(key)slot.dataset.gmtSlot=key;
      });
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
        const row=ci.find(x=>String(x.equipped_slot||'')===key),item=row&&itemMap.get(String(row.item_id));
        const name=item&&item.is_active!==false?item.name:'Boş';
        if(value.textContent!==name)value.textContent=name;
        value.classList.toggle('muted',name==='Boş');
      }
    }
  }catch(e){console.warn('GMT_PLAYER_PANEL_SYNC',e)}finally{gmtPlayerBusy=false}
}
function gmtInvalidatePlayer(){setTimeout(()=>gmtRenderPlayerPanels(),20)}'''
s=must_sub(
    s,
    r"async function gmtRenderPlayerPanels\(\)\{.*?\n\}\nfunction gmtInvalidatePlayer\(\)\{.*?\}",
    new_panels,
    'id based stable player panels'
)

# Envanter/eşya değişimlerini üst panel doğrudan dinlesin. Böylece GM başka bir
# tarayıcıdan silah verdiğinde player-live renderına bağımlı kalmadan yuva güncellenir.
anchor="GMT_S.channel('cc-gmt-conditions')"
if "cc-gmt-player-equipment" not in s:
    realtime="GMT_S.channel('cc-gmt-player-equipment').on('postgres_changes',{event:'*',schema:'public',table:'catlak_inventory'},()=>{if(!gmtIsGM())gmtInvalidatePlayer()}).on('postgres_changes',{event:'*',schema:'public',table:'catlak_items'},()=>{if(!gmtIsGM())gmtInvalidatePlayer()}).subscribe();\n"
    if anchor not in s: raise SystemExit('gm player equipment realtime anchor bulunamadı')
    s=s.replace(anchor,realtime+anchor,1)

# Player-live panel yokken de oluşturma API'sini çağırabilsin.
if "window.__catlakGmPlayerPanels=" not in s:
    s += "\nwindow.__catlakGmPlayerPanels={render:gmtRenderPlayerPanels,invalidate:gmtInvalidatePlayer};\n"
p.write_text(s,encoding='utf-8')

# ---------------------------------------------------------------------------
# Player live: refresh çalışırken yeni realtime olayı gelirse kaybolmasın; kuyruğa
# alınsın. Panel henüz oluşmamışsa GM panel oluşturucusunu tetikle.
# ---------------------------------------------------------------------------
p=root/'player-live-actions-patch.js'
s=p.read_text(encoding='utf-8')
s=must_replace(
    s,
    "let plaRefreshTimer=null,plaRefreshing=false,plaLastRefresh=0;",
    "let plaRefreshTimer=null,plaRefreshing=false,plaRefreshQueued=false,plaLastRefresh=0;",
    'player refresh queue state'
)
s=must_replace(
    s,
    "  const panel=stack?.querySelector('[data-gmt-player-panel]');if(!panel)return;",
    "  const panel=stack?.querySelector('[data-gmt-player-panel]');if(!panel){window.__catlakGmPlayerPanels?.render?.();return}",
    'create equipment panel when missing'
)
s=must_replace(
    s,
    "  if(!plaIsSheet()||plaRefreshing)return;",
    "  if(!plaIsSheet())return;if(plaRefreshing){if(force)plaRefreshQueued=true;return}",
    'queue overlapping player refresh'
)
s=must_replace(
    s,
    "  }catch(e){console.warn('CATLAK_PLAYER_LIVE_REFRESH',e)}finally{plaRefreshing=false}\n}",
    "  }catch(e){console.warn('CATLAK_PLAYER_LIVE_REFRESH',e)}finally{plaRefreshing=false;if(plaRefreshQueued){plaRefreshQueued=false;plaRefreshSoon(true,0)}}\n}",
    'flush queued player refresh'
)
p.write_text(s,encoding='utf-8')

# Cache bust.
p=root/'index.html'
s=p.read_text(encoding='utf-8')
s=s.replace('./gm-tools-patch.js?v=gmtools-v7','./gm-tools-patch.js?v=gmtools-v8')
s=s.replace('./player-live-actions-patch.js?v=playerlive-v6','./player-live-actions-patch.js?v=playerlive-v7')
p.write_text(s,encoding='utf-8')
