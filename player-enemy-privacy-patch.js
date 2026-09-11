const PEP_APP=document.querySelector('#app');
if(!PEP_APP)throw new Error('Oyuncu yaratık gizlilik katmanı başlatılamadı.');

const pepTxt=e=>String(e?.textContent||'').trim();
const pepIsPlayer=()=>{const r=pepTxt(PEP_APP.querySelector('.role'));return !!r&&r!=='GM'};
let pepScheduled=false;

if(!document.querySelector('#pep-creature-privacy-style')){
  const s=document.createElement('style');
  s.id='pep-creature-privacy-style';
  s.textContent=`
    #app main [data-br3-creatures] .br3-card>.mini,
    #app main [data-br3-creatures] .br3-card>.br3-note{display:none!important}
  `;
  document.head.appendChild(s);
}

function pepStripHpText(text){
  return String(text||'').replace(/\s*•\s*HP\s*\d+\s*\/\s*\d+/gi,'').replace(/\s*HP\s*\d+\s*\/\s*\d+/gi,'').trim();
}
function pepSanitize(){
  if(!pepIsPlayer()||window.__catlakBattleRoomOpen!==true)return;
  const main=PEP_APP.querySelector('main');if(!main)return;

  // Oyuncu yaratık kartında yalnız AC'yi bilir. HP, inisiyatif,
  // saldırı/silah adı, saldırı zarı ve hasar formülü GM bilgisi olarak kalır.
  main.querySelectorAll('[data-br3-creatures] .br3-card').forEach(card=>{
    card.querySelectorAll('.br3-pill').forEach(p=>{
      if(!/^AC\s+/i.test(pepTxt(p)))p.remove();
    });
    card.querySelectorAll(':scope > .mini,:scope > .br3-note').forEach(x=>x.remove());
  });

  // Büyü/yetenek hedef seçiminde yaratık HP'si sızmasın.
  main.querySelectorAll('[data-br3-ability-target] option').forEach(o=>{
    const clean=pepStripHpText(o.textContent);
    if(clean!==o.textContent)o.textContent=clean;
  });

  // Son aksiyon sonucunda hedefin kalan HP'si gösterilmez.
  main.querySelectorAll('.br3-result').forEach(box=>{
    box.querySelectorAll('div').forEach(d=>{
      if(/HP\s*\d+\s*\/\s*\d+/i.test(d.textContent||''))d.textContent=pepStripHpText(d.textContent);
    });
  });
}
function pepSchedule(){
  if(pepScheduled)return;pepScheduled=true;
  requestAnimationFrame(()=>{pepScheduled=false;pepSanitize()});
}

new MutationObserver(pepSchedule).observe(PEP_APP,{childList:true,subtree:true,characterData:true});
document.addEventListener('click',pepSchedule,true);
setTimeout(pepSanitize,120);
window.__catlakEnemyHpPrivacy={sanitize:pepSanitize,mode:'ac-only'};
