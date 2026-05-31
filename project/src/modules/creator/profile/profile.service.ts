/**
 * =============================================================================
 * Profile Service - خدمة ملف تعريف صانع المحتوى
 * =============================================================================
 * تدير عمليات إنشاء وتحديث واستعراض ملفات تعريف صناع المحتوى
 * بالإضافة إلى متابعة/إلغاء المتابعة بين المستخدمين وصناع المحتوى
 */

import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindOptionsWhere } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  CreatorProfile,
  CreatorType,
  CreatorStatus,
  VerificationStatus,
} from './creator-profile.entity';
import {
  CreateCreatorProfileDto,
  UpdateCreatorProfileDto,
  SearchCreatorProfilesDto,
} from './profile.dto';

/** حدث متابعة صانع محتوى جديد */
export class CreatorFollowedEvent {
  constructor(
    public readonly followerId: string,
    public readonly creatorId: string,
    public readonly creatorUserId: string,
  ) {}
}

/** حدث إلغاء متابعة صانع محتوى */
export class CreatorUnfollowedEvent {
  constructor(
    public readonly followerId: string,
    public readonly creatorId: string,
    public readonly creatorUserId: string,
  ) {}
}

/** حدث إنشاء ملف صانع محتوى */
export class CreatorProfileCreatedEvent {
  constructor(
    public readonly creatorId: string,
    public readonly userId: string,
    public readonly creatorType: CreatorType,
  ) {}
}

@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(CreatorProfile)
    private readonly profileRepo: Repository<CreatorProfile>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ── CRUD الأساسي ───────────────────────────────────────────────

  /**
   * إنشاء ملف تعريف صانع محتوى جديد
   */
  async create(dto: CreateCreatorProfileDto): Promise<CreatorProfile> {
    // التحقق من عدم وجود ملف مسبق للمستخدم
    const existing = await this.profileRepo.findOne({
      where: { user_id: dto.user_id },
      withDeleted: true,
    });
    if (existing) {
      throw new ConflictException(
        `Creator profile already exists for user ${dto.user_id}`,
      );
    }

    const profile = this.profileRepo.create({
      ...dto,
      status: CreatorStatus.PENDING,
      verification_status: VerificationStatus.PENDING,
      specialties: dto.specialties ?? [],
      certifications: dto.certifications ?? [],
      social_links: (dto.social_links as unknown as Record<string, string>) ?? {},
      payout_details: (dto.payout_details as unknown as Record<string, unknown>) ?? {},
    });

    const saved = await this.profileRepo.save(profile);

    // نشر حدث إنشاء ملف صانع المحتوى
    this.eventEmitter.emit(
      'creator.profile.created',
      new CreatorProfileCreatedEvent(
        saved.id,
        saved.user_id,
        saved.creator_type,
      ),
    );

    return saved;
  }

  /**
   * تحديث ملف تعريف صانع المحتوى
   */
  async update(
    creatorId: string,
    dto: UpdateCreatorProfileDto,
  ): Promise<CreatorProfile> {
    const profile = await this.getById(creatorId);

    // لا يمكن تحديث ملف موقوف
    if (profile.status === CreatorStatus.SUSPENDED) {
      throw new BadRequestException('Cannot update suspended creator profile');
    }

    // دمج الحقول القابلة للتحديث
    if (dto.display_name !== undefined) profile.display_name = dto.display_name;
    if (dto.bio !== undefined) profile.bio = dto.bio ?? null;
    if (dto.avatar !== undefined) profile.avatar = dto.avatar ?? null;
    if (dto.cover_image !== undefined) profile.cover_image = dto.cover_image ?? null;
    if (dto.specialties !== undefined) profile.specialties = dto.specialties;
    if (dto.certifications !== undefined) profile.certifications = dto.certifications;
    if (dto.social_links !== undefined) {
      profile.social_links = dto.social_links as unknown as Record<string, string>;
    }
    if (dto.payout_method !== undefined) profile.payout_method = dto.payout_method ?? null;
    if (dto.payout_details !== undefined) {
      profile.payout_details = dto.payout_details as unknown as Record<string, unknown>;
    }
    if (dto.creator_type !== undefined) profile.creator_type = dto.creator_type;

    return this.profileRepo.save(profile);
  }

  /**
   * جلب ملف تعريف بواسطة المعرف
   */
  async getById(creatorId: string): Promise<CreatorProfile> {
    const profile = await this.profileRepo.findOne({
      where: { id: creatorId },
      relations: ['subscription_plans', 'programs'],
    });
    if (!profile) {
      throw new NotFoundException(`Creator profile with id ${creatorId} not found`);
    }
    return profile;
  }

  /**
   * جلب ملف تعريف بواسطة معرف المستخدم
   */
  async getByUserId(userId: string): Promise<CreatorProfile | null> {
    return this.profileRepo.findOne({
      where: { user_id: userId },
      relations: ['subscription_plans', 'programs'],
    });
  }

  /**
   * البحث واستعراض ملفات صناع المحتوى
   */
  async search(dto: SearchCreatorProfilesDto): Promise<{
    items: CreatorProfile[];
    total: number;
    page: number;
    limit: number;
  }> {
    const where: FindOptionsWhere<CreatorProfile> = {
      status: CreatorStatus.ACTIVE,
    };

    // فلترة حسب النوع
    if (dto.creator_type) {
      where.creator_type = dto.creator_type;
    }

    // فلترة حسب التخصص
    if (dto.specialty) {
      where.specialties = Like(`%${dto.specialty}%`);
    }

    // فلترة حسب التقييم الأدنى
    if (dto.min_rating !== undefined) {
      // نستخدم QueryBuilder للتعامل مع التقييم
      const qb = this.profileRepo.createQueryBuilder('creator')
        .leftJoinAndSelect('creator.subscription_plans', 'plans')
        .leftJoinAndSelect('creator.programs', 'programs')
        .where('creator.status = :status', { status: CreatorStatus.ACTIVE });

      if (dto.creator_type) {
        qb.andWhere('creator.creator_type = :type', { type: dto.creator_type });
      }
      if (dto.min_rating) {
        qb.andWhere('creator.rating >= :rating', { rating: dto.min_rating });
      }
      if (dto.q) {
        qb.andWhere(
          '(creator.display_name ILIKE :q OR creator.bio ILIKE :q)',
          { q: `%${dto.q}%` },
        );
      }

      const [items, total] = await qb
        .orderBy(`creator.${dto.sort_by ?? 'created_at'}`, dto.sort_order ?? 'DESC')
        .skip(((dto.page ?? 1) - 1) * (dto.limit ?? 20))
        .take(dto.limit ?? 20)
        .getManyAndCount();

      return {
        items,
        total,
        page: dto.page ?? 1,
        limit: dto.limit ?? 20,
      };
    }

    // بحث بسيط بدون QueryBuilder
    const [items, total] = await this.profileRepo.findAndCount({
      where,
      relations: ['subscription_plans', 'programs'],
      order: { [dto.sort_by ?? 'created_at']: dto.sort_order ?? 'DESC' },
      skip: ((dto.page ?? 1) - 1) * (dto.limit ?? 20),
      take: dto.limit ?? 20,
    });

    return {
      items,
      total,
      page: dto.page ?? 1,
      limit: dto.limit ?? 20,
    };
  }

  // ── المتابعة / إلغاء المتابعة ──────────────────────────────────

  /**
   * متابعة صانع محتوى
   * ملاحظة: جدول المتابعين يكون في موديول Social
   * هنا نحدث العداد فقط
   */
  async follow(
    followerId: string,
    creatorId: string,
  ): Promise<{ following: boolean }> {
    const profile = await this.getById(creatorId);

    if (profile.user_id === followerId) {
      throw new BadRequestException('Cannot follow yourself');
    }

    // زيادة عداد المتابعين
    profile.follower_count += 1;
    await this.profileRepo.save(profile);

    // نشر حدث المتابعة
    this.eventEmitter.emit(
      'creator.followed',
      new CreatorFollowedEvent(followerId, creatorId, profile.user_id),
    );

    return { following: true };
  }

  /**
   * إلغاء متابعة صانع محتوى
   */
  async unfollow(
    followerId: string,
    creatorId: string,
  ): Promise<{ following: boolean }> {
    const profile = await this.getById(creatorId);

    // تقليل عداد المتابعين (لا يقل عن 0)
    profile.follower_count = Math.max(0, profile.follower_count - 1);
    await this.profileRepo.save(profile);

    // نشر حدث إلغاء المتابعة
    this.eventEmitter.emit(
      'creator.unfollowed',
      new CreatorUnfollowedEvent(followerId, creatorId, profile.user_id),
    );

    return { following: false };
  }

  // ── إدارة الحالة ───────────────────────────────────────────────

  /**
   * تحديث حالة التحقق
   */
  async updateVerificationStatus(
    creatorId: string,
    status: VerificationStatus,
  ): Promise<CreatorProfile> {
    const profile = await this.getById(creatorId);
    profile.verification_status = status;

    // عند التحقق الناجح، تفعيل الملف تلقائياً
    if (status === VerificationStatus.VERIFIED) {
      profile.status = CreatorStatus.ACTIVE;
    }

    return this.profileRepo.save(profile);
  }

  /**
   * تحديث Stripe Connect Account ID
   */
  async setStripeConnectId(
    creatorId: string,
    stripeConnectId: string,
  ): Promise<CreatorProfile> {
    const profile = await this.getById(creatorId);
    profile.stripe_connect_id = stripeConnectId;
    return this.profileRepo.save(profile);
  }

  /**
   * تحديث إجمالي الإيرادات (يُستدعى من خدمة الدفع)
   */
  async addRevenue(creatorId: string, amount: number): Promise<void> {
    await this.profileRepo.increment(
      { id: creatorId },
      'total_revenue',
      amount,
    );
  }

  /**
   * تحديث عدد المشتركين
   */
  async updateSubscriberCount(creatorId: string, delta: number): Promise<void> {
    const profile = await this.getById(creatorId);
    profile.subscriber_count = Math.max(0, profile.subscriber_count + delta);
    await this.profileRepo.save(profile);
  }

  /**
   * حذف ناعم لملف صانع المحتوى
   */
  async softDelete(creatorId: string): Promise<void> {
    const profile = await this.getById(creatorId);
    profile.status = CreatorStatus.SUSPENDED;
    await this.profileRepo.save(profile);
    await this.profileRepo.softDelete(creatorId);
  }
}
