/**
 * =============================================================================
 * FeedService - خدمة الـ Feed الرئيسية
 * =============================================================================
 * توفر وظائف إنشاء المنشورات والتفاعل معها واسترجاع الـ Feeds المختلفة.
 * تنشر أحداثاً عبر EventBus عند حدوث تفاعلات.
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { FeedRepository } from './feed.repository';
import { EventBusService } from '../../../core/event-bus/event-bus.service';
import { AuditService } from '../../../core/audit/audit.service';
import {
  Post,
  PostStatus,
  PostVisibility,
  PostType,
} from './post.entity';
import { createClickHouseClient } from '../../../config/clickhouse.config';
import { PostMediaType } from './post-media.entity';
import {
  CreatePostDto,
  CreateCommentDto,
  SharePostDto,
  ReportPostDto,
  LikeResponseDto,
} from './feed.dto';

@Injectable()
export class FeedService {
  private readonly logger = new Logger(FeedService.name);
  private readonly MODULE_NAME = 'social.feed';

  constructor(
    private readonly feedRepository: FeedRepository,
    private readonly eventBus: EventBusService,
    private readonly auditService: AuditService,
    private readonly dataSource: DataSource,
  ) {}

  // ============================================================================
  // Feed Retrieval
  // ============================================================================

  /** الحصول على الـ Feed الشخصي (AI ranked) */
  async getPersonalizedFeed(userId: string, page = 1, limit = 20): Promise<Post[]> {
    this.logger.debug('Getting personalized feed for user %s', userId);
    return this.feedRepository.getPersonalizedFeed(userId, page, limit);
  }

  /** الحصول على التغذية الموصى بها بالذكاء الاصطناعي بنسب الأوزان الدستورية الخمسة */
  async getRecommendedFeed(userId: string, page = 1, limit = 20): Promise<Post[]> {
    this.logger.log(`Calculating AI recommendation feed for user ${userId} | Page: ${page}, Limit: ${limit}`);
    
    let scoresMap: Record<string, number> = {};
    let hasClickhouseData = false;

    // ─── 1. محاولة جلب الإشارات السلوكية من ClickHouse ───
    try {
      const chClient = createClickHouseClient();
      const resultSet = await chClient.query({
        query: `
          SELECT content_id,
                 sum(watch_time) as watch_time_val,
                 countIf(event_type = 'like' OR event_type = 'comment' OR event_type = 'share') as engagement_val,
                 sum(interest_match) as fitness_interests_val,
                 sum(friend_action) as friends_activity_val
          FROM gemz_analytics.content_signals
          WHERE timestamp >= now() - INTERVAL 30 DAY
          GROUP BY content_id
        `,
        format: 'JSONEachRow',
      });
      
      const rows = await resultSet.json() as any[];
      
      if (rows && rows.length > 0) {
        // حساب الـ Weighted Score ديناميكياً لكل منشور
        for (const row of rows) {
          const watchTime = parseFloat(row.watch_time_val || '0');
          const engagement = parseFloat(row.engagement_val || '0');
          const interests = parseFloat(row.fitness_interests_val || '0');
          const friends = parseFloat(row.friends_activity_val || '0');

          // دمج الأوزان: 60% + 20% + 10% + 10%
          const score = (watchTime * 0.60) + (engagement * 0.20) + (interests * 0.10) + (friends * 0.10);
          scoresMap[row.content_id] = score;
        }
        hasClickhouseData = true;
        this.logger.log(`Successfully parsed recommendation scores for ${rows.length} content entries from ClickHouse`);
      }
    } catch (err: any) {
      this.logger.warn(`ClickHouse query failed or timed out: ${err.message}. Triggering PostgreSQL local fallback strategy.`);
    }

    // ─── 2. استراتيجية التراجع المحلية (PostgreSQL Fallback Strategy) ───
    // إذا لم تتوفر بيانات ClickHouse، نقوم بحساب الـ score محلياً من إحصائيات التفاعل المخزنة
    let posts = await this.feedRepository.getActivePublicPostsForRecommendation();

    const rankedPosts = posts.map(post => {
      let score = 0;

      if (hasClickhouseData) {
        score = scoresMap[post.id] || 0;
      } else {
        // حساب محلي مبني على المقاييس الخمسة:
        // 60% watch_time (ممثلة محلياً بعدد المشاهدات ومؤشر المشاهدة المكتملة إن وجد)
        const localWatchTimeScore = post.views_count * 10; 
        
        // 20% engagement (ممثلة بالإعجابات، التعليقات، والمشاركات)
        const localEngagementScore = (post.likes_count * 2) + (post.comments_count * 3) + (post.shares_count * 5);
        
        // 10% user_fitness_interests (مطابقة هاشتاجات المنشور مع اهتمامات المستخدم المفترضة)
        const hasFitnessTags = post.content?.toLowerCase().match(/(workout|fitness|gym|nutrition|diet|training|healthy)/g);
        const localInterestsScore = hasFitnessTags ? 100 : 10;

        // 10% social_graph_friends_activity (تفاعل الأصدقاء - محاكاة baseline)
        const localFriendsScore = Math.floor(Math.random() * 50);

        // دمج الأوزان بدقة متناهية
        score = (localWatchTimeScore * 0.60) + (localEngagementScore * 0.20) + (localInterestsScore * 0.10) + (localFriendsScore * 0.10);
      }

      return { post, score };
    });

    // الترتيب التنازلي بناءً على النتيجة المحسوبة
    rankedPosts.sort((a, b) => b.score - a.score);

    // تطبيق الـ pagination
    const start = (page - 1) * limit;
    const paginated = rankedPosts.slice(start, start + limit).map(item => item.post);

    return paginated;
  }

  /** الحصول على منشورات المتابعين */
  async getFollowingFeed(userId: string, page = 1, limit = 20): Promise<Post[]> {
    this.logger.debug('Getting following feed for user %s', userId);
    return this.feedRepository.getFollowingFeed(userId, page, limit);
  }

  /** الحصول على المنشورات الرائجة */
  async getTrendingFeed(page = 1, limit = 20): Promise<Post[]> {
    this.logger.debug('Getting trending feed');
    return this.feedRepository.getTrendingFeed(page, limit);
  }

  /** الحصول على المحتوى الإقليمي */
  async getRegionalFeed(userId: string, region: string, page = 1, limit = 20): Promise<Post[]> {
    this.logger.debug('Getting regional feed for region %s', region);
    return this.feedRepository.getRegionalFeed(userId, region, page, limit);
  }

  // ============================================================================
  // Post CRUD
  // ============================================================================

  /** إنشاء منشور جديد مع الميديا */
  async createPost(userId: string, dto: CreatePostDto): Promise<Post> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // ─── إنشاء المنشور ───
      const metadata: Record<string, unknown> = {};
      if (dto.mentions) metadata.mentions = dto.mentions;
      if (dto.hashtags) metadata.hashtags = dto.hashtags;

      const post = await this.feedRepository.createPost({
        user_id: userId,
        content: dto.content || null,
        type: dto.type || PostType.TEXT,
        visibility: dto.visibility || PostVisibility.PUBLIC,
        status: PostStatus.ACTIVE,
        metadata: Object.keys(metadata).length > 0 ? metadata : null,
      });

      // ─── إضافة الميديا ───
      if (dto.media && dto.media.length > 0) {
        for (const mediaDto of dto.media) {
          await this.feedRepository.addMedia({
            post_id: post.id,
            type: mediaDto.type as PostMediaType,
            url: mediaDto.url,
            thumbnail: mediaDto.thumbnail || null,
            duration: mediaDto.duration || null,
            order: mediaDto.order || 0,
          });
        }
      }

      // ─── تحميل المنشور الكامل ───
      const fullPost = await this.feedRepository.findPostById(post.id);
      if (!fullPost) {
        throw new NotFoundException('Post not found after creation');
      }

      // ─── نشر حدث ───
      await this.eventBus.publishSimple(
        'POST_CREATED' as any,
        {
          post_id: post.id,
          user_id: userId,
          type: post.type,
          visibility: post.visibility,
          media_count: dto.media?.length || 0,
        },
        userId,
        this.MODULE_NAME,
      );

      // ─── Audit Log ───
      await this.auditService.logSimple('POST_CREATED', userId, 'POST', post.id);

      await queryRunner.commitTransaction();
      return fullPost;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Failed to create post: %s', (error as Error).message);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /** حذف منشور (soft delete) */
  async deletePost(userId: string, postId: string): Promise<void> {
    const post = await this.feedRepository.findPostById(postId);
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // التحقق من الملكية
    if (post.user_id !== userId) {
      throw new ForbiddenException('You can only delete your own posts');
    }

    await this.feedRepository.softDeletePost(postId);

    // إلغاء cache
    await this.feedRepository.invalidateUserFeedCache(userId);
    await this.feedRepository.invalidateTrendingCache();

    // نشر حدث
    await this.eventBus.publishSimple(
      'POST_DELETED' as any,
      { post_id: postId, user_id: userId },
      userId,
      this.MODULE_NAME,
    );

    // Audit Log
    await this.auditService.logSimple('POST_DELETED', userId, 'POST', postId);
  }

  // ============================================================================
  // Like Operations
  // ============================================================================

  /** تبديل الإعجاب (إضافة/إزالة) */
  async likePost(userId: string, postId: string): Promise<LikeResponseDto> {
    const post = await this.feedRepository.findPostById(postId);
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // التحقق من وجود إعجاب سابق
    const existingLike = await this.feedRepository.findLike(postId, userId);

    if (existingLike) {
      // ─── إزالة الإعجاب ───
      await this.feedRepository.removeLike(postId, userId);
      await this.feedRepository.decrementLikes(postId);

      // إلغاء cache
      await this.feedRepository.invalidateTrendingCache();

      return { liked: false, likesCount: post.likes_count - 1 };
    } else {
      // ─── إضافة إعجاب ───
      await this.feedRepository.addLike(postId, userId);
      await this.feedRepository.incrementLikes(postId);

      // نشر حدث
      await this.eventBus.publishSimple(
        'POST_LIKED' as any,
        { post_id: postId, user_id: userId, author_id: post.user_id },
        userId,
        this.MODULE_NAME,
      );

      // Audit Log
      await this.auditService.logSimple('POST_LIKED', userId, 'POST', postId);

      // إلغاء cache
      await this.feedRepository.invalidateTrendingCache();

      return { liked: true, likesCount: post.likes_count + 1 };
    }
  }

  // ============================================================================
  // Comment Operations
  // ============================================================================

  /** إضافة تعليق على منشور */
  async commentOnPost(
    userId: string,
    postId: string,
    dto: CreateCommentDto,
  ): Promise<import('./post-comment.entity').PostComment> {
    const post = await this.feedRepository.findPostById(postId);
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.status !== PostStatus.ACTIVE) {
      throw new BadRequestException('Cannot comment on inactive post');
    }

    // التحقق من وجود التعليق الأب (للردود)
    if (dto.parentId) {
      const parentComment = await this.feedRepository.findCommentById(dto.parentId);
      if (!parentComment || parentComment.post_id !== postId) {
        throw new BadRequestException('Parent comment not found or does not belong to this post');
      }
    }

    // ─── إنشاء التعليق ───
    const comment = await this.feedRepository.addComment({
      post_id: postId,
      user_id: userId,
      content: dto.content,
      parent_id: dto.parentId || null,
    });

    // ─── تحديث عدد التعليقات ───
    await this.feedRepository.incrementComments(postId);

    // ─── نشر حدث ───
    await this.eventBus.publishSimple(
      'POST_COMMENTED' as any,
      {
        post_id: postId,
        comment_id: comment.id,
        user_id: userId,
        author_id: post.user_id,
        parent_id: dto.parentId || null,
      },
      userId,
      this.MODULE_NAME,
    );

    // ─── Audit Log ───
    await this.auditService.logSimple('POST_COMMENTED', userId, 'POST', postId);

    // إلغاء cache
    await this.feedRepository.invalidateTrendingCache();

    return comment;
  }

  // ============================================================================
  // Share Operations
  // ============================================================================

  /** مشاركة منشور (Repost أو Quote) */
  async sharePost(userId: string, postId: string, dto: SharePostDto): Promise<import('./post-share.entity').PostShare> {
    const post = await this.feedRepository.findPostById(postId);
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.status !== PostStatus.ACTIVE) {
      throw new BadRequestException('Cannot share inactive post');
    }

    // منع إعادة نشر المنشور نفسه أكثر من مرة
    const existingShare = await (this.feedRepository as any)
      .findExistingShare?.(postId, userId)
      ?? null;
    if (existingShare) {
      throw new BadRequestException('You have already shared this post');
    }

    // ─── إنشاء المشاركة ───
    const share = await this.feedRepository.addShare({
      post_id: postId,
      user_id: userId,
      share_type: dto.shareType,
      content: dto.content || null,
    });

    // ─── تحديث عدد المشاركات ───
    await this.feedRepository.incrementShares(postId);

    // ─── نشر حدث ───
    await this.eventBus.publishSimple(
      'POST_SHARED' as any,
      {
        post_id: postId,
        share_id: share.id,
        user_id: userId,
        author_id: post.user_id,
        share_type: dto.shareType,
      },
      userId,
      this.MODULE_NAME,
    );

    // ─── Audit Log ───
    await this.auditService.logSimple('POST_SHARED', userId, 'POST', postId);

    // إلغاء cache
    await this.feedRepository.invalidateTrendingCache();

    return share;
  }

  // ============================================================================
  // Report Operations
  // ============================================================================

  /** الإبلاغ عن منشور */
  async reportPost(userId: string, postId: string, dto: ReportPostDto): Promise<import('./post-report.entity').PostReport> {
    const post = await this.feedRepository.findPostById(postId);
    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // منع الإبلاغ عن منشور أكثر من مرة
    const existingReport = await this.reportRepoFindByUser(postId, userId);
    if (existingReport) {
      throw new BadRequestException('You have already reported this post');
    }

    // ─── إنشاء البلاغ ───
    const report = await this.feedRepository.addReport({
      post_id: postId,
      reporter_id: userId,
      reason: dto.reason,
      description: dto.description || null,
    });

    // ─── نشر حدث ───
    await this.eventBus.publishSimple(
      'POST_REPORTED' as any,
      {
        post_id: postId,
        report_id: report.id,
        reporter_id: userId,
        author_id: post.user_id,
        reason: dto.reason,
      },
      userId,
      this.MODULE_NAME,
    );

    // ─── Audit Log ───
    await this.auditService.logSimple('POST_REPORTED', userId, 'POST', postId);

    return report;
  }

  /** تسجيل مشاهدة */
  async recordPostView(userId: string | null, postId: string, viewerIp?: string): Promise<void> {
    try {
      await this.feedRepository.recordView({
        post_id: postId,
        user_id: userId,
        viewer_ip: viewerIp || null,
      });
      await this.feedRepository.incrementViews(postId);
    } catch (error) {
      // لا نرمي خطأ - المشاهدة غير حرجة
      this.logger.warn('Failed to record view: %s', (error as Error).message);
    }
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  /** البحث عن بلاغ مستخدم سابق */
  private async reportRepoFindByUser(postId: string, userId: string): Promise<import('./post-report.entity').PostReport | null> {
    const reports = await this.feedRepository['reportRepo'].find({
      where: { post_id: postId, reporter_id: userId },
    });
    return reports.length > 0 ? reports[0] : null;
  }
}
