$ErrorActionPreference = "Stop"

$esrganDir = "C:\Users\emin\.gemini\antigravity\scratch\anisync\realesrgan"
if (-not (Test-Path "$esrganDir\realesrgan-ncnn-vulkan.exe")) {
    Write-Host "Yapay Zeka (RealESRGAN) indiriliyor..."
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -Uri "https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.5.0/realesrgan-ncnn-vulkan-20220424-windows.zip" -OutFile "realesrgan.zip"
    Write-Host "Dosyalar çıkartılıyor..."
    Expand-Archive "realesrgan.zip" -DestinationPath $esrganDir -Force
}

$inputDir = "C:\Users\emin\Desktop\resimler"
$outputDir = "C:\Users\emin\Desktop\resimler_kaliteli"

if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir | Out-Null
}

$files = Get-ChildItem -Path $inputDir -Recurse -File | Where-Object { $_.Extension -match "\.(jpg|jpeg|png|webp)$" }

foreach ($file in $files) {
    $relativePath = $file.FullName.Substring($inputDir.Length + 1)
    $targetFile = Join-Path $outputDir $relativePath
    $targetDir = Split-Path $targetFile -Parent

    if (-not (Test-Path $targetDir)) {
        New-Item -ItemType Directory -Path $targetDir | Out-Null
    }

    Write-Host "Yapay zeka ile netleştiriliyor: $($file.Name)..."
    
    $targetFileJpg = [System.IO.Path]::ChangeExtension($targetFile, ".jpg")
    
    # -s 2 means 2x upscale (so 1080p becomes 2160p with AI details reconstructed)
    & "$esrganDir\realesrgan-ncnn-vulkan.exe" -i $file.FullName -o $targetFileJpg -s 2 -f jpg
}

Write-Host "Tüm resimler başarıyla yapay zeka ile netleştirildi! Yeni resimler klasörü: $outputDir"
