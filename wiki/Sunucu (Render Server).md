# Sunucu (Render Server)

> `packages/render-server/server.js` — Express + Socket.IO sunucusu, Render.com'da deploy edilir.

## Genel Bilgi

| Özellik | Değer |
|---------|-------|
| Framework | Express.js + Socket.IO |
| Hosting | Render.com (free tier) |
| Veritabanı | Yok — tamamen in-memory |
| URL | https://anisync-server.onrender.com |
| GitHub | https://github.com/LunaticZen/anisync-server.git |
| Port | `process.env.PORT` veya `3000` |

## Önemli Dosyalar

```
packages/render-server/
├── server.js          ← Ana sunucu kodu (tek dosya)
├── package.json       ← Bağımlılıklar
└── public/            ← Vite build çıktısı (statik dosyalar)
    ├── index.html
    └── assets/
        ├── index-*.css
        └── index-*.js
```

## In-Memory State

```javascript
const rooms = new Map();        // roomId → Room object
const codeToId = new Map();     // roomCode → roomId
const disconnectTimers = new Map(); // `${roomId}:${userId}` → grace timer
```

### Room Object Yapısı
```javascript
{
  id: string,          // Rastgele benzersiz ID
  code: string,        // 6 karakterli oda kodu (ABCDEF23456789)
  name: string,        // Oda adı (max 50 karakter)
  hostId: string,      // Host kullanıcı adı
  members: Map,        // userId → { username, avatar, role, joinedAt, disconnected? }
  syncState: {
    isPlaying: boolean,
    currentTime: number,
    playbackSpeed: number,
    generation: number,     // Her sync olayında artar
    lastEventAt: number     // Son event timestamp
  },
  currentUrl: string|null,  // Aktif anime URL'si
  createdAt: string
}
```

## Grace Period Sistemi

Socket disconnect olduğunda kullanıcı hemen odadan silinmez:

```
Disconnect → 30 saniye grace period başlar
  ├── 30s içinde reconnect → Timer iptal, kullanıcı geri aktif
  └── 30s geçerse → Kullanıcı odadan silinir, diğerlerine bildirilir
```

- `DISCONNECT_GRACE_MS = 30000` (30 saniye)
- Grace sırasında kullanıcı `member.disconnected = true` olarak işaretlenir
- Diğer kullanıcılara `presence:room-update` ile `isConnected: false` gönderilir
- Reconnect olursa `room:member-reconnected` yayınlanır

## Statik Dosya Servisi

```javascript
app.use(express.static(path.join(__dirname, 'public')));
app.get('/app', (req, res) => res.sendFile('public/index.html'));
app.get('/app/*', (req, res) => res.sendFile('public/index.html'));
```

- `/app` rotası web arayüzünü sunar
- Vite build çıktısı `public/` klasörüne kopyalanır
- APK bu URL'yi WebView'da açar

## Keep-Alive

Render.com free tier 15 dakika inaktiviteden sonra uyuyor:

```javascript
setInterval(() => {
  fetch(RENDER_URL + '/api/health');
}, 5 * 60 * 1000); // Her 5 dakikada bir self-ping
```

## Deploy Akışı

```bash
# 1. Desktop'u build et
cd packages/desktop
node ../../node_modules/vite/bin/vite.js build

# 2. Build çıktısını render-server'a kopyala
Copy-Item -Path "dist/*" -Destination "../render-server/public/" -Recurse -Force

# 3. Render-server'ı push et
cd ../render-server
git add -A
git commit -m "deploy: update"
git push origin master
# Render.com otomatik deploy eder (1-2 dk)
```

## İlgili Sayfalar

- [[Socket Olayları]] — Tüm event detayları
- [[Senkronizasyon]] — Video sync mantığı
- [[Build ve Deploy]] — Tam build süreci
