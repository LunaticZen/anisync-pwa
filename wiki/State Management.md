# State Management

> Zustand store'ları — `packages/desktop/src/stores/index.ts`

## Store'lar

### AuthStore
```typescript
interface AuthState {
  username: string;           // localStorage'dan okunur
  user: UserInfo | null;      // { username, displayName }
  avatar: string;             // Base64 encoded, localStorage
  isConnected: boolean;       // Socket.IO bağlantı durumu
  
  setUser(username, displayName?): void;
  setDisplayName(displayName): void;
  setAvatar(avatar): void;
  setConnected(connected): void;
  logout(): void;
}
```
- LocalStorage key'leri: `anisync_username`, `anisync_displayname`, `anisync_avatar`

### RoomStore
```typescript
interface RoomState {
  currentRoom: RoomDetails | null;  // Aktif oda
  members: RoomMember[];            // currentRoom.members mirror
  
  setRoom(room): void;         // Oda bilgisini set et
  leaveRoom(): void;           // Odayı temizle
  addMember(member): void;     // Yeni üye ekle
  removeMember(userId): void;  // Üye çıkar
  updateSettings(settings): void;
}
```

### SyncStore
```typescript
interface SyncState {
  currentUrl: string | null;   // Aktif anime URL'si
  syncState: SyncStateData | null;
  
  setCurrentUrl(url): void;
  setSyncState(state): void;
}
```

### ChatStore
```typescript
interface ChatState {
  messages: ChatMessage[];          // Mesaj listesi
  typingUsers: TypingIndicator[];   // Yazıyor... göstergesi
  
  addMessage(msg): void;
  removeMessage(id): void;
  setTyping(data): void;
  clear(): void;
}
```

### UIStore
```typescript
type AppView = 'home' | 'login' | 'register' | 'lobby' | 'room' | 'profile' | 'friends' | 'discover';

interface UIState {
  currentView: AppView;
  sidebarOpen: boolean;
  toasts: Toast[];
  theme: 'dark' | 'light';
  
  setView(view): void;
  toggleSidebar(): void;
  addToast(toast): void;
  removeToast(id): void;
}
```

## Sayfa Akışı

```
home → login/register → lobby → room
 ↑                        ↑       ↓
 └────────────────────────┘  (leave)
```

1. **home** → HomePage: Sunucu bağlantısı, kullanıcı adı girişi
2. **login** → LoginPage (şu an kullanılmıyor, home üzerinden giriş)
3. **lobby** → LobbyPage: Oda oluştur/katıl, keşfet
4. **room** → RoomPage: Video izleme + sohbet

## Veri Akışı

```
Socket Event → socket.ts handler → Store update → React re-render
    ↓
  Server ← socket.emit() ← User Action ← React Component
```

## İlgili Sayfalar

- [[UI Bileşenleri]] — Component'ler
- [[Socket Olayları]] — Event handler'ları
