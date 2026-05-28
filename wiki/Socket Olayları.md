# Socket Olayları

> Tüm Socket.IO event'leri, yönleri ve payload yapıları.

## Bağlantı

### Auth (Handshake)
```javascript
// Client → Server (bağlantı sırasında)
io(serverUrl, {
  auth: { username: "kullanıcıAdı", avatar: "base64|null" },
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 20,
  timeout: 25000
});
```

### `time:ping`
```
Client → Server → Client (callback)
{ clientSendTime: number } → { clientSendTime, serverTime, serverSendTime }
```
NTP-style saat senkronizasyonu. 5 sample alınır, median offset hesaplanır.

---

## Oda Olayları

### `room:create`
```
Client → Server → Client (callback)
{ name: string } → { success: boolean, room: RoomDetails }
```

### `room:join`
```
Client → Server → Client (callback)
{ code: string } → { success, room, syncState, currentUrl }
```
- Kullanıcı zaten odadaysa (reconnect): member güncellenir, yeni join yayınlanmaz
- Grace period timer varsa iptal edilir

### `room:rejoin`
```
Client → Server → Client (callback)
{ roomId: string } → { success, room, syncState, currentUrl }
```
- Reconnect sonrası otomatik çağrılır (client `connect` event'inde)
- Kullanıcı hala member ise: `disconnected = false`, `room:member-reconnected` yayınlanır
- Kullanıcı silinmişse: yeni member olarak eklenir

### `room:leave`
```
Client → Server
{} (no payload, uses socket.roomId)
```
- Explicit leave — grace period YOK, hemen silinir

### `room:member-joined`
```
Server → Room (broadcast)
{ member: { userId, username, displayName, avatar, role, joinedAt, presence } }
```

### `room:member-left`
```
Server → Room (broadcast)
{ userId: string, reason: 'left'|'timeout' }
```

### `room:member-reconnected`
```
Server → Room (broadcast)
{ userId, username, avatar }
```
Grace period içinde dönen kullanıcı. Client bu event'te member presence'ı `isConnected: true` yapar.

### `room:member-kicked`
```
Server → Room (broadcast)
{ userId: string }
```

### `room:closed`
```
Server → Room (broadcast)
{ reason: string }
```

### `room:host-transferred`
```
Server → Room (broadcast)
{ newHostId: string }
```
Host disconnect olup grace period dolunca otomatik transfer olur.

---

## Senkronizasyon Olayları

### `sync:play`
```
Client → Server → Room (broadcast)
Send: { roomId, time: number, generation: number }
Receive: { time, generation, originUserId, serverTimestamp }
```

### `sync:pause`
```
Client → Server → Room (broadcast)
Send: { roomId, time, generation }
Receive: { time, generation, originUserId, serverTimestamp }
```

### `sync:seek`
```
Client → Server → Room (broadcast)
Send: { roomId, time, generation }
Receive: { time, generation, originUserId, serverTimestamp }
```

### `sync:timecheck`
```
Client → Server → Room (broadcast, except sender)
Send: { roomId, time, playing, userId }
Receive: { time, playing, userId, serverTimestamp }
```
- Her 5 saniyede bir gönderilir (PC tarafında)
- Drift correction için kullanılır
- PC: >1.5s drift → seek + play/pause düzeltme
- Mobil: >3s drift + 8s debounce → seek

### `sync:url-changed`
```
Client → Server → Room (broadcast)
Send: { roomId, url: string }
Receive: { url, originUserId, serverTimestamp }
```
Anime linki paylaşıldığında.

### `sync:state-update`
```
Server → Client
SyncState object (tam state)
```

### `sync:heartbeat`
```
Client → Server → Room
{ roomId, isBuffering, currentTime }
→ presence:room-update yayınlar
```

---

## Presence Olayları

### `presence:room-update`
```
Server → Room (broadcast)
{ userId, presence: { isConnected, isBuffering, currentTime, lastHeartbeat } }
```
- Disconnect olunca `isConnected: false` gönderilir
- Heartbeat'te `isConnected: true` gönderilir

---

## Chat Olayları

### `chat:message`
```
Client → Server → Room (broadcast)
Send: { roomId, text: string }
Receive: { id, roomId, userId, username, displayName, text, type, timestamp, createdAt, ... }
```
- `timestamp: Date.now()` sunucu tarafında eklenir
- Max 500 karakter

### `chat:typing`
```
Client → Server → Room (broadcast, except sender)
{ roomId, isTyping: boolean }
→ { userId, username, isTyping }
```

### `chat:system`
```
Server → Room (broadcast)
{ text: string }
```
"X katıldı", "X ayrıldı" gibi sistem mesajları.

### `chat:deleted`
```
Server → Room (broadcast)
{ messageId: string }
```

---

## Avatar Olayları

### `user:update-avatar`
```
Client → Server → Room (broadcast)
Send: { avatar: string|null }
Receive (as user:avatar-changed): { userId, avatar }
```

---

## Keşif

### `rooms:discover`
```
Client → Server → Client (callback)
{} → { rooms: RoomSummary[], total, page, hasMore }
```

## İlgili Sayfalar

- [[Sunucu (Render Server)]] — Server implementasyonu
- [[Senkronizasyon]] — Sync mantığı detayları
- [[State Management]] — Client store'ları
