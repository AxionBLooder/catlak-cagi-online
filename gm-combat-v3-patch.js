const GCV3_S=window.__catlakSupabase;
const GCV3_APP=document.querySelector('#app');
if(!GCV3_S||!GCV3_APP)throw new Error('Çatlak Çağı GM savaş v3 başlatılamadı.');
const gcv3Txt=e=>String(e?.textContent||'').trim();
const gcv3IsGM=()=>gcv3Txt(GCV3_APP.querySelector('.role'))==='GM';
const gcv3Num=(x,f=0)=>Number.isFinite(Number(x))?Number(x):f;
const gcv3Toast=x=>{const t=document.querySelector('#toast');if(!t)return;t.textContent=String(x);t.classList.remove('hidden');clearTimeout(gcv3Toast.t);gcv3Toast.t=setTimeout(()=>t.classList.add('hidden'),4200)};
let gcv3Busy=false,gcv3UiQueued=false;

if(!document.querySelector('#gcv3-compact-style')){
  const s=document.createElement('style');s.id='gcv3-compact-style';s.textContent=`
  main.gcv3-compact-gm-combat{max-width:1760px!important;padding-top:10px!important}
  main.gcv3-compact-gm-combat .gmt-shell{gap:10px!important}
  main.gcv3-compact-gm-combat .gmt-shell>section.card:first-child{padding:10px 12px!important}
  main.gcv3-compact-gm-combat .gmt-shell>section.card:first-child h1{margin:.1rem 0 .45rem!important;font-size:1.35rem!important}
  main.gcv3-compact-gm-combat .gmt-tabs{gap:6px!important}
  main.gcv3-compact-gm-combat .gmt-tabs button{padding:7px 10px!important;min-height:34px!important}
  main.gcv3-compact-gm-combat .gmt-grid{display:grid!important;grid-template-columns:minmax(240px,.72fr) minmax(390px,1.28fr) minmax(300px,.9fr)!important;gap:10px!important;align-items:start!important}
  main.gcv3-compact-gm-combat .gmt-grid>.gmt-stack:first-child,main.gcv3-compact-gm-combat .gmt-grid>aside.gmt-stack{display:contents!important}
  main.gcv3-compact-gm-combat .gmt-grid>.gmt-stack:first-child>section.card{margin:0!important;min-width:0!important;padding:10px!important}
  main.gcv3-compact-gm-combat .gmt-grid>.gmt-stack:first-child>section.card:nth-child(1){grid-column:1/2;grid-row:1}
  main.gcv3-compact-gm-combat .gmt-grid>.gmt-stack:first-child>section.card:nth-child(1):only-child{grid-column:1/3}
  main.gcv3-compact-gm-combat .gmt-grid>.gmt-stack:first-child>section.card:nth-child(2){grid-column:2/3;grid-row:1}
  main.gcv3-compact-gm-combat .gmt-grid>.gmt-stack:first-child>section.card:nth-child(3){grid-column:1/-1;grid-row:2}
  main.gcv3-compact-gm-combat .gmt-grid>aside.gmt-stack>section.card{grid-column:3/4;grid-row:1;margin:0!important;min-width:0!important;padding:10px!important}
  main.gcv3-compact-gm-combat .gmt-grid h2{font-size:1rem!important;margin:.08rem 0 .4rem!important}
  main.gcv3-compact-gm-combat .gmt-grid p.muted{font-size:.72rem!important;line-height:1.3!important;margin:.3rem 0 .5rem!important}
  main.gcv3-compact-gm-combat .gmt-toolbar{display:grid!important;grid-template-columns:repeat(auto-fit,minmax(115px,1fr))!important;gap:6px!important;align-items:end!important}
  main.gcv3-compact-gm-combat .gmt-toolbar label{min-width:0!important;font-size:.72rem!important}
  main.gcv3-compact-gm-combat .gmt-toolbar input,main.gcv3-compact-gm-combat .gmt-toolbar select,main.gcv3-compact-gm-combat .gmt-toolbar button{min-height:34px!important;padding:6px 8px!important;font-size:.75rem!important}
  main.gcv3-compact-gm-combat .gmt-grid>.gmt-stack:first-child>section.card:nth-child(2) hr{margin:8px 0!important}
  main.gcv3-compact-gm-combat .gmt-grid>.gmt-stack:first-child>section.card:nth-child(3)>.gmt-stack{display:grid!important;grid-template-columns:repeat(auto-fit,minmax(235px,1fr))!important;gap:7px!important}
  main.gcv3-compact-gm-combat .gmt-combatant{padding:8px!important;border-radius:11px!important;min-width:0!important}
  main.gcv3-compact-gm-combat .gmt-combatant-head{grid-template-columns:42px minmax(0,1fr) auto!important;gap:7px!important}
  main.gcv3-compact-gm-combat .gmt-init{font-size:1.15rem!important}
  main.gcv3-compact-gm-combat .gmt-mini{font-size:.68rem!important}
  main.gcv3-compact-gm-combat .gmt-hp{font-size:.78rem!important}
  main.gcv3-compact-gm-combat .gmt-combatant>.actions{display:grid!important;grid-template-columns:repeat(5,minmax(0,1fr))!important;gap:4px!important;margin-top:6px!important}
  main.gcv3-compact-gm-combat .gmt-combatant>.actions button{padding:5px 4px!important;min-height:30px!important;font-size:.66rem!important}
  main.gcv3-compact-gm-combat .gmt-grid>aside .form{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:6px!important}
  main.gcv3-compact-gm-combat .gmt-grid>aside .form label{font-size:.7rem!important;min-width:0!important}
  main.gcv3-compact-gm-combat .gmt-grid>aside .form .wide{grid-column:1/-1!important}
  main.gcv3-compact-gm-combat .gmt-grid>aside textarea{min-height:54px!important}
  main.gcv3-compact-gm-combat .gmt-condition{padding:6px 0!important}
  main.gcv3-compact-gm-combat .gmt-grid>aside hr{margin:8px 0!important}
  @media(max-width:1180px){
    main.gcv3-compact-gm-combat .gmt-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}
    main.gcv3-compact-gm-combat .gmt-grid>.gmt-stack:first-child>section.card:nth-child(1){grid-column:1/2!important;grid-row:auto!important}
    main.gcv3-compact-gm-combat .gmt-grid>.gmt-stack:first-child>section.card:nth-child(2){grid-column:2/3!important;grid-row:auto!important}
    main.gcv3-compact-gm-combat .gmt-grid>aside.gmt-stack>section.card{grid-column:1/-1!important;grid-row:auto!important}
    main.gcv3-compact-gm-combat .gmt-grid>.gmt-stack:first-child>section.card:nth-child(3){grid-column:1/-1!important;grid-row:auto!important}
  }
  @media(max-width:720px){
    main.gcv3-compact-gm-combat{padding:8px!important}
    main.gcv3-compact-gm-combat .gmt-grid{grid-template-columns:1fr!important;gap:7px!important}
    main.gcv3-compact-gm-combat .gmt-grid>.gmt-stack:first-child>section.card,main.gcv3-compact-gm-combat .gmt-grid>aside.gmt-stack>section.card{grid-column:1/-1!important;grid-row:auto!important}
    main.gcv3-compact-gm-combat .gmt-grid>.gmt-stack:first-child>section.card:nth-child(3)>.gmt-stack{display:flex!important;overflow-x:auto!important;gap:6px!important;padding-bottom:4px!important;scrollbar-width:thin}
    main.gcv3-compact-gm-combat .gmt-combatant{flex:0 0 235px!important}
    main.gcv3-compact-gm-combat .gmt-grid>aside .form{grid-template-columns:1fr 1fr!important}
  }
  `;document.head.appendChild(s)
}

function gcv3CompactLayout(){
  const main=GCV3_APP.querySelector('main');if(!main)return;
  const combatOpen=gcv3IsGM()&&!!main.querySelector('.gmt-tabs [data-gmt-sub="combat"].on')&&!!main.querySelector('.gmt-grid');
  main.classList.toggle('gcv3-compact-gm-combat',combatOpen)
}
async function gcv3Active(){const r=await GCV3_S.from('catlak_combat_state').select('active').eq('id',1).maybeSingle();if(r.error)throw r.error;return !!r.data?.active}
async function gcv3Refresh(){const m=GCV3_APP.querySelector('main');if(m)m.dataset.gmtTools='';setTimeout(()=>window.gmtRender?.(true),20);setTimeout(()=>window.__catlakCombatEnhancementsTest?.renderGM?.(true),120);setTimeout(()=>{gcv3NormalizeCustomForm();gcv3CompactLayout()},180)}
function gcv3NormalizeCustomForm(){
  gcv3UiQueued=false;gcv3CompactLayout();if(!gcv3IsGM())return;
  const btn=GCV3_APP.querySelector('[data-bcc-add-creature]');if(!btn)return;
  btn.textContent='Kütüphaneye Kaydet';btn.title='Yaratığı kalıcı Yaratık Kütüphanesi’ne kaydeder.';
  const init=GCV3_APP.querySelector('#bcc-init');init?.closest('label')?.remove();
  const section=btn.closest('section.card');const eyebrow=section?.querySelector('.eyebrow');
  if(eyebrow)eyebrow.textContent='OYUNCU / YARATIK KÜTÜPHANESİ';
  const row=btn.closest('.bcc-gm-form,.gmt-toolbar');
  if(row&&!row.querySelector('[data-gcv3-library-note]')){
    const note=document.createElement('div');note.dataset.gcv3LibraryNote='1';note.className='mini muted';note.style.gridColumn='1/-1';note.textContent='Özel yaratık önce kütüphaneye kaydolur. Sonra aşağıdaki Yaratık Kütüphanesi kartından Goblin gibi Savaşa Ekle ile karşılaşmaya alınır.';row.insertBefore(note,btn);
  }
}
function gcv3QueueUi(){if(gcv3UiQueued)return;gcv3UiQueued=true;requestAnimationFrame(()=>{gcv3NormalizeCustomForm();gcv3CompactLayout()})}
async function gcv3AddTemplate(btn){if(gcv3Busy)return;gcv3Busy=true;btn.disabled=true;try{if(!await gcv3Active())throw new Error('Önce savaşı başlat.');const id=btn.dataset.cexTemplateAdd;if(!id)throw new Error('Yaratık şablonu bulunamadı.');const r=await GCV3_S.rpc('catlak_gm_combat_add_template',{p_template_id:id,p_initiative:null});if(r.error)throw r.error;if(!r.data)throw new Error('Yaratık savaşa eklenemedi.');gcv3Toast('Yaratık savaşa gönderildi. Oyuncu Savaş Odası’nda görünecek.');await gcv3Refresh()}finally{gcv3Busy=false;if(btn.isConnected)btn.disabled=false}}
async function gcv3AddCustom(btn){
  if(gcv3Busy)return;gcv3Busy=true;btn.disabled=true;
  try{
    const name=GCV3_APP.querySelector('#bcc-name')?.value.trim()||'';if(!name)throw new Error('Yaratık adı gerekli.');
    const args={
      p_name:name,
      p_creature_type:GCV3_APP.querySelector('#bcc-type')?.value.trim()||'',
      p_hp:Math.max(1,gcv3Num(GCV3_APP.querySelector('#bcc-hp')?.value,10)),
      p_ac:Math.max(0,gcv3Num(GCV3_APP.querySelector('#bcc-ac')?.value,10)),
      p_attack_name:GCV3_APP.querySelector('#bcc-attack-name')?.value.trim()||'',
      p_attack_formula:GCV3_APP.querySelector('#bcc-attack-formula')?.value.trim()||'',
      p_damage_formula:GCV3_APP.querySelector('#bcc-damage-formula')?.value.trim()||'',
      p_note:GCV3_APP.querySelector('#bcc-note')?.value.trim()||''
    };
    const r=await GCV3_S.rpc('catlak_gm_save_creature_template',args);if(r.error)throw r.error;if(!r.data)throw new Error('Yaratık kütüphaneye kaydedilemedi.');
    gcv3Toast(name+' Yaratık Kütüphanesi’ne kaydedildi. Artık Goblin gibi Savaşa Ekle ile kullanabilirsin.');
    ['#bcc-name','#bcc-type','#bcc-attack-name','#bcc-attack-formula','#bcc-damage-formula','#bcc-note'].forEach(q=>{const e=GCV3_APP.querySelector(q);if(e)e.value=''});
    await gcv3Refresh();
  }finally{gcv3Busy=false;if(btn.isConnected)btn.disabled=false}
}
document.addEventListener('click',e=>{if(!gcv3IsGM())return;const t=e.target.closest?.('[data-cex-template-add]');if(t){e.preventDefault();e.stopImmediatePropagation();gcv3AddTemplate(t).catch(x=>gcv3Toast(x?.message||String(x)));return}const c=e.target.closest?.('[data-bcc-add-creature]');if(c){e.preventDefault();e.stopImmediatePropagation();gcv3AddCustom(c).catch(x=>gcv3Toast(x?.message||String(x)));return}},true);
new MutationObserver(gcv3QueueUi).observe(GCV3_APP,{childList:true,subtree:true});
window.addEventListener('resize',gcv3QueueUi);
setInterval(()=>{gcv3NormalizeCustomForm();gcv3CompactLayout()},1400);setTimeout(()=>{gcv3NormalizeCustomForm();gcv3CompactLayout()},220);
window.__catlakGmCombatV3Test={addTemplate:gcv3AddTemplate,addCustom:gcv3AddCustom,normalizeCustomForm:gcv3NormalizeCustomForm,compact:gcv3CompactLayout};