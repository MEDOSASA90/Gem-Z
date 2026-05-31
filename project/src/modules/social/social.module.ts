/**
 * =============================================================================
 * SocialModule - الموديول الرئيسي للنظام الاجتماعي
 * =============================================================================
 * يجمع كل الموديولات الفرعية: Feed, Reels, Stories, Messaging, Communities.
 * يوفر نقطة دخول واحدة لكل الوظائف الاجتماعية في GEM Z.
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// ─── Sub-modules ───
import { FeedModule } from './feed/feed.module';
import { ReelsModule } from './reels/reels.module';
import { StoriesModule } from './stories/stories.module';
import { MessagingModule } from './messaging/messaging.module';
import { CommunitiesModule } from './communities/communities.module';

// ─── Entities for SocialActivityService ───
import { Post } from './feed/post.entity';
import { PostLike } from './feed/post-like.entity';
import { PostComment } from './feed/post-comment.entity';
import { Reel } from './reels/reel.entity';
import { ReelEngagement } from './reels/reel-engagement.entity';
import { Story } from './stories/story.entity';

// ─── Cross-module services ───
import { SocialFeedService } from './social-feed.service';
import { SocialActivityService } from './social-activity.service';

@Module({
  imports: [
    FeedModule,
    ReelsModule,
    StoriesModule,
    MessagingModule,
    CommunitiesModule,
    TypeOrmModule.forFeature([
      Post,
      PostLike,
      PostComment,
      Reel,
      ReelEngagement,
      Story,
    ]),
  ],
  controllers: [],
  providers: [SocialFeedService, SocialActivityService],
  exports: [
    FeedModule,
    ReelsModule,
    StoriesModule,
    MessagingModule,
    CommunitiesModule,
    SocialFeedService,
    SocialActivityService,
  ],
})
export class SocialModule {}
