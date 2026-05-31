/**
 * =============================================================================
 * SocialActivityService - خدمة نشاط المستخدم الاجتماعي
 * =============================================================================
 * تجمع إحصائيات وتحليلات النشاط الاجتماعي للمستخدم.
 * تُستخدم في dashboard التحليلات والـ profile.
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Post } from './feed/post.entity';
import { PostLike } from './feed/post-like.entity';
import { PostComment } from './feed/post-comment.entity';
import { Reel } from './reels/reel.entity';
import { ReelEngagement } from './reels/reel-engagement.entity';
import { Story } from './stories/story.entity';

export interface UserActivityStats {
  userId: string;
  posts: {
    total: number;
    totalLikes: number;
    totalComments: number;
    totalShares: number;
    totalViews: number;
  };
  reels: {
    total: number;
    totalViews: number;
    totalCompletions: number;
    avgCompletionRate: number;
  };
  stories: {
    total: number;
    totalViews: number;
    totalReactions: number;
  };
  engagement: {
    postsLiked: number;
    commentsMade: number;
    reelsEngaged: number;
  };
}

@Injectable()
export class SocialActivityService {
  private readonly logger = new Logger(SocialActivityService.name);

  constructor(
    @InjectRepository(Post)
    private readonly postRepo: Repository<Post>,
    @InjectRepository(PostLike)
    private readonly likeRepo: Repository<PostLike>,
    @InjectRepository(PostComment)
    private readonly commentRepo: Repository<PostComment>,
    @InjectRepository(Reel)
    private readonly reelRepo: Repository<Reel>,
    @InjectRepository(ReelEngagement)
    private readonly reelEngagementRepo: Repository<ReelEngagement>,
    @InjectRepository(Story)
    private readonly storyRepo: Repository<Story>,
  ) {}

  /** الحصول على إحصائيات نشاط المستخدم */
  async getUserActivityStats(userId: string): Promise<UserActivityStats> {
    this.logger.debug('Getting activity stats for user %s', userId);

    // ─── إحصائيات المنشورات ───
    const [posts, totalPosts] = await this.postRepo.findAndCount({
      where: { user_id: userId },
    });

    const totalLikes = posts.reduce((sum, p) => sum + p.likes_count, 0);
    const totalComments = posts.reduce((sum, p) => sum + p.comments_count, 0);
    const totalShares = posts.reduce((sum, p) => sum + p.shares_count, 0);
    const totalViews = posts.reduce((sum, p) => sum + p.views_count, 0);

    // ─── إحصائيات الريلز ───
    const [reels, totalReels] = await this.reelRepo.findAndCount({
      where: { user_id: userId },
    });

    const reelViews = reels.reduce((sum, r) => sum + r.views_count, 0);
    const reelCompletions = reels.reduce((sum, r) => sum + r.completions_count, 0);
    const avgCompletionRate = reelViews > 0 ? (reelCompletions / reelViews) * 100 : 0;

    // ─── إحصائيات الستوريز ───
    const [stories, totalStories] = await this.storyRepo.findAndCount({
      where: { user_id: userId },
    });

    const storyViews = stories.reduce((sum, s) => sum + s.view_count, 0);
    const storyReactions = stories.reduce((sum, s) => sum + s.reaction_count, 0);

    // ─── إحصائيات التفاعل (ما فعله المستخدم مع محتوى الآخرين) ───
    const postsLiked = await this.likeRepo.count({ where: { user_id: userId } });
    const commentsMade = await this.commentRepo.count({ where: { user_id: userId } });
    const reelsEngaged = await this.reelEngagementRepo.count({ where: { user_id: userId } });

    return {
      userId,
      posts: {
        total: totalPosts,
        totalLikes,
        totalComments,
        totalShares,
        totalViews,
      },
      reels: {
        total: totalReels,
        totalViews: reelViews,
        totalCompletions: reelCompletions,
        avgCompletionRate: Math.round(avgCompletionRate * 100) / 100,
      },
      stories: {
        total: totalStories,
        totalViews: storyViews,
        totalReactions: storyReactions,
      },
      engagement: {
        postsLiked,
        commentsMade,
        reelsEngaged,
      },
    };
  }

  /** الحصول على أفضل المحتويات أداءً للمستخدم */
  async getTopPerformingContent(userId: string, limit = 5): Promise<{
    topPosts: Post[];
    topReels: Reel[];
    topStories: Story[];
  }> {
    const topPosts = await this.postRepo.find({
      where: { user_id: userId },
      order: { likes_count: 'DESC' },
      take: limit,
    });

    const topReels = await this.reelRepo.find({
      where: { user_id: userId },
      order: { views_count: 'DESC' },
      take: limit,
    });

    const topStories = await this.storyRepo.find({
      where: { user_id: userId },
      order: { view_count: 'DESC' },
      take: limit,
    });

    return { topPosts, topReels, topStories };
  }
}
