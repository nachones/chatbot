# Script para crear un paquete optimizado para Plesk
# Ejecutar: pwsh build-plesk.ps1

Write-Host "🚀 Creando paquete para Plesk..." -ForegroundColor Cyan
Write-Host ""

# Nombre del archivo ZIP
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$zipName = "miabot-plesk-$timestamp.zip"

# Archivos y carpetas a incluir
$itemsToInclude = @(
    "public",
    "routes", 
    "services",
    "node_modules",
    "server.js",
    "package.json",
    "package-lock.json",
    ".env.example",
    "ecosystem.config.js",
    "database.sqlite",
    "README.md",
    "DEPLOYMENT_PLESK.md",
    "QUICKSTART_PLESK.md",
    "DEPLOYMENT_INSTRUCTIONS.txt",
    "deploy.sh",
    "CHECKLIST.md",
    "ESTADO_FINAL.md"
)

# Crear directorio temporal
$tempDir = "temp-plesk-build"
if (Test-Path $tempDir) {
    Remove-Item -Recurse -Force $tempDir
}
New-Item -ItemType Directory -Path $tempDir | Out-Null

Write-Host "📦 Copiando archivos necesarios..." -ForegroundColor Yellow

# Copiar archivos
foreach ($item in $itemsToInclude) {
    if (Test-Path $item) {
        Write-Host "  ✓ $item" -ForegroundColor Green
        Copy-Item -Path $item -Destination $tempDir -Recurse -Force
    } else {
        Write-Host "  ⚠ $item no encontrado" -ForegroundColor Yellow
    }
}

# Crear directorios vacíos necesarios
$emptyDirs = @("uploads", "logs", "training-data")
foreach ($dir in $emptyDirs) {
    $dirPath = Join-Path $tempDir $dir
    New-Item -ItemType Directory -Path $dirPath -Force | Out-Null
    # Crear archivo .gitkeep
    New-Item -ItemType File -Path (Join-Path $dirPath ".gitkeep") -Force | Out-Null
    Write-Host "  ✓ $dir/ (vacío)" -ForegroundColor Green
}

Write-Host ""
Write-Host "🗜️ Comprimiendo..." -ForegroundColor Yellow

# Comprimir
Compress-Archive -Path "$tempDir\*" -DestinationPath $zipName -Force

# Limpiar temporal
Remove-Item -Recurse -Force $tempDir

# Información del archivo
$zipSize = (Get-Item $zipName).Length / 1MB
Write-Host ""
Write-Host "================================" -ForegroundColor Green
Write-Host "✓ Paquete creado exitosamente" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host ""
Write-Host "Archivo: $zipName" -ForegroundColor Cyan
Write-Host "Tamaño: $([math]::Round($zipSize, 2)) MB" -ForegroundColor Cyan
Write-Host ""
Write-Host "📤 Próximos pasos:" -ForegroundColor Yellow
Write-Host "  1. Sube $zipName a tu servidor Plesk" -ForegroundColor White
Write-Host "  2. Extrae el ZIP en el directorio de tu dominio" -ForegroundColor White
Write-Host "  3. Configura Node.js en Plesk (ver QUICKSTART_PLESK.md)" -ForegroundColor White
Write-Host "  4. Añade las variables de entorno (OPENAI_API_KEY)" -ForegroundColor White
Write-Host "  5. Habilita y reinicia la aplicación Node.js" -ForegroundColor White
Write-Host ""
Write-Host "📖 Documentación completa en DEPLOYMENT_PLESK.md" -ForegroundColor Cyan
Write-Host ""
