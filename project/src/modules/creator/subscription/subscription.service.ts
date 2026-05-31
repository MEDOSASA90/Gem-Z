/**
 * =============================================================================
 * Subscription Service - خدمة الاشتراكات
 * =============================================================================
 * تدير عمليات إنشاء خطط الاشتراك، الاشتراك، الإلغاء، والتجديد التلقائي
 */

import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SubscriptionPlan, SubscriptionInterval } from './subscription-plan.entity';
import {
  CreatorSubscription,
  SubscriptionStatus,
} from './creator-subscription.entity';
import {
  CreateSubscriptionPlanDto,
  UpdateSubscriptionPlanDto,
  CancelSubscriptionDto,
  GetCreatorSubscribersDto,
} from './subscription.dto';

// ── الأحداث ─────────────────────────────────────────────────────

/** حدث اشتراك جديد في صانع محتوى */
export class CreatorSubscribedEvent {
  constructor(
    public readonly subscriptionId: string,
    public readonly subscriberId: string,
    public readonly creatorId: string,
    public readonly planId: string,
    public readonly price: number,
    public readonly currency: string,
    public readonly isTrial: boolean,
  ) {}
}

/** حدث إلغاء الاشتراك */
export class CreatorUnsubscribedEvent {
  constructor(
    public readonly subscriptionId: string,
    public readonly subscriberId: string,
    public readonly creatorId: string,
    public readonly cancelledAt: Date,
    public readonly reason?: string,
  ) {}
}

/** حدث تجديد الاشتراك */
export class SubscriptionRenewedEvent {
  constructor(
    public readonly subscriptionId: string,
    public readonly subscriberId: string,
    public readonly creatorId: string,
    public readonly planId: string,
    public readonly amount: number,
    public readonly currency: string,
    public readonly newEndDate: Date,
    public readonly renewalCount: number,
  ) {}
}

@Injectable()
export class SubscriptionService {
  constructor(
    @InjectRepository(SubscriptionPlan)
    private readonly planRepo: Repository<SubscriptionPlan>,
    @InjectRepository(CreatorSubscription)
    private readonly subscriptionRepo: Repository<CreatorSubscription>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ── إدارة خطط الاشتراك ─────────────────────────────────────────

  /**
   * إنشاء خطة اشتراك جديدة
   */
  async createPlan(
    creatorId: string,
    dto: CreateSubscriptionPlanDto,
  ): Promise<SubscriptionPlan> {
    // التحقق من عدم وجود خطة بنفس الاسم لنفس الصانع
    const existing = await this.planRepo.findOne({
      where: { creator_id: creatorId, name: dto.name },
    });
    if (existing) {
      throw new ConflictException(
        `Plan with name "${dto.name}" already exists`,
      );
    }

    const plan = this.planRepo.create({
      ...dto,
      creator_id: creatorId,
      features: dto.features ?? [],
      currency: dto.currency ?? 'USD',
      trial_days: dto.trial_days ?? 0,
    });

    return this.planRepo.save(plan);
  }

  /**
   * تحديث خطة اشتراك
   */
  async updatePlan(
    planId: string,
    dto: UpdateSubscriptionPlanDto,
  ): Promise<SubscriptionPlan> {
    const plan = await this.planRepo.findOne({ where: { id: planId } });
    if (!plan) {
      throw new NotFoundException(`Plan with id ${planId} not found`);
    }

    Object.assign(plan, dto);
    return this.planRepo.save(plan);
  }

  /**
   * جلب خطة بواسطة المعرف
   */
  async getPlan(planId: string): Promise<SubscriptionPlan> {
    const plan = await this.planRepo.findOne({
      where: { id: planId },
      relations: ['creator'],
    });
    if (!plan) {
      throw new NotFoundException(`Plan with id ${planId} not found`);
    }
    return plan;
  }

  /**
   * جلب خطط صانع محتوى
   */
  async getCreatorPlans(creatorId: string): Promise<SubscriptionPlan[]> {
    return this.planRepo.find({
      where: { creator_id: creatorId },
      order: { price: 'ASC' },
    });
  }

  /**
   * حذف خطة اشتراك
   */
  async deletePlan(planId: string): Promise<void> {
    const plan = await this.getPlan(planId);

    // التحقق من عدم وجود اشتراكات نشطة
    const activeCount = await this.subscriptionRepo.count({
      where: { plan_id: planId, status: SubscriptionStatus.ACTIVE },
    });
    if (activeCount > 0) {
      throw new BadRequestException(
        `Cannot delete plan with ${activeCount} active subscriptions`,
      );
    }

    await this.planRepo.remove(plan);
  }

  // ── إدارة الاشتراكات ───────────────────────────────────────────

  /**
   * الاشتراك في خطة
   * يدعم الفترة التجريبية المجانية
   */
  async subscribe(
    userId: string,
    planId: string,
  ): Promise<CreatorSubscription> {
    const plan = await this.getPlan(planId);

    if (!plan.is_active) {
      throw new BadRequestException('This subscription plan is not active');
    }

    // التحقق من عدم وجود اشتراك نشط مسبق على نفس الخطة
    const existingActive = await this.subscriptionRepo.findOne({
      where: {
        subscriber_id: userId,
        plan_id: planId,
        status: SubscriptionStatus.ACTIVE,
      },
    });
    if (existingActive) {
      throw new ConflictException('Already subscribed to this plan');
    }

    // التحقق من عدم وجود اشتراك تجريبي مسبق (لمنع إساءة استخدام التجربة)
    if (plan.trial_days > 0) {
      const existingTrial = await this.subscriptionRepo.findOne({
        where: {
          subscriber_id: userId,
          plan_id: planId,
          status: SubscriptionStatus.TRIAL,
        },
      });
      if (existingTrial) {
        throw new ConflictException('Free trial already used for this plan');
      }
    }

    // حساب تواريخ البدء والانتهاء
    const now = new Date();
    const hasTrial = plan.trial_days > 0;

    let startDate = now;
    let endDate: Date;
    let trialEndsAt: Date | null = null;
    let initialStatus: SubscriptionStatus;

    if (hasTrial) {
      // الفترة التجريبية
      trialEndsAt = new Date(now);
      trialEndsAt.setDate(trialEndsAt.getDate() + plan.trial_days);
      endDate = trialEndsAt;
      initialStatus = SubscriptionStatus.TRIAL;
    } else {
      // بدون تجربة
      endDate = this.calculateEndDate(now, plan.interval);
      initialStatus = SubscriptionStatus.ACTIVE;
    }

    const subscription = this.subscriptionRepo.create({
      subscriber_id: userId,
      creator_id: plan.creator_id,
      plan_id: planId,
      status: initialStatus,
      start_date: startDate,
      end_date: endDate,
      trial_ends_at: trialEndsAt,
      auto_renew: true,
      cancelled_at: null,
      subscribed_price: plan.price,
      currency: plan.currency,
      renewal_count: 0,
    });

    const saved = await this.subscriptionRepo.save(subscription);

    // نشر حدث الاشتراك
    this.eventEmitter.emit(
      'creator.subscribed',
      new CreatorSubscribedEvent(
        saved.id,
        saved.subscriber_id,
        saved.creator_id,
        saved.plan_id,
        Number(plan.price),
        plan.currency,
        hasTrial,
      ),
    );

    return saved;
  }

  /**
   * إلغاء الاشتراك (إيقاف التجديد التلقائي)
   */
  async cancel(
    subscriptionId: string,
    dto?: CancelSubscriptionDto,
  ): Promise<CreatorSubscription> {
    const sub = await this.getSubscription(subscriptionId);

    if (sub.status === SubscriptionStatus.CANCELLED) {
      throw new BadRequestException('Subscription already cancelled');
    }

    if (sub.status === SubscriptionStatus.EXPIRED) {
      throw new BadRequestException('Subscription already expired');
    }

    // تحديث حالة الاشتراك
    sub.auto_renew = false;
    sub.cancelled_at = new Date();

    // الإلغاء الفوري إذا طلب المستخدم
    if (dto?.cancel_immediately) {
      sub.status = SubscriptionStatus.CANCELLED;
    }

    const saved = await this.subscriptionRepo.save(sub);

    // نشر حدث الإلغاء
    this.eventEmitter.emit(
      'creator.unsubscribed',
      new CreatorUnsubscribedEvent(
        saved.id,
        saved.subscriber_id,
        saved.creator_id,
        saved.cancelled_at!,
        dto?.reason,
      ),
    );

    return saved;
  }

  /**
   * تجديد الاشتراك
   * يُستدعى من Cron Job أو Webhook
   */
  async renew(subscriptionId: string): Promise<CreatorSubscription> {
    const sub = await this.subscriptionRepo.findOne({
      where: { id: subscriptionId },
      relations: ['plan'],
    });
    if (!sub) {
      throw new NotFoundException(`Subscription ${subscriptionId} not found`);
    }

    if (!sub.auto_renew || sub.status === SubscriptionStatus.CANCELLED) {
      // تحويل إلى منتهي
      sub.status = SubscriptionStatus.EXPIRED;
      return this.subscriptionRepo.save(sub);
    }

    const plan = sub.plan;
    const now = new Date();
    const newEndDate = this.calculateEndDate(now, plan.interval);

    // إذا كان في فترة تجريبية، ينتقل للحالة النشطة
    const newStatus = sub.status === SubscriptionStatus.TRIAL
      ? SubscriptionStatus.ACTIVE
      : sub.status;

    sub.start_date = now;
    sub.end_date = newEndDate;
    sub.status = newStatus;
    sub.trial_ends_at = null; // انتهت التجربة
    sub.renewal_count += 1;

    const saved = await this.subscriptionRepo.save(sub);

    // نشر حدث التجديد
    this.eventEmitter.emit(
      'subscription.renewed',
      new SubscriptionRenewedEvent(
        saved.id,
        saved.subscriber_id,
        saved.creator_id,
        saved.plan_id,
        Number(plan.price),
        plan.currency,
        newEndDate,
        saved.renewal_count,
      ),
    );

    return saved;
  }

  /**
   * جلب اشتراك بواسطة المعرف
   */
  async getSubscription(subscriptionId: string): Promise<CreatorSubscription> {
    const sub = await this.subscriptionRepo.findOne({
      where: { id: subscriptionId },
      relations: ['plan'],
    });
    if (!sub) {
      throw new NotFoundException(`Subscription ${subscriptionId} not found`);
    }
    return sub;
  }

  /**
   * جلب الاشتراكات النشطة لمستخدم
   */
  async getActiveSubscriptions(
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<{
    items: CreatorSubscription[];
    total: number;
    page: number;
    limit: number;
  }> {
    const [items, total] = await this.subscriptionRepo.findAndCount({
      where: {
        subscriber_id: userId,
        status: SubscriptionStatus.ACTIVE,
        end_date: MoreThan(new Date()),
      },
      relations: ['plan'],
      order: { end_date: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, total, page, limit };
  }

  /**
   * جلب مشتركي صانع محتوى
   */
  async getCreatorSubscribers(
    creatorId: string,
    filters: GetCreatorSubscribersDto,
  ): Promise<{
    items: CreatorSubscription[];
    total: number;
    page: number;
    limit: number;
  }> {
    const where: Record<string, unknown> = { creator_id: creatorId };

    if (filters.status) {
      where.status = filters.status;
    } else if (!filters.include_expired) {
      // افتراضياً استبعاد المنتهية
      where.status = SubscriptionStatus.ACTIVE;
    }

    const [items, total] = await this.subscriptionRepo.findAndCount({
      where,
      relations: ['plan'],
      order: { created_at: 'DESC' },
      skip: ((filters.page ?? 1) - 1) * (filters.limit ?? 20),
      take: filters.limit ?? 20,
    });

    return {
      items,
      total,
      page: filters.page ?? 1,
      limit: filters.limit ?? 20,
    };
  }

  /**
   * معالجة انتهاء الفترات التجريبية
   * يُستدعى من Cron Job
   */
  async expireTrials(): Promise<number> {
    const now = new Date();
    const trials = await this.subscriptionRepo.find({
      where: {
        status: SubscriptionStatus.TRIAL,
        trial_ends_at: LessThan(now),
      },
    });

    let count = 0;
    for (const sub of trials) {
      // التحقق من وجود طريقة دفع للتجديد
      // في الإنتاج: التحقق من Stripe
      sub.status = SubscriptionStatus.EXPIRED;
      await this.subscriptionRepo.save(sub);
      count++;
    }

    return count;
  }

  // ── مساعدات ────────────────────────────────────────────────────

  /**
   * حساب تاريخ الانتهاء بناءً على الفترة
   */
  private calculateEndDate(start: Date, interval: SubscriptionInterval): Date {
    const end = new Date(start);
    switch (interval) {
      case SubscriptionInterval.WEEKLY:
        end.setDate(end.getDate() + 7);
        break;
      case SubscriptionInterval.MONTHLY:
        end.setMonth(end.getMonth() + 1);
        break;
      case SubscriptionInterval.ANNUAL:
        end.setFullYear(end.getFullYear() + 1);
        break;
    }
    return end;
  }
}
