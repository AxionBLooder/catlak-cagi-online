(function(){
'use strict';
if(window.__catlakPlayerSheetRuntimeV4)return;
window.__catlakPlayerSheetRuntimeV4=true;
const APP=document.querySelector('#app'),S=window.__catlakSupabase;
if(!APP||!S)return;
const txt=e=>String(e?.textContent||'').trim();
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=x=>Number(x||0);
const isGM=()=>txt(APP.querySelector('.role'))==='GM';
const tab=()=>APP.querySelector('.nav button.on[data-tab]')?.dataset.tab||'';
const toast=m=>{const t=document.querySelector('#toast');if(!t)return;t.textContent=String(m);t.classList.remove('hidden');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.add('hidden'),3800)};
let scheduled=false,applying=false,raceOpen=false,raceBusy=false,raceGen=0;

if(!document.querySelector('#psv4-style')){
 const s=document.createElement('style');s.id='psv4-style';s.textContent=`
 main.psv4-sheet{max-width:1680px;padding-top:16px}.psv4-sheet>.cc-desk-intro{display:none!important}.psv4-sheet .cc-character-label{display:none!important}.psv4-sheet .cc-character-stack{padding:0!important;border:0!important;background:transparent!important;box-shadow:none!important;margin:0!important}.psv4-grid{display:grid;grid-template-columns:minmax(0,1.28fr) minmax(300px,.78fr) minmax(300px,.72fr);gap:14px;align-items:start}.psv4-main,.psv4-side,.psv4-rolls{display:flex;flex-direction:column;gap:12px;min-width:0}.psv4-detail{grid-column:1/3;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;min-width:0}.psv4-grid>.psv4-main>.card,.psv4-grid>.psv4-side>.card,.psv4-grid>.psv4-rolls>.card,.psv4-detail>.card{margin:0!important;min-width:0}.psv4-rolls{position:sticky;top:12px;max-height:calc(100vh - 24px);overflow:auto;padding-right:2px}.psv4-rolls .roll{padding:8px!important}.psv4-rolls .die{width:38px!important;height:38px!important}.psv4-sheet section.hero{display:grid!important;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:15px;padding:18px!important}.psv4-sheet section.hero h1{font-size:clamp(1.8rem,3.2vw,2.8rem);margin:.05em 0 .16em}.psv4-sheet section.hero .vitals{display:grid!important;grid-template-columns:repeat(2,minmax(105px,1fr));gap:7px;min-width:245px}.psv4-sheet section.hero .vital{padding:10px!important;border-radius:12px!important}.psv4-sheet [data-psv4-hp]{cursor:pointer;text-decoration:underline dotted #7fb6d0;text-underline-offset:4px}.psv4-sheet [data-psv4-hp]:hover{color:var(--cyan)}.psv4-sheet [data-psv4-race-hidden]{display:none!important}.psv4-inventory>h2{display:none!important}.psv4-race-page{max-width:1500px;margin:0 auto;padding:18px 22px}.psv4-race-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:10px}.psv4-race-power{border:1px solid var(--line);border-radius:13px;padding:12px;background:#08131f}.psv4-race-power.locked{opacity:.5}.psv4-race-power .tag{float:right}.psv4-race-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.psv4-race-head h2{margin:.1em 0}.psv4-race-character{margin-bottom:14px}
 @media(max-width:1180px){.psv4-grid{grid-template-columns:minmax(0,1.2fr) minmax(300px,.8fr)}.psv4-rolls{grid-column:1/-1;position:static;max-height:none;display:grid;grid-template-columns:1fr}.psv4-detail{grid-column:1/-1}}
 @media(max-width:760px){main.psv4-sheet{padding:10px}.psv4-grid{grid-template-columns:1fr}.psv4-detail{grid-column:auto;grid-template-columns:1fr}.psv4-rolls{grid-column:auto}.psv4-sheet section.hero{grid-template-columns:1fr}.psv4-sheet section.hero .vitals{min-width:0;width:100%}}
 `;document.head.appendChild(s)
}
function eyebrow(sec){return txt(sec?.querySelector(':scope > .eyebrow,:scope > .section-title .eyebrow'))}
function charId(stack){return stack?.querySelector('section.hero [data-a="hp"][data-id]')?.dataset.id||''}
function ensureGrid(stack){let g=stack.querySelector(':scope > .psv4-grid');if(g)return g;g=document.createElement('div');g.className='psv4-grid';g.innerHTML='<div class="psv4-main"></div><aside class="psv4-side"></aside><aside class="psv4-rolls"></aside><div class="psv4-detail"></div>';stack.appendChild(g);return g}
function place(parent,nodes){if(!parent)return;for(const n of nodes.filter(Boolean))parent.appendChild(n)}
function hpSetup(stack){const hero=stack.querySelector('section.hero'),vitals=[...hero?.querySelectorAll('.vital')||[]],hp=vitals.find(v=>/^HP$/i.test(txt(v.querySelector('span'))));if(!hp)return;const b=hp.querySelector('b');if(!b)return;b.dataset.psv4Hp=charId(stack);b.title='Canı değiştirmek için tıkla. Örn: -5 veya +3'}
function normalizeInventory(sec){if(!sec)return;sec.classList.add('psv4-inventory');const e=sec.querySelector(':scope > .eyebrow');if(e)e.textContent='ENVANTER';const h=sec.querySelector(':scope > h2');if(h&&/silah\s*[•·-]\s*zırh\s*[•·-]\s*eşya/i.test(txt(h)))h.remove()}
function arrange(stack){
 if(!stack||!stack.isConnected)return;
 const g=ensureGrid(stack),main=g.querySelector('.psv4-main'),side=g.querySelector('.psv4-side'),rolls=g.querySelector('.psv4-rolls'),detail=g.querySelector('.psv4-detail');
 const cards=[...stack.querySelectorAll(':scope > section.card,:scope > .psv4-grid > div > section.card,:scope > .psv4-grid > aside > section.card')];
 const hero=[],stats=[],inventory=[],status=[],roll=[],details=[],other=[],visual=[];
 for(const sec of cards){
  const e=eyebrow(sec);
  if(sec.matches('section.hero'))hero.push(sec);
  else if(e==='D20 TESTLERİ')stats.push(sec);
  else if(e==='CANLI ENVANTER'||e==='ENVANTER'){normalizeInventory(sec);inventory.push(sec)}
  else if(e==='SON ZARLAR')roll.push(sec);
  else if(e==='IRK GÜÇLERİ'){sec.dataset.psv4RaceHidden='1'}
  else if(sec.hasAttribute('data-gmt-player-panel')||sec.hasAttribute('data-cc-player-note-for')||sec.hasAttribute('data-ps-combat-card'))status.push(sec);
  else if(sec.hasAttribute('data-cc-party-visual-card'))visual.push(sec);
  else if(sec.classList.contains('vampire')||e==='ÖZEL YOL')details.push(sec);
  else other.push(sec)
 }
 place(main,[...hero,...stats,...inventory,...visual]);
 place(side,status);
 place(rolls,roll);
 place(detail,[...details,...other]);
 hpSetup(stack);stack.dataset.psv4Ready='1'
}
function ensureRaceNav(){
 const nav=APP.querySelector('.nav');if(!nav||isGM())return;
 let b=nav.querySelector('[data-psv4-race-nav]');
 if(!b){b=document.createElement('button');b.type='button';b.dataset.psv4RaceNav='1';b.textContent='Irk Becerileri';const sheet=nav.querySelector('[data-tab="sheet"]');sheet?sheet.after(b):nav.prepend(b)}
 b.classList.toggle('on',raceOpen)
}
function apply(){scheduled=false;if(applying)return;applying=true;try{ensureRaceNav();const main=APP.querySelector('main');if(!main)return;if(isGM()||tab()!=='sheet'||raceOpen){main.classList.remove('psv4-sheet');return}main.classList.add('psv4-sheet');[...main.querySelectorAll('.cc-character-stack')].forEach(arrange)}finally{applying=false}}
function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(apply)}
async function editHp(el){
 const id=el.dataset.psv4Hp;if(!id)return;const m=txt(el).match(/(\d+)\s*\/\s*(\d+)/);if(!m)return;
 const cur=num(m[1]),max=num(m[2]),raw=prompt(`HP ${cur}/${max}\nDeğişim miktarını yaz. Örn: -5 veya +3`,'-1');if(raw==null)return;
 const delta=Number(String(raw).replace(',','.'));if(!Number.isFinite(delta)||delta===0)return toast('Geçerli bir + / - sayı gir.');
 const next=Math.max(0,Math.min(max,cur+delta));el.textContent=`${next}/${max}`;
 const r=await S.rpc('catlak_update_my_hp',{p_character_id:id,p_hp:next});if(r.error){el.textContent=`${cur}/${max}`;return toast(r.error.message)}
 toast(`HP ${cur} → ${next}`);try{window.__catlakPlayerSheetSupport?.refresh?.(true)}catch(_){}
}
function racePowerHtml(p,level){
 const lv=num(p.unlock_level)||1,on=lv<=level;
 return `<article class="psv4-race-power ${on?'':'locked'}"><span class="tag">LV ${lv}</span><h3>${esc(p.name)}</h3><p>${esc(p.short_description||p.data?.description||'')}</p>${p.detail_note?`<small class="muted">${esc(p.detail_note)}</small>`:''}</article>`
}
function raceCharacterHtml(c,powers){
 const level=num(c.level)||1,rows=powers.filter(p=>p.species_name===c.species_name&&p.data?.disabled!==true);
 const cards=rows.length?rows.map(p=>racePowerHtml(p,level)).join(''):'<div class="muted">Bu ırk için kayıtlı beceri yok.</div>';
 return `<section class="card psv4-race-character"><div class="psv4-race-head"><div><div class="eyebrow">${esc(c.species_name||'IRK')}</div><h2>${esc(c.name)}</h2></div><span class="tag">LV ${level}</span></div><div class="psv4-race-grid">${cards}</div></section>`
}
async function renderRace(){
 if(raceBusy)return;raceBusy=true;const gen=++raceGen;
 try{
  const ses=(await S.auth.getSession()).data.session,user=ses?.user?.id;if(!user)throw new Error('Oyuncu oturumu bulunamadı.');
  const cr=await S.from('catlak_characters').select('id,name,species_name,level').eq('owner_id',user).order('created_at',{ascending:true});if(cr.error)throw cr.error;
  const chars=cr.data||[],species=[...new Set(chars.map(c=>c.species_name).filter(Boolean))];let powers=[];
  if(species.length){const pr=await S.from('catlak_species_powers').select('species_name,unlock_level,name,short_description,detail_note,data').in('species_name',species).order('unlock_level',{ascending:true});if(pr.error)throw pr.error;powers=pr.data||[]}
  if(gen!==raceGen||!raceOpen)return;const main=APP.querySelector('main');if(!main)return;
  main.className='psv4-race-page';
  const intro='<section class="card"><div class="eyebrow">IRK BECERİLERİ</div><h1>Seviye Gelişimleri</h1><p class="muted">Irkından her seviyede açılan özellikleri burada görürsün. Açılmış beceriler parlak, ileride açılacaklar soluk görünür.</p></section>';
  main.innerHTML=intro+(chars.length?chars.map(c=>raceCharacterHtml(c,powers)).join(''):'<section class="card"><div class="muted">Karakter bulunamadı.</div></section>')
 }catch(e){toast('Irk Becerileri açılamadı: '+(e?.message||String(e)))}finally{raceBusy=false}
}
function openRace(){if(isGM())return;raceOpen=true;ensureRaceNav();APP.querySelectorAll('.nav button.on').forEach(x=>{if(!x.hasAttribute('data-psv4-race-nav'))x.classList.remove('on')});renderRace()}
function closeRace(){if(!raceOpen)return;raceOpen=false;raceGen++;ensureRaceNav()}
document.addEventListener('click',e=>{const hp=e.target.closest?.('[data-psv4-hp]');if(hp){e.preventDefault();e.stopImmediatePropagation();editHp(hp);return}const race=e.target.closest?.('[data-psv4-race-nav]');if(race){e.preventDefault();e.stopImmediatePropagation();openRace();return}const nav=e.target.closest?.('#app .nav button[data-tab]');if(nav&&raceOpen)closeRace()},true);
new MutationObserver(schedule).observe(APP,{childList:true,subtree:true});
S.channel('psv4-race-live').on('postgres_changes',{event:'*',schema:'public',table:'catlak_species_powers'},()=>{if(raceOpen)renderRace()}).on('postgres_changes',{event:'*',schema:'public',table:'catlak_characters'},()=>{if(raceOpen)renderRace()}).subscribe();
schedule();window.__catlakPlayerSheetTest={apply,arrange,openRace,editHp};
})();