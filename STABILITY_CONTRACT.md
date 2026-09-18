# Çatlak Çağı — Oynanabilir Sürüm Stabilite Sözleşmesi

Bu dosya yeni özellik eklemek için değil, mevcut oynanabilir sistemi bozulmadan korumak için kullanılır.

## 1. Tek ekran sahibi

Her ana ekranın yalnız bir canonical sahibi vardır:

- Oyuncu Masası / Irk Becerileri: `player-sheet-hard-recovery.js`
- Oyuncu Savaş Odası görünümü: `battle-room-v3-patch.js`
- Oyuncu oda/sekme yönlendirmesi: `room-system-patch.js`
- GM Merkezi: `gm-clean-router-v1.js`
- Yönetim Odası: `gm-ui-polish-v1.js`
- Canlı Oyun Masası savaş alanı: `live-combat-center-patch.js`
- Zar Akışı: `event-rolls-patch.js`

`runtime-health-guard.js` çalışma anında bu sahiplikleri kaydeder. Aynı yüzeye ikinci bir farklı sahip eklenmemelidir.

## 2. Eski runtime karantinası

Eski dosyalar hemen silinmez. Önce `index.html` içinden tamamen çıkarılır ve canlı sistem tarafından yüklenmediği doğrulanır. Stabil sürüm birkaç oturum sorunsuz çalıştıktan sonra fiziksel dosya temizliği yapılabilir.

## 3. Merkezi yönlendirme

GM Merkezi rotaları `gm-clean-router-v1.js` üzerinden, oyuncu ekranları ise Oyuncu Masası + Savaş Odası canonical sahipleri üzerinden açılır. Kayıt işlemleri rota değiştirmemelidir.

## 4. Savaş regresyon zinciri

Her savaş değişikliğinden sonra şu zincir korunur:

`Savaşı Başlat → oyuncu/yaratık ekle → inisiyatif → hedef seç → saldırı → yetenek → HP → tur bitir → yaratık ölümü → otomatik savaş bitişi`.

Savaş bittiğinde oda açık kalır.

## 5. GM regresyon zinciri

`GM Merkezi → Yetenek → Eşya → Stat → Irk → Karakter Oluşturucu → Olay Atölyesi → Yaratık Kütüphanesi → İtibar → Mühür → Kaynaklar → Hesap`.

Canlı Oyun Masası ile Zar Akışı üst menüde yan yana tutulur. Zar Akışı oyuncu kağıdındaki atışlar dahil bütün zar kayıtlarını tek akışta gösterir ve toplu silme bütün `catlak_rolls` kayıtlarını temizler.

Alt rota değişirken GM Merkezi tekrar tıklanmak zorunda kalmamalıdır.

## 6. Oyuncu regresyon zinciri

`Oyuncu Masası → zar → Irk Becerileri → Savaş Odası → hedef → aksiyon → Oyuncu Masası`.

Irk Becerileri masa düzeninde sayfanın tüm genişliği kullanılır; Irk Güçleri solda, Yetenekler & Büyüler sağda aynı üst hizadan başlayıp bağımsız sütunlar halinde aşağı doğru büyür.

## 7. Veri güvenliği

Başarısız veri/RPC işlemi başarılıymış gibi gösterilmez. Silme işlemleri kullanıcı onayı ister. Kritik aksiyonlarda aynı anda ikinci işlem engellenir.

## 8. Performans bütçesi

Kritik runtime dosyalarında sürekli `setInterval` polling kullanılmaz. Tam sayfa render yerine mümkün olduğunca lokal DOM güncellemesi, cache ve realtime olayları tercih edilir.

## 9. Hata görünürlüğü

`runtime-health-guard.js` son çalışma hatalarını sınırlı bir ring buffer içinde tutar. Geliştirici incelemesi için `window.__catlakRuntimeDiagnostics.list()` kullanılabilir. Kullanıcıya ham teknik hata yığını gösterilmez.

## 10. Stabil sürüm / geri dönüş noktası

Hardening başlamadan önceki oynanabilir geri dönüş noktası:

`stable/playable-pre-hardening-2026-09-18`

Yeni bir değişiklik bu sözleşmeyi bozarsa önce düzeltme yapılır; eski runtime ancak yeni canonical sistem birkaç gerçek oyun oturumunda stabil kaldıktan sonra silinir.


## Görsel Arşivi sözleşmesi

Görsel Arşivi yalnız yükleme ekranıdır; daha önce yüklenen görseller burada listelenmez. Görseller Harita ekranındaki ilgili Harita / Yer-Sahne / NPC bölümlerinde görüntülenir.
