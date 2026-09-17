(function(){
  'use strict';
  const S=window.__catlakSupabase;
  const APP=document.querySelector('#app');
  if(!S||!APP)return;

  const txt=e=>String(e?.textContent||'').trim();
  const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm=x=>String(x||'').toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i');
  const isGM=()=>txt(APP.querySelector('.role'))==='GM';
  const toast=x=>{const t=document.querySelector('#toast');if(!t)return;t.textContent=String(x);t.classList.remove('hidden');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.add('hidden'),4200)};

  const PROFILE={
    title:'Çatlak Dikişçisi',
    subtitle:'Seviye 3 • Destek / Kontrol',
    race:'İnsan Kökenli Çatlak Yolcusu',
    class_name:'Çatlak Dikişçisi',
    role:'Destek • Kontrol • Acil Müdahale',
    summary:'Eeliot, dünyanın dokusunda oluşan çatlakları diğerlerinden önce hisseden; küçük yarıkları bastırabilen ve Wakfu bağlarıyla takım arkadaşlarını ayakta tutan oynanabilir bir yardımcı karakterdir.',
    appearance:'Yaklaşık 1.72 boyunda, ince yapılı ve çevik. Koyu lacivert uzun bir yolcu ceketi, deri kemerler ve soluk turkuaz dikiş-rünleri taşır. Gözleri normalde gri-mavi; çatlak enerjisi yakındayken irislerinin çevresinde kısa süreli parlak halkalar belirir. Sol eldiveninin üzerinde çatlakları kapatmak için kullandığı kırık halka biçimli bir mühür vardır.',
    personality:'Sakin, gözlemci ve ölçülü konuşur. Tehlikeyi küçümsemez; paniğe de kapılmaz. İnsanlarla hemen yakınlaşmaz ama gruba bağlandığında özellikle yaralı ve savunmasız kişileri korumayı görev edinir. Kuru, kısa bir mizahı vardır.',
    history:'Eeliot çocukken küçük bir yerleşimde meydana gelen bilinmeyen bir yarılma olayından sağ kurtuldu. O günden sonra çatlakların açılmadan hemen önce bıraktığı titreşimi duymaya başladı. Yıllarca gezgin büyücüler, mühür ustaları ve eski harabelerden topladığı notlarla bu yeteneğini kontrol etmeyi öğrendi. Amacı çatlakların kaynağını bulmak değil yalnızca; yanlış ellerde kullanılmalarını engellemek ve mümkün olduğunca dünyayı yeniden “dikmek”.',
    combat_style:'Ön safta kalmaz. Savaşın kenarında hareket eder, tehlikeli hedefleri işaretler, müttefikleri Wakfu bağlarıyla destekler ve kritik anda iyileştirme yapar. Hasarı ikincil; pozisyon ve takım güvenliği birincildir.',
    weakness:'Düşük STR ve orta AC nedeniyle yakın dövüş baskısına karşı zayıftır. Büyük çatlakları tek başına kapatamaz. Mühürleme güçlü yaratıklarda tam kilitleme yerine kısa süreli baskılama olarak kullanılmalıdır.',
    gm_note:'Denge hedefi: tam bir büyücü kadar hasar vermemeli, tam bir şifacı kadar sürekli iyileştirmemeli. Gücü, doğru anda kullanılan sınırlı destek aksiyonlarından gelir.',
    traits:['Çatlak Sezgisi','Wakfu Bağı','Mühürleme','Kırık İşaret','Acil Müdahale'],
    stats:{STR:8,DEX:14,CON:13,INT:16,WIS:15,CHA:10,HP:21,AC:13,SPEED:30},
    balance:[
      'Kırık İşaret: +4 saldırı, 1d6+2 hasar, savaş başına 3 kullanım.',
      'Wakfu Bağı: savaş başına 2 kullanım; kısa süreli savunma/destek etkisi.',
      'Mühürleme: savaş başına 2 kullanım; normal hedefte bastırma, boss hedefte tam kilitleme yok.',
      'Acil Müdahale: 1d6+3 iyileştirme, savaş başına 1 kullanım.',
      'Çatlak Sezgisi: sınırsız keşif/algı yeteneği; doğrudan hasar sağlamaz.'
    ]
  };

  let eeliotId=null,saving=false,scheduled=false,lastSync=0;

  if(!document.querySelector('#eeliot-profile-style')){
    const st=document.createElement('style');st.id='eeliot-profile-style';st.textContent=`
      #app .eep-panel{margin-top:12px;border:1px solid #544b74;border-radius:14px;padding:13px;background:linear-gradient(135deg,#101a27,#191424)}
      #app .eep-panel .eyebrow{color:#bca9ff}
      #app .eep-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:10px}
      #app .eep-box{border:1px solid var(--line);border-radius:12px;padding:10px;background:#08121d}
      #app .eep-box h4{margin:0 0 6px;color:var(--gold)}
      #app .eep-box p{margin:0;white-space:pre-line;color:var(--muted);line-height:1.48}
      #app .eep-stats{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:7px;margin-top:10px}
      #app .eep-stat{border:1px solid var(--line);border-radius:10px;padding:8px;text-align:center;background:#071019}
      #app .eep-stat b{display:block;color:var(--cyan)}
      #app .eep-list{margin:6px 0 0;padding-left:18px;color:var(--muted)}
      #app .eep-list li{margin:5px 0}
      @media(max-width:760px){#app .eep-grid{grid-template-columns:1fr}#app .eep-stats{grid-template-columns:repeat(3,1fr)}}
    `;document.head.appendChild(st);
  }

  async function syncProfile(force=false){
    if(!isGM()||saving)return;
    if(!force&&Date.now()-lastSync<12000)return;
    saving=true;
    try{
      const q=await S.from('catlak_characters').select('id,name,data,play_status').in('play_status',['active','prepared']);
      if(q.error)throw q.error;
      const e=(q.data||[]).find(x=>norm(x.name)==='eeliot');
      if(!e)return;
      eeliotId=e.id;
      const current=e.data||{};
      const old=current.cc_profile||{};
      const merged={...old,...PROFILE,stats:{...(old.stats||{}),...PROFILE.stats},traits:[...PROFILE.traits],balance:[...PROFILE.balance]};
      const same=JSON.stringify(old)===JSON.stringify(merged);
      if(!same){
        const u=await S.from('catlak_characters').update({data:{...current,cc_role:'Çatlak Dikişçisi',cc_companion:true,cc_profile:merged}}).eq('id',e.id).select('id');
        if(u.error)throw u.error;
        if((u.data||[]).length)toast('Eeliot ayrıntılı karakter profili güncellendi.');
      }
      lastSync=Date.now();
    }catch(e){console.warn('EELIOT_PROFILE_SYNC',e)}finally{saving=false}
  }

  function statHtml(){
    const s=PROFILE.stats;
    return `<div class="eep-stats">${['STR','DEX','CON','INT','WIS','CHA'].map(k=>`<div class="eep-stat"><b>${k}</b>${s[k]}</div>`).join('')}<div class="eep-stat"><b>HP</b>${s.HP}</div><div class="eep-stat"><b>AC</b>${s.AC}</div><div class="eep-stat"><b>HIZ</b>${s.SPEED}</div></div>`;
  }

  function panelHtml(){
    return `<div class="eep-panel" data-eep-panel><div class="eyebrow">EELIOT • TAM KARAKTER PROFİLİ</div><h3>${esc(PROFILE.race)} • ${esc(PROFILE.class_name)}</h3><p class="muted">${esc(PROFILE.role)}</p>${statHtml()}<div class="eep-grid"><div class="eep-box"><h4>Görünüş</h4><p>${esc(PROFILE.appearance)}</p></div><div class="eep-box"><h4>Kişilik</h4><p>${esc(PROFILE.personality)}</p></div><div class="eep-box"><h4>Geçmiş</h4><p>${esc(PROFILE.history)}</p></div><div class="eep-box"><h4>Savaş Tarzı</h4><p>${esc(PROFILE.combat_style)}</p></div><div class="eep-box"><h4>Zayıflık / Sınır</h4><p>${esc(PROFILE.weakness)}</p></div><div class="eep-box"><h4>GM Denge Notu</h4><p>${esc(PROFILE.gm_note)}</p></div></div><div class="eep-box" style="margin-top:10px"><h4>3. Seviye Denge Paketi</h4><ul class="eep-list">${PROFILE.balance.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div></div>`;
  }

  function decorate(){
    const main=APP.querySelector('main');if(!main)return;
    const cards=[...main.querySelectorAll('[data-cpr-char],.cpr-member')];
    for(const card of cards){
      const name=txt(card.querySelector('h2,h3'));
      if(norm(name)!=='eeliot')continue;
      if(card.querySelector('[data-eep-panel]'))continue;
      card.insertAdjacentHTML('beforeend',panelHtml());
    }
  }

  function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;decorate();syncProfile(false)})}
  new MutationObserver(schedule).observe(APP,{childList:true,subtree:true});
  S.channel('eeliot-profile-live').on('postgres_changes',{event:'*',schema:'public',table:'catlak_characters'},()=>{lastSync=0;schedule()}).subscribe();
  setTimeout(()=>{syncProfile(true);decorate()},1100);
  window.__catlakEeliotProfile={profile:PROFILE,sync:syncProfile,decorate};
})();
