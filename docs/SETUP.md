# Setup local — Kancha

Guía de arranque, credenciales y accesos para desarrollo local. Valores válidos
mientras uses el `.env` del repo tal cual (solo desarrollo, nunca producción).

## 1. Arrancar

```
cp .env.example .env
docker compose up --build
```

## 2. Puertos

Se publican en el host con valores poco comunes para no chocar con los
puertos "de siempre" (3000/3001/5432/6379) que suelen usar otros proyectos
en la misma máquina. Los puertos **dentro** de la red de Docker (entre
contenedores) no cambian; solo cambia el lado expuesto al host.

| Servicio     | Puerto host (default) | Variable en `.env`   | Puerto interno |
| ------------ | ----------------------- | --------------------- | -------------- |
| Frontend     | 53000                   | `FRONTEND_PORT`       | 3000           |
| Backend      | 53001                   | `BACKEND_PORT`        | 3001           |
| PostgreSQL   | 55432                   | `POSTGRES_PORT`       | 5432           |
| Redis        | 56379                   | `REDIS_PORT`          | 6379           |
| pgAdmin      | 55050                   | `PGADMIN_PORT`        | 80             |
| RedisInsight | 55540                   | `REDISINSIGHT_PORT`   | 5540           |

**Si necesitas usar otro proyecto que ya ocupa alguno de estos puertos:**
cambia el valor correspondiente en `.env` (cualquier puerto libre funciona) y
corre `docker compose up --build` de nuevo. Si el puerto sigue ocupado,
Docker avisa solo con un error del tipo `Bind for 0.0.0.0:PORT failed: port
is already allocated` — esa es la señal de que hay que elegir otro número.

## 3. Credenciales

### PostgreSQL

| Campo    | Valor                  |
| -------- | ----------------------- |
| Host     | `localhost`              |
| Puerto   | `55432` (o `POSTGRES_PORT`) |
| Usuario  | `kancha`                 |
| Password | `kancha_dev_password`    |
| Base     | `kancha`                 |

Cadena de conexión (desde el host, con un cliente como psql, TablePlus, DBeaver, etc.):

```
postgres://kancha:kancha_dev_password@localhost:55432/kancha
```

Cadena de conexión **dentro** de Docker (la que usa el backend, vía `DATABASE_URL`):

```
postgres://kancha:kancha_dev_password@postgres:5432/kancha
```

Conectarse por línea de comandos:

```
docker compose exec postgres psql -U kancha -d kancha
```

### Redis

| Campo  | Valor                   |
| ------ | ------------------------ |
| Host   | `localhost`               |
| Puerto | `56379` (o `REDIS_PORT`)  |

Conectarse por línea de comandos:

```
docker compose exec redis redis-cli
```

Desde el host con un cliente externo (ej. RedisInsight, Another Redis Desktop Manager):

```
redis://localhost:56379
```

### pgAdmin (web)

| Campo    | Valor                        |
| -------- | ------------------------------ |
| URL      | http://localhost:55050         |
| Email    | `admin@kancha.dev`             |
| Password | `kancha_dev_password`          |

El servidor "Kancha (postgres)" ya viene pre-registrado (ver
`pgadmin/servers.json`, montado dentro del contenedor). Al abrirlo en el
árbol "Servers" solo pedirá la contraseña una vez — pgAdmin no la guarda en
texto plano por seguridad:

| Campo    | Valor                  |
| -------- | ------------------------ |
| Host     | `postgres`                |
| Puerto   | `5432`                    |
| Usuario  | `kancha`                  |
| Password | `kancha_dev_password`     |

Si necesitas agregarlo a mano (por ejemplo en un pgAdmin nuevo sin el
volumen inicializado con `servers.json`), usa esos mismos datos. Como
pgAdmin corre en la misma red de Docker, el host es el **nombre del
servicio** (`postgres`), no `localhost`.

### RedisInsight (web)

| Campo | Valor                   |
| ----- | ------------------------- |
| URL   | http://localhost:55540     |

Al entrar, agrega una base de datos Redis. Igual que con pgAdmin, usa el
nombre del servicio dentro de la red de Docker:

| Campo  | Valor    |
| ------ | --------- |
| Host   | `redis`    |
| Puerto | `6379`     |

## 4. Enlaces

| Qué                     | URL                                         |
| ------------------------ | --------------------------------------------- |
| Frontend                 | http://localhost:53000                        |
| Backend (health check)   | http://localhost:53001/health                 |
| pgAdmin (Postgres web)   | http://localhost:55050                        |
| RedisInsight (Redis web) | http://localhost:55540                        |
| Postgres (cliente GUI)   | `localhost:55432` (ver credenciales arriba)    |
| Redis (cliente GUI)      | `localhost:56379`                             |

También puedes seguir usando los comandos `psql` / `redis-cli` vía
`docker compose exec` (sección 3) si prefieres la terminal.

## 5. Reiniciar la base desde cero

```
docker compose down -v
docker compose up --build
```

## 6. Autenticación

- **Registro / login:** `http://localhost:53000/registro` y `/login`. Toda otra ruta redirige a `/login` si no hay sesión (`frontend/proxy.ts`, el "middleware" de Next 16).
- **Sesión:** access token de 3 h y refresh token de 30 días deslizante (tope absoluto de 90 días). El proxy renueva el access token solo cuando vence; no hay que volver a iniciar sesión.
- **Cookies:** `httpOnly`, `SameSite=Lax`. El navegador solo habla con el frontend (BFF); el backend no usa cookies.
- **Identidad:** solo el correo. `nombres` y `apellidos` son datos de perfil, no hay nombre de usuario.
- **Variables** (en `.env`, ver `.env.example`): `AUTH_JWT_SECRET` (obligatoria, mínimo 32 caracteres), `ACCESS_TOKEN_TTL`, `REFRESH_TOKEN_TTL`, `REFRESH_FAMILY_TTL`, `SECURE_COOKIES`, `PUBLIC_WEB_URL`.
- **API** (puerto 53001): `POST /auth/registro`, `POST /auth/sesion`, `POST /auth/sesion/refrescar`, `DELETE /auth/sesion`, `DELETE /auth/sesiones`, `GET /auth/perfil`, `GET /auth/google/inicio`, `POST /auth/google/callback`.

### Google OAuth 2.0

1. [Google Cloud Console](https://console.cloud.google.com) → *APIs y servicios* → *Credenciales* → *Crear credenciales* → *ID de cliente de OAuth* → **Aplicación web**.
2. **Orígenes de JavaScript autorizados:** `http://localhost:53000`
3. **URI de redirección autorizados:** `http://localhost:53000/api/auth/google/callback` (coincidencia exacta: si cambias `FRONTEND_PORT`, añade la nueva).
4. Pantalla de consentimiento con los permisos `openid`, `email`, `profile`. En modo *Testing*, añade tu correo como *Test user*.
5. Escribe `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` **directamente en `.env`** (nunca en el chat ni en un commit; si se filtran, rótalas) y corre `docker compose up -d`. Sin ellas el botón de Google no aparece.

### Cloudflare R2 (guardado de documentos, imágenes y archivos) — pendiente

No está implementado todavía. Para activarlo hacen falta:

1. **Bucket:** panel de Cloudflare → *R2* → *Create bucket* (p. ej. `kancha-archivos`).
2. **Account ID:** en la vista general de R2; forma el endpoint `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`.
3. **Token de API:** *R2* → *Manage R2 API Tokens* → *Create API Token* con permiso **Object Read & Write** y **Apply to specific buckets only** (el bucket anterior). Requiere rol Super Administrator. Devuelve *Access Key ID* y *Secret Access Key*; **el secreto se muestra una sola vez**.
4. **Dominio público:** solo si los archivos deben verse sin autenticación. Para documentos privados es mejor no publicar el bucket y servirlos con URLs firmadas temporales.

Variables previstas (van al `.env`): `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`.

### Deuda conocida

- **Falta verificar el correo en el registro.** Es la causa de que el registro pueda enumerar correos (`409 correo_en_uso`) y de la regla del login con Google: si la cuenta existe sin verificar, se descarta su contraseña y se cierran sus sesiones al vincular.
- **En producción:** quitar `ports:` del servicio `backend` (hoy está publicado en 53001), poner `SECURE_COOKIES=true`, renombrar las cookies al prefijo `__Host-` y usar un `AUTH_JWT_SECRET` propio.
- **Límites por IP en local:** sin un proxy delante, el frontend no recibe `X-Forwarded-For` y el backend ve siempre la IP del contenedor, así que el límite por IP es de facto global. El límite por cuenta sí protege.
- Si algún día el proxy necesita verificar la firma del token, usar RS256 con la clave privada solo en el backend; compartir el secreto HS256 es la peor opción.
