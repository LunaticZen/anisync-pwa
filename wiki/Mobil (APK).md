# Mobil (APK)

> Android WebView uygulaması — `packages/mobile/`

## Mimari

Android uygulaması iki WebView kullanır:

```
┌─────────────────────────────────────┐
│         LinearLayout (root)         │
│                                     │
│  ┌──────────────────────────────┐   │
│  │     animeWebView             │   │  ← Anime sitesini gösterir
│  │     (weight: 6, portrait)    │   │     (animecix.tv vb.)
│  │     (weight: 6, landscape)   │   │
│  └──────────────────────────────┘   │
│  ┌──────────────────────────────┐   │
│  │     mainWebView              │   │  ← React UI (chat, sync bar)
│  │     (weight: 4, portrait)    │   │     Render.com/app
│  │     (weight: 4, landscape)   │   │
│  └──────────────────────────────┘   │
│                                     │
└─────────────────────────────────────┘
```

## Dosya Yapısı

```
packages/mobile/
├── app/
│   └── src/main/
│       ├── AndroidManifest.xml
│       ├── java/com/anisync/mobile/
│       │   └── MainActivity.java      ← Ana aktivite
│       └── res/
│           ├── layout/activity_main.xml
│           ├── values/styles.xml
│           ├── drawable/               ← Uygulama ikonu
│           └── mipmap-*/               ← Farklı çözünürlük ikonları
├── build.gradle
├── gradle/
├── gradlew.bat
└── settings.gradle
```

## MainActivity.java — Kritik Noktalar

### WebView Yapılandırması
```java
// mainWebView: React UI'ı gösterir
mainWebView.getSettings().setJavaScriptEnabled(true);
mainWebView.getSettings().setDomStorageEnabled(true);
mainWebView.getSettings().setMixedContentMode(MIXED_CONTENT_ALWAYS_ALLOW);
mainWebView.loadUrl("https://anisync-server.onrender.com/app");

// animeWebView: Anime sitesini gösterir
animeWebView.getSettings().setJavaScriptEnabled(true);
animeWebView.getSettings().setMediaPlaybackRequiresUserGesture(false);
```

### AniSyncBridge (JS ↔ Java)

mainWebView'a inject edilen JavaScript interface:

```java
@JavascriptInterface
public void openAnime(String url) {
    // animeWebView'ı göster ve URL'yi yükle
    runOnUiThread(() -> {
        animeWebView.setVisibility(View.VISIBLE);
        animeWebView.loadUrl(url);
    });
}

@JavascriptInterface
public void closeAnime() {
    // animeWebView'ı gizle
    runOnUiThread(() -> {
        animeWebView.setVisibility(View.GONE);
        animeWebView.loadUrl("about:blank");
    });
}

@JavascriptInterface
public void controlAnime(String action, float time) {
    // animeWebView'daki videoyu kontrol et
    String js = "";
    if ("seek".equals(action)) {
        js = "document.querySelector('video').currentTime=" + time;
    } else if ("play".equals(action)) {
        js = "document.querySelector('video').currentTime=" + time + ";document.querySelector('video').play()";
    } else if ("pause".equals(action)) {
        js = "document.querySelector('video').currentTime=" + time + ";document.querySelector('video').pause()";
    }
    animeWebView.evaluateJavascript(js, null);
}
```

### Ekran Yönü Desteği

```xml
<!-- AndroidManifest.xml -->
<activity android:screenOrientation="fullSensor" ... >
```

LinearLayout yönü otomatik değişir:
- **Portrait**: `orientation="vertical"` — video üstte, chat altta
- **Landscape**: `orientation="horizontal"` — video solda, chat sağda

### Xiaomi MIUI Fix

Xiaomi WebView render sorunları için:
```java
// Software rendering (donanım hızlandırma bypass)
animeWebView.setLayerType(View.LAYER_TYPE_SOFTWARE, null);

// WebView crash recovery
@Override
public void onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
    // WebView'ı yeniden oluştur
}

// Force redraw
private void forceWebViewRedraw(WebView wv) {
    wv.setVisibility(View.INVISIBLE);
    wv.postDelayed(() -> wv.setVisibility(View.VISIBLE), 100);
}
```

## APK Build

```powershell
# Gereksinimler: JDK 17+, Android SDK
cd packages/mobile

# Gradle ile build
.\gradlew.bat assembleDebug

# APK konumu
# app/build/outputs/apk/debug/app-debug.apk
```

Veya root'taki script:
```powershell
.\build-apk.ps1
```

## Mobil UI (RoomPage.tsx)

Mobilde anime aktifken (`mobileAnimeActive = true`), tamamen farklı bir layout render edilir:

```
┌─────────────────────────┐
│ ← [avatar] Room Name    │  ← Compact header (flex: none)
│   ● CANLI  CODE  👥 2   │
├─────────────────────────┤
│ [avatar] User1    20:14 │  ← Chat messages (flex: 1)
│ Mesaj metni             │
│                         │
│ [avatar] User2    20:15 │
│ Mesaj metni             │
│ ...                     │
├─────────────────────────┤
│ [Mesaj yaz...]  Gönder▸ │  ← Input area (flex-shrink: 0)
└─────────────────────────┘
```

## İlgili Sayfalar

- [[Senkronizasyon]] — APK sync mantığı
- [[UI Bileşenleri]] — RoomPage mobil modu
- [[Build ve Deploy]] — APK derleme
- [[Bilinen Sorunlar ve Çözümler]] — Xiaomi fix
