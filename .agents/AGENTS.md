# AniSync Projesi Agent Kuralları ve Yönergeleri

Bu dosya, bu projede çalışacak olan yapay zeka asistanları (Agent'lar) için oluşturulmuştur. Yeni bir sohbete başladığınızda (yeni bir Agent atandığında), her göreve başlamadan önce bu dosyayı okuyup aşağıdaki kurallara KESİNLİKLE UYMALISINIZ. Kullanıcıya "Kim derleyecek?", "Kim pushlayacak?" gibi sorular SORMAYIN.

## 1. Kod Yazımı, Derleme (Build) Süreçleri ve Agent'ın Görevleri
Kullanıcı sizden bir özellik eklemenizi veya hata çözmenizi istediğinde, işlemleri yapıp ardından otomatik olarak aşağıdaki derleme ve hazırlık süreçlerini KENDİNİZ gerçekleştirmelisiniz:

### a) Masaüstü (EXE) Derlemesi
- Masaüstü uygulaması `packages/desktop` klasöründedir. 
- Build almak için: `cd packages/desktop && npm run package` komutu kullanılır.
- Çıktı `packages/desktop/release` klasörüne `.exe` formatında çıkar.
- **Zorunlu İşlem:** Her yeni EXE build'inden sonra oluşturulan EXE dosyasını kullanıcının masaüstündeki test dizinine kopyalayın: `cp release/*.exe /home/emim/Desktop/AniSync_Yeni/`

### b) Mobil/Web (Render) Derlemesi
- Uygulamanın web ve mobil WebView versiyonları için arayüz (frontend), Render üzerinde barındırılan sunucu (`packages/render-server`) üzerinden sunulur.
- Frontend'i güncellemek için: `cd packages/desktop && npm run build` çalıştırın.
- **Zorunlu İşlem:** Derlenen `dist` klasörünün içindeki tüm dosyaları Render sunucusunun public klasörüne kopyalayın: `cp -r dist/* ../render-server/public/`
- Render sunucusuna deploy olması için `packages/render-server/public` içindeki bu dosyaların `git add` ile projeye eklenmesi KESİNLİKLE unutulmamalıdır.

### c) Yerel Android (APK) Derlemesi
- Android uygulaması `packages/mobile` klasöründedir (React Native).
- **ÖNEMLİ (Gerekli Araçlar):** Sunucuda `sudo` yetkiniz yoktur! APK derlemeniz istenirse, Java ve Android SDK şurada kuruludur:
  - `JAVA_HOME=/home/emim/.java/jdk-17`
  - `ANDROID_HOME=/home/emim/Android/Sdk`
- APK derlemek için: Bu değişkenleri export edin, `cd packages/mobile` dizinine gidin ve `java -classpath gradle/wrapper/gradle-wrapper.jar org.gradle.wrapper.GradleWrapperMain assembleRelease` çalıştırın. (Bunun için bir `build_apk.sh` betiği de oluşturabilirsiniz).
- Derlenen APK şurada çıkar: `app/build/outputs/apk/release/app-release.apk`
- **Zorunlu İşlem:** Çıkan APK'yı `cp` ile `/home/emim/Desktop/AniSync_Yeni/` dizinine taşıyın.

## 2. GitHub Push İşlemleri (ÇOK ÖNEMLİ)
- Agent **KESİNLİKLE KENDİ BAŞINA `git push` YAPMAMALIDIR**.
- Terminal üzerinden yapılan `git push` komutları hata vermektedir. Push işlemi için KESİNLİKLE terminal kullanmayın.
- **Agent'ın Görevi:** Yukarıdaki derleme (build) işlemlerini bitirdikten sonra, güncellenen tüm kodları ve derlenmiş dosyaları `git add .` ile eklemek ve `git commit -m "Anlamlı bir mesaj"` ile YEREL (local) depoya kaydetmektir.
- **Kullanıcının Görevi (Push):** Değişiklikleri uzak sunucuya (origin) gönderme **`Push`** işi, SADECE kullanıcıya (EMİM) aittir. Kullanıcı bu işlemi kendi bilgisayarındaki **GitHub Desktop** uygulaması üzerinden yapacaktır.
- Agent, `git commit` işlemini yaptıktan sonra kullanıcısına dönüp **sadece şu mesajı vermelidir**: "Tüm değişiklikleri yaptım, dosyaları derledim ve projeye commitledim. Şimdi GitHub Desktop uygulamanız üzerinden Push yapabilirsiniz."
