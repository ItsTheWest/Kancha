#!/usr/bin/env bash
set -euo pipefail

# Respaldo automático de base de datos PostgreSQL de Kancha
DIR_DESTINO="${1:-./backups}"
mkdir -p "$DIR_DESTINO"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
ARCHIVO="$DIR_DESTINO/kancha_backup_${TIMESTAMP}.sql"

echo "[kancha] Generando respaldo de PostgreSQL en $ARCHIVO..."

docker compose exec -T postgres pg_dump -U "${POSTGRES_USER:-kancha}" -d "${POSTGRES_DB:-kancha}" --clean --if-exists > "$ARCHIVO"

echo "[kancha] Respaldo generado con éxito: $ARCHIVO ($(wc -c < "$ARCHIVO" | tr -d ' ') bytes)"
