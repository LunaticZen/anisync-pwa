# Mimari Genel Bakış

## Monorepo Yapısı

AniSync bir **npm workspaces** monorepo'dur. Tüm paketler `packages/` altında bulunur.

```
anisync/
├── packages/
│   ├── shared/          ← Ortak TypeScript tipleri (@anisync/shared)
│   ├── server/          ← Tam özellikli backend (Express + Socket.IO + PostgreSQL + Redis)
│   ├── desktop/         ← Electron + React UI (hem EXE hem web UI)
│   ├── mobile/          ← Android WebView wrapper (APK)
│   ├── render-server/   ← Render.com için basitleştirilmiş sunucu (in-memory)
│   └── render-server-adapter/ ← Anime sayfalarına enjekte edilen JS
├── full-build.ps1       ← Tek tuşla tam build scripti
├── version.txt          ← Otomatik artan build numarası
└── package.json         ← Workspace root
```

## Paket İlişki Diyagramı

```
┌──────────────┐     ┌──────────────┐
│  @anisync/   │     │   render-    │
│   shared     │◄────│   server     │ (runtime bağımlı değil, tipler ortak)
│  (types)     │     │  (deploy)    │
└──────┬───────┘     └──────┬───────┘
       │                    │
       ▼                    ▼
┌──────────────┐     ┌──────────────┐
│  @anisync/   │     │   render-    │
│   desktop    │────►│   server-    │
│ (React+E-)   │     │   adapter    │
│              │     │  (adapter.js)│
└──────┬───────┘     └──────────────┘
       │
       ▼
┌──────────────┐
│   mobile     │ (Android WebView — render-server'ın web UI'ını yükler)
│   (APK)      │
└──────────────┘
```

## Aktif Mimari

Şu an **render-server** aktif kullanımdadır. `packages/server` tam özellikli backend olarak yazılmış ama PostgreSQL/Redis gerektirdiğinden kullanılmıyor. `render-server` tamamen in-memory çalışır.

### İletişim Akışı

1. **Desktop (EXE)**: Electron uygulaması → Gömülü Express sunucu → React UI render eder → Socket.IO ile `render-server`'a bağlanır
2. **Web (Browser)**: `https://anisync-server.onrender.com` → React UI yüklenir → Aynı sunucuya Socket.IO bağlantısı
3. **Mobile (APK)**: Android WebView → Render.com URL'sini yükler → `AniSyncBridge` ile native köprü
4. **Anime Sayfası**: `adapter.js` enjekte edilir → Video element'ini bulur → Socket.IO ile sync yapar

## Veri Akışı

```
Kullanıcı Login → connectSocket(username) → Socket.IO bağlantı
  → room:create/room:join → Oda'ya katılım
    → sync:url-changed → Anime URL paylaşım (BrowserView / WebView açılır)
      → sync:play/pause/seek → Video senkronizasyonu
      → chat:message → Sohbet mesajları
```

---
[[Home]] | [[Teknoloji Stack]] | [[Dosya Yapısı]]
