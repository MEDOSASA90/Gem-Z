/**
 * GymService - خدمة إدارة الأندية الرياضية (SaaS)
 * تدير عمليات CRUD للجيم + الفروع + العضويات
 */
import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { EventBusService } from '../../../core/event-bus/event-bus.service';
import {
  GymRepository,
  GymBranchRepository,
  MembershipPlanRepository,
  MembershipRepository,
} from './gym.repository';
import { Gym } from './gym.entity';
import { GymBranch } from './branch.entity';
import { MembershipPlan } from './membership-plan.entity';
import { Membership } from './membership.entity';
import {
  GymCreatedEvent,
  GymApprovedEvent,
  MembershipPurchasedEvent,
  MembershipCancelledEvent,
  MembershipRenewedEvent,
  MembershipExpiredEvent,
  EventType,
} from '../../../core/event-bus/event.types';
import { GymStatus, KYCStatus, MembershipStatus } from '../../../common/enums/gym.enum';
import {
  CreateGymDto,
  UpdateGymDto,
  CreateBranchDto,
  UpdateBranchDto,
  CreateMembershipPlanDto,
  SubscribeDto,
  GymFilterDto,
} from './gym.dto';

@Injectable()
export class GymService {
  constructor(
    private readonly gymRepo: GymRepository,
    private readonly branchRepo: GymBranchRepository,
    private readonly planRepo: MembershipPlanRepository,
    private readonly eventBus: EventBusService,
  ) {}

  /** إنشاء جيم جديد */
  async create(dto: CreateGymDto): Promise<Gym> {
    // التحقق من عدم تكرار الـ slug
    const existing = await this.gymRepo.findBySlug(
      dto.slug || this.slugify(dto.name),
    );
    if (existing) {
      throw new ConflictException('Gym with this slug already exists');
    }

    const gym = this.gymRepo.create({
      ...dto,
      slug: dto.slug || this.slugify(dto.name),
      status: GymStatus.PENDING,
      kyc_status: KYCStatus.PENDING,
      settings: dto.settings || {},
      analytics: {},
    });

    const saved = await this.gymRepo.save(gym);

    // نشر حدث GymCreated
    const event: GymCreatedEvent = {
      gym_id: saved.id,
      owner_id: saved.owner_id,
      name: saved.name,
      slug: saved.slug,
    };
    await this.eventBus.publishSimple(EventType.GYM_CREATED, event, saved.owner_id, 'fitness');

    return saved;
  }

  /** تحديث بيانات جيم */
  async update(id: string, dto: UpdateGymDto): Promise<Gym> {
    const gym = await this.gymRepo.findOne({ where: { id } });
    if (!gym) throw new NotFoundException('Gym not found');

    Object.assign(gym, dto);
    return this.gymRepo.save(gym);
  }

  /** قائمة الجيمات مع فلترة */
  async list(filters: GymFilterDto): Promise<{ items: Gym[]; total: number; page: number; limit: number }> {
    const [items, total] = await this.gymRepo.findWithFilters(
      filters.status,
      filters.page,
      filters.limit,
    );
    return { items, total, page: filters.page ?? 1, limit: filters.limit ?? 20 };
  }

  /** جلب جيم بالتفاصيل الكاملة */
  async getById(id: string): Promise<Gym> {
    const gym = await this.gymRepo.findByIdWithBranches(id);
    if (!gym) throw new NotFoundException('Gym not found');
    return gym;
  }

  /** جلب جيمات مالك */
  async getByOwner(ownerId: string, page = 1, limit = 20) {
    const [items, total] = await this.gymRepo.findByOwner(ownerId, page, limit);
    return { items, total, page, limit };
  }

  /** موافقة إدارية على جيم */
  async approve(gymId: string, approvedBy: string): Promise<Gym> {
    const gym = await this.getById(gymId);
    gym.status = GymStatus.ACTIVE;
    gym.kyc_status = KYCStatus.APPROVED;
    const saved = await this.gymRepo.save(gym);

    const event: GymApprovedEvent = {
      gym_id: saved.id,
      approved_by: approvedBy,
      status: saved.status,
    };
    await this.eventBus.publishSimple(EventType.GYM_APPROVED, event, approvedBy, 'fitness');
    return saved;
  }

  /** تحديث حالة جيم */
  async updateStatus(gymId: string, status: GymStatus): Promise<void> {
    await this.gymRepo.updateStatus(gymId, status);
  }

  /** حذف ناعم */
  async softDelete(id: string): Promise<void> {
    const result = await this.gymRepo.softDelete(id);
    if (result.affected === 0) throw new NotFoundException('Gym not found');
  }

  /** تحويل الاسم إلى slug */
  private slugify(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}

@Injectable()
export class BranchService {
  constructor(
    private readonly gymRepo: GymRepository,
    private readonly branchRepo: GymBranchRepository,
  ) {}

  /** إنشاء فرع جديد */
  async create(gymId: string, dto: CreateBranchDto): Promise<GymBranch> {
    // التحقق من وجود الجيم
    const gym = await this.gymRepo.findOne({ where: { id: gymId } });
    if (!gym) throw new NotFoundException('Gym not found');

    const branch = this.branchRepo.create({
      ...dto,
      gym_id: gymId,
    });

    return this.branchRepo.save(branch);
  }

  /** تحديث فرع */
  async update(id: string, dto: UpdateBranchDto): Promise<GymBranch> {
    const branch = await this.branchRepo.findOne({ where: { id } });
    if (!branch) throw new NotFoundException('Branch not found');

    Object.assign(branch, dto);
    return this.branchRepo.save(branch);
  }

  /** جلب فروع جيم */
  async getByGym(gymId: string): Promise<GymBranch[]> {
    return this.branchRepo.findByGym(gymId);
  }

  /** حذف فرع */
  async delete(id: string): Promise<void> {
    const result = await this.branchRepo.delete(id);
    if (result.affected === 0) throw new NotFoundException('Branch not found');
  }
}

@Injectable()
export class MembershipService {
  constructor(
    private readonly planRepo: MembershipPlanRepository,
    private readonly membershipRepo: MembershipRepository,
    private readonly eventBus: EventBusService,
  ) {}

  /**
   * الاشتراك في خطة عضوية
   * - تُخصم الدفعة من المحفظة (عبر Event)
   * - تُنشئ العضوية
   * - تنشر حدث MembershipPurchased
   */
  async subscribe(userId: string, dto: SubscribeDto): Promise<Membership> {
    const plan = await this.planRepo.findOne({
      where: { id: dto.plan_id, is_active: true },
    });
    if (!plan) throw new NotFoundException('Membership plan not found or inactive');

    // حساب تواريخ البدء والانتهاء
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + plan.duration_months);

    const membership = this.membershipRepo.create({
      user_id: userId,
      gym_id: plan.gym_id,
      branch_id: dto.branch_id || null,
      plan_id: plan.id,
      status: MembershipStatus.ACTIVE,
      start_date: startDate,
      end_date: endDate,
      auto_renew: true,
      payment_method: dto.payment_method || null,
    });

    const saved = await this.membershipRepo.save(membership);

    // نشر حدث شراء العضوية
    const event: MembershipPurchasedEvent = {
      membership_id: saved.id,
      user_id: saved.user_id,
      gym_id: saved.gym_id,
      plan_id: saved.plan_id,
      amount: Number(plan.price),
      currency: plan.currency,
      start_date: saved.start_date.toISOString(),
      end_date: saved.end_date.toISOString(),
    };
    await this.eventBus.publishSimple(EventType.MEMBERSHIP_PURCHASED, event, saved.user_id, 'fitness');

    return saved;
  }

  /** إلغاء العضوية */
  async cancel(membershipId: string, userId: string): Promise<Membership> {
    const membership = await this.membershipRepo.findOne({
      where: { id: membershipId, user_id: userId },
    });
    if (!membership) throw new NotFoundException('Membership not found');
    if (membership.status !== MembershipStatus.ACTIVE) {
      throw new ForbiddenException('Cannot cancel non-active membership');
    }

    membership.status = MembershipStatus.CANCELLED;
    membership.auto_renew = false;
    const saved = await this.membershipRepo.save(membership);

    const event: MembershipCancelledEvent = {
      membership_id: saved.id,
      user_id: saved.user_id,
      gym_id: saved.gym_id,
      reason: 'User requested cancellation',
    };
    await this.eventBus.publishSimple(EventType.MEMBERSHIP_CANCELLED, event, userId, 'fitness');

    return saved;
  }

  /** تجديد العضوية */
  async renew(membershipId: string, userId: string): Promise<Membership> {
    const membership = await this.membershipRepo.findOne({
      where: { id: membershipId, user_id: userId },
      relations: ['plan'],
    });
    if (!membership) throw new NotFoundException('Membership not found');

    const plan = await this.planRepo.findOne({
      where: { id: membership.plan_id },
    });
    if (!plan) throw new NotFoundException('Plan not found');

    // تمديد تاريخ الانتهاء
    const newEndDate = new Date(membership.end_date);
    newEndDate.setMonth(newEndDate.getMonth() + plan.duration_months);
    membership.end_date = newEndDate;
    membership.status = MembershipStatus.ACTIVE;

    const saved = await this.membershipRepo.save(membership);

    const event: MembershipRenewedEvent = {
      membership_id: saved.id,
      user_id: saved.user_id,
      gym_id: saved.gym_id,
      new_end_date: saved.end_date.toISOString(),
    };
    await this.eventBus.publishSimple(EventType.MEMBERSHIP_RENEWED, event, userId, 'fitness');

    return saved;
  }

  /** جلب العضويات النشطة */
  async getActive(userId: string): Promise<Membership[]> {
    return this.membershipRepo.findActiveByUser(userId);
  }

  /** التحقق من صلاحية الدخول */
  async checkAccess(userId: string, gymId: string): Promise<boolean> {
    return this.membershipRepo.hasActiveMembership(userId, gymId);
  }

  /**
   * Cron Job: إنهاء العضويات المنتهية
   * يُستدعى يومياً عبر @Cron
   */
  async expireMemberships(): Promise<number> {
    const now = new Date();
    const expiredMemberships = await this.membershipRepo.findExpiredMemberships(now);

    for (const membership of expiredMemberships) {
      membership.status = MembershipStatus.EXPIRED;
      await this.membershipRepo.save(membership);

      const event: MembershipExpiredEvent = {
        membership_id: membership.id,
        user_id: membership.user_id,
        gym_id: membership.gym_id,
        expired_at: now.toISOString(),
      };
      await this.eventBus.publishSimple(EventType.MEMBERSHIP_EXPIRED, event, membership.user_id, 'fitness');
    }

    return expiredMemberships.length;
  }
}
