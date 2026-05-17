# 🎬 AniSync — Anime Watch Party Platform

<div align="center">

**Rave benzeri, anime sitelerine özel optimize edilmiş profesyonel watch-party platformu**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue?logo=typescript)](https://typescriptlang.org)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green?logo=node.js)](https://nodejs.org)
[![Electron](https://img.shields.io/badge/Electron-30-blueviolet?logo=electron)](https://electronjs.org)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.7-black?logo=socket.io)](https://socket.io)

</div>

---

## ✨ Özellikler

### 🎯 Senkronizasyon
- **NTP-bazlı saat senkronizasyonu** — Ultra düşük gecikme
- **Deterministik sync engine** — Generation counter, echo prevention, anti-loop
- **Otomatik drift correction** — >500ms sapma tespit ve düzeltme
- **Late-join instant sync** — Odaya sonradan katılanlar anında senkron olur
- **Buffering coordination** — Tamponlama sırasında odanın duraklaması

### 🏠 Oda Sistemi
- Public / Private odalar
- Şifreli odalar (bcrypt)
- Davet linkleri (imzalı JWT)
- Oda kodu ile katılma (ABCDEF formatı)
- Public oda keşfetme & trending
- Host authority + democratic mod
- Otomatik host transferi

### 💬 Sohbet
- Gerçek zamanlı text chat
- Emoji reactions
- Typing indicator
- Spam koruması & rate limiting
- DOMPurify XSS sanitization
- Mesaj silme (moderasyon)

### 🎮 Player Kontrolü
- **JWPlayer** otomatik algılama
- **HTML5 video** desteği
- **iframe player** desteği (postMessage bridge)
- **MutationObserver** ile dinamik player algılama
- Retry scanning (exponential backoff)
- Ortak player API: `play()`, `pause()`, `seek()`, `getTime()`, `getDuration()`, `setSpeed()`

### 🔒 Güvenlik
- JWT authentication (access + refresh tokens)
- bcrypt password hashing (cost=12)
- Token bucket rate limiting (API + Chat + Auth)
- Input sanitization (XSS, null bytes, control chars)
- Secure IPC (Electron contextBridge)
- Helmet security headers
- CORS strict configuration

---

## 🚀 Hızlı Başlangıç

### Gereksinimler
- Node.js 20+
- Docker Desktop (PostgreSQL + Redis için)
- Windows 10/11

### Kurulum

```bash
# 1. Bağımlılıkları yükle
npm install

# 2. Prisma client oluştur
npx prisma generate --schema=packages/server/prisma/schema.prisma

# 3. Docker servisleri başlat
docker-compose up -d

# 4. Veritabanı migrate
cd packages/server
npx prisma migrate dev --name init
cd ../..

# 5. Sunucuyu başlat
npm run dev:server

# 6. Desktop uygulamasını başlat (yeni terminal)
npm run dev:desktop
```

### Tek Komut ile (PowerShell)
```powershell
.\start.ps1 all
```

---

## 📁 Proje Yapısı

```
anisync/
├── packages/shared/     # Paylaşılan tipler, protokol, sync engine
├── packages/server/     # Node.js backend (Express + Socket.IO)
├── packages/desktop/    # Electron + React masaüstü uygulaması
├── packages/mobile/     # React Native Android (Faz 2)
└── docker-compose.yml   # PostgreSQL + Redis
```

---

## 🏗️ Mimari

```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│   Desktop   │  │   Android   │  │   Web (v2)  │
│  (Electron) │  │(React Native│  │             │
│  + Player   │  │  + WebView) │  │             │
│  Injection  │  │             │  │             │
└──────┬──────┘  └──────┬──────┘  └──────┬──────┘
       └────────────────┼────────────────┘
              Socket.IO + REST API
                        │
       ┌────────────────┼────────────────┐
       │            SERVER               │
       │  Auth │ Room │ Sync │ Chat     │
       │  Presence │ Rate Limit         │
       │     PostgreSQL + Redis          │
       └─────────────────────────────────┘
```

---

## 🔧 Desteklenen Anime Siteleri

| Site | Durum | Player Tipi |
|------|-------|-------------|
| TurkAnime | ✅ | JWPlayer / HTML5 |
| TranimeIzle | ✅ | HTML5 / iframe |
| Genel | ✅ | Tüm HTML5 video |

---

## 📄 Lisans

Ticari kullanım — Tüm hakları saklıdır.
