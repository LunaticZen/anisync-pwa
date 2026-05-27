Copy-Item 'C:\Users\emin\.gemini\antigravity\scratch\anisync\packages\mobile\app\build\outputs\apk\debug\app-debug.apk' 'C:\Users\emin\Desktop\AniSync\AniSync.apk' -Force
$f = Get-Item 'C:\Users\emin\Desktop\AniSync\AniSync.apk'
$sizeMB = [math]::Round($f.Length / 1MB, 1)
Write-Host "APK kopyalandi! Boyut: $sizeMB MB"
