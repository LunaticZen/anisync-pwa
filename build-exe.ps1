Set-Location "$PSScriptRoot\packages\desktop"
$env:CSC_IDENTITY_AUTO_DISCOVERY = "false"
npx electron-builder --win dir --config.win.signAndEditExecutable=false

# Copy to Desktop
if (Test-Path 'C:\Users\emin\Desktop\AniSync') {
    Remove-Item 'C:\Users\emin\Desktop\AniSync' -Recurse -Force
}
Copy-Item 'release\win-unpacked' 'C:\Users\emin\Desktop\AniSync' -Recurse
Write-Host "AniSync masaustune kopyalandi!"
