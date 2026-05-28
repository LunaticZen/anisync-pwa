# Senkronizasyon

> Video senkronizasyon mantığı — PC, mobil ve sunucu arasında nasıl çalışır.

## Genel Bakış

AniSync'te video senkronizasyonu 3 farklı platformda farklı mekanizmalarla çalışır:

| Platform | Video Kontrolü | Sync Yöntemi |
|----------|---------------|--------------|
| PC (Electron) | BrowserView + injected JS | `anisync.player` API |
| Mobil (APK) | Android animeWebView | `AniSyncBridge.controlAnime()` |
| Web (Tarayıcı) | Yeni sekmede açılır | Manuel |

## PC (Electron) Sync Akışı

### Event Gönderme (PC → Sunucu)
```
BrowserView'daki video → Injected JS event'leri yakalar
  → anisync.player.getEvent() ile poll edilir (500ms)
  → play/pause/seek event'i algılanır
  → socket.emit('sync:play/pause/seek', { roomId, time, generation })
```

### Event Alma (Sunucu → PC)
```
socket.on('sync:play') → anisync.player.seek(time) + play()
socket.on('sync:pause') → anisync.player.seek(time) + pause()
socket.on('sync:seek') → anisync.player.seek(time)
```

### Timecheck (Drift Correction — PC)
```
Her 5 saniyede bir:
  → anisync.player.getState() → { time, state }
  → socket.emit('sync:timecheck', { time, playing })

Gelen timecheck'te:
  → drift = |myTime - hostTime|
  → drift > 1.5s ise: seek + play/pause düzelt
  → ignoreUntil = Date.now() + 1500 (feedback loop önleme)
```

## Mobil (APK) Sync Akışı

### Event Alma (Sunucu → APK)
```javascript
// AniSyncBridge = Android Java tarafından sağlanan interface
bridge.controlAnime('play', time)   // play + seek
bridge.controlAnime('pause', time)  // pause + seek  
bridge.controlAnime('seek', time)   // sadece seek
```

### Timecheck (Drift Correction — Mobil)
```
Gelen timecheck'te:
  1. Debounce: Son correction'dan 8 saniye geçmedi mi? → Atla
  2. expectedHostTime = lastHostTime + (timeSinceLast / 1000)
  3. hostDrift = |reportedTime - expectedHostTime|
  4. hostDrift > 3s ise: bridge.controlAnime('seek', time)
  5. playing ise: bridge.controlAnime('play', time)
```

### Neden 3s Threshold?
- Mobil WebView video zamanlaması ~1-2s doğal varyans içerir
- Her timecheck'te seek yapılırsa "mikro-takılma" (stutter) oluşur
- 3s threshold: Sadece ciddi saplama varsa düzelt
- 8s debounce: Ardışık düzeltmeleri önle

## Sunucu Tarafı

Sunucu **state tutar ama zorlamaz**:

```javascript
socket.on('sync:play', (data) => {
  room.syncState.isPlaying = true;
  room.syncState.currentTime = data.time;
  room.syncState.generation++;
  io.to(roomId).emit('sync:play', { ... });
});
```

- `generation`: Her event'te artar, stale event'leri filtrelemek için
- `lastEventAt`: Son event zamanı
- Sunucu timecheck'i broadcast eder ama kendisi seek YAPMAZ

## ignoreUntil Mekanizması (PC)

Feedback loop önleme:
```
PC play butonuna bastı → event algılandı → sunucuya gönderildi
Sunucu broadcast etti → aynı PC'ye de geldi → TEKRAR play yapmamalı!

Çözüm: ignoreUntil = Date.now() + 1500
  → 1.5 saniye boyunca gelen sync event'leri yoksay
  → originUserId kontrolü de yapılır (kendi event'lerini filtrele)
```

## URL Senkronizasyonu

```
Host anime URL'sini değiştirdi
  → socket.emit('sync:url-changed', { roomId, url })
  → Sunucu room.currentUrl'ı günceller
  → Tüm odaya broadcast
  
PC: BrowserView navigate eder
APK: AniSyncBridge.openAnime(url) veya window.location.href = url
Web: useSyncStore.setCurrentUrl(url)
```

## Bilinen Sınırlamalar

1. **Mobil → PC event gönderemiyor**: APK video kontrolünü kullanıcıya bırakır, host her zaman PC
2. **Web tarayıcı**: Video yeni sekmede açılır, senkron yok
3. **Farklı video kaynakları**: Aynı siteyi kullanmak gerekir (URL sync)

## İlgili Sayfalar

- [[Socket Olayları]] — Event payload detayları
- [[Mobil (APK)]] — Android bridge implementasyonu
- [[Masaüstü (EXE)]] — Electron player API
