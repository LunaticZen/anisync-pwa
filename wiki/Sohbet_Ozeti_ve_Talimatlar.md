# Geliştirme Özeti ve Claude/Agent İçin Devam Rehberi (v1.1.1)

Bu dosya, önceki seansta yapılan son geliştirme aşamalarının, kritik düzeltmelerin ve sistem hakkındaki önemli bilgilerin unutulmaması için oluşturulmuştur. Yeni bir sohbet başlatıldığında Claude veya AI ajanının bu dosyayı okuması, projeye tam kaldığı yerden devam edebilmesi için elzemdir.

## Mevcut Mimari Hatırlatması
- **Uygulama:** AniSync (Kullanıcıların birlikte senkronize anime/video izlediği platform).
- **Altyapı:** React, Vite, Socket.io, Zustand (Frontend). Express (Render Server). Android WebView (Mobil APK). Electron (Masaüstü EXE).
- **Çalışma Mantığı:** Masaüstü uygulaması React'i lokal olarak çalıştırırken, **Android APK doğrudan `https://anisync-server.onrender.com` adresini WebView üzerinden yükler**. 
- **Deploy Süreci:** Frontend (`packages/desktop`) derlenip (build edilip), çıkan `dist` klasörü `packages/render-server/public` içine kopyalanır. Render sunucusu bu klasörü statik olarak yayınlar. Böylece Render güncellendiğinde APK anında yeni frontend'i alır.

## Son Yapılan Geliştirmeler ve Kritik Düzeltmeler (Canlı Temalar)
1. **Canlı (Videolu) Temalar:** Kullanıcıların odada arkaplan olarak hareketli videolar seçebilmesi için `constants.ts` içindeki tema objelerine `isVideo: true` ve `video: '/themes/live/...'` özellikleri eklendi.
2. **Android WebView Play İkonu Sorunu:** Android WebView, HTML5 `<video>` etiketleri yüklenene kadar otomatik olarak devasa gri bir oynatma (Play) ikonu koymaktadır. Bu iğrenç görüntüyü engellemek için iki kritik hile uygulandı:
   - `<video>` etiketlerine şeffaf pixel poster eklendi: `poster="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"`
   - Video `onCanPlay` tetiklenene kadar `opacity: 0` yapılarak gizlendi ve yumuşak bir CSS transition ile `fade-in` olması sağlandı.
3. **Zarif Yükleme Animasyonları (Spinner):** İnternet hızı yavaş olduğunda veya tema ağır olduğunda siyah ekran çıkmasını engellemek için:
   - **Oda Arkaplanı (`RoomPage.tsx`):** `renderBgLoader()` fonksiyonu eklendi. Arka plan siyah (`#000`) yapılırken üstünde şık bir "glass blur" ve ortasında dönen AniSync spinner'ı gösteriliyor. Tema yüklenince pürüzsüzce kayboluyor.
   - **Temalar Menüsü (`RoomModals.tsx`):** Bento Grid tasarımındaki küçük önizlemelerin (thumbnail) içine de aynı spinner mantığı kuruldu. Bunun çalışabilmesi için `.map` döngüsü içindeki yapı `ThemeThumbnail` adında ayrı bir bileşene (component) çıkartıldı.
4. **WebView Cache (Önbellek) Kırıcı:** Android cihazların güncellemeyi anında görmesi için `MainActivity.java` içinde URL yüklenirken `?v=timestamp` query'si eklendi. (Kullanıcı uygulamayı tamamen kapatıp açtığında çalışır).

## Komutlar ve Scriptler
Frontend derlemesini yapıp, Render (sunucu) için statik dosyaları kopyalamak ve GitHub'a pushlamak için şu PowerShell komut zinciri kullanılır:
```powershell
npm run build:desktop
Remove-Item -Recurse -Force packages\render-server\public\* -ErrorAction SilentlyContinue
Copy-Item -Recurse -Force packages\desktop\dist\* packages\render-server\public\
git add .
git commit -m "fix: sync frontend build to render-server"
git push origin main
```
EXE oluşturmak için `packages/desktop` içinde `npm run package` çalıştırılır.
APK oluşturmak için `packages/mobile` içinde `./gradlew assembleRelease` kullanılır.

## Sonraki Adımlar İçin Not
- Kod düzenlerken React Hooks (`useState`, `useEffect`) kullanımında `.map()` içine hook yazılmamasına dikkat edin (`RoomModals` içindeki hatadan ders çıkarıldı).
- Herhangi bir UI komponentine video eklerken her zaman `poster="data:image/gif;base64..."` şeffaf hilesini kullanın, yoksa mobil WebView varsayılan play ikonunu basar.
- Versiyon şu anda `1.1.1`'e yükseltilmiştir. Tüm paket (`package.json`) dosyalarında bu versiyon eşlenmiştir.
