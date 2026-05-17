# ═══════════════════════════════════════════════════════════════
# AniSync — Hızlı Başlatma Scripti (Windows)
# ═══════════════════════════════════════════════════════════════

Write-Host ""
Write-Host "  ╔═══════════════════════════════════════╗" -ForegroundColor Magenta
Write-Host "  ║         AniSync Watch Party            ║" -ForegroundColor Magenta
Write-Host "  ║   Anime Birlikte İzleme Platformu     ║" -ForegroundColor Magenta
Write-Host "  ╚═══════════════════════════════════════╝" -ForegroundColor Magenta
Write-Host ""

$action = $args[0]

function Show-Help {
    Write-Host "Kullanim:" -ForegroundColor Cyan
    Write-Host "  .\start.ps1 docker     - PostgreSQL + Redis baslatir (Docker gerekli)" -ForegroundColor White
    Write-Host "  .\start.ps1 server     - Backend sunucuyu baslatir" -ForegroundColor White
    Write-Host "  .\start.ps1 desktop    - Electron masaustu uygulamasini baslatir" -ForegroundColor White
    Write-Host "  .\start.ps1 migrate    - Veritabani migration calistirir" -ForegroundColor White
    Write-Host "  .\start.ps1 all        - Tum sistemi baslatir" -ForegroundColor White
    Write-Host "  .\start.ps1 build-exe  - Windows EXE olusturur" -ForegroundColor White
    Write-Host ""
}

function Start-Docker {
    Write-Host "[1/3] Docker servisleri baslatiliyor..." -ForegroundColor Yellow
    docker-compose up -d postgres redis
    Write-Host "  PostgreSQL: localhost:5432" -ForegroundColor Green
    Write-Host "  Redis: localhost:6379" -ForegroundColor Green
}

function Start-Migrate {
    Write-Host "[DB] Migration calistiriliyor..." -ForegroundColor Yellow
    Set-Location packages/server
    $env:DATABASE_URL = "postgresql://anisync:anisync_dev_2024@localhost:5432/anisync"
    npx prisma migrate dev --name init
    Set-Location ../..
    Write-Host "  Migration tamamlandi!" -ForegroundColor Green
}

function Start-Server {
    Write-Host "[2/3] Backend sunucu baslatiliyor..." -ForegroundColor Yellow
    $env:DATABASE_URL = "postgresql://anisync:anisync_dev_2024@localhost:5432/anisync"
    $env:REDIS_URL = "redis://localhost:6379"
    $env:JWT_SECRET = "dev-secret-change-in-production-anisync-2024"
    $env:JWT_REFRESH_SECRET = "dev-refresh-secret-change-in-production-2024"
    $env:CORS_ORIGIN = "http://localhost:5173,http://localhost:3001"
    Start-Process powershell -ArgumentList "-ExecutionPolicy Bypass -Command `"cd '$PWD\packages\server'; npx tsx src/index.ts`"" -WindowStyle Normal
    Write-Host "  Server: http://localhost:3000" -ForegroundColor Green
}

function Start-Desktop {
    Write-Host "[3/3] Electron uygulamasi baslatiliyor..." -ForegroundColor Yellow
    Set-Location packages/desktop
    Start-Process powershell -ArgumentList "-ExecutionPolicy Bypass -Command `"npx vite`"" -WindowStyle Normal
    Write-Host "  Vite Dev: http://localhost:5173" -ForegroundColor Green
    Set-Location ../..
}

function Build-Exe {
    Write-Host "[BUILD] EXE olusturuluyor..." -ForegroundColor Yellow
    Set-Location packages/desktop
    npx vite build
    npx tsc -p electron/tsconfig.json
    npx electron-builder --win
    Set-Location ../..
    Write-Host "  EXE: packages/desktop/release/" -ForegroundColor Green
}

switch ($action) {
    "docker"    { Start-Docker }
    "server"    { Start-Server }
    "desktop"   { Start-Desktop }
    "migrate"   { Start-Migrate }
    "build-exe" { Build-Exe }
    "all"       {
        Start-Docker
        Start-Sleep -Seconds 5
        Start-Migrate
        Start-Server
        Start-Sleep -Seconds 3
        Start-Desktop
        Write-Host ""
        Write-Host "  Tum sistem hazir!" -ForegroundColor Green
        Write-Host "  Server:  http://localhost:3000" -ForegroundColor Cyan
        Write-Host "  Desktop: http://localhost:5173" -ForegroundColor Cyan
        Write-Host ""
    }
    default { Show-Help }
}
