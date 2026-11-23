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

| Servicio   | Puerto host (default) | Variable en `.env` | Puerto interno |
| ---------- | ---------------------- | ------------------- | -------------- |
| Frontend   | 53000                   | `FRONTEND_PORT`     | 3000           |
| Backend    | 53001                   | `BACKEND_PORT`      | 3001           |
| PostgreSQL | 55432                   | `POSTGRES_PORT`     | 5432           |
| Redis      | 56379                   | `REDIS_PORT`        | 6379           |

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

## 4. Enlaces

| Qué                  | URL                                      |
| --------------------- | ----------------------------------------- |
| Frontend              | http://localhost:53000                    |
| Backend (health check)| http://localhost:53001/health             |
| Postgres (cliente GUI)| `localhost:55432` (ver credenciales arriba)|
| Redis (cliente GUI)   | `localhost:56379`                         |

No hay administración web incluida todavía; usa cualquier cliente de
escritorio apuntando a los puertos de arriba, o los comandos `psql` /
`redis-cli` vía `docker compose exec`.

## 5. Reiniciar la base desde cero

```
docker compose down -v
docker compose up --build
```
