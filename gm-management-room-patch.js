(function(){
'use strict';
if(window.__catlakManagementRoomV1)return;
const APP=document.querySelector('#app');
const S=window.__catlakSupabase;
if(!APP||!S)return;
window.__catlakManagementRoomV1=true;
let roomOpen=false,busy=false,wrapTimer=0,refreshTimer=0;
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=x=>Number(x||0);
const isGM=()=>String(APP.querySelector('.role')?.textContent||'').trim()==='GM';
const toast=m=>{const t=document.querySelector('#toast');if(!t)return;t.textContent=String(m);t.classList.remove('hidden');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.add('hidden'),4200)};

if(!document.getElementById('gmr-style')){
 const st=document.createElement('style');st.id='gmr-style';st.textContent=`
 #app [data-gmr-page] .gmr-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(310px,1fr));gap:12px}
 #app [data-gmr-page] .gmr-card{margin:0;padding:15px;box-shadow:none}
 #app [data-gmr-page] .gmr-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}
 #app [data-gmr-page] .gmr-meta{color:var(--muted);font-size:.84rem;line-height:1.45}
 #app [data-gmr-page] .gmr-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:11px}
 #app [data-gmr-page] .gmr-note{margin-top:10px}
 #app [data-gmr-page] .gmr-note textarea{min-height:70px}
 #app [data-gmr-page] .gmr-status{font-size:.68rem;border:1px solid var(--line);border-radius:999px;padding:4px 8px;white-space:nowrap}
 #app [data-gmr-page] .gmr-status.active{color:var(--green);border-color:#32644f}
 #app [data-gmr-page] .gmr-status.prepared{color:var(--gold);border-color:#66552d}
 `;document.head.appendChild(st)
}

function classBonusLabel(c){
 const b=c?.data?.class_bonus_v1;
 if(!b||!b.applied)return'';
 const bits=Object.entries(b.stats||{}).filter(([,v])=>num(v)).map(([k,v])=>`${k} ${num(v)>0?'+':''}${num(v)}`);
 if(num(b.hp))bits.push(`HP +${num(b.hp)}`);
 if(num(b.ac))bits.push(`AC +${num(b.ac)}`);
 return bits.join(' • ');
}
function card(c){
 const status=String(c.play_status||'prepared');
 const active=status==='active';
 const bonus=classBonusLabel(c);
 return `<article class="card gmr-card" data-gmr-card="${esc(c.id)}"><div class="gmr-head"><div><div class="eyebrow">${active?'CANLI KARAKTER':'HAZIR KARAKTER'}</div><h3>${esc(c.name||'Adsız Karakter')}</h3><div class="gmr-meta">${esc(c.species_name||'-')} • ${esc(c.class_name||'-')} • Seviye ${num(c.level)||1}<br>${esc(c.background_name||'-')} • HP ${num(c.hp_current)}/${num(c.hp_max)} • AC ${num(c.base_ac)}</div></div><span class="gmr-status ${active?'active':'prepared'}">${active?'● CANLI':'HAZIR'}</span></div>${bonus?`<div class="notice"><b>SINIF BONUSU</b><div>${esc(bonus)}</div></div>`:''}<div class="gmr-actions"><button type="button" data-gmr-level="-1" data-id="${esc(c.id)}">Lv −</button><button type="button" data-gmr-level="1" data-id="${esc(c.id)}">Lv +</button><button type="button" data-gmr-hp="-1" data-id="${esc(c.id)}">HP −</button><button type="button" data-gmr-hp="1" data-id="${esc(c.id)}">HP +</button>${!c.owner_id?`<button type="button" class="primary" data-gmr-invite="${esc(c.id)}" data-name="${esc(c.name||'Karakter')}">Oyuncu Daveti</button>`:''}<button type="button" class="danger" data-gmr-delete="${esc(c.id)}" data-name="${esc(c.name||'Karakter')}">Sil</button></div><label class="gmr-note">Oyuncuya Özel Durum / GM Notu<textarea data-gmr-note="${esc(c.id)}">${esc(c?.data?.gm_note||'')}</textarea></label><button type="button" data-gmr-save-note="${esc(c.id)}">Notu Kaydet</button></article>`;
}
function render(rows){
 if(!roomOpen||!isGM())return;
 const main=APP.querySelector('main');if(!main)return;
 const prepared=rows.filter(x=>String(x.play_status||'')==='prepared');
 const active=rows.filter(x=>String(x.play_status||'')==='active');
 main.dataset.gm2Route='characters';main.dataset.gmrPage='1';
 main.innerHTML=`<section class="card"><div class="eyebrow">GM • YÖNETİM ODASI</div><h1>Karakter Yönetimi</h1><p class="muted">Hazır ve canlı karakterleri tek ekrandan yönet. Seviye, HP, davet, oyuncuya özel durum ve silme işlemleri burada doğrudan çalışır.</p><div class="vitals"><div class="vital"><span>TOPLAM</span><b>${rows.length}</b></div><div class="vital"><span>CANLI</span><b>${active.length}</b></div><div class="vital"><span>HAZIR</span><b>${prepared.length}</b></div></div></section><section class="card"><div class="section-title"><div><div class="eyebrow">KARAKTERLER</div><h2>Yönetim Listesi</h2></div><button type="button" class="primary" data-gmr-builder>+ Yeni Karakter</button></div>${rows.length?`<div class="gmr-grid">${[...active,...prepared,...rows.filter(x=>!['active','prepared'].includes(String(x.play_status||'')))].map(card).join('')}</div>`:'<div class="empty">Henüz karakter yok.</div>'}</section>`;
 try{window.__catlakGmCenterRouterCore?.select?.('characters');window.__catlakGmHubV2Test?.chrome?.()}catch(_){ }
}
async function load(force=false){
 if(!roomOpen||!isGM()||busy)return;
 busy=true;
 try{
  const r=await S.from('catlak_characters').select('*').order('created_at',{ascending:true});
  if(r.error)throw r.error;
  if(roomOpen)render(r.data||[]);
 }catch(e){toast('Yönetim Odası yüklenemedi: '+(e?.message||String(e)))}finally{busy=false}
}
function closeRoom(){roomOpen=false;window.__catlakManagementRoomOpen=false;if(APP.querySelector('main')?.dataset.gmrPage==='1')delete APP.querySelector('main').dataset.gmrPage;if(window.__catlakGmHubOwnsMain===true)window.__catlakGmHubOwnsMain=false}
function openRoom(force=true){
 if(!isGM())return false;
 roomOpen=true;window.__catlakManagementRoomOpen=true;window.__catlakGmHubOwnsMain=true;
 const main=APP.querySelector('main');if(main){main.dataset.gm2Route='characters';main.innerHTML='<section class="card"><div class="eyebrow">GM • YÖNETİM ODASI</div><h2>Karakterler yükleniyor…</h2></section>'}
 load(force);return true;
}
function wrapHub(){
 const hub=window.__catlakGmHubV2Test;if(!hub||hub.__gmrWrapped)return false;
 const originalRoute=typeof hub.route==='function'?hub.route.bind(hub):null;
 const originalLeave=typeof hub.leave==='function'?hub.leave.bind(hub):null;
 hub.route=function(route){if(String(route||'')==='characters')return openRoom(true);closeRoom();return originalRoute?.(route)};
 hub.leave=function(){closeRoom();return originalLeave?.()};
 hub.__gmrWrapped=true;hub.openManagement=openRoom;hub.closeManagement=closeRoom;
 return true;
}
function ensureWrap(){if(wrapHub())return;clearTimeout(wrapTimer);wrapTimer=setTimeout(ensureWrap,40)}
async function setLevel(id,delta){const c=await S.from('catlak_characters').select('id,level').eq('id',id).maybeSingle();if(c.error)throw c.error;if(!c.data)throw new Error('Karakter bulunamadı.');const level=Math.max(1,Math.min(20,num(c.data.level)+num(delta)));const r=await S.rpc('catlak_set_character_level',{p_character_id:id,p_level:level});if(r.error)throw r.error;toast(`Seviye ${level} olarak ayarlandı.`);await load(true)}
async function setHp(id,delta){const c=await S.from('catlak_characters').select('id,hp_current,hp_max').eq('id',id).maybeSingle();if(c.error)throw c.error;if(!c.data)throw new Error('Karakter bulunamadı.');const hp=Math.max(0,Math.min(num(c.data.hp_max),num(c.data.hp_current)+num(delta)));const r=await S.from('catlak_characters').update({hp_current:hp}).eq('id',id);if(r.error)throw r.error;await load(true)}
async function saveNote(id){const el=APP.querySelector(`[data-gmr-note="${CSS.escape(String(id))}"]`);const c=await S.from('catlak_characters').select('id,data').eq('id',id).maybeSingle();if(c.error)throw c.error;if(!c.data)throw new Error('Karakter bulunamadı.');const data={...(c.data||{}),gm_note:String(el?.value||'')};const r=await S.from('catlak_characters').update({data}).eq('id',id);if(r.error)throw r.error;toast('Karakter notu kaydedildi.');await load(true)}
async function invite(id,name){const r=await S.rpc('catlak_generate_character_claim',{p_character_id:id});if(r.error)throw r.error;const url=location.origin+location.pathname+'?join='+encodeURIComponent(r.data);try{await navigator.clipboard.writeText(url)}catch(_){ }toast(`${name||'Karakter'} davet linki kopyalandı.`);prompt('Oyuncuya bu bağlantıyı gönder:',url)}
async function del(id,name){if(!confirm(`${name||'Bu karakter'} kalıcı olarak silinsin mi?`))return;const r=await S.from('catlak_characters').delete().eq('id',id);if(r.error)throw r.error;toast('Karakter silindi.');await load(true)}

window.addEventListener('click',e=>{
 const lvl=e.target?.closest?.('[data-gmr-level]');if(lvl&&roomOpen){e.preventDefault();e.stopImmediatePropagation();setLevel(lvl.dataset.id,lvl.dataset.gmrLevel).catch(x=>toast(x?.message||String(x)));return}
 const hp=e.target?.closest?.('[data-gmr-hp]');if(hp&&roomOpen){e.preventDefault();e.stopImmediatePropagation();setHp(hp.dataset.id,hp.dataset.gmrHp).catch(x=>toast(x?.message||String(x)));return}
 const note=e.target?.closest?.('[data-gmr-save-note]');if(note&&roomOpen){e.preventDefault();e.stopImmediatePropagation();saveNote(note.dataset.gmrSaveNote).catch(x=>toast(x?.message||String(x)));return}
 const inv=e.target?.closest?.('[data-gmr-invite]');if(inv&&roomOpen){e.preventDefault();e.stopImmediatePropagation();invite(inv.dataset.gmrInvite,inv.dataset.name).catch(x=>toast(x?.message||String(x)));return}
 const d=e.target?.closest?.('[data-gmr-delete]');if(d&&roomOpen){e.preventDefault();e.stopImmediatePropagation();del(d.dataset.gmrDelete,d.dataset.name).catch(x=>toast(x?.message||String(x)));return}
 if(e.target?.closest?.('[data-gmr-builder]')&&roomOpen){e.preventDefault();e.stopImmediatePropagation();closeRoom();window.__catlakGmHubV2Test?.route?.('builder');return}
},true);

S.channel('gmr-characters').on('postgres_changes',{event:'*',schema:'public',table:'catlak_characters'},()=>{if(!roomOpen)return;clearTimeout(refreshTimer);refreshTimer=setTimeout(()=>load(true),90)}).subscribe();
ensureWrap();
window.__catlakManagementRoom={open:openRoom,close:closeRoom,refresh:()=>load(true),isOpen:()=>roomOpen};
})();
