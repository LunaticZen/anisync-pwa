New-Item -ItemType Directory -Force -Path 'C:\Android\cmdline-tools' | Out-Null
$url = 'https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip'
$dest = 'C:\Android\cmdline-tools-download.zip'
Write-Host 'SDK indiriliyor...'
Invoke-WebRequest -Uri $url -OutFile $dest -UseBasicParsing
Write-Host 'Cikartiliyor...'
Expand-Archive -Path $dest -DestinationPath 'C:\Android\cmdline-tools' -Force
if (Test-Path 'C:\Android\cmdline-tools\cmdline-tools') {
    if (Test-Path 'C:\Android\cmdline-tools\latest') { Remove-Item 'C:\Android\cmdline-tools\latest' -Recurse -Force }
    Rename-Item 'C:\Android\cmdline-tools\cmdline-tools' 'latest'
}
Remove-Item $dest -Force -ErrorAction SilentlyContinue
Write-Host 'SDK araci indirildi!'

# Install SDK packages
$env:ANDROID_HOME = 'C:\Android'
$sdkmanager = 'C:\Android\cmdline-tools\latest\bin\sdkmanager.bat'
Write-Host 'Platform ve build-tools kuruluyor...'
echo 'y' | & $sdkmanager --sdk_root='C:\Android' 'platform-tools' 'platforms;android-34' 'build-tools;34.0.0' 2>&1
Write-Host 'Android SDK hazir!'
