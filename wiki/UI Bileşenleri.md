# UI Bileşenleri

> React component'leri — `packages/desktop/src/components/`

## Component Haritası

```
App.tsx
├── TitleBar.tsx          (Electron başlık çubuğu)
├── Toasts.tsx            (Bildirim toast'ları)
└── [currentView] →
    ├── HomePage.tsx       (Sunucu bağlantı + kullanıcı adı)
    ├── LoginPage.tsx      (Login formu — şu an unused)
    ├── RegisterPage.tsx   (Register formu — şu an unused)
    ├── LobbyPage.tsx      (Oda oluştur/katıl/keşfet)
    └── RoomPage.tsx       (Ana izleme sayfası)
        ├── ChatPanel       (Sohbet paneli)
        ├── MemberPopup     (Üyeler popup — mobil)
        ├── MemberList      (Üyeler listesi — desktop sidebar)
        ├── WebAnimeCard    (Web tarayıcı anime kartı)
        ├── LeaveConfirmModal (Çıkış onayı)
        └── RoomProfileModal (Avatar değiştirme)
```

## RoomPage.tsx — En Kritik Component

### Platform Algılama
```typescript
const isElectron = !!(window as any).anisync;           // PC
const isMobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) && !isElectron;
const isPortrait = window.innerHeight > window.innerWidth; // Dikey mi?
const mobileAnimeActive = isMobile && !!currentUrl;     // Mobil + anime açık
```

### İki Farklı Render Yolu

**`mobileAnimeActive = true`** → Tam ekran chat arayüzü:
- Compact header (back, avatar, room name, CANLI badge, members icon)
- ChatPanel (avatar'lı mesajlar, timestamp)
- Input + "Gönder" butonu

**`mobileAnimeActive = false`** → Standart desktop/pre-anime layout:
- app__main: sync-bar + player area
- resize-handle
- app__sidebar: MemberList + ChatPanel

### ChatPanel — Referans Tasarım

Her mesaj:
```
┌─────────────────────────────────────┐
│ [🟣avatar] Username         20:14  │
│            Mesaj metni buraya       │
└─────────────────────────────────────┘
```

- Avatar: 34px circle, gradient renk (username hash'ine göre)
- Username: Bold, rengi username'e göre
- Timestamp: Sağa dayalı, soluk renk
- Kendi mesajların: Username mavi (#5b7cff)

### Gönder Butonu
```
Boşken:  [          Gönder ▸ ]  (soluk, deaktif)
Doluyken: [          Gönder ▸ ]  (mavi #3b82f6, aktif)
```

### Avatar Renk Sistemi
```typescript
const AVATAR_COLORS = [
  'linear-gradient(135deg, #667eea, #764ba2)',
  'linear-gradient(135deg, #f093fb, #f5576c)',
  'linear-gradient(135deg, #4facfe, #00f2fe)',
  'linear-gradient(135deg, #43e97b, #38f9d7)',
  // ... 8 gradient
];
function avatarColor(name) → hash → AVATAR_COLORS[index]
```

## Sidebar Resize

Desktop ve mobil pre-anime'de chat/sidebar boyutu ayarlanabilir:

```typescript
// Portrait: Dikey sürükleme (yükseklik)
// Landscape: Yatay sürükleme (genişlik)
resizingRef.current = true;
onMove → setSidebarWidth(newValue);
```

- Touch desteği var (`touchmove`, `touchend`)
- Electron'da `syncBoundsToElectron()` çağrılır (BrowserView boyutu güncellenir)

## CSS — `styles/index.css`

Ana CSS dosyası (~25KB). Önemli sınıflar:
- `.app__main` — Sol/üst panel (video)
- `.app__sidebar` — Sağ/alt panel (chat)
- `.sync-bar` — Üst bilgi çubuğu
- `.chat` — Chat container
- `.chat__messages` — Mesaj listesi
- `.chat__input-area` — Input alanı
- `.member` — Üye kartı
- `.modal-overlay` / `.modal` — Modal dialog
- `.btn`, `.btn--primary/secondary/ghost` — Butonlar
- `.form-input` — Input alanları
- `.badge` — Rozetler

### CSS Değişkenleri (Dark Theme)
```css
--bg-primary: #0a0a1a;
--bg-secondary: #0f0f23;
--bg-tertiary: #141432;
--bg-card: #12122b;
--text-primary: #e2e8f0;
--text-secondary: #94a3b8;
--text-muted: #475569;
--accent-primary: #5b7cff;
--accent-secondary: #22d3ee;
--accent-gradient: linear-gradient(135deg, #5b7cff, #a855f7);
--border: rgba(255, 255, 255, 0.06);
--font-family: 'Inter', system-ui, sans-serif;
--font-mono: 'JetBrains Mono', monospace;
```

## İlgili Sayfalar

- [[State Management]] — Store'lar
- [[Mobil (APK)]] — Mobil layout
- [[Masaüstü (EXE)]] — Desktop layout
