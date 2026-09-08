(()=>{
  const APP=document.querySelector('#app');
  if(!APP)return;
  let wizardStep=1;
  let scheduled=false;

  const css=`
  .cc-desk-intro{background:linear-gradient(135deg,#122a3e,#0a1523 58%,#20182d)!important;border-color:#36536e!important}
  .cc-desk-intro h1{margin:.15em 0 .25em}.cc-desk-intro .cc-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:15px}
  .cc-mini-stat{border:1px solid var(--line);border-radius:13px;padding:12px;background:#07121f;text-align:center}.cc-mini-stat b{display:block;font-size:1.35rem;color:var(--gold)}.cc-mini-stat span{font-size:.72rem;color:var(--muted);letter-spacing:.08em}
  .cc-character-stack{border:1px solid #263a56;border-radius:22px;padding:10px;margin-bottom:22px;background:#050b14aa;box-shadow:0 20px 60px #0006}.cc-character-stack>.card:last-child{margin-bottom:0}
  .cc-character-label{display:flex;align-items:center;justify-content:space-between;padding:5px 7px 12px;color:var(--muted);font-size:.72rem;letter-spacing:.12em;font-weight:900}.cc-character-label span:last-child{color:var(--cyan)}
  .cc-roll-panel{border-color:#31516e!important}.cc-roll-panel .roll{transition:.18s}.cc-roll-panel .roll:hover{transform:translateX(3px);border-color:#4d7396}
  .cc-wizard{margin:12px 0 18px}.cc-stepper{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.cc-step{padding:10px 8px!important;text-align:left!important;background:#091522!important}.cc-step small{display:block;color:var(--muted);font-size:.65rem}.cc-step.on{border-color:var(--cyan)!important;background:#10263a!important;box-shadow:0 0 0 2px #69d7ff18}.cc-step.done{border-color:#3c735e!important}.cc-wizard-actions{display:flex;justify-content:space-between;gap:10px;margin-top:14px}.cc-wizard-note{margin:12px 0;color:var(--muted);font-size:.82rem}.cc-builder-card{overflow:hidden}
  .cc-hidden-step{display:none!important}.cc-preview-dim{display:none!important}
  .cc-gm-roll-center{border-color:#365877!important}.cc-roll-dashboard{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin:14px 0}.cc-roll-filterbar{display:flex;gap:7px;flex-wrap:wrap;margin:4px 0 15px}.cc-roll-filterbar button.on{border-color:var(--cyan);color:var(--cyan);background:#102338}.cc-critical{border-color:#806934!important;box-shadow:inset 3px 0 #ffd479}.cc-fumble{border-color:#713b49!important;box-shadow:inset 3px 0 #ff7f93}
  @media(max-width:760px){.cc-desk-intro .cc-summary,.cc-roll-dashboard{grid-template-columns:repeat(2,1fr)}.cc-stepper{grid-template-columns:repeat(2,1fr)}.cc-character-stack{padding:6px;border-radius:16px}}
  `;
  const style=document.createElement('style');style.id='cc-ui-patch-style';style.textContent=css;document.head.appendChild(style);

  const txt=(el)=>String(el?.textContent||'').trim();
  const activeTab=()=>txt(APP.querySelector('.nav button.on'));
  const role=()=>txt(APP.querySelector('.role'));

  function enhancePlayerDesk(){
    if(activeTab()!=='Oyuncu Masası'||role()==='GM')return;
    const main=APP.querySelector('main');
    if(!main||main.dataset.ccDesk==='1')return;
    const children=[...main.children];
    const heroes=children.filter(x=>x.matches?.('section.hero'));
    if(!heroes.length){main.dataset.ccDesk='1';return;}
    const rollCount=main.querySelectorAll('.roll').length;
    const intro=document.createElement('section');
    intro.className='card cc-desk-intro';
    intro.innerHTML=`<div class="eyebrow">OYUNCU MERKEZİ</div><h1>Oyuncu Masası</h1><p class="muted">Kendi oluşturduğun ve GM’den sahiplenip aldığın hazır karakterlerin burada birlikte görünür. Karakter kağıdı, envanter ve zar geçmişi tek yerde kalır.</p><div class="cc-summary"><div class="cc-mini-stat"><b>${heroes.length}</b><span>KARAKTER</span></div><div class="cc-mini-stat"><b>${rollCount}</b><span>GÖRÜNEN ZAR</span></div><div class="cc-mini-stat"><b>●</b><span>CANLI MASA</span></div></div>`;
    main.insertBefore(intro,main.firstChild);

    const nodes=[...main.children].filter(x=>x!==intro);
    let group=null,idx=0;
    for(const node of nodes){
      if(node.matches?.('section.hero')){
        idx++;
        group=document.createElement('div');
        group.className='cc-character-stack';
        const label=document.createElement('div');
        label.className='cc-character-label';
        label.innerHTML=`<span>KARAKTER ${idx}</span><span>KARAKTER + ZAR + ENVANTER</span>`;
        group.appendChild(label);
        main.appendChild(group);
      }
      if(group)group.appendChild(node);
    }
    main.querySelectorAll('section.card').forEach(card=>{
      const eye=txt(card.querySelector('.eyebrow'));
      if(eye==='SON ZARLAR')card.classList.add('cc-roll-panel');
    });
    main.dataset.ccDesk='1';
  }

  function setWizardStep(step){
    wizardStep=Math.max(1,Math.min(4,step));
    const root=APP.querySelector('.builder');
    if(!root)return;
    root.querySelectorAll('.cc-step').forEach((b,i)=>{b.classList.toggle('on',i+1===wizardStep);b.classList.toggle('done',i+1<wizardStep)});
    const map={bname:1,bsp:2,bbg:2,bcl:3,bpath:3};
    Object.entries(map).forEach(([id,s])=>{const el=root.querySelector('#'+id);if(el?.parentElement)el.parentElement.classList.toggle('cc-hidden-step',s!==wizardStep)});
    const stats=root.querySelector('.effects');
    const statsTitle=[...root.querySelectorAll('h3')].find(x=>txt(x)==='Başlangıç Statları');
    if(stats)stats.classList.toggle('cc-hidden-step',wizardStep!==4);
    if(statsTitle)statsTitle.classList.toggle('cc-hidden-step',wizardStep!==4);
    const create=root.querySelector('[data-a="create"]');
    if(create)create.classList.toggle('cc-hidden-step',wizardStep!==4);
    const previews=[root.querySelector('#speciesPreview'),root.querySelector('#bgPreview'),root.querySelector('#pathPreview')];
    previews.forEach((p,i)=>p?.classList.toggle('cc-preview-dim',!((wizardStep===2&&i<2)||(wizardStep===3&&i===2)||(wizardStep===4))));
    const note=root.querySelector('.cc-wizard-note');
    if(note)note.textContent=[
      'Önce karakterinin adını belirle.',
      'Irkını ve arka plan hikâyeni seç. Sağdaki kartlar seçimini açıklar.',
      'Sınıfını ve varsa özel yolunu seç.',
      'Statlarını son kez kontrol et ve karakteri oluştur.'
    ][wizardStep-1];
    const back=root.querySelector('[data-cc-wizard="back"]');
    const next=root.querySelector('[data-cc-wizard="next"]');
    if(back)back.disabled=wizardStep===1;
    if(next){next.classList.toggle('hidden',wizardStep===4);next.textContent=wizardStep===3?'Statlara Geç':'Devam';}
  }

  function enhanceBuilder(){
    if(activeTab()!=='Karakter Oluştur')return;
    const root=APP.querySelector('.builder');
    if(!root||root.dataset.ccWizard==='1')return;
    const card=root.querySelector(':scope > section.card');
    if(!card)return;
    card.classList.add('cc-builder-card');
    const wizard=document.createElement('div');
    wizard.className='cc-wizard';
    wizard.innerHTML=`<div class="cc-stepper"><button type="button" class="cc-step" data-cc-step="1"><small>ADIM 1</small>Kimlik</button><button type="button" class="cc-step" data-cc-step="2"><small>ADIM 2</small>Irk & Arka Plan</button><button type="button" class="cc-step" data-cc-step="3"><small>ADIM 3</small>Sınıf & Yol</button><button type="button" class="cc-step" data-cc-step="4"><small>ADIM 4</small>Statlar & Onay</button></div><div class="cc-wizard-note"></div><div class="cc-wizard-actions"><button type="button" data-cc-wizard="back">← Geri</button><button type="button" class="primary" data-cc-wizard="next">Devam</button></div>`;
    const form=card.querySelector('.form');
    card.insertBefore(wizard,form);
    root.dataset.ccWizard='1';
    setWizardStep(1);
  }

  function enhanceGmRolls(){
    if(activeTab()!=='Zar Akışı'||role()!=='GM')return;
    const card=APP.querySelector('main > section.card');
    if(!card||card.dataset.ccRollCenter==='1')return;
    card.classList.add('cc-gm-roll-center');
    const rows=[...card.querySelectorAll('.roll')];
    rows.forEach(r=>{const v=Number(txt(r.querySelector('.die')));r.dataset.ccDie=Number.isFinite(v)?String(v):'';if(v===20)r.classList.add('cc-critical');if(v===1)r.classList.add('cc-fumble')});
    const total=rows.length,crit=rows.filter(r=>r.dataset.ccDie==='20').length,fumble=rows.filter(r=>r.dataset.ccDie==='1').length;
    const names=new Set(rows.map(r=>txt(r.querySelector('b'))).filter(Boolean));
    const dash=document.createElement('div');
    dash.innerHTML=`<div class="cc-roll-dashboard"><div class="cc-mini-stat"><b>${total}</b><span>AKIŞTAKİ ZAR</span></div><div class="cc-mini-stat"><b>${names.size}</b><span>KARAKTER</span></div><div class="cc-mini-stat"><b>${crit}</b><span>20 / KRİTİK</span></div><div class="cc-mini-stat"><b>${fumble}</b><span>1 / KRİTİK HATA</span></div></div><div class="cc-roll-filterbar"><button type="button" class="on" data-cc-rollfilter="all">Tümü</button><button type="button" data-cc-rollfilter="crit">20 / Kritik</button><button type="button" data-cc-rollfilter="fumble">1 / Hata</button><button type="button" data-cc-rollfilter="last10">Son 10</button></div>`;
    const rolls=card.querySelector('.rolls');
    card.insertBefore(dash,rolls||null);
    card.dataset.ccRollCenter='1';
  }

  function run(){
    scheduled=false;
    enhancePlayerDesk();
    enhanceBuilder();
    enhanceGmRolls();
  }
  function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(run)}

  APP.addEventListener('click',e=>{
    const step=e.target.closest('[data-cc-step]');
    if(step){setWizardStep(Number(step.dataset.ccStep));return;}
    const wiz=e.target.closest('[data-cc-wizard]');
    if(wiz){
      if(wiz.dataset.ccWizard==='back')setWizardStep(wizardStep-1);
      else{
        if(wizardStep===1){const name=APP.querySelector('#bname');if(name&&!name.value.trim()){name.focus();name.style.borderColor='#ff7f93';return;}}
        setWizardStep(wizardStep+1);
      }
      return;
    }
    const filter=e.target.closest('[data-cc-rollfilter]');
    if(filter){
      const card=filter.closest('.cc-gm-roll-center');if(!card)return;
      card.querySelectorAll('[data-cc-rollfilter]').forEach(b=>b.classList.toggle('on',b===filter));
      const rows=[...card.querySelectorAll('.roll')],mode=filter.dataset.ccRollfilter;
      rows.forEach((r,i)=>{let show=true;if(mode==='crit')show=r.dataset.ccDie==='20';if(mode==='fumble')show=r.dataset.ccDie==='1';if(mode==='last10')show=i<10;r.style.display=show?'':'none'});
    }
  });

  new MutationObserver(schedule).observe(APP,{childList:true,subtree:true});
  schedule();
})();