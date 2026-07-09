$ErrorActionPreference = "Stop"

Write-Host "🚀 1/3: Yeni kodlar derleniyor ve paketleniyor (full-build)..." -ForegroundColor Cyan
Set-Location $PSScriptRoot
.\full-build.ps1

Write-Host "🚀 2/3: Yeni arayüz Render sunucusuna ekleniyor..." -ForegroundColor Cyan
Set-Location "$PSScriptRoot\packages\render-server"
git add .
git commit -m "feat: UX ve Tema ergonomi düzeltmeleri eklendi"

Write-Host "🚀 3/3: Render sunucusuna (GitHub) yollanıyor..." -ForegroundColor Cyan
git push origin master

Write-Host "✅ İŞLEM TAMAMLANDI! Render şu an otomatik güncelleniyor. 1-2 dakika sonra APK'yı açabilirsiniz." -ForegroundColor Green
Start-Sleep -Seconds 5
