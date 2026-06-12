# Bilinen Sorunlar ve Çözümler

> Geçmişte karşılaşılan buglar, çözümleri ve öğrenilen dersler.

## 🔴 Çözülmüş Sorunlar

---

### Xiaomi Siyah Ekran
**Sorun**: Xiaomi/MIUI telefonlarda anime linki girilince WebView siyah ekran gösteriyor.

**Kök Neden**: MIUI WebView donanım hızlandırması ile render sorunları.

**Çözüm** (MainActivity.java):
```java
animeWebView.setLayerType(View.LAYER_TYPE_SOFTWARE, null);
```
+ Crash recovery + force redraw mekanizması

**Durum**: Kod yazıldı ama APK rebuild gerekiyor. Test bekleniyor.

---

### APK Sync Stuttering (4-5s aralıklarla takılma)
**Sorun**: APK'da video izlerken 4-5 saniyede bir kısa takılma/ileri sarma oluyor.

**Kök Neden**: `onTimecheck` handler'ı her 5 saniyede threshold kontrolü YAPMADAN `controlAnime('seek', ...)` çağırıyordu. Bu, video player'ı her timecheck'te resetliyordu.

**Çözüm**: 
- Drift threshold: Sadece >3s fark varsa seek
- Debounce: Max 1 düzeltme per 8 saniye
- Beklenen host zamanı hesaplanır, gerçek drift ölçülür

```javascript
if (hostDrift > 3) {
  bridge.controlAnime('seek', d.time);
}
```

---

### APK Kullanıcısı EXE'de Gözükmüyor
**Sorun**: APK arka plana atılıp geri dönünce, EXE'deki üye listesinde APK kullanıcısı kayboluyor.

**Kök Neden**: Socket disconnect olunca sunucu hemen `handleLeave()` çağırıp kullanıcıyı odadan siliyordu.

**Çözüm**: 3 katmanlı fix:
1. **Sunucu**: 30 saniye grace period — disconnect sonrası kullanıcı hemen silinmez
2. **Sunucu**: `room:rejoin` event — reconnect eden kullanıcı odaya geri katılabilir
3. **Client**: `socket.on('connect')` → otomatik `room:rejoin` gönderir

---

### Chat Resize Anime Açıkken Kaybolması
**Sorun**: Link açılmadan önce chat boyutu sürüklenerek ayarlanabiliyor, link açılınca bu özellik kayboluyor.

**Kök Neden**: Mobilde anime aktifken `app__main` `flex: 1` alıyor ve tüm alanı dolduruyor, resize handle'a yer kalmıyor.

**Çözüm**: `mobileAnimeActive` durumunda tamamen farklı layout render ediliyor — app__main `flex: none`, sidebar `flex: 1`.

---

### Dikey Modda Oda Bilgileri Yanlış Konumda
**Sorun**: Portrait modda oda ismi, kod ve üyeler bilgisi ekranın ortasında/altında gözüküyor.

**Kök Neden**: `app__main` div'i `flex: 1` alıyordu ve boş alan oluşuyordu.

**Çözüm**: `mobileAnimeActive` durumunda `app__main` yerine tamamen ayrı bir layout kullanılıyor — compact header en üstte, chat altta.

---

### TSConfig declarationMap Hatası
**Sorun**: `tsc --noEmit` çalıştırınca "Option 'declarationMap' cannot be specified without specifying option 'declaration'" hatası.

**Kök Neden**: `tsconfig.base.json`'da `declarationMap: true` var, `desktop/tsconfig.json`'da `declaration: false` override ediliyor ama `declarationMap` override edilmemiş.

**Çözüm**: Desktop tsconfig'e `"declarationMap": false` eklendi.

---

### Windows'ta npx/vite/tsc Çalışmıyor
**Sorun**: `npx vite build` veya `node ./node_modules/.bin/vite` çalıştırınca bash script parse hatası veriyor.

**Kök Neden**: `.bin/` altındaki dosyalar Unix bash scriptleri, Windows'ta çalışmaz.

**Çözüm**: Doğrudan JS dosyasını çalıştır:
```powershell
node ../../node_modules/vite/bin/vite.js build
node ../../node_modules/typescript/bin/tsc --noEmit
```

---

### Render.com "Cannot find module server.js" Çökmesi
**Sorun**: Render deploy olduktan sonra "Error: Cannot find module '/opt/render/project/src/packages/render-server/server.js'" hatası verip çöküyor.

**Kök Neden**: `packages/render-server` klasörünün içinde gizli bir `.git` klasörü bulunması. Bu durum Git'in klasörü bir "submodule" (alt proje) olarak görmesine neden olur ve içindeki hiçbir dosyayı ana repoya (GitHub'a) yüklemez. Render da boş bir klasör indirdiği için dosyayı bulamaz.

**Çözüm**: İçerideki `.git` klasörünü silip, git cache'ini temizledikten sonra dosyaları ana projeye zorla dahil ettik:
```powershell
Remove-Item -Recurse -Force packages/render-server/.git
git rm --cached packages/render-server
git add packages/render-server
git commit -m "fix: include render-server files"
```

---

## 🟡 Bilinen Sınırlamalar

### Render.com Free Tier
- 15 dakika inaktivite sonrası uyuyor (keep-alive ile bypass ediliyor)
- İlk bağlantıda ~30s cold start olabilir (warmUpServer ile handle ediliyor)
- RAM/CPU sınırlı

### In-Memory State
- Sunucu restart olursa tüm odalar kaybolur
- Veritabanı yok — kalıcı veri depolanmaz
- Chat geçmişi saklanmaz

### Video Sync
- Sadece host PC kontrol edebilir (APK → PC event gönderemiyor)
- Farklı video kaynakları sync edilemez
- Web tarayıcıda video yeni sekmede açılır, sync yok

### Mobil
- Mobil kullanıcı video kontrolü yapamaz (sadece PC host)
- Xiaomi fix APK rebuild gerektirir
- Bazı anime sitelerinde video element'i farklı selector gerektirebilir

## İlgili Sayfalar

- [[Senkronizasyon]] — Sync detayları
- [[Mobil (APK)]] — Android sorunları
- [[Sunucu (Render Server)]] — Server yapısı
