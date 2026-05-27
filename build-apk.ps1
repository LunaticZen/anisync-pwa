$env:ANDROID_HOME = 'C:\Android'
$env:ANDROID_SDK_ROOT = 'C:\Android'
Set-Location "$PSScriptRoot\packages\mobile"
$gradleBat = (Get-ChildItem 'gradle-temp\gradle-8.5\bin\gradle.bat' -ErrorAction SilentlyContinue).FullName
Write-Host "APK build basliyor..."
& $gradleBat assembleDebug --no-daemon 2>&1 | Out-Null
Copy-Item 'app\build\outputs\apk\debug\app-debug.apk' 'C:\Users\emin\Desktop\AniSync.apk' -Force
Copy-Item 'app\build\outputs\apk\debug\app-debug.apk' 'C:\Users\emin\Desktop\AniSync\AniSync.apk' -Force
$f = Get-Item 'C:\Users\emin\Desktop\AniSync.apk'
$sizeMB = [math]::Round($f.Length / 1MB, 1)
Write-Host "APK hazir! Boyut: $sizeMB MB"
