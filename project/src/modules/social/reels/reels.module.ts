/**
 * =============================================================================
 * ReelsModule - موديول الريلز
 * =============================================================================
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReelsController } from './reels.controller';
import { ReelsService } from './reels.service';
import { Reel } from './reel.entity';
import { ReelView } from './reel-view.entity';
import { ReelEngagement } from './reel-engagement.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Reel, ReelView, ReelEngagement])],
  controllers: [ReelsController],
  providers: [ReelsService],
  exports: [ReelsService],
})
export class ReelsModule {}
