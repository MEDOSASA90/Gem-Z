/**
 * =============================================================================
 * SocialFeedService - خدمة الـ Feed الموحدة
 * =============================================================================
 * تجمع المحتوى من كل المصادر (Posts, Reels, Stories) في feed واحد موحد.
 * تُستخدم من الـ client لجلب كل المحتوى الاجتماعي في مكالمة واحدة.
 */

import { Injectable, Logger } from '@nestjs/common';
import { FeedService } from './feed/feed.service';
import { ReelsService } from './reels/reels.service';
import { StoriesService } from './stories/stories.service';

export interface UnifiedFeedItem {
  id: string;
  type: 'POST' | 'REEL' | 'STORY';
  source: string;
  data: unknown;
  createdAt: Date;
  priority: number;
}

@Injectable()
export class SocialFeedService {
  private readonly logger = new Logger(SocialFeedService.name);

  constructor(
    private readonly feedService: FeedService,
    private readonly reelsService: ReelsService,
    private readonly storiesService: StoriesService,
  ) {}

  /**
   * الحصول على الـ Feed الموحد للمستخدم
   * يجمع المنشورات والريلز والستوريز في قائمة واحدة مرتبة
   */
  async getUnifiedFeed(
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<{ stories: unknown[]; feed: UnifiedFeedItem[] }> {
    this.logger.debug('Getting unified feed for user %s', userId);

    // ─── جلب الستوريز منفصلة (تظهر في الأعلى دائماً) ───
    const activeStories = await this.storiesService.getActiveStories(userId);

    // ─── جلب المنشورات ───
    const posts = await this.feedService.getPersonalizedFeed(userId, page, limit);

    // ─── جلب الريلز ───
    const reels = await this.reelsService.getReelFeed(userId, page, Math.ceil(limit / 2));

    // ─── تحويل إلى تنسيق موحد ───
    const postItems: UnifiedFeedItem[] = posts.map((post) => ({
      id: post.id,
      type: 'POST' as const,
      source: 'feed',
      data: post,
      createdAt: post.created_at,
      priority: this.calculatePostPriority(post),
    }));

    const reelItems: UnifiedFeedItem[] = reels.map((reel) => ({
      id: reel.id,
      type: 'REEL' as const,
      source: 'reels',
      data: reel,
      createdAt: reel.created_at,
      priority: this.calculateReelPriority(reel),
    }));

    // ─── دمج وترتيب ───
    const combined = [...postItems, ...reelItems].sort((a, b) => {
      // ترتيب حسب الأولوية ثم التاريخ
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    // تطبيق pagination
    const paginated = combined.slice(0, limit);

    return {
      stories: activeStories,
      feed: paginated,
    };
  }

  /** حساب أولوية المنشور (للـ ranking) */
  private calculatePostPriority(post: { likes_count: number; comments_count: number; created_at: Date }): number {
    const hoursAgo = (Date.now() - post.created_at.getTime()) / (1000 * 60 * 60);
    const recencyScore = Math.max(0, 24 - hoursAgo); // أعلى للمنشورات الجديدة
    const engagementScore = post.likes_count * 0.5 + post.comments_count * 1.5;
    return recencyScore + engagementScore;
  }

  /** حساب أولوية الريل */
  private calculateReelPriority(reel: { views_count: number; completions_count: number; created_at: Date }): number {
    const hoursAgo = (Date.now() - reel.created_at.getTime()) / (1000 * 60 * 60);
    const recencyScore = Math.max(0, 24 - hoursAgo);
    const engagementScore = reel.views_count * 0.3 + reel.completions_count * 2;
    return recencyScore + engagementScore;
  }
}
