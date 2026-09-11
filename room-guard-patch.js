const CRG_S=window.__catlakSupabase;
const CRG_APP=document.querySelector('#app');
if(!CRG_S||!CRG_APP)throw new Error('Çatlak Çağı oda koruma katmanı başlatılamadı.');

const crgTxt=e=>String(e?.textContent||'').trim();
const crgIsGM=()=>crgTxt(CRG_APP.querySelector('.role'))==='GM';
const crgToast=x=>{const t=document.querySelector('#toast');if(!t)return;t.textContent=String(x);t.classList.remove('hidden');clearTimeout(crgToast.t);crgToast.t=setTimeout(()=>t.classList.add('hidden'),3800)};
let crgScheduled=false;

// GM Merkezi alt sekmeleri yalnız GM Merkezi kendi ekranındayken görünür.
// Eşya / Stat / Irk / Karakter Oluşturucu / Yönetim Odası gibi yerel sayfalarda
// üstte ikinci bir küçük GM Merkezi çubuğu bırakılmaz.
if(!document.querySelector('#crg-gm-center-scope-style')){
  const s=document.createElement('style');
  s.id='crg-gm-center-scope-style';
  s.textContent=`
    #app [data-gm2-centerbar]{display:none!important}
    #app:has(main .gmt-shell) [data-gm2-centerbar]{display:flex!important}
  `;
  document.head.appendChild(s);
}

// Savaş Odası'nın eski ana rendererı 2.5 saniyede bir aynı base HTML'i tekrar
// main.innerHTML'e yazıyordu. Yaratık / büyü / tur kontrolü gibi eklentiler bu sırada
// silinip birkaç ms sonra geri geldiği için ekran gözle görünür biçimde yanıp sönüyordu.
// Aynı base savaş HTML'i tekrar geliyorsa yazımı yut; gerçek veri değiştiğinde HTML
// değişeceği için normal render aynen devam eder.
if(!window.__catlakBattleInnerHtmlStabilityInstalled){
  const desc=Object.getOwnPropertyDescriptor(Element.prototype,'innerHTML');
  if(desc?.get&&desc?.set){
    let lastBattleBase='',lastBattleMain=null,suppressed=0;
    const looksBattle=v=>typeof v==='string'&&(v.includes('OYUNCU • SAVAŞ ODASI')||v.includes('⚔ SAVAŞ ODASI'));
    const currentLooksBattle=el=>{try{const v=desc.get.call(el);return typeof v==='string'&&v.includes('SAVAŞ ODASI')}catch{return false}};
    Object.defineProperty(Element.prototype,'innerHTML',{
      configurable:desc.configurable,
      enumerable:desc.enumerable,
      get:desc.get,
      set:function(value){
        const main=CRG_APP.querySelector('main');
        if(this===main&&window.__catlakBattleRoomOpen===true&&looksBattle(value)){
          if(lastBattleMain===this&&lastBattleBase===value&&currentLooksBattle(this)){
            suppressed++;
            window.__catlakBattleRenderSuppressed=suppressed;
            return;
          }
          lastBattleMain=this;
          lastBattleBase=value;
        }else if(this===main&&window.__catlakBattleRoomOpen!==true){
          lastBattleMain=null;
          lastBattleBase='';
        }
        return desc.set.call(this,value);
      }
    });
    window.__catlakBattleInnerHtmlStabilityInstalled=true;
  }
}

// GM özel d20/d100 zarları yalnız Zar Akışı'nda görünür.
// Canlı Oyun Masası'ndaki eski hızlı zar kutusunu görsel olarak kaldırır;
// event-rolls-patch içindeki Zar Akışı kontrollerine dokunmaz.
if(!document.querySelector('#crg-live-dice-cleanup-style')){
  const s=document.createElement('style');
  s.id='crg-live-dice-cleanup-style';
  s.textContent='.cc-live-two [data-dx-gm-dice]{display:none!important}';
  document.head.appendChild(s);
}

const CRG_NAV_PLAN=[
  '[data-tab="gm"]',
  '[data-gmt-open]',
  '[data-cc-map-tab]',
  '[data-cc-world-tab]',
  '[data-tab="items"]',
  '[data-cc-stats-tab]',
  '[data-tab="rolls"]',
  '[data-tab="races"]',
  '[data-tab="builder"]',
  '[data-ccr-hub]'
];

function crgOrderNav(){
  if(!crgIsGM())return;
  const nav=CRG_APP.querySelector('.nav');if(!nav)return;
  const desired=CRG_NAV_PLAN.map(sel=>nav.querySelector(sel)).filter(Boolean);
  if(desired.length<2)return;
  const current=[...nav.children].filter(x=>desired.includes(x));
  if(current.length===desired.length&&current.every((x,i)=>x===desired[i]))return;
  const hiddenAnchor=[...nav.children].find(x=>x.matches?.('[data-tab="characters"],[data-tab="rules"],[data-tab="account"]'))||null;
  const frag=document.createDocumentFragment();desired.forEach(x=>frag.appendChild(x));
  nav.insertBefore(frag,hiddenAnchor);
}
function crgSchedule(){
  if(crgScheduled)return;crgScheduled=true;
  requestAnimationFrame(()=>{crgScheduled=false;crgOrderNav()});
}

const crgBusy=new Set();
const crgSuppress=new Map();
function crgActionKey(el){
  if(el?.matches?.('[data-ccr-weapon]'))return `weapon:${el.dataset.ccrWeapon}:${el.dataset.kind||'attack'}`;
  if(el?.matches?.('[data-ccr-stat]'))return `stat:${el.dataset.ccrStat}`;
  return '';
}
function crgRefreshBattle(){
  setTimeout(()=>window.__catlakRoomSystemTest?.renderBattle?.(true),80);
  setTimeout(()=>window.__catlakRoomSystemTest?.renderBattle?.(true),450);
}
async function crgRunAction(el){
  const key=crgActionKey(el);if(!key||crgBusy.has(key))return;
  crgBusy.add(key);
  try{
    if(el.matches('[data-ccr-weapon]')){
      const r=await CRG_S.rpc('catlak_roll_weapon',{p_inventory_id:el.dataset.ccrWeapon,p_action:el.dataset.kind||'attack'});
      if(r.error)throw r.error;
      crgToast(r.data?.total==null?`${r.data?.label||'Zar'}: GM Kararı`:`${r.data?.label||'Zar'}: ${r.data.total}`);
    }else{
      const s=await CRG_S.rpc('catlak_player_combat_snapshot');if(s.error)throw s.error;
      const id=s.data?.character_id;if(!id)throw new Error('Aktif karakter bulunamadı');
      const r=await CRG_S.rpc('catlak_roll_stat',{p_character_id:id,p_stat:el.dataset.ccrStat});if(r.error)throw r.error;
      crgToast(`${r.data?.label||el.dataset.ccrStat}: ${r.data?.total}`);
    }
    crgRefreshBattle();
  }catch(e){crgToast(e?.message||String(e))}finally{crgBusy.delete(key)}
}
function crgBattleTarget(e){
  if(window.__catlakBattleRoomOpen!==true)return null;
  return e.target.closest?.('[data-ccr-weapon],[data-ccr-stat]')||null;
}

// Pointer-down'da işi başlatmak, 2.5 sn'lik eski oda yenilemesi tam tıklama anına denk gelse bile
// RPC'nin kaybolmamasını sağlar. Sonraki click olayı bu katmanda yutulur; çift zar atılmaz.
document.addEventListener('pointerdown',e=>{
  if(e.button!=null&&e.button!==0)return;
  const el=crgBattleTarget(e);if(!el)return;
  const key=crgActionKey(el),now=Date.now();
  e.preventDefault();e.stopImmediatePropagation();
  if((crgSuppress.get(key)||0)>now)return;
  crgSuppress.set(key,now+3200);
  crgRunAction(el);
},true);

document.addEventListener('click',e=>{
  const el=crgBattleTarget(e);if(!el)return;
  const key=crgActionKey(el),now=Date.now();
  e.preventDefault();e.stopImmediatePropagation();
  if((crgSuppress.get(key)||0)>now)return;
  crgSuppress.set(key,now+1200);
  crgRunAction(el);
},true);

new MutationObserver(crgSchedule).observe(CRG_APP,{childList:true,subtree:true});
crgOrderNav();
setTimeout(crgOrderNav,250);
setTimeout(crgOrderNav,900);
window.__catlakRoomGuardTest={orderNav:crgOrderNav,plan:[...CRG_NAV_PLAN],runAction:crgRunAction,battleSuppressed:()=>window.__catlakBattleRenderSuppressed||0};