/**
 * =============================================================================
 * Live Module - موديول الجلسات المباشرة
 * =============================================================================
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LiveService } from './live.service';
import { LiveController } from './live.controller';
import { LiveSession } from './live-session.entity';
import { LiveTicket } from './live-ticket.entity';
import { SessionReplay } from './session-replay.entity';

@Module({
  imports: [TypeOrmModule.forFeature([LiveSession, LiveTicket, SessionReplay])],
  providers: [LiveService],
  controllers: [LiveController],
  exports: [LiveService],
})
export class LiveModule {}
