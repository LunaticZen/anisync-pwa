# AniSync Geliştirici Notları ve Çıkarılan Dersler (Wiki)

Bu döküman, AniSync'e eklenen "Resim Yükleme ve Tam Ekran (Lightbox) Özelliği" geliştirilirken karşılaşılan kritik hataları, nedenlerini ve çıkarılan dersleri belgelemek amacıyla oluşturulmuştur. İleride benzer özellikler geliştirilirken bu notlara dikkat edilmelidir.

## 1. Sunucu Tarafı Güvenlik Limitleri (Payload Truncation)
**Hata:** Kullanıcı arayüzünde Base64 olarak gönderilen resimler yerel (local) geliştirme ortamında sorunsuz çalışırken, canlı (Render) sunucusuna yüklendiğinde resimler bozuk görünüyor ve mesaj metni `[upload:data:image/jpeg;base64,...` şeklinde yarım kesilmiş olarak ekrana düşüyordu.
**Neden:** `render-server/server.js` içerisindeki Soket mesaj dinleyicisinde, genel sohbet güvenliği ve performansını korumak adına tüm mesajları koşulsuz olarak 500 karakterde kesen bir limit bulunuyordu: `(data.text || '').slice(0, 500)`
**Çözüm:** Kesme işlemi uygulanmadan önce mesajın bir Base64 resim verisi olup olmadığı kontrol edildi. Eğer mesaj `[upload:data:image/` ile başlıyor ve `]` ile bitiyorsa, bu bir görsel upload komutu olarak kabul edilip uzunluk limiti (resimler için) 500.000 karaktere çıkarıldı.
**Alınan Ders:** Lokal geliştirme sunucusu (packages/server) ile bağımsız canlı prodüksiyon sunucusu (packages/render-server) arasındaki konfigürasyon ve limit farkları gözden kaçırılmamalıdır. Bir payload boyutu artırıldığında sunucudaki karakter kesme (slice/substring) mantığı mutlaka revize edilmelidir.

## 2. Global Obje Çakışmaları (Shadowing the Global Scope)
**Hata:** Resimli mesajlara alıntı (reply) yapıldığında sohbet alanında Base64 metni yerine şık bir "Görsel" ikonu göstermek için `lucide-react` kütüphanesinden `<Image>` ikonu import edildi. Bunu yaptıktan hemen sonra galeriden resim seçildiğinde resim chat'e gitmemeye (uygulama hata vermeye) başladı.
**Neden:** `import { Image } from 'lucide-react'` satırı, tarayıcının varsayılan HTML5 `Image` constructor'ını ezdi (shadowing). Galeriden resim seçildiğinde, resmi yeniden boyutlandırmak (resize) için kullanılan `const img = new Image()` satırı, React bileşenini çağırmaya çalıştığı için `TypeError` fırlatarak işlemi durdurdu.
**Çözüm:** Import satırı `import { Image as ImageIcon } from 'lucide-react'` olarak değiştirilip global `Image` sınıfının korunması sağlandı.
**Alınan Ders:** `Image`, `Event`, `File`, `URL`, `Window` gibi global Web API sınıflarıyla aynı isme sahip kütüphane modüllerini (örneğin UI İkonları) içeri aktarırken her zaman `as` anahtar kelimesi ile Alias (Takma ad) kullanarak isim çakışmalarının önüne geçilmelidir.

## 3. React Durum Yönetiminde ReferenceError (State Scope)
**Hata:** Mesaj balonlarına tıklanıldığında resmi tam ekran (lightbox) yapacak olan fonksiyon yazıldıktan sonra sohbete herhangi bir mesaj atıldığında uygulama çöküp "Beyaz Ekran" (White Screen of Death) verdi.
**Neden:** `ChatPanel` bileşeni içerisine eklenen `setLightboxImage` fonksiyonu, mesaj balonunu işleyen dışarıdaki `SwipableMessage` fonksiyonuna doğrudan parametre olarak aktarılmamıştı (Prop Drilling eksikliği). React, o kapsamda (scope) olmayan bir fonksiyonu çalıştırmaya çalışınca ReferenceError fırlattı.
**Çözüm:** `SwipableMessage` fonksiyonunun parametrelerine `onImageClick` eklendi ve `ChatPanel` üzerinden `setLightboxImage` durumu (state) doğru bir şekilde aşağı (child component'e) aktarıldı.
**Alınan Ders:** React'te bileşenleri dışarı çıkarırken (Extracting Components), kullanacakları tüm callback fonksiyonlarının (prop) doğru kapsamda tanımlanıp tanımlanmadığı ve aktarılıp aktarılmadığı kontrol edilmelidir.

## 4. Mobil Cihazlarda Event (Dokunmatik/Touch) Tetiklenmeleri
**Hata:** Mobil cihazda sohbet penceresindeki "Kalp" ve "Galeri (Resim Seçme)" ikonlarına dokunulduğunda telefonun sanal klavyesi istem dışı olarak açılıp kapanıyordu.
**Neden:** Mobil tarayıcılar (özellikle Android WebView/iOS Safari), ekrana dokunulduğunda sırasıyla `onTouchStart`, `onTouchEnd`, `onMouseDown` ve `onClick` olaylarını ateşler. Bu dokunma eylemleri, odaklanmış (focus) haldeki input alanının odağını kaybetmesine (blur) veya ekranın yenilenmesine yol açarak klavyenin davranışlarını bozar.
**Çözüm:** İlgili ikon butonlarına `onTouchStart={(e) => e.preventDefault()}` eklendi. `preventDefault()` metodu, tarayıcının o dokunmaya ait "odak değiştirme" (focus shift) gibi varsayılan davranışlarını engellediği için klavyenin gereksiz yere açılıp kapanması durduruldu.
**Alınan Ders:** İnteraktif mobil chat arayüzleri geliştirilirken butonlarda `onClick` kadar, mobilin kendi native dokunma event'leri olan `onTouchStart` ve `onTouchEnd` davranışları da (özellikle klavye yönetimi söz konusuysa) çok dikkatli yönetilmelidir.

## 5. CSS ve UX Detayları
**Yapılanlar:**
- Kullanıcının yüklediği resimler CSS ile `aspect-ratio: 1/1` ve `object-fit: cover` kullanılarak estetik kare formlara dönüştürüldü.
- Resme basıldığında büyüyen Lightbox modülüne `@keyframes` aracılığıyla `fadeIn` (kararma) ve `scaleUp` (büyüme) gibi akıcı geçiş animasyonları eklendi.
- Mobil tarayıcılarda resimlerin veya butonların üzerine tıklandığında çıkan varsayılan mavi dokunma yansıması, `-webkit-tap-highlight-color: transparent` özelliği ile kaldırılarak tasarımın Premium hissi artırıldı.

***
**Sürüm:** v1.2.0
**Tarih:** Haziran 2026
