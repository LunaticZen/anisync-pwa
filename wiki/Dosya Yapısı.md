# Dosya Yapısı

> Proje dizini: `C:\Users\emin\.gemini\antigravity\scratch\anisync\`

## Tam Ağaç

```
anisync/
├── package.json                 ← Monorepo root (npm workspaces)
├── tsconfig.base.json           ← Paylaşılan TypeScript config
├── version.txt
│
├── build-apk.ps1               ← APK build script
├── build-exe.ps1               ← EXE build script
├── full-build.ps1              ← Tam build (web + exe + apk)
├── copy-apk.ps1                ← APK kopyalama
├── sync-render.ps1             ← Render-server'a sync
├── install-android-sdk.ps1     ← Android SDK kurulumu
│
├── wiki/                       ← Bu wiki dosyaları (Obsidian)
│
├── packages/
│   ├── shared/                 ← Ortak tipler ve protokol
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts        ← Ana export
│   │       ├── types/
│   │       │   └── index.ts    ← RoomDetails, SyncState, ChatMessage, vb.
│   │       ├── protocol/
│   │       │   └── events.ts   ← Socket event type tanımları
│   │       └── sync/
│   │           └── sync-engine.ts ← Sync engine (opsiyonel)
│   │
│   ├── desktop/                ← React + Electron uygulaması
│   │   ├── package.json
│   │   ├── tsconfig.json       ← declaration:false, declarationMap:false
│   │   ├── vite.config.ts
│   │   ├── index.html
│   │   ├── electron/
│   │   │   ├── main.ts         ← Electron ana process
│   │   │   ├── preload.ts      ← window.anisync API
│   │   │   ├── embedded-server.ts ← Gömülü sunucu
│   │   │   └── tsconfig.json
│   │   ├── src/
│   │   │   ├── main.tsx        ← React entry point
│   │   │   ├── App.tsx         ← Router + Layout
│   │   │   ├── vite-env.d.ts
│   │   │   ├── components/
│   │   │   │   ├── HomePage.tsx      ← Giriş sayfası
│   │   │   │   ├── LobbyPage.tsx     ← Oda seçimi
│   │   │   │   ├── RoomPage.tsx      ← ⭐ Ana izleme sayfası (44KB)
│   │   │   │   ├── LoginPage.tsx     ← Login (unused)
│   │   │   │   ├── RegisterPage.tsx  ← Register (unused)
│   │   │   │   ├── TitleBar.tsx      ← Electron başlık çubuğu
│   │   │   │   └── Toasts.tsx        ← Bildirimler
│   │   │   ├── services/
│   │   │   │   ├── socket.ts         ← ⭐ Socket.IO client (10KB)
│   │   │   │   ├── api.ts            ← HTTP API (opsiyonel)
│   │   │   │   └── sync-manager.ts   ← Sync manager
│   │   │   ├── stores/
│   │   │   │   └── index.ts          ← Zustand store'ları
│   │   │   └── styles/
│   │   │       └── index.css         ← ⭐ Tüm CSS (25KB)
│   │   └── dist/                     ← Vite build çıktısı
│   │
│   ├── mobile/                 ← Android APK
│   │   ├── build.gradle
│   │   ├── settings.gradle
│   │   ├── gradle.properties
│   │   ├── gradlew.bat
│   │   ├── gradle/wrapper/
│   │   └── app/
│   │       ├── build.gradle
│   │       └── src/main/
│   │           ├── AndroidManifest.xml
│   │           ├── java/com/anisync/mobile/
│   │           │   └── MainActivity.java  ← ⭐ Ana aktivite
│   │           └── res/
│   │               ├── layout/activity_main.xml
│   │               ├── values/styles.xml
│   │               ├── drawable/
│   │               └── mipmap-*/
│   │
│   ├── render-server/          ← ⭐ Üretim sunucusu (AYRI GIT REPO)
│   │   ├── .git/               ← Kendi git repo'su!
│   │   ├── package.json
│   │   ├── server.js           ← ⭐ Tek dosya sunucu (14KB)
│   │   └── public/             ← Vite build çıktısı buraya kopyalanır
│   │       ├── index.html
│   │       └── assets/
│   │
│   ├── render-server-adapter/
│   │   └── adapter.js          ← WebView adapter
│   │
│   └── server/                 ← (Eski sunucu, kullanılmıyor)
```

## Kritik Dosyalar (⭐)

| Dosya | Boyut | Açıklama |
|-------|-------|----------|
| `desktop/src/components/RoomPage.tsx` | 44KB | En büyük ve kritik component |
| `desktop/src/services/socket.ts` | 10KB | Socket.IO client, tüm event handler'ları |
| `desktop/src/styles/index.css` | 25KB | Tüm CSS stilleri |
| `render-server/server.js` | 14KB | Sunucu kodu (tek dosya) |
| `mobile/.../MainActivity.java` | ~10KB | Android ana aktivite |

## İlgili Sayfalar

- [[Teknoloji Stack]] — Kullanılan teknolojiler
- [[Build ve Deploy]] — Derleme süreçleri
