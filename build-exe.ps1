cd packages\desktop
$env:CSC_IDENTITY_AUTO_DISCOVERY = "false"
npx electron-builder --win dir --config.win.signAndEditExecutable=false

# Copy to Desktop
$desktopPath = "$env:USERPROFILE\Desktop\AniSync_Yeni"
if (Test-Path $desktopPath) {
    Remove-Item $desktopPath -Recurse -Force
}
Copy-Item 'release\win-unpacked' $desktopPath -Recurse
Write-Host "AniSync masaustune kopyalandi!"
