(function(){
'use strict';
if(window.__catlakDdbBuilderV2)return;
window.__catlakDdbBuilderV2=true;
const APP=document.getElementById('app');
if(!APP)return;
const txt=e=>String(e?.textContent||'').trim();
const isGM=()=>txt(APP.querySelector('.role'))==='GM';
let step=1,scheduled=false;

if(!document.getElementById('ddb-builder-v2-style')){
 const s=document.createElement('style');s.id='ddb-builder-v2-style';s.textContent=`
.ddb-builder-steps{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px;margin:12px 0 16px}.ddb-builder-step{padding:10px 8px!important;text-align:left!important;background:#171d21!important;border:1px solid #3c454b!important}.ddb-builder-step small{display:block;font-size:.62rem;color:#939da4;margin-bottom:3px}.ddb-builder-step.on{background:#f0ece4!important;color:#681f24!important;border-color:#b83f45!important;box-shadow:inset 0 -3px #b83f45}.ddb-builder-step.done{border-color:#667664!important}.ddb-builder-help{margin:10px 0 14px;padding:10px 12px;border-left:3px solid #b83f45;background:#151b1f;color:#bdc5ca;font-size:.82rem;line-height:1.5}.ddb-builder-actions{display:flex;justify-content:space-between;gap:8px;margin-top:15px}.ddb-builder-hidden{display:none!important}.ddb-builder-preview-active{outline:2px solid #b83f45!important;outline-offset:2px}.ddb-bg-summary{margin-top:10px;padding:10px;border:1px solid #b9a98d;border-radius:6px;background:#f6f1e8;color:#282522}.ddb-bg-summary b{color:#7a272d}
@media(max-width:900px){.ddb-builder-steps{grid-template-columns:repeat(3,1fr)}}@media(max-width:620px){.ddb-builder-steps{grid-template-columns:1fr 1fr}.ddb-builder-step:last-child{grid-column:1/-1}}
 `;document.head.appendChild(s)
}
function activeBuilder(){return isGM()&&APP.querySelector('.nav [data-tab="builder"].on')&&APP.querySelector('main .builder')}
function labelFor(id){return APP.querySelector(`#${id}`)?.closest('label')||null}
function preview(id){return APP.querySelector(id)}
function setVisible(el,on){if(el)el.classList.toggle('ddb-builder-hidden',!on)}
function show(n){
 step=Math.max(1,Math.min(5,Number(n)||1));const root=APP.querySelector('main .builder');if(!root)return;
 root.dataset.ddbStep=String(step);
 root.querySelectorAll('[data-ddb-builder-step]').forEach((b,i)=>{b.classList.toggle('on',i+1===step);b.classList.toggle('done',i+1<step)});
 setVisible(labelFor('bname'),step===1);
 setVisible(labelFor('bsp'),step===2);
 setVisible(labelFor('bbg'),step===3);
 setVisible(labelFor('bcl'),step===4);setVisible(labelFor('bpath'),step===4);
 const stats=root.querySelector('.effects'),statsHead=[...root.querySelectorAll('h3')].find(x=>/Başlangıç Statları/i.test(txt(x)));setVisible(stats,step===5);setVisible(statsHead,step===5);
 const create=root.querySelector('[data-a="ccCreatePrepared"],[data-a="create"]');setVisible(create,step===5);
 const sp=preview('#speciesPreview'),bg=preview('#bgPreview'),path=preview('#pathPreview');[sp,bg,path].forEach(x=>x?.classList.remove('ddb-builder-preview-active'));
 setVisible(sp,step===2||step===5);setVisible(bg,step===3||step===5);setVisible(path,step===4||step===5);
 if(step===2)sp?.classList.add('ddb-builder-preview-active');if(step===3)bg?.classList.add('ddb-builder-preview-active');if(step===4)path?.classList.add('ddb-builder-preview-active');
 const help=root.querySelector('[data-ddb-builder-help]');if(help)help.textContent=[
  'Karakterin adını belirle. Karakter oyuncuya bağlanmadan önce GM tarafından hazırlanır.',
  'Irkı seç. Irk özellikleri ve seviye ile açılan güçler sağ tarafta önizlenir.',
  'Arka planı seç. Hikâye, bölge, önerilen statlar, beceriler, araç ve başlangıç ekipmanı burada görünür.',
  'Sınıfı ve varsa özel yolu seç. Karakterin oyun rolünü ve gelişim yönünü burada belirle.',
  'Başlangıç statlarını kontrol et. Kaydettiğinde hazır karakter oluşur ve oyuncu davet bağlantısı hazırlanır.'
 ][step-1];
 const back=root.querySelector('[data-ddb-builder-back]'),next=root.querySelector('[data-ddb-builder-next]');if(back)back.disabled=step===1;if(next){next.hidden=step===5;next.textContent=step===4?'Statlara Geç':'Devam'}
}
function enhanceBackground(){
 const bg=preview('#bgPreview');if(!bg||bg.querySelector('[data-ddb-bg-note]'))return;
 const note=document.createElement('div');note.className='ddb-bg-summary';note.dataset.ddbBgNote='1';note.innerHTML='<b>Arka Plan</b><br>Bu seçim karakterin yalnız hikâyesini değil; becerilerini, araç bilgisini ve başlangıç ekipmanını da tanımlar.';bg.appendChild(note)
}
function install(){
 scheduled=false;if(!activeBuilder())return;const root=APP.querySelector('main .builder');if(!root||root.dataset.ddbBuilderV2==='1'){enhanceBackground();return}
 root.dataset.ddbBuilderV2='1';
 const legacy=root.querySelector('.cc-wizard');if(legacy)legacy.remove();
 const form=root.querySelector(':scope > section.card .form');if(!form)return;
 const wrap=document.createElement('div');wrap.innerHTML='<div class="ddb-builder-steps"><button type="button" class="ddb-builder-step" data-ddb-builder-step="1"><small>ADIM 1</small>Kimlik</button><button type="button" class="ddb-builder-step" data-ddb-builder-step="2"><small>ADIM 2</small>Irk</button><button type="button" class="ddb-builder-step" data-ddb-builder-step="3"><small>ADIM 3</small>Arka Plan</button><button type="button" class="ddb-builder-step" data-ddb-builder-step="4"><small>ADIM 4</small>Sınıf & Yol</button><button type="button" class="ddb-builder-step" data-ddb-builder-step="5"><small>ADIM 5</small>Statlar & Gönder</button></div><div class="ddb-builder-help" data-ddb-builder-help></div><div class="ddb-builder-actions"><button type="button" data-ddb-builder-back>← Geri</button><button type="button" class="primary" data-ddb-builder-next>Devam</button></div>';
 const nodes=[...wrap.children];nodes.reverse().forEach(n=>form.parentElement.insertBefore(n,form));
 enhanceBackground();show(1)
}
function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(install)}
window.addEventListener('click',e=>{
 const s=e.target?.closest?.('[data-ddb-builder-step]');if(s){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();show(s.dataset.ddbBuilderStep);return}
 if(e.target?.closest?.('[data-ddb-builder-back]')){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();show(step-1);return}
 if(e.target?.closest?.('[data-ddb-builder-next]')){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();if(step===1&&!APP.querySelector('#bname')?.value.trim()){APP.querySelector('#bname')?.focus();return}show(step+1)}
},true);
new MutationObserver(schedule).observe(APP,{childList:true,subtree:true});
setTimeout(schedule,0);setTimeout(schedule,300);setTimeout(schedule,900);
window.__catlakDdbBuilder={show,install};
})();