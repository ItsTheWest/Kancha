#!/usr/bin/env bash
set -euo pipefail

# Restauración de respaldo de PostgreSQL en Kancha
ARCHIVO="${1:-}"

if [ -z "$ARCHIVO" ]; then
    echo "Uso: $0 <ruta-al-archivo-sql> [nombre-base-datos]"
    exit 1
fi

if [ ! -f "$ARCHIVO" ]; then
    echo "Error: El archivo $ARCHIVO no existe."
    exit 1
fi

BD="${2:-${POSTGRES_DB:-kancha}}"

echo "[kancha] Restaurando respaldo en la base de datos '$BD'..."

cat "$ARCHIVO" | docker compose exec -T postgres psql -U "${POSTGRES_USER:-kancha}" -d "$BD"

echo "[kancha] Base de datos '$BD' restaurada con éxito."
