import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { ClubesModule } from './clubes/clubes.module';
import { DatabaseModule } from './database/database.module';
import { HealthController } from './health/health.controller';
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [DatabaseModule, RedisModule, AuthModule, ClubesModule],
  controllers: [HealthController],
})
export class AppModule {}
