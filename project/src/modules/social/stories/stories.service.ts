/**
 * =============================================================================
 * StoriesService - خدمة الستوريز
 * =============================================================================
 * توفر إنشاء وإدارة الستوريز مع انتهاء صلاحية تلقائي بعد 24 ساعة.
 * تتضمن cron job لإنهاء الستوريز القديمة.
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Story, StoryStatus, StoryType } from './story.entity';
import { StoryView } from './story-view.entity';
import { StoryReaction, StoryReactionType } from './story-reaction.entity';
import { EventBusService } from '../../../core/event-bus/event-bus.service';
import { AuditService } from '../../../core/audit/audit.service';
import { CreateStoryDto, AddReactionDto } from './stories.dto';

@Injectable()
export class StoriesService {
  private readonly logger = new Logger(StoriesService.name);
  private readonly MODULE_NAME = 'social.stories';
  private readonly STORY_EXPIRY_HOURS = 24;

  constructor(
    @InjectRepository(Story)
    private readonly storyRepo: Repository<Story>,
    @InjectRepository(StoryView)
    private readonly viewRepo: Repository<StoryView>,
    @InjectRepository(StoryReaction)
    private readonly reactionRepo: Repository<StoryReaction>,
    private readonly eventBus: EventBusService,
    private readonly auditService: AuditService,
  ) {}

  // ============================================================================
  // Create
  // ============================================================================

  /** إنشاء ستوري جديد (تنتهي صلاحيته تلقائياً بعد 24 ساعة) */
  async createStory(userId: string, dto: CreateStoryDto): Promise<Story> {
    // حساب تاريخ الانتهاء
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + this.STORY_EXPIRY_HOURS);

    // تحديد المدة الافتراضية
    const duration = dto.duration || (dto.type === StoryType.VIDEO ? 15 : 5);

    // ─── إنشاء الستوري ───
    const story = this.storyRepo.create({
      user_id: userId,
      media_url: dto.mediaUrl,
      type: dto.type,
      duration,
      status: StoryStatus.ACTIVE,
      expires_at: expiresAt,
    });

    const saved = await this.storyRepo.save(story);

    this.logger.log('Story created: %s by user %s, expires at %s', saved.id, userId, expiresAt.toISOString());

    // ─── نشر حدث ───
    await this.eventBus.publishSimple(
      'STORY_CREATED' as any,
      {
        story_id: saved.id,
        user_id: userId,
        type: saved.type,
        expires_at: expiresAt.toISOString(),
      },
      userId,
      this.MODULE_NAME,
    );

    // ─── Audit Log ───
    await this.auditService.logSimple('STORY_CREATED', userId, 'STORY', saved.id);

    return saved;
  }

  // ============================================================================
  // Read
  // ============================================================================

  /** الحصول على الستوريز النشطة من المستخدمين المتابعين */
  async getActiveStories(userId: string): Promise<Story[]> {
    const now = new Date();

    const stories = await this.storyRepo.find({
      where: {
        status: StoryStatus.ACTIVE,
        expires_at: LessThan(now), // Actually we need > now, but LessThan is the TypeORM operator
      },
      order: { created_at: 'DESC' },
    });

    // تصفية الستوريز التي لم تنتهِ صلاحيتها بعد (expires_at > now)
    const activeStories = stories.filter((s) => s.expires_at > now);

    // تحميل حالة المشاهدة لكل ستوري
    const storyIds = activeStories.map((s) => s.id);
    const views = await this.viewRepo.find({
      where: { viewer_id: userId },
    });
    const viewedStoryIds = new Set(views.map((v) => v.story_id));

    // إضافة معلومة هل شاهد المستخدم الستوري
    for (const story of activeStories) {
      (story as any).hasViewed = viewedStoryIds.has(story.id);
    }

    return activeStories;
  }

  /** الحصول على ستوري بمعرفه */
  async getStoryById(storyId: string): Promise<Story | null> {
    return this.storyRepo.findOne({
      where: { id: storyId, status: StoryStatus.ACTIVE },
    });
  }

  /** الحصول على ستوريز مستخدم معين */
  async getUserStories(userId: string, currentUserId: string): Promise<Story[]> {
    const now = new Date();

    const stories = await this.storyRepo.find({
      where: {
        user_id: userId,
        status: StoryStatus.ACTIVE,
      },
      order: { created_at: 'DESC' },
    });

    // تصفية غير المنتهية
    return stories.filter((s) => s.expires_at > now);
  }

  // ============================================================================
  // View
  // ============================================================================

  /** تسجيل مشاهدة ستوري */
  async viewStory(storyId: string, viewerId: string): Promise<StoryView> {
    const story = await this.storyRepo.findOne({
      where: { id: storyId, status: StoryStatus.ACTIVE },
    });

    if (!story) {
      throw new NotFoundException('Story not found or expired');
    }

    if (story.user_id === viewerId) {
      // المستخدم لا يمكنه تسجيل مشاهدة لستوري الخاص به
      throw new BadRequestException('Cannot view your own story');
    }

    // التحقق من عدم وجود مشاهدة سابقة
    const existingView = await this.viewRepo.findOne({
      where: { story_id: storyId, viewer_id: viewerId },
    });

    if (existingView) {
      return existingView; // مشاهدة مسجلة مسبقاً
    }

    // ─── تسجيل المشاهدة ───
    const view = this.viewRepo.create({
      story_id: storyId,
      viewer_id: viewerId,
    });

    const saved = await this.viewRepo.save(view);

    // ─── تحديث عداد المشاهدات ───
    await this.storyRepo.increment({ id: storyId }, 'view_count', 1);

    // ─── نشر حدث ───
    await this.eventBus.publishSimple(
      'STORY_VIEWED' as any,
      {
        story_id: storyId,
        viewer_id: viewerId,
        author_id: story.user_id,
      },
      viewerId,
      this.MODULE_NAME,
    );

    return saved;
  }

  // ============================================================================
  // Reaction
  // ============================================================================

  /** إضافة تفاعل على ستوري */
  async addReaction(
    storyId: string,
    userId: string,
    dto: AddReactionDto,
  ): Promise<StoryReaction> {
    const story = await this.storyRepo.findOne({
      where: { id: storyId, status: StoryStatus.ACTIVE },
    });

    if (!story) {
      throw new NotFoundException('Story not found or expired');
    }

    if (story.user_id === userId) {
      throw new BadRequestException('Cannot react to your own story');
    }

    // التحقق من عدم وجود تفاعل سابق
    const existingReaction = await this.reactionRepo.findOne({
      where: { story_id: storyId, user_id: userId },
    });

    if (existingReaction) {
      // تحديث نوع التفاعل
      existingReaction.reaction_type = dto.reactionType;
      return this.reactionRepo.save(existingReaction);
    }

    // ─── إنشاء تفاعل جديد ───
    const reaction = this.reactionRepo.create({
      story_id: storyId,
      user_id: userId,
      reaction_type: dto.reactionType,
    });

    const saved = await this.reactionRepo.save(reaction);

    // ─── تحديث عداد التفاعلات ───
    await this.storyRepo.increment({ id: storyId }, 'reaction_count', 1);

    return saved;
  }

  // ============================================================================
  // Expiration (Cron Job)
  // ============================================================================

  /** مهمة مجدولة لإنهاء صلاحية الستوريز القديمة */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async expireOldStories(): Promise<void> {
    const now = new Date();

    this.logger.debug('Running story expiration job at %s', now.toISOString());

    // البحث عن الستوريز النشطة التي انتهت صلاحيتها
    const expiredStories = await this.storyRepo.find({
      where: {
        status: StoryStatus.ACTIVE,
        expires_at: LessThan(now),
      },
    });

    if (expiredStories.length === 0) {
      return;
    }

    this.logger.log('Expiring %d stories', expiredStories.length);

    // تحديث حالة كل ستوري منتهي
    const expiredIds = expiredStories.map((s) => s.id);
    await this.storyRepo
      .createQueryBuilder()
      .update(Story)
      .set({ status: StoryStatus.EXPIRED })
      .whereInIds(expiredIds)
      .execute();

    // نشر أحداث انتهاء الصلاحية
    for (const story of expiredStories) {
      await this.eventBus.publishSimple(
        'STORY_EXPIRED' as any,
        {
          story_id: story.id,
          user_id: story.user_id,
          view_count: story.view_count,
          reaction_count: story.reaction_count,
        },
        story.user_id,
        this.MODULE_NAME,
      );
    }

    this.logger.log('Story expiration job completed. Expired %d stories.', expiredStories.length);
  }

  // ============================================================================
  // Delete
  // ============================================================================

  /** حذف ستوري (soft delete) */
  async deleteStory(userId: string, storyId: string): Promise<void> {
    const story = await this.storyRepo.findOne({
      where: { id: storyId },
    });

    if (!story) {
      throw new NotFoundException('Story not found');
    }

    if (story.user_id !== userId) {
      throw new BadRequestException('You can only delete your own stories');
    }

    await this.storyRepo.update(storyId, { status: StoryStatus.DELETED });

    await this.auditService.logSimple('STORY_DELETED', userId, 'STORY', storyId);
  }

  // ============================================================================
  // Get Viewers
  // ============================================================================

  /** الحصول على قائمة مشاهدي ستوري */
  async getStoryViewers(storyId: string, userId: string): Promise<StoryView[]> {
    const story = await this.storyRepo.findOne({
      where: { id: storyId },
    });

    if (!story) {
      throw new NotFoundException('Story not found');
    }

    if (story.user_id !== userId) {
      throw new BadRequestException('You can only view viewers of your own stories');
    }

    return this.viewRepo.find({
      where: { story_id: storyId },
      order: { viewed_at: 'DESC' },
    });
  }
}
