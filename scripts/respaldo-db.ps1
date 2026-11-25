param (
    [string]$Destino = "./backups"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $Destino)) {
    New-Item -ItemType Directory -Path $Destino -Force | Out-Null
}

$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$Archivo = Join-Path $Destino "kancha_backup_$Timestamp.sql"

Write-Host "[kancha] Generando respaldo de PostgreSQL en $Archivo..." -ForegroundColor Cyan

docker compose exec -T postgres pg_dump -U kancha -d kancha --clean --if-exists | Set-Content -Path $Archivo -Encoding utf8

$Tamano = (Get-Item $Archivo).Length
Write-Host "[kancha] Respaldo generado con éxito: $Archivo ($Tamano bytes)" -ForegroundColor Green
