# 🎬 AniSync Wiki

> Anime birlikte izleme platformu — Gerçek zamanlı senkronizasyon ile arkadaşlarınla anime izle.

## Hızlı Linkler

| Sayfa | Açıklama |
|-------|----------|
| [[Mimari Genel Bakış]] | Sistem mimarisi, veri akışı, karar gerekçeleri |
| [[Dosya Yapısı]] | Tüm dosyaların konumu ve görevi |
| [[Teknoloji Stack]] | Kullanılan teknolojiler ve versiyonlar |
| [[Sunucu (Render Server)]] | Express + Socket.IO sunucu detayları |
| [[Socket Olayları]] | Tüm WebSocket event'leri ve payload'ları |
| [[State Management]] | Zustand store'ları ve veri modelleri |
| [[Mobil (APK)]] | Android WebView uygulaması |
| [[Masaüstü (EXE)]] | Electron uygulaması |
| [[Senkronizasyon]] | Video sync mantığı ve drift correction |
| [[UI Bileşenleri]] | React component'leri ve tasarım |
| [[Build ve Deploy]] | Derleme, paketleme ve yayınlama |
| [[Bilinen Sorunlar ve Çözümler]] | Geçmişte karşılaşılan buglar |

## Proje Özeti

- **Platform**: Web + Desktop (Electron/EXE) + Mobil (Android/APK)
- **Sunucu**: Render.com üzerinde Node.js (free tier)
- **Canlı URL**: https://anisync-server.onrender.com/app
- **GitHub Repo (Server)**: https://github.com/LunaticZen/anisync-server.git
- **Proje Dizini**: `C:\Users\emin\.gemini\antigravity\scratch\anisync\`

## Nasıl Çalışır?

```
┌──────────┐     WebSocket      ┌──────────────┐     WebSocket      ┌──────────┐
│  EXE     │◄──────────────────►│  Render.com  │◄──────────────────►│   APK    │
│ Electron │   Socket.IO        │  server.js   │   Socket.IO        │ WebView  │
│ +Browser │                    │ Express+CORS │                    │ +Bridge  │
│  View    │                    └──────────────┘                    └──────────┘
└──────────┘                          ▲
                                      │ HTTPS
                                      │
                                ┌─────┴──────┐
                                │  Web Tarayıcı │
                                │  /app route   │
                                └──────────────┘
```

## Son Durum (28 Mayıs 2026)

- ✅ APK + EXE + Web tamamen çalışıyor
- ✅ Gerçek zamanlı video senkronizasyonu
- ✅ Chat sistemi (avatar, typing indicator)
- ✅ Oda oluşturma/katılma (kod ile)
- ✅ Mobil UI referans tasarıma uygun
- ✅ Disconnect grace period (30s)
- ✅ Auto-rejoin on reconnect
- ⚠️ Xiaomi siyah ekran fix'i APK rebuild gerektirir
