(function(){
'use strict';
if(window.__CATLAK_V23__)return;window.__CATLAK_V23__=true;

const esc=v=>typeof h==='function'?h(v==null?'':String(v)):String(v??'');
function isReadyInvite(){
  try{
    if(!st?.ses||st.role==='gm')return false;
    const meta=st.ses.user?.user_metadata||{};
    const mode=String(meta.catlak_invite_mode||'');
    if(mode==='character')return true;
    if(mode==='builder')return false;
    const label=String(meta.display_name||'');
    return typeof guest==='function'&&guest()&&/ Oyuncusu$/i.test(label);
  }catch{return false}
}
function canBuild(){return !isReadyInvite()}

nav=function(){
  const gm=st.role==='gm';
  const items=gm?
    [['gm','GM Masası'],['characters','Oyuncu Masam'],['ready','Hazır Karakter Oluştur'],['races','Irk Atölyesi'],['items','Eşya Atölyesi'],['world','Harita & NPC'],['universe','Evren'],['rules','Kaynaklar'],['account','Hesap']]:
    [['sheet','Karakterim'],...(canBuild()?[['builder','Karakter Oluştur']]:[]),['world','Parti Görseli'],['rolls','Zarlarım']];
  return `<header class="top"><div class="brand"><div class="mark">◇</div><div><b>Çatlak Çağı</b><div class="muted mini">${gm?'GM Canlı Masa':guest()?'Misafir Oyuncu':'Oyuncu Masası'}</div></div></div><div class="row"><span class="role">${gm?'GM':guest()?'MİSAFİR':'OYUNCU'}</span>${gm||!guest()?'<button data-a="logout" class="small">Çıkış</button>':''}</div></header><nav class="nav">${items.map(([i,l])=>`<button data-tab="${i}" class="${st.tab===i?'on':''}">${l}</button>`).join('')}</nav>`;
};

gmhome=function(){return `<section class="card hero"><div><div class="eyebrow">GM CANLI MASA</div><h1>Çatlak Çağı</h1><p>${st.chars.length} karakter • ${st.items.length} eşya • canlı oyun yönetimi</p><div class="actions"><button class="primary" data-tab="characters">Oyuncu Masamı Aç</button><button data-tab="ready">Hazır Karakter Oluştur</button><button data-a="guestinvite">Yeni Oyuncu Daveti</button></div></div><div class="vitals"><div class="vital"><span>KARAKTER</span><b>${st.chars.length}</b></div><div class="vital"><span>ZAR</span><b>${st.rolls.length}</b></div><div class="vital"><span>CANLI</span><b>●</b></div></div></section>`};

function lastRollFor(id){return st.rolls.find(r=>r.character_id===id)}
function playerDesk(){
  const dc=st.chars.find(x=>x.id===st.detailCharId);
  const cards=st.chars.map(c=>{const d=der(c),lr=lastRollFor(c.id);return `<div class="char v23-char"><div><div class="row"><b>${esc(c.name)}</b>${!c.owner_id?'<span class="tag">HAZIR / SAHİPSİZ</span>':''}</div><p class="muted">${esc(c.species_name)} • ${esc(c.class_name)} ${c.level} • ${c.owner_id?'Oyuncuya bağlı':'Davet bekliyor'}</p><span>HP ${c.hp_current}/${d.hp} • AC ${d.ac} • Hız ${d.speed}</span>${lr?`<div class="v23-last"><small>SON ZAR</small><b>${lr.total==null?'?':lr.total}</b><span>${esc(lr.label||lr.roll_kind||'Zar')}</span></div>`:''}</div><div class="actions"><button data-a="detailchar" data-id="${c.id}">Detay</button><button data-a="level" data-id="${c.id}" data-d="-1">Lv −</button><button data-a="level" data-id="${c.id}" data-d="1">Lv +</button><button data-a="hp" data-id="${c.id}" data-d="-1">HP −</button><button data-a="hp" data-id="${c.id}" data-d="1">HP +</button>${!c.owner_id?`<button class="primary" data-a="claimcode" data-id="${c.id}">Hazır Karakter Daveti</button>`:''}<button class="danger" data-a="chardelete" data-id="${c.id}">Sil</button></div></div>`}).join('')||'<div class="empty">Karakter yok.</div>';
  return `<div class="v23-desk"><section class="card"><div class="section-title"><div><div class="eyebrow">GM • OYUNCU MASAM</div><h2>Karakterler</h2><p class="muted">Oyuncuya bağlı ve hazır/sahipsiz karakterler aynı yerde.</p></div><div class="actions"><button class="primary" data-tab="ready">+ Hazır Karakter Oluştur</button><button data-a="guestinvite">+ Yeni Oyuncu Daveti</button></div></div><div class="list">${cards}</div></section><aside class="card v23-roll-panel"><div class="section-title"><div><div class="eyebrow">CANLI</div><h2>Zar Akışı</h2></div><button class="danger" data-v23="clear-rolls">Zar Logunu Temizle</button></div><div class="v23-roll-scroll">${rolls(st.rolls.slice(0,60),true)}</div></aside></div>${dc?detail(dc):''}`;
}

function readyDraft(){
  const sp=st.speciesRows?.[0]?.name||'',bg=st.backgroundRows?.[0]?.name||'',cl=st.classRows?.[0]?.name||'';
  return window.__v23ReadyDraft||(window.__v23ReadyDraft={name:'',species:sp,background:bg,className:cl,path:'',stats:{STR:15,DEX:14,CON:13,INT:12,WIS:10,CHA:8}})
}
function captureReady(){
  const d=readyDraft(),q=id=>document.querySelector(id);
  if(q('#v23-name'))d.name=q('#v23-name').value;
  if(q('#v23-species'))d.species=q('#v23-species').value;
  if(q('#v23-bg'))d.background=q('#v23-bg').value;
  if(q('#v23-class'))d.className=q('#v23-class').value;
  if(q('#v23-path'))d.path=q('#v23-path').value;
  A.forEach(a=>{if(q('#v23-'+a))d.stats[a]=q('#v23-'+a).value});
}
function readyPage(){
  const d=readyDraft(),paths=st.paths.filter(x=>x.species_name===d.species),ready=st.chars.filter(c=>!c.owner_id);
  return `<section class="card"><div class="eyebrow">GM • HAZIR KARAKTER</div><h1>Hazır Karakter Oluştur</h1><p class="muted">Burada oluşturduğun karakter sahipsiz kalır. Oyuncu Masam veya bu sayfadaki davet butonuyla sahibine gönderirsin.</p><div class="form"><label class="wide">Karakter adı<input id="v23-name" maxlength="60" value="${esc(d.name)}"></label><label>Irk<select id="v23-species">${st.speciesRows.map(x=>`<option ${x.name===d.species?'selected':''}>${esc(x.name)}</option>`).join('')}</select></label><label>Arka plan<select id="v23-bg">${st.backgroundRows.map(x=>`<option ${x.name===d.background?'selected':''}>${esc(x.name)}</option>`).join('')}</select></label><label>Sınıf<select id="v23-class">${st.classRows.map(x=>`<option ${x.name===d.className?'selected':''}>${esc(x.name)}</option>`).join('')}</select></label><label>Özel yol<select id="v23-path"><option value="">Yok / isteğe bağlı</option>${paths.map(x=>`<option value="${esc(x.path_key)}" ${x.path_key===d.path?'selected':''}>${esc(x.name)}</option>`).join('')}</select></label></div><h3>Başlangıç Statları</h3><div class="v23-stat-grid">${A.map(a=>`<label>${a}<input id="v23-${a}" type="number" min="3" max="30" value="${esc(d.stats[a])}"></label>`).join('')}</div><button class="primary widebtn" data-v23="create-ready">Hazır Karakteri Kaydet</button></section><section class="card"><div class="eyebrow">HAZIR / SAHİPSİZ</div><h2>Gönderilmeyi Bekleyen Karakterler</h2><div class="list">${ready.length?ready.map(c=>{const d2=der(c);return `<div class="char"><div><b>${esc(c.name)}</b><p class="muted">${esc(c.species_name)} • ${esc(c.class_name)} ${c.level}</p><span>HP ${c.hp_current}/${d2.hp} • AC ${d2.ac} • Hız ${d2.speed}</span></div><div class="actions"><button data-a="detailchar" data-id="${c.id}">Detay</button><button class="primary" data-a="claimcode" data-id="${c.id}">Hazır Karakter Daveti</button><button class="danger" data-a="chardelete" data-id="${c.id}">Sil</button></div></div>`}).join(''):'<div class="empty">Hazır karakter yok.</div>'}</div></section>`;
}

const oldUniverseRoom=universeRoom;
universeRoom=function(){
  let x=oldUniverseRoom();
  if(st.role!=='gm')return x;
  x=x.replace(/(<button class="primary" data-a="showvisual" data-id="([^"]+)">Partiye Göster<\/button>)/g,'$1<button class="danger" data-v23="delete-universe" data-kind="media" data-id="$2">Sil</button>');
  x=x.replace(/(<button class="primary" data-a="shownpc" data-id="([^"]+)">Partiye Göster<\/button>)/g,'$1<button class="danger" data-v23="delete-universe" data-kind="npc" data-id="$2">Sil</button>');
  return x;
};

render=function(){
  if(!st.ses)return auth();
  const mine=st.chars.filter(c=>c.owner_id===st.ses.user.id);let body='';
  if(st.role==='gm'){
    if(st.tab==='rolls')st.tab='characters';
    if(['sheet','builder'].includes(st.tab))st.tab='gm';
    if(st.tab==='gm')body=gmhome();
    if(st.tab==='characters')body=playerDesk();
    if(st.tab==='ready')body=readyPage();
    if(st.tab==='races')body=raceWorkshop();
    if(st.tab==='items')body=workshop();
    if(st.tab==='world')body=worldRoom();
    if(st.tab==='universe')body=universeRoom();
    if(st.tab==='rules')body=rules();
    if(st.tab==='account')body=account();
  }else{
    const allowed=canBuild()?['sheet','builder','world','rolls']:['sheet','world','rolls'];
    if(!allowed.includes(st.tab))st.tab='sheet';
    if(st.tab==='sheet')body=mine.length?mine.map(sheet).join(''):`<section class="card empty"><h2>${canBuild()?'Henüz karakterin yok':'Hazır karakterin yükleniyor'}</h2>${canBuild()?'<button class="primary" data-tab="builder">Karakter Oluştur</button>':'<p>GM tarafından gönderilen karakter bu ekranda görünecek.</p>'}</section>`;
    if(st.tab==='builder'&&canBuild())body=builder();
    if(st.tab==='world')body=worldRoom();
    if(st.tab==='rolls')body=`<section class="card"><div class="eyebrow">ZAR GEÇMİŞİ</div>${rolls(st.rolls.filter(r=>mine.some(c=>c.id===r.character_id)),false)}</section>`;
  }
  app.innerHTML=nav()+`<main>${body}</main>`;
};

document.addEventListener('input',e=>{if(String(e.target?.id||'').startsWith('v23-'))captureReady()},true);
document.addEventListener('change',e=>{if(String(e.target?.id||'').startsWith('v23-')){captureReady();if(e.target.id==='v23-species'){const d=readyDraft(),ps=st.paths.filter(x=>x.species_name===d.species);if(d.path&&!ps.some(x=>x.path_key===d.path))d.path='';render()}}},true);
document.addEventListener('click',async e=>{
  const b=e.target.closest('button');if(!b)return;
  try{
    if(b.dataset.v23==='clear-rolls'){
      e.preventDefault();e.stopImmediatePropagation();
      if(st.role!=='gm')throw new Error('GM yetkisi gerekli');
      if(!confirm('Tüm zar logları silinsin mi? Oyuncuların zar geçmişinden de kaybolacak.'))return;
      const {data,error}=await S.rpc('catlak_clear_roll_log');if(error)throw error;msg((data||0)+' zar kaydı temizlendi.');await refresh();return;
    }
    if(b.dataset.v23==='create-ready'){
      e.preventDefault();e.stopImmediatePropagation();captureReady();const d=readyDraft(),name=String(d.name||'').trim();if(name.length<2)throw new Error('Karakter adı en az 2 karakter olmalı');
      const stats={};for(const a of A){const v=Number(d.stats[a]);if(!Number.isInteger(v)||v<3||v>30)throw new Error(a+' 3-30 arasında olmalı');stats[a]=v}
      const {error}=await S.rpc('catlak_gm_create_ready_character',{p_name:name,p_species:d.species,p_background:d.background,p_class:d.className,p_stats:stats,p_special_path:d.path||null});if(error)throw error;
      window.__v23ReadyDraft=null;msg('Hazır karakter oluşturuldu.');await refresh();return;
    }
    if(b.dataset.v23==='delete-universe'){
      e.preventDefault();e.stopImmediatePropagation();
      if(st.role!=='gm')throw new Error('GM yetkisi gerekli');
      if(!confirm('Bu Evren dosyası silinsin mi? Parti ekranında açıksa oradan da kaldırılacak.'))return;
      const {error}=await S.rpc('catlak_delete_universe_item',{p_kind:b.dataset.kind,p_id:b.dataset.id});if(error)throw error;msg('Evren dosyası silindi.');await refresh();return;
    }
  }catch(ex){err(ex)}
},true);

const sty=document.createElement('style');sty.textContent=`
.v23-desk{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(330px,.75fr);gap:14px;align-items:start}.v23-roll-panel{position:sticky;top:118px;max-height:calc(100vh - 140px);overflow:hidden}.v23-roll-scroll{max-height:calc(100vh - 240px);overflow:auto}.v23-char{align-items:flex-start}.v23-last{display:flex;gap:8px;align-items:center;margin-top:8px;padding:6px 8px;border:1px solid var(--line);border-radius:9px;background:#07121d}.v23-last small{color:var(--muted)}.v23-last b{color:var(--gold);font-size:1.15rem}.v23-stat-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:8px;margin-bottom:12px}.universecard img,.worldcard img,.activevisual{object-fit:contain!important;object-position:center!important;background:#02060a!important}.activevisual{width:min(1200px,100%)!important;max-height:min(78vh,820px)!important;margin:auto!important;display:block!important}.universeimg,.mapthumb{image-rendering:auto!important}
@media(max-width:980px){.v23-desk{grid-template-columns:1fr}.v23-roll-panel{position:static;max-height:none}.v23-roll-scroll{max-height:520px}.v23-stat-grid{grid-template-columns:repeat(3,1fr)}}`;
document.head.appendChild(sty);
setTimeout(()=>{try{render()}catch(e){console.error(e)}},80);
})();
