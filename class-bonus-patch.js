(function(){
'use strict';
if(window.__catlakClassBonusV1)return;
const APP=document.querySelector('#app');
const S=window.__catlakSupabase;
if(!APP||!S)return;
window.__catlakClassBonusV1=true;
const STATS=['STR','DEX','CON','INT','WIS','CHA'];
let classes=[],syncBusy=false,uiQueued=false,syncTimer=0;
const txt=e=>String(e?.textContent||'').trim();
const isGM=()=>txt(APP.querySelector('.role'))==='GM';
const n=x=>Number(x||0);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const key=x=>String(x||'').toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i').replace(/[^a-z0-9]+/g,'-');
const toast=m=>{const t=document.querySelector('#toast');if(!t)return;t.textContent=String(m);t.classList.remove('hidden');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.add('hidden'),4200)};

if(!document.getElementById('ccb-style')){
 const st=document.createElement('style');st.id='ccb-style';st.textContent=`
 #app .ccb-preview{border-color:#6e5933!important;background:linear-gradient(180deg,#1d1a12,#0d1722)!important}
 #app .ccb-badges{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
 #app .ccb-badge{border:1px solid #6e5933;border-radius:999px;padding:5px 8px;color:#f0cf7c;font-size:.74rem;font-weight:800}
 #app .ddb-choice-grid[data-ddb-choice-grid="bcl"] .ddb-choice-card small{white-space:normal;line-height:1.25}
 `;document.head.appendChild(st)
}
function statObj(src){const out={};for(const k of STATS){const v=n(src?.[k]);if(v)out[k]=v}return out}
function explicitBonus(row){
 const d=row?.data||{};const raw=d.class_bonus||d.classBonus||d.bonus||d.bonuses;
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return null;
 const stats=statObj(raw.stats||raw.stat_bonuses||raw.ability_scores||raw);
 return{stats,hp:n(raw.hp??raw.hp_max??raw.max_hp),ac:n(raw.ac??raw.armor_class),title:String(raw.title||raw.name||d.bonus_text||'Sınıf Bonusu')};
}
function declaredPrimary(row){
 const d=row?.data||{};let arr=d.primary_stats||d.primary_stat||d.abilities||d.key_abilities||[];if(typeof arr==='string')arr=arr.split(/[,/| ]+/);arr=Array.isArray(arr)?arr.map(x=>String(x).toUpperCase()).filter(x=>STATS.includes(x)):[];
 if(!arr.length)return null;const stats={[arr[0]]:2};if(arr[1])stats[arr[1]]=1;return{stats,hp:Math.max(0,Math.floor(n(row.hit_die||row.hitDie||8)/4)-1),ac:0,title:'Sınıf Bonusu'};
}
function preset(row){
 const ex=explicitBonus(row);if(ex)return ex;const dec=declaredPrimary(row);if(dec)return dec;
 const k=key(row?.name);let stats={},hp=0,ac=0;
 if(/silahsor|gunslinger/.test(k)){stats={DEX:2,WIS:1};hp=1}
 else if(/barbar/.test(k)){stats={STR:2,CON:1};hp=4}
 else if(/paladin/.test(k)){stats={STR:1,CHA:1};hp=2;ac=1}
 else if(/savasc|fighter|warrior/.test(k)){stats={STR:1,CON:1};hp=2;ac=1}
 else if(/ruhban|cleric|priest/.test(k)){stats={WIS:2,CON:1};hp=1;ac=1}
 else if(/kesis|monk/.test(k)){stats={DEX:1,WIS:1};ac=1}
 else if(/kolcu|ranger|avci|hunter/.test(k)){stats={DEX:1,WIS:1};hp=2}
 else if(/haydut|rogue|hirsiz|thief/.test(k)){stats={DEX:2,INT:1}}
 else if(/ozan|bard/.test(k)){stats={CHA:2,DEX:1}}
 else if(/warlock|buyucu-antlas|cadici/.test(k)){stats={CHA:2,WIS:1};hp=1}
 else if(/sorcer|sahire|dogustan-buyucu/.test(k)){stats={CHA:2,CON:1};hp=1}
 else if(/wizard|mage|buyucu|sihirbaz/.test(k)){stats={INT:2,WIS:1}}
 else if(/druid/.test(k)){stats={WIS:2,CON:1};hp=1}
 else if(/artific|mucit|zanaatkar/.test(k)){stats={INT:2,CON:1};ac=1}
 else {const hd=n(row?.hit_die||row?.hitDie||8);if(hd>=12){stats={CON:1};hp=3}else if(hd>=10){stats={CON:1};hp=2}else if(hd>=8)hp=1}
 return{stats,hp,ac,title:'Sınıf Bonusu'};
}
function classRow(name){return classes.find(x=>String(x.name)===String(name))||{name,hit_die:8,data:{}}}
function label(b){const bits=Object.entries(b.stats||{}).filter(([,v])=>n(v)).map(([k,v])=>`${k} ${n(v)>0?'+':''}${n(v)}`);if(n(b.hp))bits.push(`Maks HP +${n(b.hp)}`);if(n(b.ac))bits.push(`AC +${n(b.ac)}`);return bits.join(' • ')||'Bu sınıf için ek mekanik bonus tanımlı değil.'}
async function loadClasses(){const r=await S.from('catlak_classes').select('*').order('sort_order',{ascending:true});if(r.error)throw r.error;classes=r.data||[];scheduleUi();return classes}
function builderActive(){return isGM()&&!!APP.querySelector('main .builder #bcl')}
function syncUi(){
 uiQueued=false;if(!builderActive())return;
 const select=APP.querySelector('main .builder #bcl');if(!select)return;const row=classRow(select.value),b=preset(row);let p=APP.querySelector('[data-ccb-preview]');
 if(!p){p=document.createElement('section');p.className='card preview ccb-preview';p.dataset.ccbPreview='1';const path=APP.querySelector('#pathPreview');if(path)path.before(p);else APP.querySelector('main .builder aside')?.appendChild(p)}
 if(p){const html=`<div class="eyebrow">SINIF BONUSU</div><h3>${esc(row.name||select.value||'Sınıf')}</h3><p class="muted">Sınıf seçildiğinde bu paket karakterin temel değerlerine bir kez uygulanır.</p><div class="ccb-badges">${label(b).split(' • ').map(x=>`<span class="ccb-badge">${esc(x)}</span>`).join('')}</div>`;if(p.innerHTML!==html)p.innerHTML=html;const step=APP.querySelector('main .builder')?.dataset.ddbStep;p.hidden=!!step&&!['4','5'].includes(String(step))}
 const grid=APP.querySelector('[data-ddb-choice-grid="bcl"]');if(grid)grid.querySelectorAll('[data-ddb-choice-target="bcl"]').forEach(card=>{const r=classRow(card.dataset.value),small=card.querySelector('small');if(small)small.textContent=label(preset(r))});
}
function scheduleUi(){if(uiQueued)return;uiQueued=true;requestAnimationFrame(syncUi)}
function reverse(stats,bonus){const out={...stats};for(const k of STATS)out[k]=Math.max(3,Math.min(30,n(out[k])-n(bonus?.stats?.[k])));return out}
function applyStats(stats,bonus){const out={...stats};for(const k of STATS)out[k]=Math.max(3,Math.min(30,n(out[k])+n(bonus?.stats?.[k])));return out}
async function applyCharacter(c){
 if(!c?.id||!c.class_name)return false;const data={...(c.data||{})},old=data.class_bonus_v1||null,row=classRow(c.class_name),b=preset(row);
 if(old?.applied&&old.version===1&&String(old.class_name)===String(c.class_name))return false;
 let stats={...(c.base_stats||{})},hp=n(c.hp_max),hpCur=n(c.hp_current),ac=n(c.base_ac);
 if(old?.applied){stats=reverse(stats,old);hp-=n(old.hp);hpCur-=n(old.hp);ac-=n(old.ac)}
 stats=applyStats(stats,b);hp=Math.max(1,hp+n(b.hp));hpCur=Math.max(0,Math.min(hp,hpCur+n(b.hp)));ac=Math.max(0,ac+n(b.ac));
 data.class_bonus_v1={version:1,applied:true,class_name:c.class_name,stats:b.stats||{},hp:n(b.hp),ac:n(b.ac),label:label(b),applied_at:new Date().toISOString()};
 const r=await S.from('catlak_characters').update({base_stats:stats,hp_max:hp,hp_current:hpCur,base_ac:ac,data}).eq('id',c.id);if(r.error)throw r.error;return true;
}
async function syncCharacters(showToast=false){
 if(!isGM()||syncBusy)return;syncBusy=true;let count=0;
 try{
  if(!classes.length)await loadClasses();const r=await S.from('catlak_characters').select('id,class_name,base_stats,hp_max,hp_current,base_ac,data').order('created_at',{ascending:true});if(r.error)throw r.error;
  for(const c of r.data||[]){try{if(await applyCharacter(c))count++}catch(e){console.warn('CLASS_BONUS_CHARACTER',c?.id,e)}}
  if(showToast&&count)toast(`${count} karakterin sınıf bonusu uygulandı.`);
 }catch(e){console.warn('CLASS_BONUS_SYNC',e);if(showToast)toast('Sınıf bonusları uygulanamadı: '+(e?.message||String(e)))}finally{syncBusy=false}
}
function scheduleSync(ms=120){clearTimeout(syncTimer);syncTimer=setTimeout(()=>syncCharacters(false),ms)}
window.addEventListener('change',e=>{if(e.target?.id==='bcl')setTimeout(scheduleUi,0)},true);
new MutationObserver(scheduleUi).observe(APP,{childList:true,subtree:true});
S.channel('class-bonus-live').on('postgres_changes',{event:'*',schema:'public',table:'catlak_classes'},()=>{classes=[];loadClasses().then(()=>scheduleSync(50)).catch(e=>console.warn('CLASS_BONUS_CLASSES',e))}).on('postgres_changes',{event:'INSERT',schema:'public',table:'catlak_characters'},()=>scheduleSync(120)).subscribe();
setTimeout(()=>{loadClasses().then(()=>syncCharacters(true)).catch(e=>console.warn('CLASS_BONUS_BOOT',e))},500);
window.__catlakClassBonus={preset,label,refresh:()=>loadClasses().then(()=>syncCharacters(true)),syncUi};
})();
