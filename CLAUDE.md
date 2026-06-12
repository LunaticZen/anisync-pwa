## Context Navigation
1. ALWAYS query the knowledge graph first.
2. Only read raw files if I explicitly say so.

## Proje Özeti (AniSync)
Bu proje tam teşekküllü bir **monorepo** yapısındadır. Eski `anisync-server` reposu iptal edilmiş olup her şey bu repodan (main branch) yönetilmektedir:
- `/packages/desktop`: Masaüstü uygulaması (Electron + React).
- `/packages/mobile`: Mobil uygulaması (APK - Android).
- `/packages/render-server`: Render.com üzerinde deploy edilen tek dosyalık sunucu.
- `/packages/shared`: Ortak kullanılan kodlar.

### Genel Kurallar
- Sürüm numaraları `packages/desktop/package.json`, `packages/mobile/package.json` ve `packages/desktop/src/components/HomePage.tsx` içerisinde güncellenir (Örn: v1.0.1).
- Uygulama arka planında "Aura" (Gemini tarzı dinamik gradyanlar) kullanılmaktadır. CSS'te düz renkler yerine gradientler tercih edilmelidir.
- Render.com güncellemeleri, GitHub `main` branchine doğrudan atılan pushlar ile otomatik gerçekleşir. (`packages/render-server` içinde asla `.git` klasörü barındırmayın).


## Detaylı Bilgi (Bilgi Havuzu)
Projenin detaylı kuralları, teknolojileri ve dosya yapısı `/wiki` klasöründe tutulmaktadır. 
Bana herhangi bir kod yazmadan veya işlem yapmadan önce, görevin içeriğine göre lütfen şu dosyalardan ilgili olanı Oku:
- Genel yapı için: `wiki/Dosya Yapısı.md`
- Mimari için: `wiki/Mimari Genel Bakış.md`
- Sorun çözümü için: `wiki/Bilinen Sorunlar ve Çözümler.md`
