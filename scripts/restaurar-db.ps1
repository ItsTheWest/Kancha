param (
    [Parameter(Mandatory=$true)]
    [string]$Archivo,
    [string]$BaseDatos = "kancha"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $Archivo)) {
    Write-Error "El archivo de respaldo '$Archivo' no existe."
    exit 1
}

Write-Host "[kancha] Restaurando respaldo en la base de datos '$BaseDatos'..." -ForegroundColor Cyan

Get-Content -Path $Archivo -Raw | docker compose exec -T postgres psql -U kancha -d $BaseDatos

Write-Host "[kancha] Base de datos '$BaseDatos' restaurada con éxito." -ForegroundColor Green
