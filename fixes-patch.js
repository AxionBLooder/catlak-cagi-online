const S=window.__catlakSupabase;
const APP=document.querySelector('#app');
if(!S||!APP)throw new Error('Çatlak Çağı düzeltme katmanı başlatılamadı.');

const txt=e=>String(e?.textContent||'').trim();
const isGM=()=>txt(APP.querySelector('.role'))==='GM';
const activeTab=()=>APP.querySelector('.nav button.on')?.dataset.tab||'';
const toast=x=>{const t=document.querySelector('#toast');if(!t)return;t.textContent=x;t.classList.remove('hidden');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.add('hidden'),4200)};
let scheduled=false,clearing=false;

function repairWorldRouter(){
  const b=APP.querySelector('[data-cc-world-tab]');
  if(!b)return;
  b.removeAttribute('data-tab');
  b.type='button';
  b.setAttribute('aria-label','Evren');
}

function makeClearButton(){
  const b=document.createElement('button');
  b.type='button';
  b.className='danger cc-clear-all-rolls';
  b.dataset.ccClearAllRolls='1';
  b.textContent='Tüm Zarları Sil';
  return b;
}

function addBulkRollControls(){
  if(!isGM())return;
  const main=APP.querySelector('main');if(!main)return;
  const tab=activeTab();

  if(tab==='rolls'){
    const card=main.querySelector(':scope > section.card');
    if(card&&!card.querySelector('[data-cc-clear-all-rolls]')){
      const bar=document.createElement('div');
      bar.className='row cc-clear-roll-actions';
      bar.style.justifyContent='flex-end';
      bar.style.marginBottom='12px';
      bar.appendChild(makeClearButton());
      const rolls=card.querySelector('.rolls');
      rolls?card.insertBefore(bar,rolls):card.appendChild(bar);
    }
  }

  if(tab==='gm'){
    const sections=[...main.querySelectorAll(':scope > section.card')];
    const flow=sections.find(s=>txt(s.querySelector('.eyebrow'))==='ORTAK ZAR AKIŞI'||txt(s.querySelector('h2'))==='DM + Oyuncular');
    if(flow&&!flow.querySelector('[data-cc-clear-all-rolls]')){
      const title=flow.querySelector('.section-title');
      if(title){
        let actions=title.querySelector('.cc-clear-roll-actions');
        if(!actions){actions=document.createElement('div');actions.className='row cc-clear-roll-actions';title.appendChild(actions)}
        actions.appendChild(makeClearButton());
      }else flow.insertBefore(makeClearButton(),flow.firstChild);
    }
  }
}

async function clearAllRolls(){
  if(clearing||!isGM())return;
  if(!confirm('Tüm zar geçmişi kalıcı olarak silinsin mi? Bu işlem oyuncu ve DM ekranındaki bütün zar kayıtlarını temizler.'))return;
  clearing=true;
  try{
    const {data,error}=await S.rpc('catlak_clear_roll_log');
    if(error)throw error;
    APP.querySelectorAll('.roll,.cc-roll-line').forEach(x=>x.remove());
    toast(`${Number(data)||0} zar kaydı silindi. Oyuncu ve DM ekranları canlı olarak yenilenecek.`);
  }catch(e){toast(e?.message||String(e))}
  finally{clearing=false}
}

APP.addEventListener('click',e=>{
  const b=e.target.closest('[data-cc-clear-all-rolls]');
  if(!b)return;
  e.preventDefault();e.stopPropagation();clearAllRolls();
},true);

function run(){scheduled=false;repairWorldRouter();addBulkRollControls()}
function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(run)}
new MutationObserver(schedule).observe(APP,{childList:true,subtree:true});
schedule();
