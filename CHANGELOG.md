# AniSync Changelog

Tüm önemli sürümler ve değişiklikler bu dosyada listelenir.

## [v1.3.0] - 2026-07-09

### Düzeltilenler (Fixes)
- **Koyu/Açık Tema Uyumluluğu:** Açık temada sohbet alıntı (yanıt) baloncuğunun metin renkleri okunabilir olacak şekilde dinamikleştirildi.
- **Tasarım Taşması (Overflow):** Yanıt baloncuğunun geniş mesajlarda ekrandan taşıp UI'yi bozması sorunu düzeltildi (`minWidth: 0` ve flex yapısı ile).
- **Alıntı Emojileri:** Mesajlara yanıt verirken ortaya çıkan alıntı önizleme kısmında (hem yazarken hem de gönderilmiş mesajda) emojilerin `[emoji:xxx.png]` gibi uzun metin kodları halinde görünmesi yerine, direkt olarak küçültülmüş resim (emoji) formatında görünmesi sağlandı.
- **Emoji Silme Hızı (Performans ve UX):** Emojilerin silinirken arkaplandaki gizli `\u200B` (Zero-Width Space) karakteri ve özel silme algoritmalarının yarattığı sorunlar çözüldü. Masaüstünde veya mobilde tek bir "Sil (Backspace)" tuşuyla emojiler doğal ve anında (hiçbir gecikme olmadan) silinebilir hale getirildi.
- **Emoji Paneli Optimizasyonu:** Mobilde (özellikle anime açıkken) klavye açıldığında emoji paneline daha fazla yer kalması için, klavye açık durumdayken paneldeki "Özel Emojiler" başlığı otomatik olarak gizlenerek alan tasarrufu sağlandı.

### Dağıtım ve Yayınlama
- Yeni Masaüstü sürümü oluşturuldu (`AniSync 1.3.0.exe`).
- Render sunucusundaki Public dosyalar (Mobil / Web sürümleri için) güncellendi. (Değişikliklerin mobilde etkili olması için kullanıcının ana repo'ya GitHub Desktop üzerinden `git push` yapması gerekmektedir).
