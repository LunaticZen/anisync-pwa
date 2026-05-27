# Dosya Yapısı

## Kök Dizin

```
anisync/
├── full-build.ps1        ← Tek tuşla EXE + APK + deploy build
├── build-apk.ps1         ← Sadece APK build
├── build-exe.ps1         ← Sadece EXE build
├── copy-to-desktop.ps1   ← EXE'yi masaüstüne kopyala
├── sync-render.ps1       ← Render server'a UI dosyalarını kopyala
├── version.txt           ← Build numarası (şu an: 42)
├── package.json          ← Workspace root config
├── tsconfig.base.json    ← Ortak TypeScript config
├── docker-compose.yml    ← PostgreSQL + Redis (pasif server için)
└── packages/
```

## packages/shared/src/

```
shared/src/
├── index.ts              ← Public API (re-export)
├── types/
│   └── index.ts          ← TÜM tipler (362 satır): User, Room, RoomDetails,
│                            RoomMember, SyncState, ChatMessage, AnimeInfo, vb.
├── protocol/
│   └── events.ts         ← Socket event tipleri (ClientToServerEvents,
│                            ServerToClientEvents, SocketData)
├── sync/
│   └── sync-engine.ts    ← Senkronizasyon motoru sabitleri
└── player/
    └── interfaces.ts     ← Player arayüz tipleri
```

## packages/desktop/

```
desktop/
├── package.json          ← Electron + React bağımlılıkları
├── vite.config.ts        ← Vite bundler config
├── electron/
│   ├── main.ts           ← Electron ana süreç (BrowserWindow + BrowserView)
│   ├── main.js           ← Derlenen JS
│   ├── preload.ts        ← IPC köprüsü (window.anisync API)
│   ├── preload.js         ← Derlenen JS
│   ├── embedded-server.ts ← Gömülü Express + Socket.IO sunucu
│   ├── embedded-server.js ← Derlenen JS
│   └── tsconfig.json     ← Electron TS config
└── src/
    ├── main.tsx           ← React entry point
    ├── App.tsx            ← View router (login/room)
    ├── vite-env.d.ts      ← Vite tip tanımları
    ├── components/
    │   ├── HomePage.tsx    ← Login + Register (no-auth mode) — 250 satır
    │   ├── LobbyPage.tsx   ← Oda listesi, oda oluştur/katıl, profil — 386 satır
    │   ├── RoomPage.tsx    ← Ana oda sayfası: video, chat, üyeler, sync — 700 satır
    │   ├── LoginPage.tsx   ← JWT login (pasif) — 101 satır
    │   ├── RegisterPage.tsx← JWT register (pasif) — 120 satır
    │   ├── TitleBar.tsx    ← Electron pencere başlığı — 100 satır
    │   └── Toasts.tsx      ← Toast bildirimleri — 20 satır
    ├── services/
    │   └── socket.ts      ← Socket.IO client, event handler'lar, NTP sync — 210 satır
    ├── stores/
    │   └── index.ts       ← 5 Zustand store: Auth, Room, Sync, Chat, UI — 223 satır
    └── styles/
        └── index.css      ← TÜM CSS: tema, layout, responsive, mobil — ~1300 satır
```

## packages/render-server/ (AKTİF SUNUCU)

```
render-server/
├── server.js             ← Express + Socket.IO + in-memory rooms — 339 satır
├── package.json          ← Bağımlılıklar
├── .gitignore
└── public/               ← Build edilen React UI (desktop/dist kopyası)
    ├── index.html
    ├── adapter.js        ← Anime sayfa adaptörü
    └── assets/
        ├── index-*.js    ← Bundled React
        └── index-*.css   ← Bundled CSS
```

## packages/render-server-adapter/

```
render-server-adapter/
└── adapter.js            ← Anime sayfalarına enjekte edilen sync scripti — 244 satır
```

## packages/mobile/

```
mobile/
├── build.gradle          ← Root Gradle config
├── settings.gradle       ← Proje adı
├── gradle.properties     ← JVM ayarları
├── app/
│   ├── build.gradle      ← Android build config (SDK 34, minSdk 24)
│   └── src/main/
│       ├── AndroidManifest.xml  ← Uygulama izinleri ve activity
│       ├── java/com/anisync/mobile/
│       │   └── MainActivity.java ← Çift WebView (main + anime), JS Bridge,
│       │                           ad blocker, video kontrol — 370 satır
│       └── res/
│           ├── mipmap-mdpi/      ← 48x48 ikon
│           ├── mipmap-hdpi/      ← 72x72 ikon
│           ├── mipmap-xhdpi/     ← 96x96 ikon
│           ├── mipmap-xxhdpi/    ← 144x144 ikon
│           ├── mipmap-xxxhdpi/   ← 192x192 ikon
│           └── values/
│               ├── styles.xml    ← AppTheme
│               └── colors.xml   ← Renk sabitleri
```

## packages/server/ (PASIF — tam sürüm)

```
server/src/
├── index.ts              ← Entry point: Express + DB + Redis + WS — 117 satır
├── config/               ← Ortam değişkenleri
├── db/                   ← Prisma client
├── redis/                ← Redis client
├── auth/                 ← JWT auth service
├── rooms/                ← Oda CRUD service
├── sync/                 ← Senkronizasyon motoru
├── chat/                 ← Chat mesaj service
├── presence/             ← Online/offline takip
├── middleware/           ← Rate limit, sanitize, error handler
├── routes/               ← REST API rotaları
└── ws/
    └── gateway.ts        ← Socket.IO gateway: tüm event routing — 387 satır
```

---
[[Home]] | [[Desktop Paketi]] | [[Server Paketi]] | [[Mobile Paketi]]
