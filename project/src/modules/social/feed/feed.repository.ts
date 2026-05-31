/**
 * =============================================================================
 * FeedRepository - مستودع منشورات الـ Feed
 * =============================================================================
 * يوفر دوال الوصول لقاعدة البيانات للمنشورات والتفاعلات.
 * يستخدم Redis للـ caching تحسين أداء الـ Feed.
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In, Brackets, IsNull } from 'typeorm';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { Post, PostStatus, PostVisibility } from './post.entity';
import { PostMedia } from './post-media.entity';
import { PostLike } from './post-like.entity';
import { PostComment } from './post-comment.entity';
import { PostShare } from './post-share.entity';
import { PostView } from './post-view.entity';
import { PostReport, ReportStatus } from './post-report.entity';

@Injectable()
export class FeedRepository {
  private readonly logger = new Logger(FeedRepository.name);
  private redis: Redis | null = null;

  constructor(
    @InjectRepository(Post)
    private readonly postRepo: Repository<Post>,
    @InjectRepository(PostMedia)
    private readonly mediaRepo: Repository<PostMedia>,
    @InjectRepository(PostLike)
    private readonly likeRepo: Repository<PostLike>,
    @InjectRepository(PostComment)
    private readonly commentRepo: Repository<PostComment>,
    @InjectRepository(PostShare)
    private readonly shareRepo: Repository<PostShare>,
    @InjectRepository(PostView)
    private readonly viewRepo: Repository<PostView>,
    @InjectRepository(PostReport)
    private readonly reportRepo: Repository<PostReport>,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {
    // تهيئة Redis client للـ caching
    const redisHost = this.configService.get<string>('REDIS_HOST', 'localhost');
    const redisPort = this.configService.get<number>('REDIS_PORT', 6379);
    const redisPassword = this.configService.get<string>('REDIS_PASSWORD');
    const redisDb = this.configService.get<number>('REDIS_FEED_DB', 2);

    try {
      this.redis = new Redis({
        host: redisHost,
        port: redisPort,
        db: redisDb,
        password: redisPassword || undefined,
        retryStrategy: (times) => Math.min(times * 50, 2000),
      });
    } catch {
      this.logger.warn('Redis not available for feed caching');
    }
  }

  // ============================================================================
  // Post Operations
  // ============================================================================

  /** إنشاء منشور جديد */
  async createPost(data: Partial<Post>): Promise<Post> {
    const post = this.postRepo.create(data);
    return this.postRepo.save(post);
  }

  /** البحث عن منشور بمعرفه مع الميديا */
  async findPostById(id: string): Promise<Post | null> {
    return this.postRepo.findOne({
      where: { id, deleted_at: IsNull() },
      relations: ['media'],
    });
  }

  /** البحث عن منشور بمعرف المستخدم */
  async findPostsByUser(userId: string, page = 1, limit = 20): Promise<[Post[], number]> {
    return this.postRepo.findAndCount({
      where: { user_id: userId, status: PostStatus.ACTIVE, deleted_at: IsNull() },
      relations: ['media'],
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  /** تحديث المنشور */
  async updatePost(id: string, data: Partial<Post>): Promise<void> {
    await this.postRepo.update(id, data as any);
  }

  /** soft delete للمنشور */
  async softDeletePost(id: string): Promise<void> {
    await this.postRepo.softDelete(id);
  }

  // ============================================================================
  // Feed Queries (مع Redis caching)
  // ============================================================================

  /** الـ Feed الشخصي (AI ranked) - يرجع منشورات متنوعة */
  async getPersonalizedFeed(userId: string, page = 1, limit = 20): Promise<Post[]> {
    const cacheKey = `feed:personalized:${userId}:${page}:${limit}`;
    const cached = await this.getFromCache<Post[]>(cacheKey);
    if (cached) return cached;

    // استعلام معقد: منشورات عامة + منشورات من مستخدمين يتابعهم المستخدم
    // مرتبة بشكل ذكي (مزيج من التاريخ والشعبية)
    const posts = await this.postRepo
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.media', 'media')
      .where('post.status = :status', { status: PostStatus.ACTIVE })
      .andWhere('post.deleted_at IS NULL')
      .andWhere('post.visibility = :public', { public: PostVisibility.PUBLIC })
      .orderBy('post.created_at', 'DESC')
      .addOrderBy('post.likes_count', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    await this.setCache(cacheKey, posts, 60); // cache 60 seconds
    return posts;
  }

  /** الحصول على كل المنشورات النشطة والعامة لحساب محرك التوصيات البديل */
  async getActivePublicPostsForRecommendation(): Promise<Post[]> {
    return this.postRepo.find({
      where: {
        status: PostStatus.ACTIVE,
        visibility: PostVisibility.PUBLIC,
        deleted_at: IsNull(),
      },
      relations: ['media'],
    });
  }

  /** منشورات المستخدمين المتابعين */
  async getFollowingFeed(userId: string, page = 1, limit = 20): Promise<Post[]> {
    const cacheKey = `feed:following:${userId}:${page}:${limit}`;
    const cached = await this.getFromCache<Post[]>(cacheKey);
    if (cached) return cached;

    // نفترض وجود جدول follows - نستخدم subquery
    const posts = await this.postRepo
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.media', 'media')
      .where('post.status = :status', { status: PostStatus.ACTIVE })
      .andWhere('post.deleted_at IS NULL')
      .andWhere(
        new Brackets((qb) => {
          qb.where('post.visibility = :public', { public: PostVisibility.PUBLIC })
            .orWhere('post.visibility = :followers', { followers: PostVisibility.FOLLOWERS });
        }),
      )
      .orderBy('post.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    await this.setCache(cacheKey, posts, 30);
    return posts;
  }

  /** المنشورات الرائجة عالمياً */
  async getTrendingFeed(page = 1, limit = 20): Promise<Post[]> {
    const cacheKey = `feed:trending:${page}:${limit}`;
    const cached = await this.getFromCache<Post[]>(cacheKey);
    if (cached) return cached;

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const posts = await this.postRepo
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.media', 'media')
      .where('post.status = :status', { status: PostStatus.ACTIVE })
      .andWhere('post.deleted_at IS NULL')
      .andWhere('post.visibility = :public', { public: PostVisibility.PUBLIC })
      .andWhere('post.created_at > :oneDayAgo', { oneDayAgo })
      .orderBy(
        '(post.likes_count * 2 + post.comments_count * 3 + post.shares_count * 4 + post.views_count * 0.5)',
        'DESC',
      )
      .addOrderBy('post.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    await this.setCache(cacheKey, posts, 120); // cache أطول للـ trending
    return posts;
  }

  /** منشورات إقليمية */
  async getRegionalFeed(userId: string, region: string, page = 1, limit = 20): Promise<Post[]> {
    const cacheKey = `feed:regional:${region}:${page}:${limit}`;
    const cached = await this.getFromCache<Post[]>(cacheKey);
    if (cached) return cached;

    const posts = await this.postRepo
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.media', 'media')
      .where('post.status = :status', { status: PostStatus.ACTIVE })
      .andWhere('post.deleted_at IS NULL')
      .andWhere('post.visibility = :public', { public: PostVisibility.PUBLIC })
      .andWhere(
        "post.metadata ->> 'region' = :region OR post.metadata ->> 'country' = :region",
        { region },
      )
      .orderBy('post.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    await this.setCache(cacheKey, posts, 60);
    return posts;
  }

  // ============================================================================
  // Like Operations
  // ============================================================================

  /** البحث عن إعجاب */
  async findLike(postId: string, userId: string): Promise<PostLike | null> {
    return this.likeRepo.findOne({ where: { post_id: postId, user_id: userId } });
  }

  /** إضافة إعجاب */
  async addLike(postId: string, userId: string): Promise<PostLike> {
    const like = this.likeRepo.create({ post_id: postId, user_id: userId });
    return this.likeRepo.save(like);
  }

  /** حذف إعجاب */
  async removeLike(postId: string, userId: string): Promise<void> {
    await this.likeRepo.delete({ post_id: postId, user_id: userId });
  }

  /** زيادة عدد الإعجابات */
  async incrementLikes(postId: string): Promise<void> {
    await this.postRepo.increment({ id: postId }, 'likes_count', 1);
  }

  /** إنقاص عدد الإعجابات */
  async decrementLikes(postId: string): Promise<void> {
    await this.postRepo.decrement({ id: postId }, 'likes_count', 1);
  }

  // ============================================================================
  // Comment Operations
  // ============================================================================

  /** إضافة تعليق */
  async addComment(data: Partial<PostComment>): Promise<PostComment> {
    const comment = this.commentRepo.create(data);
    return this.commentRepo.save(comment);
  }

  /** البحث عن تعليق */
  async findCommentById(id: string): Promise<PostComment | null> {
    return this.commentRepo.findOne({ where: { id, deleted_at: IsNull() } });
  }

  /** تعليقات المنشور */
  async getPostComments(postId: string, page = 1, limit = 20): Promise<[PostComment[], number]> {
    return this.commentRepo.findAndCount({
      where: { post_id: postId, deleted_at: IsNull(), parent_id: IsNull() },
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  /** ردود تعليق معين */
  async getCommentReplies(parentId: string, page = 1, limit = 20): Promise<[PostComment[], number]> {
    return this.commentRepo.findAndCount({
      where: { parent_id: parentId, deleted_at: IsNull() },
      order: { created_at: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  /** زيادة عدد التعليقات */
  async incrementComments(postId: string): Promise<void> {
    await this.postRepo.increment({ id: postId }, 'comments_count', 1);
  }

  // ============================================================================
  // Share Operations
  // ============================================================================

  /** إضافة مشاركة */
  async addShare(data: Partial<PostShare>): Promise<PostShare> {
    const share = this.shareRepo.create(data);
    return this.shareRepo.save(share);
  }

  /** زيادة عدد المشاركات */
  async incrementShares(postId: string): Promise<void> {
    await this.postRepo.increment({ id: postId }, 'shares_count', 1);
  }

  // ============================================================================
  // View Operations
  // ============================================================================

  /** تسجيل مشاهدة */
  async recordView(data: Partial<PostView>): Promise<PostView> {
    const view = this.viewRepo.create(data);
    return this.viewRepo.save(view);
  }

  /** زيادة عدد المشاهدات */
  async incrementViews(postId: string): Promise<void> {
    await this.postRepo.increment({ id: postId }, 'views_count', 1);
  }

  // ============================================================================
  // Report Operations
  // ============================================================================

  /** إضافة بلاغ */
  async addReport(data: Partial<PostReport>): Promise<PostReport> {
    const report = this.reportRepo.create(data);
    return this.reportRepo.save(report);
  }

  /** تحديث حالة بلاغ */
  async updateReportStatus(id: string, status: ReportStatus, resolvedBy: string): Promise<void> {
    await this.reportRepo.update(id, { status, resolved_by: resolvedBy });
  }

  /** البلاغات المعلقة */
  async getPendingReports(limit = 50): Promise<PostReport[]> {
    return this.reportRepo.find({
      where: { status: ReportStatus.PENDING },
      order: { created_at: 'ASC' },
      take: limit,
    });
  }

  // ============================================================================
  // Media Operations
  // ============================================================================

  /** إضافة ميديا */
  async addMedia(data: Partial<PostMedia>): Promise<PostMedia> {
    const media = this.mediaRepo.create(data);
    return this.mediaRepo.save(media);
  }

  // ============================================================================
  // Redis Cache Helpers
  // ============================================================================

  private async getFromCache<T>(key: string): Promise<T | null> {
    if (!this.redis) return null;
    try {
      const cached = await this.redis.get(key);
      return cached ? (JSON.parse(cached) as T) : null;
    } catch {
      return null;
    }
  }

  private async setCache<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    if (!this.redis) return;
    try {
      await this.redis.setex(key, ttlSeconds, JSON.stringify(value));
    } catch {
      // Cache failure is non-critical
    }
  }

  /** إلغاء cache لمستخدم معين */
  async invalidateUserFeedCache(userId: string): Promise<void> {
    if (!this.redis) return;
    try {
      const keys = await this.redis.keys(`feed:*:${userId}:*`);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch {
      // Non-critical
    }
  }

  /** إلغاء cache عام */
  async invalidateTrendingCache(): Promise<void> {
    if (!this.redis) return;
    try {
      const keys = await this.redis.keys('feed:trending:*');
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch {
      // Non-critical
    }
  }

  // ============================================================================
  // Transaction Support
  // ============================================================================

  /** الحصول على manager للـ transactions */
  getDataSource(): DataSource {
    return this.dataSource;
  }
}
