# 🎬 AniSync Wiki

> Anime birlikte izleme platformu — Desktop (Electron), Mobile (Android APK), Web (Render.com)

## 📋 Proje Özeti

AniSync, kullanıcıların birlikte anime izlemesini sağlayan gerçek zamanlı bir senkronizasyon platformudur. Kullanıcılar oda oluşturur, paylaştıkları anime linklerini senkronize şekilde izler ve sohbet eder.

## 🗺️ Wiki Haritası

### Mimari & Yapı
- [[Mimari Genel Bakış]] — Monorepo yapısı, paketler arası ilişki
- [[Teknoloji Stack]] — Kullanılan tüm teknolojiler
- [[Dosya Yapısı]] — Tüm dosya ve klasörlerin listesi

### Paketler
- [[Desktop Paketi]] — Electron + React UI (packages/desktop)
- [[Server Paketi]] — Express + Socket.IO backend (packages/server)
- [[Render Server]] — Render.com deploy edilen basitleştirilmiş sunucu
- [[Mobile Paketi]] — Android WebView APK (packages/mobile)
- [[Shared Paketi]] — Ortak tipler ve sabitler
- [[Render Adapter]] — Anime sayfalarına enjekte edilen senkronizasyon scripti

### State & İletişim
- [[Zustand Store'ları]] — AuthStore, RoomStore, SyncStore, ChatStore, UIStore
- [[Socket Olayları]] — Tüm WebSocket event'leri ve payload'ları
- [[IPC Bridge]] — Electron ve Android WebView köprüsü

### Build & Deploy
- [[Build Sistemi]] — full-build.ps1, Vite, Electron Builder, Gradle
- [[Deploy Süreci]] — Render.com deploy, APK dağıtım

### Geliştirme Notları
- [[Bilinen Sorunlar]] — Açık buglar ve TODO'lar
- [[Changelog]] — Sürüm geçmişi (v1-v42)

## 🔢 Mevcut Sürüm

**v42** — Son build tarihi: 22 Mayıs 2026

## 🔗 Bağlantılar

- **Render URL**: `https://anisync-server.onrender.com`
- **GitHub Repo**: `github.com/LunaticZen/anisync-server` (render-server)
- **Proje Dizini**: `C:\Users\emin\.gemini\antigravity\scratch\anisync`
