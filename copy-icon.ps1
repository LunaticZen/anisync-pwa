$src = "C:\Users\emin\.gemini\antigravity\brain\3409014e-e386-4ae3-8b03-ef921eb7fcc9\anisync_icon_1779239352924.png"
$base = "C:\Users\emin\.gemini\antigravity\scratch\anisync\packages\mobile\app\src\main\res"
$dirs = @("mipmap-xxxhdpi","mipmap-xxhdpi","mipmap-xhdpi","mipmap-hdpi","mipmap-mdpi")
foreach ($d in $dirs) {
    $dest = Join-Path $base $d
    if (-not (Test-Path $dest)) { New-Item $dest -ItemType Directory -Force | Out-Null }
    Copy-Item $src (Join-Path $dest "ic_launcher.png") -Force
}
Write-Host "Icons copied OK"
