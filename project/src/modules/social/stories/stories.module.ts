/**
 * =============================================================================
 * StoriesModule - موديول الستوريز
 * =============================================================================
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { StoriesController } from './stories.controller';
import { StoriesService } from './stories.service';
import { Story } from './story.entity';
import { StoryView } from './story-view.entity';
import { StoryReaction } from './story-reaction.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Story, StoryView, StoryReaction]),
    ScheduleModule.forRoot(),
  ],
  controllers: [StoriesController],
  providers: [StoriesService],
  exports: [StoriesService],
})
export class StoriesModule {}
