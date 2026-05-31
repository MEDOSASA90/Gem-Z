/**
 * ============================================================================
 * GEM Z - Identity Module
 * SessionModule - وحدة ادارة الجلسات
 * ============================================================================
 */

import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisModule } from '@nestjs-modules/ioredis';
import { Session } from './session.entity';
import { SessionService } from './session.service';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([Session]),
    RedisModule,
  ],
  providers: [SessionService],
  exports: [SessionService, TypeOrmModule],
})
export class SessionModule {}
