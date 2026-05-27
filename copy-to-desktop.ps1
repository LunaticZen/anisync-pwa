if (Test-Path 'C:\Users\emin\Desktop\AniSync') {
    Remove-Item 'C:\Users\emin\Desktop\AniSync' -Recurse -Force
}
Copy-Item 'C:\Users\emin\.gemini\antigravity\scratch\anisync\packages\desktop\release\win-unpacked' 'C:\Users\emin\Desktop\AniSync' -Recurse
Write-Host "Kopyalandi!"
Get-ChildItem 'C:\Users\emin\Desktop\AniSync\AniSync.exe' | ForEach-Object { Write-Host "$($_.Name) - $([math]::Round($_.Length/1MB, 1)) MB" }
