$count = 0
while ($count -lt 24) {
    Start-Sleep -Seconds 5
    $count++
    try {
        $out = & docker info 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Docker hazir!"
            & docker --version
            exit 0
        }
    } catch {}
    Write-Host "Bekleniyor... ($($count * 5) saniye)"
}
Write-Host "Docker hala hazir degil"
