# Build ve Deploy

> Derleme, paketleme ve yayınlama süreçleri.

## Gereksinimler

| Araç | Versiyon | Amaç |
|------|----------|------|
| Node.js | v24+ | Runtime |
| npm | v10+ | Paket yönetimi |
| JDK | 17+ | Android build |
| Android SDK | API 33+ | APK derleme |
| Gradle | 8.5 | Android build sistemi |

## Monorepo Yapısı

```
anisync/                    (root)
├── package.json             ← workspace tanımları
├── tsconfig.base.json       ← paylaşılan TS config
├── node_modules/            ← tüm bağımlılıklar (hoisted)
├── packages/
│   ├── shared/              ← Ortak tip tanımları
│   ├── desktop/             ← React + Electron uygulaması
│   ├── mobile/              ← Android APK
│   ├── render-server/       ← Üretim sunucusu (ayrı git repo)
│   ├── render-server-adapter/ ← Adapter script
│   └── server/              ← (eski, kullanılmıyor)
```

## Web UI Build (Vite)

```powershell
cd packages/desktop

# Vite production build
node ../../node_modules/vite/bin/vite.js build
# Çıktı: dist/
#   index.html
#   assets/index-XXXXX.css
#   assets/index-XXXXX.js
```

> **Not**: Windows'ta `npx vite build` çalışmaz (bash script sorunu). Doğrudan `node .../vite.js build` kullanın.

## Render.com'a Deploy

```powershell
# 1. Web UI'ı build et
cd packages/desktop
node ../../node_modules/vite/bin/vite.js build

# 2. Build çıktısını render-server'a kopyala
Copy-Item -Path "dist/*" -Destination "../render-server/public/" -Recurse -Force

# 3. Render-server repo'suna push et
cd ../render-server
git add -A
git commit -m "deploy: [açıklama]"
git push origin master
```

- Render.com `master` branch'e push gelince otomatik deploy eder
- Deploy süresi: ~1-2 dakika
- İlk cold start: ~30 saniye (free tier)

## EXE Build (Electron)

```powershell
cd packages/desktop

# 1. Renderer build
node ../../node_modules/vite/bin/vite.js build

# 2. Electron TypeScript compile
node ../../node_modules/typescript/bin/tsc -p electron/tsconfig.json

# 3. Electron Builder ile paketle
npx electron-builder --win
# Çıktı: release/win-unpacked/AniSync.exe
```

Veya tek komut:
```powershell
# Root'tan
.\build-exe.ps1
```

## APK Build (Android)

```powershell
cd packages/mobile

# Debug APK
.\gradlew.bat assembleDebug

# Çıktı: app/build/outputs/apk/debug/app-debug.apk
```

Veya:
```powershell
# Root'tan
.\build-apk.ps1
```

### Android SDK Kurulumu
```powershell
.\install-android-sdk.ps1
```

## TypeScript Kontrol

```powershell
cd packages/desktop

# Type check (build yapmadan)
node ../../node_modules/typescript/bin/tsc --noEmit --pretty

# tsconfig.json override'ları:
# declaration: false
# declarationMap: false  (base config ile çakışma fix'i)
```

## Git Yapısı

⚠️ **İki ayrı git repo var:**

1. **Ana repo** (`anisync/`): Tüm kaynak kod
   - Remote: yok (sadece lokal)
   
2. **Render-server repo** (`packages/render-server/`): Deploy repo
   - Remote: `https://github.com/LunaticZen/anisync-server.git`
   - Render.com bu repo'dan deploy eder

## Hızlı Komutlar

```powershell
# Tam deploy (build + copy + push)
cd packages/desktop
node ../../node_modules/vite/bin/vite.js build
Copy-Item -Path "dist/*" -Destination "../render-server/public/" -Recurse -Force
cd ../render-server
git add -A && git commit -m "deploy" && git push origin master

# Type check
cd packages/desktop
node ../../node_modules/typescript/bin/tsc --noEmit

# Dev server
cd packages/desktop
npm run dev:renderer
```

## İlgili Sayfalar

- [[Dosya Yapısı]] — Proje dosya ağacı
- [[Teknoloji Stack]] — Kullanılan teknolojiler
