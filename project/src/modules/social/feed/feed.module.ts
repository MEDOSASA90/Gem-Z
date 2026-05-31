/**
 * =============================================================================
 * FeedModule - موديول الـ Feed
 * =============================================================================
 * يجمع كل مكونات الـ Feed: entities, repository, service, controller.
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeedController } from './feed.controller';
import { FeedService } from './feed.service';
import { FeedRepository } from './feed.repository';
import { Post } from './post.entity';
import { PostMedia } from './post-media.entity';
import { PostLike } from './post-like.entity';
import { PostComment } from './post-comment.entity';
import { PostShare } from './post-share.entity';
import { PostView } from './post-view.entity';
import { PostReport } from './post-report.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Post,
      PostMedia,
      PostLike,
      PostComment,
      PostShare,
      PostView,
      PostReport,
    ]),
  ],
  controllers: [FeedController],
  providers: [FeedService, FeedRepository],
  exports: [FeedService, FeedRepository],
})
export class FeedModule {}
