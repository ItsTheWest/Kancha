import { Global, Inject, Injectable, Module, OnApplicationShutdown } from '@nestjs/common';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

export const PG_POOL = 'PG_POOL';
export const DB = 'DB';
export type Database = NodePgDatabase<typeof schema>;

@Injectable()
class PoolCloser implements OnApplicationShutdown {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async onApplicationShutdown() {
    await this.pool.end();
  }
}

@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      useFactory: () => {
        const url = process.env.DATABASE_URL;
        if (!url) throw new Error('Falta la variable DATABASE_URL');
        return new Pool({ connectionString: url, max: 10 });
      },
    },
    {
      provide: DB,
      inject: [PG_POOL],
      useFactory: (pool: Pool): Database => drizzle(pool, { schema }),
    },
    PoolCloser,
  ],
  exports: [PG_POOL, DB],
})
export class DatabaseModule {}
