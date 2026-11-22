import { Global, Inject, Injectable, Module, OnApplicationShutdown } from '@nestjs/common';
import Redis from 'ioredis';

export const REDIS = 'REDIS';

@Injectable()
class RedisCloser implements OnApplicationShutdown {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  async onApplicationShutdown() {
    await this.redis.quit().catch(() => undefined);
  }
}

@Global()
@Module({
  providers: [
    {
      provide: REDIS,
      useFactory: () => {
        const url = process.env.REDIS_URL;
        if (!url) throw new Error('Falta la variable REDIS_URL');
        return new Redis(url, { maxRetriesPerRequest: 2, lazyConnect: false });
      },
    },
    RedisCloser,
  ],
  exports: [REDIS],
})
export class RedisModule {}
