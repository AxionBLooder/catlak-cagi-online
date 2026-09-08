import{createClient}from'https://esm.sh/@supabase/supabase-js@2.115.0?bundle';

const S=createClient('https://ygbereitlhjvoqgqlwfe.supabase.co','sb_publishable_haPHSdfajhnaiHUZkVqN9Q_Yk6KrMMA',{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const APP=document.querySelector('#app');
if(!APP)throw new Error('Çatlak Çağı uygulama kökü bulunamadı.');

const h=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const txt=e=>String(e?.textContent||'').trim();
const isGM=()=>txt(APP.querySelector('.role'))==='GM';
const toast=x=>{const t=document.querySelector('#toast');if(!t)return;t.textContent=x;t.classList.remove('hidden');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.add('hidden'),4200)};
let worldActive=false,rendering=false,scheduled=false;

const css=`
.cc-world-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(270px,1fr));gap:14px}.cc-world-card{overflow:hidden}.cc-world-card img{width:100%;height:210px;object-fit:cover;border-radius:12px;border:1px solid var(--line);background:#07101d}.cc-world-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.cc-world-actions{display:flex;gap:7px;flex-wrap:wrap}.cc-world-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.cc-world-form .wide{grid-column:1/-1}.cc-world-empty{padding:24px;border:1px dashed var(--line);border-radius:12px;color:var(--muted);text-align:center}.cc-world-danger{border-color:#713b49!important;color:#ffb7c2!important}.cc-world-columns{display:grid;grid-template-columns:1fr 1fr;gap:16px}.cc-world-meta{color:var(--muted);font-size:.82rem}.cc-world-card p{white-space:pre-wrap}.cc-world-top{background:linear-gradient(135deg,#10283a,#0d1724 55%,#1a1829)!important}.cc-world-count{display:inline-block;border:1px solid var(--line);border-radius:999px;padding:4px 8px;color:var(--cyan);font-size:.72rem}
@media(max-width:850px){.cc-world-columns{grid-template-columns:1fr}}@media(max-width:600px){.cc-world-form{grid-template-columns:1fr}.cc-world-form .wide{grid-column:auto}.cc-world-card img{height:180px}}
`;
if(!document.querySelector('#cc-world-style')){const s=document.createElement('style');s.id='cc-world-style';s.textContent=css;document.head.appendChild(s)}

function ensureNav(){
  const nav=APP.querySelector('.nav');if(!nav)return;
  let b=nav.querySelector('[data-cc-world-tab]');
  if(!b){
    b=document.createElement('button');b.type='button';b.dataset.ccWorldTab='1';b.dataset.tab='world';b.textContent='Evren';
    const rules=nav.querySelector('[data-tab="rules"]');rules?rules.before(b):nav.appendChild(b);
  }
  if(worldActive){nav.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b))}
}

function mediaCard(m,gm){
  return`<article class="card cc-world-card"><div class="cc-world-head"><div><span class="tag">HARİTA</span><h3>${h(m.title||'Adsız Harita')}</h3></div>${gm?`<button class="cc-world-danger small" data-cc-delete-map="${m.id}">Haritayı Sil</button>`:''}</div>${m.image_url?`<img src="${h(m.image_url)}" alt="${h(m.title||'Harita')}" loading="lazy" referrerpolicy="no-referrer">`:''}<p>${h(m.description||'')}</p></article>`
}
function npcCard(n,gm){
  return`<article class="card cc-world-card"><div class="cc-world-head"><div><span class="tag">NPC</span><h3>${h(n.name||'Adsız NPC')}</h3><div class="cc-world-meta">${h(n.role||'NPC')}${n.place?' • '+h(n.place):''}${n.relation?' • '+h(n.relation):''}</div></div>${gm?`<button class="cc-world-danger small" data-cc-delete-npc="${n.id}">NPC'yi Sil</button>`:''}</div>${n.image_url?`<img src="${h(n.image_url)}" alt="${h(n.name||'NPC')}" loading="lazy" referrerpolicy="no-referrer">`:''}<p>${h(n.note||'')}</p></article>`
}

async function renderWorld(force=false){
  if(!worldActive||rendering)return;
  const main=APP.querySelector('main');if(!main)return;
  if(!force&&main.dataset.ccWorld==='ready')return;
  rendering=true;main.dataset.ccWorld='loading';
  try{
    const [{data:maps,error:me},{data:npcs,error:ne}]=await Promise.all([
      S.from('catlak_world_media').select('*').eq('media_type','map').order('sort_order').order('created_at',{ascending:false}),
      S.from('catlak_npcs').select('*').order('sort_order').order('created_at',{ascending:false})
    ]);
    if(me)throw me;if(ne)throw ne;
    const gm=isGM();
    const controls=gm?`<div class="cc-world-columns"><section class="card"><div class="eyebrow">GM • HARİTA EKLE</div><h2>Yeni Harita</h2><div class="cc-world-form"><label>Başlık<input id="cc-map-title" maxlength="100" placeholder="Harita adı"></label><label>Görsel URL<input id="cc-map-url" placeholder="https://..."></label><label class="wide">Açıklama<textarea id="cc-map-desc" placeholder="Bölge, önemli noktalar, GM notu..."></textarea></label></div><button class="primary" data-cc-add-map>Haritayı Ekle</button></section><section class="card"><div class="eyebrow">GM • NPC EKLE</div><h2>Yeni NPC</h2><div class="cc-world-form"><label>Ad<input id="cc-npc-name" maxlength="100" placeholder="NPC adı"></label><label>Rol<input id="cc-npc-role" placeholder="Tüccar, Muhafız..."></label><label>Yer<input id="cc-npc-place" placeholder="Bulunduğu yer"></label><label>İlişki<input id="cc-npc-relation" placeholder="Tanışılmadı, Dost..."></label><label class="wide">Görsel URL<input id="cc-npc-url" placeholder="https://..."></label><label class="wide">Not<textarea id="cc-npc-note" placeholder="Oyuncuların görebileceği bilgi"></textarea></label></div><button class="primary" data-cc-add-npc>NPC'yi Ekle</button></section></div>`:'';
    main.innerHTML=`<section class="card cc-world-top"><div class="eyebrow">ÇATLAK ÇAĞI • EVREN</div><h1>Haritalar & NPC'ler</h1><p class="muted">Oyunda paylaşılan haritalar ve karşılaşılan NPC'ler burada tutulur. ${gm?'GM olarak kayıt ekleyebilir veya silebilirsin.':'GM tarafından görünür yapılan kayıtları burada görebilirsin.'}</p><div class="row"><span class="cc-world-count">${maps?.length||0} HARİTA</span><span class="cc-world-count">${npcs?.length||0} NPC</span><span class="live">● CANLI</span></div></section>${controls}<section class="card"><div class="section-title"><div><div class="eyebrow">HARİTALAR</div><h2>Evren Haritaları</h2></div></div>${maps?.length?`<div class="cc-world-grid">${maps.map(x=>mediaCard(x,gm)).join('')}</div>`:'<div class="cc-world-empty">Henüz harita eklenmedi.</div>'}</section><section class="card"><div class="section-title"><div><div class="eyebrow">NPC ARŞİVİ</div><h2>Karşılaşılan Karakterler</h2></div></div>${npcs?.length?`<div class="cc-world-grid">${npcs.map(x=>npcCard(x,gm)).join('')}</div>`:'<div class="cc-world-empty">Henüz NPC eklenmedi.</div>'}</section>`;
    main.dataset.ccWorld='ready';
  }catch(e){main.innerHTML=`<section class="card"><div class="eyebrow">EVREN</div><h2>Evren verileri yüklenemedi</h2><p>${h(e?.message||e)}</p><button data-cc-world-retry>Tekrar Dene</button></section>`;main.dataset.ccWorld='error';toast(e?.message||String(e))}
  finally{rendering=false}
}

async function addMap(){
  if(!isGM())return;const title=document.querySelector('#cc-map-title')?.value.trim();if(!title){toast('Harita başlığı gerekli.');return}
  const {error}=await S.from('catlak_world_media').insert({media_type:'map',title,description:document.querySelector('#cc-map-desc')?.value||'',image_url:document.querySelector('#cc-map-url')?.value.trim()||'',visible:true,sort_order:0,data:{}});if(error)throw error;toast('Harita eklendi.');await renderWorld(true)
}
async function addNpc(){
  if(!isGM())return;const name=document.querySelector('#cc-npc-name')?.value.trim();if(!name){toast('NPC adı gerekli.');return}
  const {error}=await S.from('catlak_npcs').insert({name,role:document.querySelector('#cc-npc-role')?.value.trim()||'NPC',place:document.querySelector('#cc-npc-place')?.value.trim()||'',relation:document.querySelector('#cc-npc-relation')?.value.trim()||'Tanışılmadı',note:document.querySelector('#cc-npc-note')?.value||'',image_url:document.querySelector('#cc-npc-url')?.value.trim()||'',visible:true,sort_order:0,data:{}});if(error)throw error;toast('NPC eklendi.');await renderWorld(true)
}
async function del(table,id,label){
  if(!isGM())return;if(!confirm(`${label} kalıcı olarak silinsin mi?`))return;const {error}=await S.from(table).delete().eq('id',id);if(error)throw error;toast(`${label} silindi.`);await renderWorld(true)
}

APP.addEventListener('click',async e=>{
  const world=e.target.closest('[data-cc-world-tab]');
  if(world){e.preventDefault();e.stopPropagation();worldActive=true;ensureNav();await renderWorld(true);return}
  const normal=e.target.closest('.nav [data-tab]:not([data-cc-world-tab])');if(normal)worldActive=false;
  try{
    if(e.target.closest('[data-cc-add-map]')){e.preventDefault();await addMap();return}
    if(e.target.closest('[data-cc-add-npc]')){e.preventDefault();await addNpc();return}
    const dm=e.target.closest('[data-cc-delete-map]');if(dm){e.preventDefault();await del('catlak_world_media',dm.dataset.ccDeleteMap,'Harita');return}
    const dn=e.target.closest('[data-cc-delete-npc]');if(dn){e.preventDefault();await del('catlak_npcs',dn.dataset.ccDeleteNpc,'NPC');return}
    if(e.target.closest('[data-cc-world-retry]')){e.preventDefault();await renderWorld(true)}
  }catch(x){toast(x?.message||String(x))}
},true);

function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;ensureNav();if(worldActive)renderWorld()})}
new MutationObserver(schedule).observe(APP,{childList:true,subtree:true});
S.channel('cc-world-live').on('postgres_changes',{event:'*',schema:'public',table:'catlak_world_media'},()=>{if(worldActive)renderWorld(true)}).on('postgres_changes',{event:'*',schema:'public',table:'catlak_npcs'},()=>{if(worldActive)renderWorld(true)}).subscribe();
schedule();