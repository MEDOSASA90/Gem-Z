/**
 * =============================================================================
 * ReelsService - خدمة الريلز (الفيديوهات القصيرة)
 * =============================================================================
 * توفر رفع الفيديوهات القصيرة، تتبع وقت المشاهدة، completion rate،
 * وتحليلات التفاعل. تنشر أحداثاً عبر EventBus.
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Reel, ReelStatus } from './reel.entity';
import { ReelView } from './reel-view.entity';
import { ReelEngagement, ReelEngagementType } from './reel-engagement.entity';
import { EventBusService } from '../../../core/event-bus/event-bus.service';
import { AuditService } from '../../../core/audit/audit.service';
import { createElasticsearchClient } from '../../../config/elasticsearch.config';
import {
  UploadReelDto,
  EngagementDto,
  EngagementStatsDto,
} from './reels.dto';

@Injectable()
export class ReelsService {
  private readonly logger = new Logger(ReelsService.name);
  private readonly MODULE_NAME = 'social.reels';

  constructor(
    @InjectRepository(Reel)
    private readonly reelRepo: Repository<Reel>,
    @InjectRepository(ReelView)
    private readonly viewRepo: Repository<ReelView>,
    @InjectRepository(ReelEngagement)
    private readonly engagementRepo: Repository<ReelEngagement>,
    private readonly eventBus: EventBusService,
    private readonly auditService: AuditService,
  ) {}

  // ============================================================================
  // Upload & Create
  // ============================================================================

  /** رفع ريل جديد وبدء المعالجة */
  async uploadReel(userId: string, dto: UploadReelDto): Promise<Reel> {
    // ─── إنشاء الريل ───
    const metadata: Record<string, unknown> = {};
    if (dto.hashtags) metadata.hashtags = dto.hashtags;
    if (dto.mentions) metadata.mentions = dto.mentions;
    if (dto.duration) metadata.originalDuration = dto.duration;

    const reel = this.reelRepo.create({
      user_id: userId,
      title: dto.title || null,
      description: dto.description || null,
      video_url: dto.videoUrl,
      thumbnail_url: dto.thumbnailUrl || null,
      duration: dto.duration || null,
      status: ReelStatus.PENDING,
      metadata: Object.keys(metadata).length > 0 ? metadata : null,
    });

    const saved = await this.reelRepo.save(reel);

    this.logger.log('Reel uploaded: %s by user %s', saved.id, userId);

    // ─── نشر حدث رفع الريل ───
    await this.eventBus.publishSimple(
      'REEL_UPLOADED' as any,
      {
        reel_id: saved.id,
        user_id: userId,
        video_url: dto.videoUrl,
        duration: dto.duration,
      },
      userId,
      this.MODULE_NAME,
    );

    // ─── Audit Log ───
    await this.auditService.logSimple('REEL_UPLOADED', userId, 'REEL', saved.id);

    // ─── الفهرسة غير المتزامنة في Elasticsearch لضمان عدم تأثر المعاملة الأساسية بأي انقطاع مؤقت ───
    this.indexReelInElasticsearch(saved).catch((err) => {
      this.logger.error(`Error spawned from background ES indexing for reel ${saved.id}: ${err.message}`);
    });

    // ─── trigger transcoding (async) ───
    // TODO: إرسال مهمة إلى queue لتحويل الفيديو
    await this.triggerTranscoding(saved.id);

    return saved;
  }

  /** إنشاء ريل جديد (Alias متوافق مع المصفات) */
  async createReel(userId: string, dto: UploadReelDto): Promise<Reel> {
    return this.uploadReel(userId, dto);
  }

  /** الفهرسة الفعلية في Elasticsearch بمرونة عالية وحماية من أي استثناءات */
  private async indexReelInElasticsearch(reel: Reel): Promise<void> {
    try {
      const client = createElasticsearchClient();
      const hashtags = reel.metadata && (reel.metadata as any).hashtags ? (reel.metadata as any).hashtags : [];
      const mentions = reel.metadata && (reel.metadata as any).mentions ? (reel.metadata as any).mentions : [];

      await client.index({
        index: 'reels_index',
        id: reel.id,
        document: {
          id: reel.id,
          user_id: reel.user_id,
          title: reel.title || '',
          description: reel.description || '',
          video_url: reel.video_url,
          duration: reel.duration ? Number(reel.duration) : 0,
          hashtags,
          mentions,
          status: reel.status,
          created_at: reel.created_at,
        },
      });

      this.logger.log(`Successfully indexed reel metadata ${reel.id} in Elasticsearch`);
    } catch (error: any) {
      this.logger.error(
        `Failed to index reel ${reel.id} in Elasticsearch asynchronously: ${error.message}`
      );
    }
  }

  /** بدء تحويل الفيديو - placeholder لـ video processing queue */
  private async triggerTranscoding(reelId: string): Promise<void> {
    // تحديث الحالة إلى PROCESSING
    await this.reelRepo.update(reelId, { status: ReelStatus.PROCESSING });

    // TODO: إرسال مهمة إلى Video Transcoding Service
    // بعد اكتمال المعالجة، يتم تحديث الحالة إلى PUBLISHED
    this.logger.debug('Transcoding triggered for reel %s', reelId);

    // محاكاة اكتمال المعالجة بعد فترة (في الإنتاج يكون هذا من الـ queue worker)
    // setTimeout(async () => {
    //   await this.reelRepo.update(reelId, { status: ReelStatus.PUBLISHED });
    // }, 5000);
  }

  /** تحديث حالة الريل بعد اكتمال المعالجة */
  async publishReel(reelId: string): Promise<void> {
    await this.reelRepo.update(reelId, { status: ReelStatus.PUBLISHED });
    this.logger.log('Reel published: %s', reelId);
  }

  // ============================================================================
  // Feed
  // ============================================================================

  /** الحصول على feed الريلز الشخصي */
  async getReelFeed(userId: string, page = 1, limit = 20): Promise<Reel[]> {
    const reels = await this.reelRepo.find({
      where: { status: ReelStatus.PUBLISHED, deleted_at: IsNull() },
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return reels;
  }

  /** الحصول على ريل بمعرفه */
  async getReelById(reelId: string): Promise<Reel | null> {
    return this.reelRepo.findOne({
      where: { id: reelId, deleted_at: IsNull() },
    });
  }

  // ============================================================================
  // View Tracking
  // ============================================================================

  /** تسجيل مشاهدة ريل */
  async recordView(
    userId: string | null,
    reelId: string,
    watchDuration = 0,
    completed = false,
  ): Promise<ReelView> {
    const reel = await this.getReelById(reelId);
    if (!reel) {
      throw new NotFoundException('Reel not found');
    }

    // ─── تسجيل المشاهدة ───
    const view = this.viewRepo.create({
      reel_id: reelId,
      user_id: userId,
      watch_duration: watchDuration,
      completed,
    });

    const savedView = await this.viewRepo.save(view);

    // ─── تحديث عدادات الريل ───
    await this.reelRepo.increment({ id: reelId }, 'views_count', 1);

    if (completed) {
      await this.reelRepo.increment({ id: reelId }, 'completions_count', 1);
    }

    // ─── نشر حدث ───
    await this.eventBus.publishSimple(
      'REEL_VIEWED' as any,
      {
        reel_id: reelId,
        user_id: userId,
        watch_duration: watchDuration,
        completed,
      },
      userId || 'anonymous',
      this.MODULE_NAME,
    );

    if (completed) {
      await this.eventBus.publishSimple(
        'REEL_COMPLETED' as any,
        { reel_id: reelId, user_id: userId },
        userId || 'anonymous',
        this.MODULE_NAME,
      );
    }

    return savedView;
  }

  // ============================================================================
  // Engagement
  // ============================================================================

  /** إضافة تفاعل على ريل */
  async addEngagement(
    userId: string,
    reelId: string,
    dto: EngagementDto,
  ): Promise<ReelEngagement> {
    const reel = await this.getReelById(reelId);
    if (!reel) {
      throw new NotFoundException('Reel not found');
    }

    if (reel.status !== ReelStatus.PUBLISHED) {
      throw new BadRequestException('Cannot engage with unpublished reel');
    }

    // التحقق من عدم وجود تفاعل سابق من نفس النوع
    const existing = await this.engagementRepo.findOne({
      where: { reel_id: reelId, user_id: userId, type: dto.type },
    });

    if (existing) {
      throw new BadRequestException(`Already ${dto.type.toLowerCase()}d this reel`);
    }

    // ─── إنشاء التفاعل ───
    const engagement = this.engagementRepo.create({
      reel_id: reelId,
      user_id: userId,
      type: dto.type,
    });

    const saved = await this.engagementRepo.save(engagement);

    // ─── تحديث العدادات ───
    const counterMap: Record<ReelEngagementType, string> = {
      [ReelEngagementType.LIKE]: 'likes_count',
      [ReelEngagementType.COMMENT]: 'comments_count',
      [ReelEngagementType.SHARE]: 'share_count',
      [ReelEngagementType.SAVE]: 'share_count', // TODO: add saves_count column
    };

    await this.reelRepo.increment({ id: reelId }, counterMap[dto.type], 1);

    // ─── نشر حدث ───
    if (dto.type === ReelEngagementType.LIKE) {
      await this.eventBus.publishSimple(
        'REEL_LIKED' as any,
        { reel_id: reelId, user_id: userId, author_id: reel.user_id },
        userId,
        this.MODULE_NAME,
      );
    }

    // ─── Audit Log ───
    await this.auditService.logSimple(
      `REEL_${dto.type}d`,
      userId,
      'REEL',
      reelId,
    );

    return saved;
  }

  /** إزالة تفاعل (إلغاء إعجاب مثلاً) */
  async removeEngagement(userId: string, reelId: string, type: ReelEngagementType): Promise<void> {
    const result = await this.engagementRepo.delete({
      reel_id: reelId,
      user_id: userId,
      type,
    });

    if (result.affected && result.affected > 0) {
      const counterMap: Record<ReelEngagementType, string> = {
        [ReelEngagementType.LIKE]: 'likes_count',
        [ReelEngagementType.COMMENT]: 'comments_count',
        [ReelEngagementType.SHARE]: 'share_count',
        [ReelEngagementType.SAVE]: 'share_count',
      };

      await this.reelRepo.decrement({ id: reelId }, counterMap[type], 1);
    }
  }

  // ============================================================================
  // Analytics
  // ============================================================================

  /** إحصائيات تفاعل ريل */
  async getEngagementStats(reelId: string): Promise<EngagementStatsDto> {
    const reel = await this.reelRepo.findOne({
      where: { id: reelId, deleted_at: IsNull() },
    });

    if (!reel) {
      throw new NotFoundException('Reel not found');
    }

    // حساب متوسط مدة المشاهدة
    const avgWatchResult = await this.viewRepo
      .createQueryBuilder('view')
      .select('AVG(view.watch_duration)', 'avg')
      .where('view.reel_id = :reelId', { reelId })
      .getRawOne();

    const avgWatchDuration = parseFloat(avgWatchResult?.avg || '0');

    // حساب إجمالي مدة المشاهدة
    const totalWatchResult = await this.viewRepo
      .createQueryBuilder('view')
      .select('SUM(view.watch_duration)', 'total')
      .where('view.reel_id = :reelId', { reelId })
      .getRawOne();

    const totalWatchDuration = parseFloat(totalWatchResult?.total || '0');

    // عدد كل نوع تفاعل
    const engagementCounts = await this.engagementRepo
      .createQueryBuilder('eng')
      .select('eng.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('eng.reel_id = :reelId', { reelId })
      .groupBy('eng.type')
      .getRawMany();

    const countsMap: Record<string, number> = {};
    for (const row of engagementCounts) {
      countsMap[row.type] = parseInt(row.count, 10);
    }

    const views = reel.views_count;
    const completions = reel.completions_count;

    return {
      reelId,
      views,
      completions,
      completionRate: views > 0 ? (completions / views) * 100 : 0,
      likes: countsMap[ReelEngagementType.LIKE] || 0,
      comments: countsMap[ReelEngagementType.COMMENT] || 0,
      shares: countsMap[ReelEngagementType.SHARE] || 0,
      saves: countsMap[ReelEngagementType.SAVE] || 0,
      avgWatchDuration: Math.round(avgWatchDuration * 100) / 100,
      totalWatchDuration: Math.round(totalWatchDuration * 100) / 100,
    };
  }

  // ============================================================================
  // Delete
  // ============================================================================

  /** حذف ريل (soft delete) */
  async deleteReel(userId: string, reelId: string): Promise<void> {
    const reel = await this.reelRepo.findOne({
      where: { id: reelId, deleted_at: IsNull() },
    });

    if (!reel) {
      throw new NotFoundException('Reel not found');
    }

    if (reel.user_id !== userId) {
      throw new BadRequestException('You can only delete your own reels');
    }

    await this.reelRepo.softDelete(reelId);

    await this.auditService.logSimple('REEL_DELETED', userId, 'REEL', reelId);
  }
}
