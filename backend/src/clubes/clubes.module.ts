import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { ClubesController } from './clubes.controller';
import { ClubesService } from './clubes.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ClubesController],
  providers: [ClubesService],
  exports: [ClubesService],
})
export class ClubesModule {}
