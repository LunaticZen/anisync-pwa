# ── Version ──
$versionFile = "$PSScriptRoot\version.txt"
$version = [int](Get-Content $versionFile -ErrorAction SilentlyContinue)
$version++
Set-Content $versionFile $version
$versionStr = "v$version"
Write-Host "=== AniSync Build $versionStr ===" -ForegroundColor Magenta

# Step 1: Build React UI
Write-Host "=== [1/5] React UI build ===" -ForegroundColor Cyan
Set-Location "$PSScriptRoot\packages\desktop"
npx vite build 2>&1 | Out-Null
npx tsc -p electron/tsconfig.json 2>&1 | Out-Null
Write-Host "UI + Electron TS derlendi"

# Step 2: Electron portable build
Write-Host "=== [2/5] Electron build ===" -ForegroundColor Cyan
$env:CSC_IDENTITY_AUTO_DISCOVERY = "false"
npx electron-builder --win dir --config.win.signAndEditExecutable=false 2>&1 | Out-Null
Write-Host "Electron build tamam"

# Step 3: Kill old process & copy to Desktop
Write-Host "=== [3/5] Masaustune kopyalama ===" -ForegroundColor Cyan
Get-Process -Name 'AniSync' -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep 2
if (Test-Path 'C:\Users\emin\Desktop\AniSync\AniSync.exe') {
    Remove-Item 'C:\Users\emin\Desktop\AniSync' -Recurse -Force -ErrorAction SilentlyContinue
}
Copy-Item 'release\win-unpacked' 'C:\Users\emin\Desktop\AniSync' -Recurse
Write-Host "EXE masaustune kopyalandi"

# Step 4: Update render-server public files
Write-Host "=== [4/5] Render server guncelleme ===" -ForegroundColor Cyan
Set-Location "$PSScriptRoot\packages\render-server"
if (Test-Path 'public') { Remove-Item 'public' -Recurse -Force }
Copy-Item "$PSScriptRoot\packages\desktop\dist" 'public' -Recurse
Copy-Item "$PSScriptRoot\packages\render-server-adapter\adapter.js" 'public\adapter.js' -Force -ErrorAction SilentlyContinue
Write-Host "Render server web UI guncellendi"

# Step 5: Build APK
Write-Host "=== [5/5] APK build ===" -ForegroundColor Cyan
Set-Location "$PSScriptRoot\packages\mobile"
$env:ANDROID_HOME = 'C:\Android'
$env:ANDROID_SDK_ROOT = 'C:\Android'
$gradleBat = (Get-ChildItem 'gradle-temp\gradle-8.5\bin\gradle.bat' -ErrorAction SilentlyContinue).FullName
if ($gradleBat) {
    & $gradleBat assembleDebug --no-daemon 2>&1 | Out-Null
    $apkName = "AniSync_$versionStr.apk"
    # Delete ALL old AniSync APKs from Desktop
    Get-ChildItem 'C:\Users\emin\Desktop\AniSync_*.apk' -ErrorAction SilentlyContinue | Remove-Item -Force
    Get-ChildItem 'C:\Users\emin\Desktop\AniSync.apk' -ErrorAction SilentlyContinue | Remove-Item -Force
    # Copy new APK
    Copy-Item 'app\build\outputs\apk\debug\app-debug.apk' "C:\Users\emin\Desktop\$apkName" -Force
    Write-Host "APK build tamam: $apkName"
} else {
    Write-Host "Gradle bulunamadi - APK build atlandi"
}

Write-Host ""
Write-Host "=== TAMAMLANDI - $versionStr ===" -ForegroundColor Green
Get-ChildItem 'C:\Users\emin\Desktop\AniSync\AniSync.exe' -ErrorAction SilentlyContinue | ForEach-Object {
    $sizeMB = [math]::Round($_.Length / 1MB, 1)
    Write-Host "  $($_.Name) - $sizeMB MB"
}
Get-ChildItem "C:\Users\emin\Desktop\AniSync_*.apk" -ErrorAction SilentlyContinue | ForEach-Object {
    $sizeMB = [math]::Round($_.Length / 1MB, 1)
    Write-Host "  $($_.Name) - $sizeMB MB"
}
