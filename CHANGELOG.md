# AniSync Changelog

Tüm önemli sürümler ve değişiklikler bu dosyada listelenir.

## [v1.3.0+] - 2026-07-20

### Yeni Özellikler (Features)
- **Custom Mesaj Baloncukları:** TikTok tarzı 14 adet özel görsel baloncuk teması eklendi (Kurbağa, Aşk, Kedi, Patiler, Galaksi, Bulut, Piksel, Not Kağıdı, Dalga, Terminal, Kurdele, Peynir, Tahta, Mektup).
- **CSS border-image 9-Slice Rendering:** Tek bir PNG görselinden `border-image-slice` ile 9 bölgeye ayrılarak render ediliyor. Köşe dekorasyonları (gözler, kulaklar vb.) sabit kalırken orta kısım esneyerek mesaj uzunluğuna uyum sağlıyor.

### Düzeltilenler (Fixes)
- **Kesim Çizgisi (Seam) Sorunu:** `border-image-repeat` `stretch` yerine `round stretch` yapılarak yatayda tile, dikeyde stretch kullanıldı. Slice değerleri kenar çizgisinin 5px iç tarafından geçecek şekilde hesaplandı. `border-image-outset: 0.5px` ile mikro boşluklar kapatıldı.
- **Dikey Esneme Sorunu:** Uzun mesajlar alt satıra geçtiğinde baloncuğun dikeyde esnememesi düzeltildi (`border-image-repeat: round stretch`).
- **Kenar Pürüzlülüğü:** Sprite sheet'ten çıkarılan görsellerde siyah arka plan kalıntıları defringe ve alpha smoothing ile temizlendi.
- **Gri Avatar Kalıntıları:** Bazı baloncuklarda kalan gri avatar daireleri gray cluster flood-fill ile otomatik tespit edilip silindi.
- **Balçık Teması:** Kullanıcı isteğiyle kaldırıldı.

### Dağıtım ve Yayınlama
- Masaüstü EXE ve Render sunucusu güncellendi.

## [v1.3.0] - 2026-07-09

### Düzeltilenler (Fixes)
- **Koyu/Açık Tema Uyumluluğu:** Açık temada sohbet alıntı (yanıt) baloncuğunun metin renkleri okunabilir olacak şekilde dinamikleştirildi.
- **Tasarım Taşması (Overflow):** Yanıt baloncuğunun geniş mesajlarda ekrandan taşıp UI'yi bozması sorunu düzeltildi (`minWidth: 0` ve flex yapısı ile).
- **Alıntı Emojileri:** Alıntı önizlemesinde emojilerin `[emoji:xxx.png]` gibi kodlar yerine küçültülmüş resim formatında görünmesi sağlandı.
- **Emoji Silme Hızı:** Zero-Width Space sorunları çözüldü. Tek Backspace ile anında silme sağlandı.
- **Emoji Paneli Optimizasyonu:** Klavye açıkken "Özel Emojiler" başlığı gizlenerek alan tasarrufu yapıldı.
- **Klavye Tetikleme Sorunu (Xiaomi):** `onTouchStart` ile gereksiz klavye açılması engellendi.

### Dağıtım ve Yayınlama
- Yeni Masaüstü sürümü oluşturuldu (`AniSync 1.3.0.exe`).
- Render sunucusu güncellendi.
