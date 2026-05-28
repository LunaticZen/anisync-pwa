# Masaüstü (EXE)

> Electron uygulaması — `packages/desktop/`

## Mimari

```
┌─────────────────────────────────────────────────┐
│                 Electron Main Process            │
│                  (electron/main.ts)              │
│                                                  │
│  ┌────────────────────┐  ┌────────────────────┐  │
│  │   BrowserWindow    │  │   BrowserView      │  │
│  │   (mainWindow)     │  │   (animeView)      │  │
│  │                    │  │                    │  │
│  │   React App        │  │   Anime Sitesi     │  │
│  │   (Vite dev/dist)  │  │   (animecix.tv)    │  │
│  │                    │  │                    │  │
│  │   - HomePage       │  │   Video player     │  │
│  │   - LobbyPage      │  │   injected JS      │  │
│  │   - RoomPage       │  │   event detection   │  │
│  └────────────────────┘  └────────────────────┘  │
│                                                  │
│  ┌────────────────────┐                          │
│  │  Embedded Server   │  (Opsiyonel, LAN modu)   │
│  │  (express+socket)  │                          │
│  └────────────────────┘                          │
└─────────────────────────────────────────────────┘
```

## Electron Dosyaları

```
packages/desktop/electron/
├── main.ts           ← Ana process (window, BrowserView, IPC)
├── main.js           ← Compiled output
├── preload.ts        ← Preload script (window.anisync API)
├── preload.js        ← Compiled output
├── embedded-server.ts ← Gömülü sunucu (LAN modu, opsiyonel)
└── embedded-server.js
```

## Preload API (`window.anisync`)

Preload script, renderer process'e güvenli API sağlar:

### `window.anisync.anime`
```typescript
{
  navigate(url: string): void;        // BrowserView'da URL aç
  close(): void;                       // BrowserView'ı kapat
  goBack(): void;                      // Geri git
  goForward(): void;                   // İleri git
  reload(): void;                      // Yenile
  show(): void;                        // BrowserView'ı göster
  hide(): void;                        // BrowserView'ı gizle
  setBounds({ x, y, w, h }): void;    // BrowserView boyutunu ayarla
  onNavigated(callback): cleanup;      // URL değişim listener
}
```

### `window.anisync.player`
```typescript
{
  play(): void;                         // Video oynat
  pause(): void;                        // Video duraklat
  seek(time: number): void;             // Belirli zamana git
  getState(): Promise<{                 // Mevcut durumu al
    time: number;
    state: 'playing' | 'paused';
  }>;
  getEvent(): Promise<{                 // Son event'i al
    type: 'play' | 'pause' | 'seek';
    time: number;
    ts: number;
  } | null>;
}
```

### `window.anisync.window`
```typescript
{
  minimize(): void;
  maximize(): void;
  close(): void;
  isMaximized(): Promise<boolean>;
  onMaximizeChange(callback): cleanup;
}
```

## BrowserView (Anime Görüntüleyici)

- Ayrı bir render process'te çalışır (iframe değil!)
- CORS kısıtlamalarını bypass eder
- Injected JS ile video event'leri yakalar:

```javascript
// main.ts'de BrowserView oluşturduktan sonra inject edilen JS:
const injectedJS = `
  (function() {
    let lastEvent = null;
    const observer = new MutationObserver(() => {
      const video = document.querySelector('video');
      if (!video || video.__anisync) return;
      video.__anisync = true;
      video.addEventListener('play', () => lastEvent = { type: 'play', time: video.currentTime, ts: Date.now() });
      video.addEventListener('pause', () => lastEvent = { type: 'pause', time: video.currentTime, ts: Date.now() });
      video.addEventListener('seeked', () => lastEvent = { type: 'seek', time: video.currentTime, ts: Date.now() });
    });
    observer.observe(document, { childList: true, subtree: true });
    window.__anisyncGetEvent = () => { const e = lastEvent; lastEvent = null; return e; };
    window.__anisyncGetState = () => {
      const v = document.querySelector('video');
      return v ? { time: v.currentTime, state: v.paused ? 'paused' : 'playing' } : null;
    };
  })();
`;
```

## EXE Build

```powershell
cd packages/desktop

# 1. Renderer (React) build
node ../../node_modules/vite/bin/vite.js build

# 2. Electron TypeScript compile
node ../../node_modules/typescript/bin/tsc -p electron/tsconfig.json

# 3. Electron Builder ile paketle
npx electron-builder --win
# Çıktı: release/ klasöründe
```

Veya root'taki script:
```powershell
.\build-exe.ps1
```

## Dev Mode

```powershell
cd packages/desktop
npm run dev
# Concurrently: Vite + TSC watch + Electron
```

## İlgili Sayfalar

- [[Senkronizasyon]] — PC sync detayları
- [[UI Bileşenleri]] — React component'ler
- [[Build ve Deploy]] — EXE derleme
