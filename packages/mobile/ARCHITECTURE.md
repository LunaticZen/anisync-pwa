# ═══════════════════════════════════════════════════════════════
# AniSync Mobile — React Native Android App Architecture
# Faz 2'de tam implementasyon yapılacak
# ═══════════════════════════════════════════════════════════════

## Klasör Yapısı

```
packages/mobile/
├── package.json
├── tsconfig.json
├── app.json
├── index.js
├── android/                    # Android native project
│   ├── app/
│   │   ├── build.gradle
│   │   └── src/main/
│   │       ├── AndroidManifest.xml
│   │       └── java/.../MainActivity.java
│   └── gradle/
├── src/
│   ├── App.tsx                 # Root component
│   ├── navigation/
│   │   └── AppNavigator.tsx    # React Navigation stack
│   ├── screens/
│   │   ├── LoginScreen.tsx
│   │   ├── LobbyScreen.tsx
│   │   ├── RoomScreen.tsx
│   │   └── ProfileScreen.tsx
│   ├── components/
│   │   ├── ChatPanel.tsx
│   │   ├── MemberList.tsx
│   │   ├── SyncOverlay.tsx
│   │   ├── PlayerView.tsx      # WebView with injection
│   │   └── RoomCard.tsx
│   ├── services/
│   │   ├── socket.ts           # Socket.IO client (same protocol)
│   │   ├── api.ts              # REST API calls
│   │   ├── sync.ts             # SyncEngine from @anisync/shared
│   │   └── storage.ts          # AsyncStorage wrapper
│   ├── stores/                 # Zustand (same architecture as desktop)
│   │   └── index.ts
│   └── utils/
│       └── playerInjection.ts  # WebView JavaScript injection
└── assets/
```

## Paylaşılan Modüller

Mobile app aşağıdaki modülleri desktop ile paylaşır:
- `@anisync/shared` → Types, Protocol, SyncEngine, ClockSync
- Aynı WebSocket event contract
- Aynı Zustand store yapısı
- Aynı sync algoritması

## Player Kontrolü (Android)

Android'de React Native WebView kullanılır:
1. WebView anime sitesini yükler
2. `injectedJavaScript` ile player detection script enjekte edilir
3. `onMessage` ile WebView ↔ React Native arası iletişim
4. Aynı IPlayerController interface'i kullanılır

```typescript
// PlayerView.tsx (React Native)
<WebView
  source={{ uri: animeUrl }}
  injectedJavaScript={PLAYER_DETECTION_SCRIPT}
  onMessage={(event) => {
    const data = JSON.parse(event.nativeEvent.data);
    handlePlayerMessage(data);
  }}
  javaScriptEnabled={true}
  domStorageEnabled={true}
  allowsInlineMediaPlayback={true}
  mediaPlaybackRequiresUserAction={false}
/>
```

## Build & APK

```bash
cd packages/mobile
npx react-native run-android        # Debug
cd android && ./gradlew assembleRelease  # APK
```
