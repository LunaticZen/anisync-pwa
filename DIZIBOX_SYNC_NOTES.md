# Dizibox Video Sync — Teknik Notlar (ASKIYA ALINDI)

> **Durum:** Askıya alındı (28 Haziran 2026)  
> **Sebep:** APK tarafında cross-origin iframe video kontrolü çözülemedi  
> **Öncelik:** Düşük — Animecix desteği öncelikli

---

## Sorunun Özeti

Dizibox.tv video player'ı cross-origin iframe kullanıyor (`dbx.molystream.org`).
Android WebView'da cross-origin iframe'lere JavaScript erişimi mümkün değil.
Bu nedenle APK'daki `executeVideoCommand` Dizibox için çalışmıyor.

## Çalışan Kısımlar (PC - Electron)

### ✅ URL Sync
- PC'den Dizibox açıldığında APK'ya URL gönderiliyor
- Socket üzerinden `sync:url-changed` ile çalışıyor

### ✅ Video Event Yakalama (PC Tarafı)
- `main.ts` içindeki `scanForVideoFrame` fonksiyonu `dbx.molystream.org` iframe'ini buluyor
- `__anisync_api` başarıyla inject ediliyor
- Play/pause/seek event'leri yakalanıyor:
  ```
  [AniSync] player:getEvent = {"time":0,"ts":...,"type":"play"}
  [AniSync] player:getState = {"duration":2833.208333,"speed":1,"state":"playing","time":1.715338}
  [AniSync] player:getEvent = {"time":2.368021,"ts":...,"type":"pause"}
  [AniSync] player:getEvent = {"time":303.234757,"ts":...,"type":"seek"}
  ```

### ✅ Socket Relay (Server)
- `render-server/server.js` satır 360-396: `sync:play/pause/seek` event'leri broadcast ediliyor
- Aynı altyapı URL sync için de kullanılıyor ve çalışıyor

### ✅ Render Web UI (APK Frontend)
- `index-B3vZ31lo.js` bundle'ı `controlAnime` ve `sync:play` handler'larını içeriyor
- APK web UI socket event'lerini alıp `window.AniSyncBridge.controlAnime(cmd, time)` çağırıyor
- Java `@JavascriptInterface controlAnime()` → `executeVideoCommand()` zinciri çalışıyor

## Çalışmayan Kısım (APK → Video Kontrolü)

### ❌ Cross-Origin Video Kontrolü
`executeVideoCommand` şunu yapıyor:
```java
// Bu Animecix'te çalışıyor (same-origin):
fs[i].contentDocument.querySelector('video')

// Bu Dizibox'ta BAŞARISIZ (cross-origin — molystream.org):
// SecurityError: Blocked a frame with origin "..." from accessing a cross-origin frame
```

## Denenen Çözümler

### 1. postMessage Yaklaşımı
- `executeVideoCommand` → postMessage fallback eklendi
- `shouldInterceptRequest` → molystream HTML'ine `postMessage` listener inject edildi
- **Sonuç:** Çalışmadı. Olası sebepler:
  - `shouldInterceptRequest`'te HTTP fetch cookie/session taşımıyor olabilir
  - molystream embed sayfası dinamik yükleme yapıyor olabilir (video tag sonradan ekleniyor)
  - Inject edilen listener, sayfanın kendi script'leri tarafından override ediliyor olabilir

### 2. İleride Denenecek Alternatif Yaklaşımlar

#### a) `WebViewCompat.addDocumentStartJavaScript()` (API 33+)
- AndroidX Webkit 1.6+ gerekli
- Tüm frame'lere (cross-origin dahil) document start'ta script inject edebilir
- En temiz çözüm ama Android 13+ gerektirir

#### b) Custom WebViewClient ile tam HTML intercept
- `shouldInterceptRequest` + OkHttp (cookie jar ile)
- Molystream HTML'ini tam olarak alıp, tüm header/cookie'leri koruyarak inject
- Daha robust ama karmaşık implementasyon gerektirir

#### c) Ayrı WebView stratejisi
- Video iframe URL'sini tespit et
- Molystream embed'i ayrı bir WebView'da aç
- Bu WebView'da doğrudan `evaluateJavascript` ile kontrol et
- Layout yönetimi karmaşık olabilir

#### d) WebView DevTools Protocol
- `WebView.setWebContentsDebuggingEnabled(true)`
- Chrome DevTools Protocol ile frame'e bağlan
- En güçlü ama en karmaşık çözüm

## Dosya Referansları

| Dosya | İlgili Satırlar | Açıklama |
|-------|-----------------|----------|
| `packages/desktop/electron/main.ts` | 400-513 | Video frame tarama ve injection (PC) |
| `packages/desktop/electron/main.ts` | 567-595 | player:command/getState/getEvent IPC |
| `packages/desktop/src/components/room/RoomPage.tsx` | 98-155 | PC video sync bridge (event polling) |
| `packages/desktop/src/components/room/RoomPage.tsx` | 186-234 | Mobile sync bridge (controlAnime) |
| `packages/render-server/server.js` | 360-396 | Sync event relay |
| `packages/mobile/.../MainActivity.java` | 345-378 | executeVideoCommand |
| `packages/mobile/.../MainActivity.java` | 504-518 | shouldInterceptRequest |

## Dizibox Site Yapısı

```
dizibox.tv → redirect → www.dizibox.live
                ↓
        Bölüm sayfası: /i-will-find-you-1-sezon-1-bolum-izle/
                ↓
        Player iframe: /player/king/king.php?v=...
                ↓
        Video iframe: dbx.molystream.org/embed/8857-...
                ↓
        <video> tag (HLS player)
```

## Header Gereksinimleri
- `Referer: https://www.dizibox.live/` gerekli (molystream 403 döner yoksa)
- Electron'da `setupHeaderInterceptors()` ile çözüldü (main.ts satır 590+)
- APK'da henüz uygulanmadı

## PC Tarafında Kalan Debug Log'ları
`main.ts`'de Dizibox debug amaçlı eklenen log'lar hala aktif:
- `[AniSync] player:getState =`
- `[AniSync] player:getEvent =`
- `stateLogCounter` değişkeni

Bunlar performansı etkilemiyor, istenirse temizlenebilir.
