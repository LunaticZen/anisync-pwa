$src = 'C:\Users\emin\.gemini\antigravity\scratch\anisync\packages\render-server'
$dst = 'C:\Users\emin\Desktop\AniSync\render-server'
if (Test-Path $dst) { Remove-Item $dst -Recurse -Force }
New-Item -ItemType Directory -Force -Path $dst | Out-Null
Copy-Item "$src\server.js" $dst -Force
Copy-Item "$src\package.json" $dst -Force
Copy-Item "$src\render.yaml" $dst -Force
Copy-Item "$src\public" "$dst\public" -Recurse -Force
Write-Host "Render server dosyalari guncellendi"
