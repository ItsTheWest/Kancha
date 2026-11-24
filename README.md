# Kancha

Plataforma de gestión para clubes deportivos. Este repositorio contiene la **Fase 0 · Cimientos**: entorno Docker, base de datos con sus migraciones y la estructura de backend y frontend. Incluye además la autenticación por correo y Google (ver `docs/SETUP.md`).

## Stack

- **Backend:** NestJS (TypeScript) + Drizzle ORM
- **Frontend:** Next.js (App Router)
- **Base de datos:** PostgreSQL 16
- **Caché / colas:** Redis 7
- **Entorno:** Docker Compose

## Estructura

```
backend/            API NestJS
  db/migrations/    migraciones SQL numeradas
  src/database/     conexión, esquema Drizzle y ejecutor de migraciones
  src/redis/        conexión a Redis
  src/health/       GET /health
frontend/           aplicación Next.js
docker-compose.yml
```

## Arranque

```
cp .env.example .env
docker compose up --build
```

- Frontend: http://localhost:53000
- Backend: http://localhost:53001/health

Los puertos publicados en el host (53000/53001/55432/56379) son poco comunes a propósito, para no chocar con otros proyectos locales. Se cambian en `.env` — ver [docs/SETUP.md](docs/SETUP.md) para el detalle de credenciales, enlaces y cómo resolver conflictos de puertos.

Las migraciones se aplican solas al iniciar el backend. También se pueden correr a mano:

```
docker compose exec backend npm run migrate
```

## Migraciones

Los archivos de `backend/db/migrations/` se aplican en orden alfabético y el estado queda en la tabla `schema_migrations` (con checksum). Una migración ya aplicada no se puede modificar: se agrega una nueva.

| Archivo | Contenido |
| --- | --- |
| `001_usuarios.sql` | extensiones, trigger `updated_at` y tabla `usuarios` |
| `002_credenciales_y_tokens.sql` | `credenciales_acceso` y `tokens_verificacion` |

## Reiniciar la base desde cero

```
docker compose down -v
docker compose up --build
```
