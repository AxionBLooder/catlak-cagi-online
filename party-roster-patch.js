(function(){
  'use strict';
  const S=window.__catlakSupabase;
  const APP=document.querySelector('#app');
  if(!S||!APP)return;

  const KEY_PARTY='cc_party_member';
  const KEY_BATTLE='cc_battle_member';
  const text=e=>String(e?.textContent||'').trim();
  const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const num=x=>Number(x||0);
  const norm=x=>String(x||'').toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i');
  const isGM=()=>text(APP.querySelector('.role'))==='GM';
  const hasRole=()=>!!text(APP.querySelector('.role'));
  const toast=x=>{const t=document.querySelector('#toast');if(!t)return;t.textContent=String(x);t.classList.remove('hidden');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.add('hidden'),4200)};

  let gmOpen=false,partyOpen=false,busy=false,accessBusy=false,renderQueued=false;
  let sessionUserId=null,owned=[],partyAllowed=false,battleAllowed=false;
  let lastAccessAt=0,eeliotEnsured=false;

  if(!document.querySelector('#cpr-style')){
    const st=document.createElement('style');st.id='cpr-style';st.textContent=`
      #app .cpr-hidden{display:none!important}
      #app .cpr-shell{display:flex;flex-direction:column;gap:14px;max-width:1500px;margin:0 auto}
      #app .cpr-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px}
      #app .cpr-card{border:1px solid var(--line);border-radius:15px;padding:14px;background:#091522}
      #app .cpr-card.party{border-color:#6b5b34;box-shadow:inset 3px 0 #d2aa58}
      #app .cpr-card.battle{box-shadow:inset -3px 0 #8c4e4e}
      #app .cpr-card.party.battle{box-shadow:inset 3px 0 #d2aa58,inset -3px 0 #8c4e4e}
      #app .cpr-head{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}
      #app .cpr-pills{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0}
      #app .cpr-pill{font-size:.7rem;border:1px solid var(--line);border-radius:999px;padding:4px 8px;color:var(--muted)}
      #app .cpr-pill.on{border-color:#6d7e52;color:#cde9a8;background:#142018}
      #app .cpr-pill.war{border-color:#75424b;color:#ffbec8;background:#24151a}
      #app .cpr-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:11px}
      #app .cpr-actions button{flex:1 1 128px}
      #app .cpr-hero{background:linear-gradient(135deg,#10283a,#0b1724 55%,#21172a)!important}
      #app .cpr-party-roster{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:10px}
      #app .cpr-member{border:1px solid var(--line);border-radius:14px;padding:13px;background:#08131e}
      #app .cpr-member.self{border-color:#4a849d;background:#0c1d29}
      #app .cpr-profile{border:1px solid #4d496c;background:linear-gradient(135deg,#111c2a,#191526);border-radius:14px;padding:13px;margin-top:10px}
      #app .cpr-profile h3{margin:4px 0 7px}
      #app .cpr-eeliot{border-color:#5b4f78!important;background:linear-gradient(135deg,#121b28,#1b1424)!important}
      #app .cpr-eeliot .eyebrow{color:#bda9ff}
      #app .cpr-muted{font-size:.8rem;color:var(--muted)}
      #app .cpr-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin-top:12px}
      #app .cpr-summary>div{border:1px solid var(--line);border-radius:12px;padding:10px;text-align:center;background:#07121d}
      #app .cpr-summary b{display:block;font-size:1.3rem;color:var(--gold)}
      #app .cpr-summary span{font-size:.66rem;color:var(--muted);letter-spacing:.07em}
      #app .cpr-visual img{display:block;width:auto;height:auto;max-width:100%;max-height:64vh;object-fit:contain;margin:10px auto;border-radius:14px;border:1px solid var(--line);background:#040a10}
      @media(max-width:720px){#app .cpr-summary{grid-template-columns:repeat(2,1fr)}}
    `;document.head.appendChild(st);
  }

  function nav(){return APP.querySelector('.nav')}
  function selectOnly(b){const n=nav();if(!n)return;n.querySelectorAll('button.on').forEach(x=>x.classList.remove('on'));b?.classList.add('on')}
  function closeOwnRoutes(){gmOpen=false;partyOpen=false}

  function injectNav(){
    const n=nav();if(!n||!hasRole())return;
    let gm=n.querySelector('[data-cpr-manager]');
    if(isGM()){
      if(!gm){gm=document.createElement('button');gm.type='button';gm.dataset.cprManager='1';gm.textContent='Parti Yönetimi';const tools=n.querySelector('[data-gmt-open]');tools?tools.after(gm):n.appendChild(gm)}
      gm.classList.toggle('on',gmOpen);
    }else gm?.remove();
    let pb=n.querySelector('[data-cpr-party]');
    if(!isGM()&&partyAllowed){
      if(!pb){pb=document.createElement('button');pb.type='button';pb.dataset.cprParty='1';pb.textContent='◆ Parti Odası';const battle=n.querySelector('[data-ccr-battle]');battle?battle.before(pb):n.prepend(pb)}
      pb.classList.toggle('on',partyOpen);
    }else pb?.remove();
    const battle=n.querySelector('[data-ccr-battle]');
    if(battle&&!isGM())battle.classList.toggle('cpr-hidden',!battleAllowed);
  }

  async function refreshAccess(force=false){
    if(isGM()||accessBusy||!hasRole())return;
    if(!force&&Date.now()-lastAccessAt<3500)return;
    accessBusy=true;
    try{
      const gs=await S.auth.getSession();const uid=gs.data?.session?.user?.id||null;sessionUserId=uid;
      if(!uid){owned=[];partyAllowed=false;battleAllowed=false;return}
      const q=await S.from('catlak_characters').select('id,name,data,owner_id,play_status').eq('owner_id',uid).eq('play_status','active');
      if(q.error)throw q.error;
      owned=q.data||[];
      partyAllowed=owned.some(c=>c.data?.[KEY_PARTY]===true);
      battleAllowed=owned.some(c=>c.data?.[KEY_BATTLE]===true);
      lastAccessAt=Date.now();
    }catch(e){console.warn('CPR_ACCESS',e)}finally{accessBusy=false;injectNav();decorateOwnedProfiles()}
  }

  async function allCharacters(){
    const r=await S.from('catlak_characters').select('id,name,species_name,background_name,class_name,level,hp_current,hp_max,base_ac,base_speed,base_stats,data,owner_id,play_status,created_at').in('play_status',['active','prepared']).order('created_at',{ascending:true});
    if(r.error)throw r.error;return r.data||[];
  }
  async function combatData(){
    const [sr,br]=await Promise.all([
      S.from('catlak_combat_state').select('*').eq('id',1).maybeSingle(),
      S.from('catlak_combatants').select('*').order('initiative',{ascending:false}).order('created_at',{ascending:true})
    ]);
    if(sr.error)throw sr.error;if(br.error)throw br.error;
    return{state:sr.data||{active:false},combatants:br.data||[]};
  }

  function roleLabel(c){return c.data?.cc_role||c.class_name||'Karakter'}
  function ownerLabel(c){return c.owner_id?'OYUNCUYA BAĞLI':'SAHİPSİZ / YARDIMCI'}
  function profileHtml(c){const p=c.data?.cc_profile;if(!p)return'';return`<div class="cpr-profile ${norm(c.name)==='eeliot'?'cpr-eeliot':''}"><div class="eyebrow">${esc(p.title||roleLabel(c))}</div><h3>${esc(p.subtitle||'')}</h3>${p.summary?`<div class="cpr-muted">${esc(p.summary)}</div>`:''}${Array.isArray(p.traits)&&p.traits.length?`<div class="cpr-pills">${p.traits.map(x=>`<span class="cpr-pill">${esc(x)}</span>`).join('')}</div>`:''}</div>`}

  function characterCard(c,combat){
    const party=c.data?.[KEY_PARTY]===true,battle=c.data?.[KEY_BATTLE]===true;
    const live=combat.combatants.find(x=>x.character_id===c.id);
    return `<article class="cpr-card ${party?'party':''} ${battle?'battle':''}" data-cpr-char="${esc(c.id)}"><div class="cpr-head"><div><div class="eyebrow">${esc(ownerLabel(c))}</div><h2>${esc(c.name)}</h2><div class="cpr-muted">${esc(c.species_name||'')} • ${esc(roleLabel(c))} • Seviye ${num(c.level)}</div></div><span class="tag">${c.play_status==='active'?'CANLI':'HAZIR'}</span></div><div class="cpr-pills"><span class="cpr-pill ${party?'on':''}">${party?'✓ PARTİDE':'PARTİ DIŞI'}</span><span class="cpr-pill ${battle?'war':''}">${battle?'⚔ SAVAŞ ODASI':'SAVAŞ DIŞI'}</span>${live?'<span class="cpr-pill war">AKTİF SAVAŞTA</span>':''}</div><div class="cpr-muted">HP ${num(c.hp_current)}/${num(c.hp_max)} • AC ${num(c.base_ac)} • Hız ${num(c.base_speed)}</div>${profileHtml(c)}<div class="cpr-actions"><button type="button" class="${party?'danger':'primary'}" data-cpr-party-toggle="${esc(c.id)}" data-value="${party?'0':'1'}">${party?'Partiden Çıkar':'Partiye Al'}</button><button type="button" class="${battle?'danger':'primary'}" data-cpr-battle-toggle="${esc(c.id)}" data-value="${battle?'0':'1'}" ${c.play_status!=='active'?'title="Oyuncuya bağlandığında aktifleşir"':''}>${battle?'Savaştan Çıkar':'Savaş Odasına Al'}</button>${!c.owner_id?`<button type="button" data-cpr-invite="${esc(c.id)}" data-name="${esc(c.name)}">Oyuncuya Davet</button>`:''}</div></article>`;
  }

  async function renderManager(){
    if(!gmOpen||!isGM()||busy)return;
    busy=true;
    try{
      const [chars,combat]=await Promise.all([allCharacters(),combatData()]);
      if(!gmOpen||!isGM())return;
      const main=APP.querySelector('main');if(!main)return;
      const part=chars.filter(c=>c.data?.[KEY_PARTY]===true).length,batt=chars.filter(c=>c.data?.[KEY_BATTLE]===true).length,ownedCount=chars.filter(c=>c.owner_id).length;
      main.innerHTML=`<div class="cpr-shell" data-cpr-manager-page><section class="card cpr-hero"><div><div class="eyebrow">GM • PARTİ & SAVAŞ KATILIMI</div><h1>Parti Yönetimi</h1><p class="muted">Oyuna bağlı veya hazır bütün karakterleri buradan partiye ve savaş odasına alıp çıkarabilirsin. Seçimler karakter kaydında saklanır ve cihazlar arasında canlı güncellenir.</p><div class="cpr-summary"><div><b>${chars.length}</b><span>KARAKTER</span></div><div><b>${ownedCount}</b><span>OYUNCUYA BAĞLI</span></div><div><b>${part}</b><span>PARTİDE</span></div><div><b>${batt}</b><span>SAVAŞ ODASINDA</span></div></div></div></section><section class="card"><div class="section-title"><div><div class="eyebrow">KATILIMCI HAVUZU</div><h2>Oyuncular & Oynanabilir Yardımcılar</h2></div><div class="actions"><button type="button" data-cpr-party-all="1">Hepsini Partiye Al</button><button type="button" data-cpr-party-all="0">Partiyi Temizle</button></div></div><div class="cpr-grid">${chars.length?chars.map(c=>characterCard(c,combat)).join(''):'<div class="empty">Karakter bulunamadı.</div>'}</div></section></div>`;
      main.dataset.cprOwn='1';selectOnly(nav()?.querySelector('[data-cpr-manager]'));
    }catch(e){toast('Parti Yönetimi yüklenemedi: '+(e?.message||String(e)))}finally{busy=false}
  }

  async function updateFlag(id,key,value){
    const r=await S.from('catlak_characters').select('id,name,data,play_status').eq('id',id).maybeSingle();if(r.error)throw r.error;if(!r.data)throw new Error('Karakter bulunamadı.');
    const data={...(r.data.data||{}),[key]:!!value};
    const u=await S.from('catlak_characters').update({data}).eq('id',id).select('id');if(u.error)throw u.error;if(!(u.data||[]).length)throw new Error('Karakter ayarı güncellenemedi.');
    return r.data;
  }

  async function toggleParty(id,value){await updateFlag(id,KEY_PARTY,value);toast(value?'Karakter partiye alındı.':'Karakter partiden çıkarıldı.');await renderManager()}
  async function toggleBattle(id,value){
    const c=await updateFlag(id,KEY_BATTLE,value);
    const combat=await combatData();const existing=combat.combatants.find(x=>x.character_id===id);
    if(combat.state?.active){
      if(value&&!existing&&c.play_status==='active'){
        const r=await S.rpc('catlak_gm_combat_add_character',{p_character_id:id,p_initiative:null});if(r.error)throw r.error;
      }else if(!value&&existing){
        const r=await S.rpc('catlak_gm_combat_remove',{p_combatant_id:existing.id});if(r.error)throw r.error;
      }
    }
    toast(value?'Karakter savaş odasına alındı.':'Karakter savaş odasından çıkarıldı.');await renderManager();
  }

  async function setAllParty(v){
    const chars=await allCharacters();for(const c of chars){const data={...(c.data||{}),[KEY_PARTY]:!!v};const r=await S.from('catlak_characters').update({data}).eq('id',c.id);if(r.error)throw r.error}
    toast(v?'Tüm karakterler partiye alındı.':'Parti seçimi temizlendi.');await renderManager();
  }

  async function syncSelectedIntoActiveCombat(){
    if(!isGM())return;
    try{
      const combat=await combatData();if(!combat.state?.active)return;
      const chars=(await allCharacters()).filter(c=>c.play_status==='active'&&c.data?.[KEY_BATTLE]===true);
      const inCombat=new Set(combat.combatants.filter(x=>x.character_id).map(x=>String(x.character_id)));
      for(const c of chars){if(inCombat.has(String(c.id)))continue;const r=await S.rpc('catlak_gm_combat_add_character',{p_character_id:c.id,p_initiative:null});if(r.error)console.warn('CPR_COMBAT_AUTOADD',c.name,r.error)}
    }catch(e){console.warn('CPR_COMBAT_SYNC',e)}
  }

  async function renderParty(){
    if(!partyOpen||isGM()||busy)return;
    busy=true;
    try{
      await refreshAccess(true);if(!partyAllowed){partyOpen=false;injectNav();return}
      const [chars,visual]=await Promise.all([
        allCharacters(),
        S.from('catlak_party_visual').select('*').eq('singleton',true).maybeSingle()
      ]);
      const members=chars.filter(c=>c.data?.[KEY_PARTY]===true),myIds=new Set(owned.map(x=>String(x.id)));
      const main=APP.querySelector('main');if(!main||!partyOpen)return;
      main.innerHTML=`<div class="cpr-shell" data-cpr-party-page>${visual.data?.image_url?`<section class="card cpr-visual"><div class="eyebrow">GM'NİN PARTİYE YANSITTIĞI GÖRSEL</div><h2>${esc(visual.data.title||'Parti Görseli')}</h2><img src="${esc(visual.data.image_url)}" alt="${esc(visual.data.title||'Parti görseli')}">${visual.data.note?`<p class="muted">${esc(visual.data.note)}</p>`:''}</section>`:''}<section class="card cpr-hero"><div><div class="eyebrow">◆ PARTİ ODASI</div><h1>Aktif Parti</h1><p class="muted">GM'nin bu oturum için seçtiği karakterler burada görünür.</p></div></section><section class="card"><div class="eyebrow">PARTİ ÜYELERİ</div><h2>${members.length} Karakter</h2><div class="cpr-party-roster">${members.length?members.map(c=>`<article class="cpr-member ${myIds.has(String(c.id))?'self':''}"><div class="eyebrow">${myIds.has(String(c.id))?'SENİN KARAKTERİN':c.data?.cc_companion?'YARDIMCI KARAKTER':'PARTİ ÜYESİ'}</div><h3>${esc(c.name)}</h3><div class="cpr-muted">${esc(c.species_name||'')} • ${esc(roleLabel(c))} • Seviye ${num(c.level)}</div><div class="cpr-pills"><span class="cpr-pill on">HP ${num(c.hp_current)}/${num(c.hp_max)}</span><span class="cpr-pill">AC ${num(c.base_ac)}</span></div>${profileHtml(c)}</article>`).join(''):'<div class="empty">Parti üyesi seçilmedi.</div>'}</div></section></div>`;
      main.dataset.cprOwn='1';selectOnly(nav()?.querySelector('[data-cpr-party]'));
    }catch(e){toast('Parti Odası yüklenemedi: '+(e?.message||String(e)))}finally{busy=false}
  }

  function preferred(rows,keys,field='name'){
    if(!rows?.length)return null;for(const k of keys){const f=rows.find(x=>norm(x[field]).includes(norm(k)));if(f)return f}return rows[0]
  }

  const EELIOT_PROFILE={
    title:'Çatlak Dikişçisi',subtitle:'Seviye 3 • Destek / Kontrol',
    summary:'Çatlak enerjisini hisseden, küçük yarıkları bastırabilen ve takım arkadaşlarını Wakfu bağlarıyla koruyan oynanabilir yardımcı karakter.',
    traits:['Çatlak Sezgisi','Wakfu Bağı','Mühürleme','Kırık İşaret','Acil Müdahale']
  };
  const EELIOT_ABILITIES=[
    {name:'Çatlak Sezgisi',ability_type:'special',effect_type:'utility',target_type:'self',formula:'',requires_attack:false,attack_bonus:0,description:'Yakındaki büyü bozulmalarını, yarıkları ve anormal Wakfu akışlarını sezersin.',uses:null},
    {name:'Wakfu Bağı',ability_type:'special',effect_type:'utility',target_type:'ally',formula:'',requires_attack:false,attack_bonus:0,description:'Bir müttefikin çevresinde kısa süreli koruyucu Wakfu bağı kurarsın.',uses:2},
    {name:'Mühürleme',ability_type:'special',effect_type:'utility',target_type:'enemy',formula:'',requires_attack:false,attack_bonus:0,description:'Hedefteki çatlak etkisini veya büyüsel bozulmayı geçici olarak bastırırsın.',uses:2},
    {name:'Kırık İşaret',ability_type:'skill',effect_type:'damage',target_type:'enemy',formula:'1d6+2',requires_attack:true,attack_bonus:4,description:'Düşmana çatlak işareti bırakıp Wakfu darbesiyle saldırırsın.',uses:3},
    {name:'Acil Müdahale',ability_type:'special',effect_type:'heal',target_type:'ally',formula:'1d6+3',requires_attack:false,attack_bonus:0,description:'Düşmek üzere olan bir müttefikin yaşam akışını kısa süreliğine dengelersin.',uses:1}
  ];

  async function ensureAbilitiesForEeliot(cid){
    try{
      for(const a of EELIOT_ABILITIES){
        let q=await S.from('catlak_abilities').select('id,name').eq('name',a.name).maybeSingle();if(q.error)throw q.error;
        if(!q.data){const sv=await S.rpc('catlak_gm_save_ability',{p_name:a.name,p_ability_type:a.ability_type,p_effect_type:a.effect_type,p_target_type:a.target_type,p_formula:a.formula,p_requires_attack:a.requires_attack,p_attack_bonus:a.attack_bonus,p_description:a.description});if(sv.error)throw sv.error;q=await S.from('catlak_abilities').select('id,name').eq('name',a.name).maybeSingle();if(q.error)throw q.error}
        const aid=q.data?.id;if(!aid)continue;
        const ex=await S.from('catlak_character_abilities').select('id').eq('character_id',cid).eq('ability_id',aid).maybeSingle();
        if(ex.error)throw ex.error;
        if(!ex.data){const as=await S.rpc('catlak_gm_assign_ability',{p_character_id:cid,p_ability_id:aid,p_uses_per_combat:a.uses});if(as.error)console.warn('CPR_EELIOT_ASSIGN',a.name,as.error)}
      }
    }catch(e){console.warn('CPR_EELIOT_ABILITIES',e)}
  }

  async function ensureEeliot(){
    if(eeliotEnsured||!isGM())return;eeliotEnsured=true;
    try{
      const all=await S.from('catlak_characters').select('id,name,data,play_status,owner_id').in('play_status',['active','prepared']);if(all.error)throw all.error;
      let eeliot=(all.data||[]).find(x=>norm(x.name)==='eeliot');
      if(!eeliot){
        const [sp,bg,cl]=await Promise.all([
          S.from('catlak_species').select('name,sort_order').order('sort_order',{ascending:true}),
          S.from('catlak_backgrounds').select('name,sort_order').order('sort_order',{ascending:true}),
          S.from('catlak_classes').select('name,hit_die,sort_order').order('sort_order',{ascending:true})
        ]);
        for(const r of [sp,bg,cl])if(r.error)throw r.error;
        const species=preferred(sp.data,['İnsan','Human','Elf']);
        const background=preferred(bg.data,['Bilgin','Araştırmacı','Sage','Gezgin']);
        const klass=preferred(cl.data,['Büyücü','Wizard','Mage','Warlock']);
        if(!species||!background||!klass)throw new Error('Eeliot için ırk/sınıf/arka plan kaynağı bulunamadı.');
        const stats={STR:8,DEX:14,CON:13,INT:16,WIS:15,CHA:10};
        const cr=await S.rpc('catlak_create_prepared_character',{p_name:'Eeliot',p_species:species.name,p_background:background.name,p_class:klass.name,p_stats:stats,p_special_path:null});
        if(cr.error)throw cr.error;const cid=cr.data;if(!cid)throw new Error('Eeliot oluşturuldu fakat karakter kimliği alınamadı.');
        const lv=await S.rpc('catlak_set_character_level',{p_character_id:cid,p_level:3});if(lv.error)console.warn('CPR_EELIOT_LEVEL',lv.error);
        const sheet=await S.rpc('catlak_gm_update_character_sheet',{p_character_id:cid,p_stats:stats,p_hp_current:21,p_hp_max:21,p_ac:13,p_speed:30,p_level:3});if(sheet.error)console.warn('CPR_EELIOT_SHEET',sheet.error);
        const row=await S.from('catlak_characters').select('id,name,data,play_status,owner_id').eq('id',cid).maybeSingle();if(row.error)throw row.error;eeliot=row.data;
        toast('Eeliot • Seviye 3 oynanabilir yardımcı karakter olarak hazırlandı.');
      }
      if(eeliot){
        const data={...(eeliot.data||{}),cc_role:'Çatlak Dikişçisi',cc_companion:true,[KEY_PARTY]:eeliot.data?.[KEY_PARTY]===true,[KEY_BATTLE]:eeliot.data?.[KEY_BATTLE]===true,cc_profile:EELIOT_PROFILE};
        const up=await S.from('catlak_characters').update({data}).eq('id',eeliot.id);if(up.error)throw up.error;
        await ensureAbilitiesForEeliot(eeliot.id);
      }
    }catch(e){eeliotEnsured=false;console.warn('CPR_EELIOT',e);toast('Eeliot hazırlanamadı: '+(e?.message||String(e)))}
  }

  async function inviteCharacter(id,name){
    const r=await S.rpc('catlak_generate_character_claim',{p_character_id:id});if(r.error)throw r.error;
    const link='https://axionblooder.github.io/catlak-cagi-online/?join='+encodeURIComponent(r.data);
    try{await navigator.clipboard.writeText(link)}catch(_){ }
    prompt(`${name||'Karakter'} için oynanabilir karakter daveti:`,link);
    toast('Oynanabilir karakter davet linki kopyalandı.');
  }

  function decorateOwnedProfiles(){
    if(isGM()||partyOpen)return;const main=APP.querySelector('main');if(!main)return;
    for(const c of owned){const p=c.data?.cc_profile;if(!p)continue;if(main.querySelector(`[data-cpr-owned-profile="${CSS.escape(String(c.id))}"]`))continue;
      const hp=main.querySelector(`[data-a="hp"][data-id="${CSS.escape(String(c.id))}"]`);const hero=hp?.closest('section.hero');if(!hero)continue;
      const box=document.createElement('section');box.className='card cpr-profile cpr-eeliot';box.dataset.cprOwnedProfile=String(c.id);box.innerHTML=`<div class="eyebrow">OYNANABİLİR YARDIMCI • ${esc(p.title||'')}</div><h2>${esc(c.name)}</h2><p class="muted">${esc(p.summary||'')}</p><div class="cpr-pills">${(p.traits||[]).map(x=>`<span class="cpr-pill">${esc(x)}</span>`).join('')}</div>`;hero.insertAdjacentElement('afterend',box);
    }
  }

  function openGM(){
    if(!isGM())return;gmOpen=true;partyOpen=false;window.__catlakGmToolsOpen=false;window.__catlakGmHubOwnsMain=false;window.__catlakCreatureLibraryOpen=false;window.__catlakBattleRoomOpen=false;window.__catlakRouteGeneration=(window.__catlakRouteGeneration||0)+1;injectNav();renderManager();
  }
  function openParty(){if(isGM()||!partyAllowed)return;partyOpen=true;gmOpen=false;window.__catlakBattleRoomOpen=false;injectNav();renderParty()}

  APP.addEventListener('click',e=>{
    const gm=e.target.closest?.('[data-cpr-manager]');if(gm){e.preventDefault();e.stopImmediatePropagation();openGM();return}
    const pr=e.target.closest?.('[data-cpr-party]');if(pr){e.preventDefault();e.stopImmediatePropagation();openParty();return}
    const navBtn=e.target.closest?.('.nav button');if(navBtn&&!navBtn.matches('[data-cpr-manager],[data-cpr-party]')){closeOwnRoutes();injectNav();return}
    if(!gmOpen||!isGM())return;
    const pt=e.target.closest?.('[data-cpr-party-toggle]');if(pt){e.preventDefault();e.stopImmediatePropagation();pt.disabled=true;toggleParty(pt.dataset.cprPartyToggle,pt.dataset.value==='1').catch(x=>toast(x?.message||String(x)));return}
    const bt=e.target.closest?.('[data-cpr-battle-toggle]');if(bt){e.preventDefault();e.stopImmediatePropagation();bt.disabled=true;toggleBattle(bt.dataset.cprBattleToggle,bt.dataset.value==='1').catch(x=>toast(x?.message||String(x)));return}
    const pa=e.target.closest?.('[data-cpr-party-all]');if(pa){e.preventDefault();e.stopImmediatePropagation();setAllParty(pa.dataset.cprPartyAll==='1').catch(x=>toast(x?.message||String(x)));return}
    const inv=e.target.closest?.('[data-cpr-invite]');if(inv){e.preventDefault();e.stopImmediatePropagation();inviteCharacter(inv.dataset.cprInvite,inv.dataset.name).catch(x=>toast(x?.message||String(x)));return}
  },true);

  function maintain(){
    injectNav();
    if(isGM()){ensureEeliot();if(gmOpen&&!APP.querySelector('[data-cpr-manager-page]'))renderManager()}
    else{refreshAccess(false);if(partyOpen&&!APP.querySelector('[data-cpr-party-page]'))renderParty();decorateOwnedProfiles()}
  }
  function schedule(){if(renderQueued)return;renderQueued=true;requestAnimationFrame(()=>{renderQueued=false;maintain()})}
  new MutationObserver(schedule).observe(APP,{childList:true,subtree:true});

  S.channel('cpr-roster-live')
    .on('postgres_changes',{event:'*',schema:'public',table:'catlak_characters'},()=>{lastAccessAt=0;if(gmOpen)renderManager();else refreshAccess(true);schedule()})
    .on('postgres_changes',{event:'*',schema:'public',table:'catlak_combat_state'},()=>{if(isGM())syncSelectedIntoActiveCombat();if(gmOpen)renderManager()})
    .on('postgres_changes',{event:'*',schema:'public',table:'catlak_combatants'},()=>{if(gmOpen)renderManager()})
    .on('postgres_changes',{event:'*',schema:'public',table:'catlak_party_visual'},()=>{if(partyOpen)renderParty()})
    .subscribe();

  setTimeout(()=>{maintain();if(isGM())syncSelectedIntoActiveCombat()},700);
  window.__catlakPartyRoster={renderManager,renderParty,refreshAccess,syncCombat:syncSelectedIntoActiveCombat};
})();
