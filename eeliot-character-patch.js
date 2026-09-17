(function(){
  'use strict';
  if(window.__catlakEeliotProfileCompatInstalled)return;
  window.__catlakEeliotProfileCompatInstalled=true;

  // Uyumluluk katmanı: Eeliot profilini erişilebilir tutar fakat DOM izlemez,
  // Stat Atölyesi'ni yeniden çizmez ve veritabanına arka planda yazmaz.
  // Kalıcı karakter oluşturma/güncelleme tek otorite olan runtime katmanındadır.
  const PROFILE={
    title:'Çatlak Dikişçisi',
    subtitle:'Seviye 3 • Destek / Kontrol',
    race:'İnsan Kökenli Çatlak Yolcusu',
    class_name:'Çatlak Dikişçisi',
    role:'Destek • Kontrol • Acil Müdahale',
    summary:'Eeliot, dünyanın dokusunda oluşan çatlakları diğerlerinden önce hisseden; küçük yarıkları bastırabilen ve Wakfu bağlarıyla takım arkadaşlarını ayakta tutan oynanabilir bir yardımcı karakterdir.',
    appearance:'İnce yapılı ve çevik. Koyu lacivert yolcu ceketi, deri kemerler ve soluk turkuaz dikiş-rünleri taşır. Çatlak enerjisi yakındayken gri-mavi gözlerinde parlak halkalar belirir.',
    personality:'Sakin, gözlemci ve ölçülü. Gruba bağlandığında özellikle yaralı ve savunmasız kişileri korur.',
    history:'Çocukken bir yarılma olayından sağ kurtuldu. O günden sonra çatlakların titreşimini duymaya başladı; yıllarca mühür ustaları ve harabelerden topladığı bilgilerle bu yeteneğini kontrol etmeyi öğrendi.',
    combat_style:'Ön safta kalmaz; hedefleri işaretler, müttefikleri destekler ve kritik anda iyileştirir.',
    weakness:'Düşük fiziksel güç ve orta AC nedeniyle yakın dövüş baskısına karşı zayıftır.',
    gm_note:'Denge hedefi: yüksek sürekli hasar yerine doğru anda kullanılan sınırlı destek ve kontrol aksiyonları.',
    traits:['Çatlak Sezgisi','Wakfu Bağı','Mühürleme','Kırık İşaret','Acil Müdahale'],
    stats:{STR:8,DEX:14,CON:13,INT:16,WIS:15,CHA:10,HP:21,AC:13,SPEED:30}
  };

  window.__catlakEeliotProfile={
    profile:PROFILE,
    sync:async()=>false,
    decorate:()=>false,
    compatOnly:true
  };
})();
