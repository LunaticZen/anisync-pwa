# AniSync Projesi Agent Kuralları ve Yönergeleri

Bu dosya, bu projede çalışacak olan yapay zeka asistanları (Agent'lar) için oluşturulmuştur. Lütfen her göreve başlamadan önce aşağıdaki kurallara kesinlikle uyun.

## 1. Build ve Deployment Süreçleri
Projeyi derleme (build) süreçleri Masaüstü (EXE) ve Web/Mobil (Render) olmak üzere iki farklı şekilde yapılır:

### a) Masaüstü (EXE) Derlemesi
- Masaüstü uygulaması `packages/desktop` klasöründedir. 
- Build almak için: `cd packages/desktop && npm run package` komutu kullanılır.
- Çıktı `packages/desktop/release` klasörüne `.exe` formatında çıkar.
- Kullanıcıya her zaman bu yeni oluşturulan EXE'yi masaüstündeki test dizinine kopyalamanız istenir: `cp release/*.exe /home/emim/Desktop/AniSync_Yeni/`

### b) Mobil/Web (Render) Derlemesi
- Uygulamanın web ve mobil versiyonları için arayüz (frontend), Render üzerinde barındırılan sunucu (packages/render-server) üzerinden sunulur.
- Frontend'i güncellemek için: `cd packages/desktop && npm run build` çalıştırın.
- Ardından derlenen `dist` klasörünün içindeki tüm dosyaları Render sunucusunun public klasörüne kopyalayın: `cp -r dist/* ../render-server/public/`
- Render sunucusuna deploy olması için bu dosyaların `git commit` ile projeye eklenmesi gerekir.

## 2. GitHub Push İşlemleri (ÇOK ÖNEMLİ)
- Agent **KESİNLİKLE KENDİ BAŞINA `git push` YAPMAMALIDIR**.
- Kimlik doğrulama (Authentication) sınırlamaları nedeniyle terminal üzerinden yapılan `git push` komutları hata vermektedir.
- Agent'ın görevi sadece değişiklikleri yapmak, dosyaları build etmek, `git add` ve `git commit` ile yerel depoya kaydetmektir.
- Değişiklikleri uzak sunucuya (origin) gönderme **`Push`** işi, kullanıcıya (EMİM) bırakılmalıdır. Kullanıcı bu işlemi kendi bilgisayarındaki **GitHub Desktop** uygulaması üzerinden tek tuşla gerçekleştirecektir.
- Agent, her güncelleme ve commit sonrası kullanıcıya "Değişiklikleri kaydettim, şimdi GitHub Desktop üzerinden Push yapabilirsiniz" şeklinde bilgi vermelidir.

## 3. Genel Kurallar
- Mobil ve EXE olmak üzere iki ayrı hedef vardır, yapılan arayüz (CSS vb.) değişiklikleri her ikisini de etkiler.
- İş akışını bozmamak adına yukarıdaki build/kopyalama süreçlerini otomatize edebilir (örneğin terminalden çalıştırabilirsiniz), ancak son onay ve push adımı her zaman kullanıcıdadır.

## 4. Custom Mesaj Baloncuğu Ekleme (ÇOK ÖNEMLİ)
Sohbet baloncuklarında CSS `border-image` 9-slice rendering kullanılıyor. Yeni tema eklerken şu adımları takip et:

### Dosyalar
- **Görseller:** `packages/desktop/public/bubbles/themes/<tema_id>/full.png` — transparan PNG, ~400-500px genişlik
- **Ayarlar:** `packages/desktop/src/components/room/constants.tsx` → `BUBBLE_THEMES` dizisi
- **Render:** `packages/desktop/src/components/room/RoomChat.tsx` ~L593-618

### Slice Hesaplama Kuralı
`slice: [top, right, bottom, left]` değerleri **kaynak görseldeki piksel cinsinden** kenar kalınlığı + 5px güvenlik marjı olarak hesaplanır. Kesim çizgisi **baloncuğun iç alanının düz renkli bölgesinden** geçmelidir. Aksi halde kenar antialiasing artefaktları (seam) oluşur.

### border-image-repeat
Her zaman `round stretch` kullan:
- `round` → yatay: orta kısım tile olarak döşenir
- `stretch` → dikey: uzun mesajlarda baloncuk serbestçe uzar

### Detaylı Dokümantasyon
Tam teknik detaylar için: `ANI_SYNC_PROJE_DOKUMANTASYONU.md` → "7. Custom Mesaj Baloncukları Sistemi" bölümü.
