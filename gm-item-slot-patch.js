const GMS_S=window.__catlakSupabase;
const GMS_APP=document.querySelector('#app');
if(!GMS_S||!GMS_APP)throw new Error('Çatlak Çağı GM eşya dağıtım katmanı başlatılamadı.');

const gmsTxt=e=>String(e?.textContent||'').trim();
const gmsIsGM=()=>gmsTxt(GMS_APP.querySelector('.role'))==='GM';
const gmsTab=()=>GMS_APP.querySelector('.nav button.on[data-tab]')?.dataset.tab||'';
const gmsToast=x=>{const t=document.querySelector('#toast');if(!t)return;t.textContent=String(x);t.classList.remove('hidden');clearTimeout(gmsToast.t);gmsToast.t=setTimeout(()=>t.classList.add('hidden'),4300)};
const gmsN=x=>Number(x||0);
let gmsBusy=false,gmsTimer=null,gmsSyncToken=0;
const gmsItemCache=new Map();

if(!document.querySelector('#gms-style')){
  const s=document.createElement('style');
  s.id='gms-style';
  s.textContent=`
  .gms-slot-label select:disabled{opacity:.55;cursor:not-allowed}
  .gms-slot-help{display:block;margin-top:5px;color:var(--muted);font-size:.72rem;line-height:1.35}
  .gms-slot-badge{color:#f2d284;font-weight:900;letter-spacing:.04em}
  `;
  document.head.appendChild(s);
}

async function gmsItem(id){
  if(!id)return null;
  if(gmsItemCache.has(id))return gmsItemCache.get(id);
  const r=await GMS_S.from('catlak_items').select('id,name,item_type,effects').eq('id',id).maybeSingle();
  if(r.error)throw r.error;
  const item=r.data||null;
  if(item)gmsItemCache.set(id,item);
  return item;
}

function gmsItemMode(item){return String(item?.effects?.item_mode||'general')}
function gmsSlotLabel(slot){
  return slot==='main_weapon'?'1. Silah':slot==='off_weapon'?'2. Silah':slot==='armor'?'Zırh':slot==='accessory_1'?'Aksesuar 1':slot==='accessory_2'?'Aksesuar 2':'Sadece Envantere';
}
function gmsAllowedSlots(item){
  if(item?.item_type==='weapon')return ['','main_weapon','off_weapon'];
  if(item?.item_type==='armor')return ['','armor'];
  if(item?.item_type==='item'&&gmsItemMode(item)==='accessory')return ['','accessory_1','accessory_2'];
  return [''];
}
function gmsSlotHelp(item){
  if(item?.item_type==='weapon')return 'Silahı sadece envantere bırakabilir veya doğrudan 1./2. silaha takabilirsin.';
  if(item?.item_type==='armor')return 'Zırhı sadece envantere bırakabilir veya doğrudan Zırh yuvasına takabilirsin.';
  if(item?.item_type==='item'&&gmsItemMode(item)==='accessory')return 'Aksesuarı sadece envantere bırakabilir veya doğrudan Aksesuar 1 / Aksesuar 2 yuvasına takabilirsin.';
  return 'Bu kayıt takılabilir bir eşya değil; yalnız envantere verilebilir.';
}

function gmsEnsureSlotControl(){
  if(!gmsIsGM()||gmsTab()!=='items')return null;
  const btn=GMS_APP.querySelector('main [data-gms-give],main [data-iw-give]');
  if(!btn)return null;

  if(btn.hasAttribute('data-iw-give')){
    btn.removeAttribute('data-iw-give');
    btn.dataset.gmsGive='1';
    btn.textContent='Oyuncuya Ver';
  }

  const form=btn.parentElement?.querySelector('.form');
  if(!form)return null;
  let select=form.querySelector('#gms-give-slot');
  if(!select){
    const label=document.createElement('label');
    label.className='gms-slot-label';
    label.innerHTML='Takılacak Yuva<select id="gms-give-slot"><option value="">Sadece Envantere</option><option value="main_weapon">1. Silah</option><option value="off_weapon">2. Silah</option><option value="armor">Zırh</option><option value="accessory_1">Aksesuar 1</option><option value="accessory_2">Aksesuar 2</option></select><small class="gms-slot-help" data-gms-slot-help>Verilecek kaydı seçtiğinde uygun yuvalar açılır.</small>';
    const qty=form.querySelector('#iw-give-qty')?.closest('label');
    qty?form.insertBefore(label,qty):form.appendChild(label);
    select=label.querySelector('#gms-give-slot');
  }
  return select;
}

async function gmsSyncSlotControl(){
  if(!gmsIsGM()||gmsTab()!=='items')return;
  const select=gmsEnsureSlotControl();if(!select)return;
  const token=++gmsSyncToken;
  const iid=GMS_APP.querySelector('#iw-give-item')?.value||'';
  const help=select.closest('label')?.querySelector('[data-gms-slot-help]');
  if(!iid){select.value='';select.disabled=true;if(help)help.textContent='Önce verilecek kaydı seç.';return}
  try{
    const item=await gmsItem(iid);if(token!==gmsSyncToken)return;
    const allowed=new Set(gmsAllowedSlots(item));
    [...select.options].forEach(o=>o.disabled=!allowed.has(o.value));
    if(!allowed.has(select.value))select.value='';
    select.disabled=allowed.size<=1;
    if(help)help.textContent=gmsSlotHelp(item);
  }catch(e){select.value='';select.disabled=true;if(help)help.textContent='Kayıt türü okunamadı.'}
}

async function gmsPaintInventorySlots(){
  if(!gmsIsGM()||gmsTab()!=='items')return;
  const buttons=[...GMS_APP.querySelectorAll('main .iw-inv-row [data-iw-qty]')];
  const ids=[...new Set(buttons.map(b=>b.dataset.iwQty).filter(Boolean))];
  if(!ids.length)return;
  const r=await GMS_S.from('catlak_inventory').select('id,equipped,equipped_slot').in('id',ids);
  if(r.error)return;
  const map=new Map((r.data||[]).map(x=>[String(x.id),x]));
  for(const b of buttons){
    const row=b.closest('.iw-inv-row'),meta=row?.querySelector('.iw-meta');if(!meta)continue;
    meta.querySelectorAll('.gms-slot-badge').forEach(x=>x.remove());
    const inv=map.get(String(b.dataset.iwQty));
    if(!inv?.equipped_slot)continue;
    if(!['main_weapon','off_weapon','armor','accessory_1','accessory_2'].includes(inv.equipped_slot))continue;
    const badge=document.createElement('span');badge.className='gms-slot-badge';badge.textContent=` • ${gmsSlotLabel(inv.equipped_slot).toUpperCase()}`;meta.appendChild(badge);
  }
}

function gmsRefreshWorkshop(){
  const edit=GMS_APP.querySelector('#iw-edit');
  if(edit){edit.dispatchEvent(new Event('change',{bubbles:true}));return}
  const main=GMS_APP.querySelector('main');if(main)main.removeAttribute('data-iw-workshop');
}

async function gmsGive(){
  if(gmsBusy||!gmsIsGM()||gmsTab()!=='items')return;
  gmsBusy=true;
  try{
    const cid=GMS_APP.querySelector('#iw-give-char')?.value||'';
    const iid=GMS_APP.querySelector('#iw-give-item')?.value||'';
    const qty=Math.max(1,gmsN(GMS_APP.querySelector('#iw-give-qty')?.value)||1);
    const slot=GMS_APP.querySelector('#gms-give-slot')?.value||'';
    if(!cid||!iid)throw new Error('Karakter ve kayıt seç.');

    const item=await gmsItem(iid);
    if(!item)throw new Error('Seçilen eşya bulunamadı.');
    if(!gmsAllowedSlots(item).includes(slot))throw new Error('Seçilen yuva bu eşya türü için uygun değil.');

    const give=await GMS_S.rpc('catlak_gm_give_item',{p_character_id:cid,p_item_id:iid,p_quantity:qty});
    if(give.error)throw give.error;

    if(slot){
      const inv=await GMS_S.from('catlak_inventory').select('id').eq('character_id',cid).eq('item_id',iid).order('granted_at',{ascending:false}).limit(1).maybeSingle();
      if(inv.error)throw inv.error;
      if(!inv.data?.id)throw new Error('Eşya envantere verildi ama yuva kaydı bulunamadı.');
      const equip=await GMS_S.rpc('catlak_set_equipped_slot',{p_inventory_id:inv.data.id,p_slot:slot});
      if(equip.error)throw equip.error;
      gmsToast(`${item.name} oyuncuya verildi ve ${gmsSlotLabel(slot)} yuvasına takıldı.`);
    }else{
      gmsToast(`${item.name} oyuncunun envanterine verildi.`);
    }

    gmsBusy=false;
    gmsRefreshWorkshop();
    setTimeout(()=>{gmsEnsureSlotControl();gmsSyncSlotControl();gmsPaintInventorySlots()},120);
  }catch(e){gmsToast('Verilemedi: '+(e?.message||String(e)))}finally{gmsBusy=false}
}

function gmsInstall(){
  if(!gmsIsGM()||gmsTab()!=='items')return;
  const select=gmsEnsureSlotControl();
  if(select)gmsSyncSlotControl();
  gmsPaintInventorySlots();
}
function gmsSoon(delay=60){clearTimeout(gmsTimer);gmsTimer=setTimeout(gmsInstall,delay)}

document.addEventListener('change',e=>{
  if(e.target.id==='iw-give-item'&&gmsIsGM())gmsSyncSlotControl();
},true);

document.addEventListener('click',e=>{
  const b=e.target.closest('[data-gms-give]');
  if(!b||!gmsIsGM()||gmsTab()!=='items')return;
  e.preventDefault();e.stopImmediatePropagation();gmsGive();
},true);

new MutationObserver(()=>gmsSoon()).observe(GMS_APP,{childList:true,subtree:true});
GMS_S.channel('cc-gm-item-slot-live').on('postgres_changes',{event:'*',schema:'public',table:'catlak_inventory'},()=>gmsSoon(80)).on('postgres_changes',{event:'*',schema:'public',table:'catlak_items'},()=>{gmsItemCache.clear();gmsSoon(80)}).subscribe();
setInterval(()=>{if(gmsIsGM()&&gmsTab()==='items')gmsInstall()},1800);
setTimeout(()=>gmsInstall(),180);
window.__catlakGmItemSlotTest={install:gmsInstall,sync:gmsSyncSlotControl,give:gmsGive,allowed:gmsAllowedSlots};