import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common';
import Redis from 'ioredis';
import { Pool } from 'pg';
import { Publico } from '../auth/decoradores/publico.decorador';
import { PG_POOL } from '../database/database.module';
import { REDIS } from '../redis/redis.module';

type Estado = 'up' | 'down';

// Público: lo consulta el healthcheck de Docker, que no tiene sesión.
@Publico()
@Controller('health')
export class HealthController {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  @Get()
  async check() {
    const [db, redis] = await Promise.all([this.probarDb(), this.probarRedis()]);
    const resultado = { status: db === 'up' && redis === 'up' ? 'ok' : 'degraded', db, redis };
    if (resultado.status !== 'ok') throw new ServiceUnavailableException(resultado);
    return resultado;
  }

  private async probarDb(): Promise<Estado> {
    try {
      await this.pool.query('SELECT 1');
      return 'up';
    } catch {
      return 'down';
    }
  }

  private async probarRedis(): Promise<Estado> {
    try {
      return (await this.redis.ping()) === 'PONG' ? 'up' : 'down';
    } catch {
      return 'down';
    }
  }
}
