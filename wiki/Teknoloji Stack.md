# Teknoloji Stack

## Frontend (packages/desktop)

| Teknoloji | Versiyon | Kullanım |
|-----------|----------|----------|
| React | 18.3 | UI framework |
| TypeScript | 5.4 | Tip güvenliği |
| Vite | 5.2 | Bundler / dev server |
| Zustand | 4.5 | State management (5 store) |
| Socket.IO Client | 4.7.5 | WebSocket iletişimi |
| Framer Motion | 11.1 | Animasyonlar |
| Lucide React | 0.378 | İkon seti |

## Electron (Desktop wrapper)

| Teknoloji | Versiyon | Kullanım |
|-----------|----------|----------|
| Electron | 30.5.1 | Desktop shell |
| Electron Builder | 24.13 | Paketleme (.exe) |
| BrowserView | - | Anime sayfası görüntüleme |

## Backend (packages/render-server — AKTİF)

| Teknoloji | Versiyon | Kullanım |
|-----------|----------|----------|
| Express | 4.x | HTTP sunucu |
| Socket.IO Server | 4.x | WebSocket sunucu |
| In-Memory Maps | - | Oda/kullanıcı state'i |

## Backend (packages/server — PASIF, tam sürüm)

| Teknoloji | Versiyon | Kullanım |
|-----------|----------|----------|
| Express | 4.19 | HTTP sunucu |
| Socket.IO | 4.7.5 | WebSocket sunucu |
| PostgreSQL | - | Veritabanı |
| Redis | - | Cache & pub/sub |
| Prisma | - | ORM |
| Helmet | - | Güvenlik |
| Morgan | - | Logging |

## Mobile (packages/mobile)

| Teknoloji | Versiyon | Kullanım |
|-----------|----------|----------|
| Android SDK | 34 | Target API |
| Gradle | 8.5 | Build tool |
| WebView | - | UI rendering |
| AppCompat | 1.6.1 | Uyumluluk |

## Build Araçları

| Araç | Kullanım |
|------|----------|
| PowerShell | Build scriptleri (full-build.ps1) |
| npm workspaces | Monorepo yönetimi |
| Git | Versiyon kontrolü / Render deploy |

## Deploy

| Platform | Kullanım |
|----------|----------|
| Render.com | Sunucu hosting (free tier) |
| GitHub | render-server kaynak kodu |
| Masaüstü kopyalama | EXE ve APK dağıtımı |

---
[[Home]] | [[Mimari Genel Bakış]] | [[Dosya Yapısı]]
