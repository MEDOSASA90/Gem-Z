/**
 * =============================================================================
 * Payout Service - خدمة المدفوعات
 * =============================================================================
 * تدير عمليات حساب الإيرادات، طلبات السحب، معالجة المدفوعات، والتقارير
 */

import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreatorPayout, PayoutStatus, PayoutMethod } from './creator-payout.entity';
import { RevenueSplit, RevenueSourceType } from './revenue-split.entity';
import {
  RequestPayoutDto,
  ProcessPayoutDto,
  CalculateRevenueDto,
  GetPayoutHistoryDto,
} from './payout.dto';

// ── الأحداث ─────────────────────────────────────────────────────

/** حدث طلب سحب جديد */
export class PayoutRequestedEvent {
  constructor(
    public readonly payoutId: string,
    public readonly creatorId: string,
    public readonly netAmount: number,
    public readonly currency: string,
    public readonly payoutMethod: PayoutMethod,
  ) {}
}

/** حدث معالجة السحب */
export class PayoutProcessedEvent {
  constructor(
    public readonly payoutId: string,
    public readonly creatorId: string,
    public readonly netAmount: number,
    public readonly currency: string,
    public readonly processedAt: Date,
  ) {}
}

/** حدث إتمام السحب */
export class PayoutPaidEvent {
  constructor(
    public readonly payoutId: string,
    public readonly creatorId: string,
    public readonly netAmount: number,
    public readonly currency: string,
    public readonly transactionId: string | null,
    public readonly paidAt: Date,
  ) {}
}

/** نسبة عمولة المنصة الافتراضية (20%) */
const PLATFORM_COMMISSION_PERCENTAGE = 20;

/** الحد الأدنى للسحب */
const MINIMUM_PAYOUT_AMOUNT = 10;

@Injectable()
export class PayoutService {
  constructor(
    @InjectRepository(CreatorPayout)
    private readonly payoutRepo: Repository<CreatorPayout>,
    @InjectRepository(RevenueSplit)
    private readonly revenueRepo: Repository<RevenueSplit>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ── تسجيل الإيرادات ────────────────────────────────────────────

  /**
   * تسجيل إيراد جديد من مصدر
   * يُستدعى عند كل معاملة ناجحة (اشتراك، برنامج، تذكرة)
   */
  async recordRevenue(
    creatorId: string,
    sourceType: RevenueSourceType,
    sourceId: string,
    grossAmount: number,
    currency: string,
    paymentTransactionId?: string,
  ): Promise<RevenueSplit> {
    const platformPercentage = PLATFORM_COMMISSION_PERCENTAGE;
    const platformAmount = (grossAmount * platformPercentage) / 100;
    const creatorAmount = grossAmount - platformAmount;

    const split = this.revenueRepo.create({
      creator_id: creatorId,
      source_type: sourceType,
      source_id: sourceId,
      gross_amount: grossAmount,
      platform_percentage: platformPercentage,
      platform_amount: platformAmount,
      creator_amount: creatorAmount,
      currency,
      payment_transaction_id: paymentTransactionId ?? null,
      is_paid_out: false,
    });

    return this.revenueRepo.save(split);
  }

  // ── حساب الإيرادات ─────────────────────────────────────────────

  /**
   * حساب إجمالي الإيرادات لصانع محتوى في فترة معينة
   */
  async calculateRevenue(
    creatorId: string,
    dto: CalculateRevenueDto,
  ): Promise<{
    total_gross: number;
    total_platform_fee: number;
    total_net: number;
    currency: string;
    by_source: Record<string, { gross: number; platform: number; net: number }>;
    period_start: Date;
    period_end: Date;
  }> {
    const startDate = new Date(dto.start_date);
    const endDate = new Date(dto.end_date);

    const where: Record<string, unknown> = {
      creator_id: creatorId,
      is_paid_out: false,
      created_at: Between(startDate, endDate),
    };

    if (dto.source_type) {
      where.source_type = dto.source_type;
    }

    const revenues = await this.revenueRepo.find({ where });

    // تجميع الإيرادات
    let totalGross = 0;
    let totalPlatform = 0;
    const bySource: Record<string, { gross: number; platform: number; net: number }> = {};

    for (const rev of revenues) {
      const gross = Number(rev.gross_amount);
      const platform = Number(rev.platform_amount);
      const net = Number(rev.creator_amount);

      totalGross += gross;
      totalPlatform += platform;

      const source = rev.source_type;
      if (!bySource[source]) {
        bySource[source] = { gross: 0, platform: 0, net: 0 };
      }
      bySource[source].gross += gross;
      bySource[source].platform += platform;
      bySource[source].net += net;
    }

    // تحديد العملة (نفترض نفس العملة لكل الإيرادات)
    const currency = revenues.length > 0 ? revenues[0].currency : 'USD';

    return {
      total_gross: Math.round(totalGross * 100) / 100,
      total_platform_fee: Math.round(totalPlatform * 100) / 100,
      total_net: Math.round((totalGross - totalPlatform) * 100) / 100,
      currency,
      by_source: bySource,
      period_start: startDate,
      period_end: endDate,
    };
  }

  // ── طلب السحب ──────────────────────────────────────────────────

  /**
   * طلب سحب من قبل صانع محتوى
   */
  async requestPayout(
    creatorId: string,
    dto: RequestPayoutDto,
  ): Promise<CreatorPayout> {
    // التحقق من الحد الأدنى
    if (dto.amount < MINIMUM_PAYOUT_AMOUNT) {
      throw new BadRequestException(
        `Minimum payout amount is ${MINIMUM_PAYOUT_AMOUNT} ${dto.currency ?? 'USD'}`,
      );
    }

    // حساب الرسوم
    const grossAmount = dto.amount;
    const platformFee = (grossAmount * PLATFORM_COMMISSION_PERCENTAGE) / 100;
    const paymentGatewayFee = this.calculateGatewayFee(
      dto.payout_method,
      grossAmount,
    );
    const fxFee = 0; // نحسبها لاحقاً حسب العملة
    const taxDeduction = 0; // نحسبها حسب دولة صانع المحتوى
    const netAmount = grossAmount - platformFee - paymentGatewayFee - fxFee - taxDeduction;

    if (netAmount <= 0) {
      throw new BadRequestException(
        'Net payout amount after fees must be greater than zero',
      );
    }

    // إنشاء طلب السحب
    const payout = this.payoutRepo.create({
      creator_id: creatorId,
      gross_amount: grossAmount,
      platform_fee: platformFee,
      payment_gateway_fee: paymentGatewayFee,
      fx_fee: fxFee,
      tax_deduction: taxDeduction,
      net_amount: netAmount,
      currency: dto.currency ?? 'USD',
      status: PayoutStatus.PENDING,
      payout_method: dto.payout_method,
      payout_details: (dto.payout_details as unknown as Record<string, unknown>) ?? {},
      scheduled_at: new Date(), // فوري افتراضياً، يمكن جدولة لاحقاً
    });

    const saved = await this.payoutRepo.save(payout);

    // نشر حدث طلب السحب
    this.eventEmitter.emit(
      'payout.requested',
      new PayoutRequestedEvent(
        saved.id,
        creatorId,
        netAmount,
        saved.currency,
        dto.payout_method,
      ),
    );

    return saved;
  }

  /**
   * معالجة السحب (موافقة + تنفيذ)
   */
  async processPayout(
    payoutId: string,
    dto?: ProcessPayoutDto,
  ): Promise<CreatorPayout> {
    const payout = await this.getPayout(payoutId);

    if (payout.status !== PayoutStatus.PENDING && payout.status !== PayoutStatus.APPROVED) {
      throw new BadRequestException(
        `Cannot process payout with status ${payout.status}`,
      );
    }

    payout.status = PayoutStatus.PROCESSING;
    const saved = await this.payoutRepo.save(payout);

    // محاكاة معالجة الدفع
    // في الإنتاج: هنا نستدعي Stripe Connect / PayPal / Banking API
    try {
      // تحديث الحالة لـ PAID (محاكاة نجاح)
      saved.status = PayoutStatus.PAID;
      saved.processed_at = new Date();
      saved.transaction_id = dto?.transaction_id ?? `SIM_${Date.now()}`;

      if (dto?.admin_notes) {
        saved.admin_notes = dto.admin_notes;
      }

      const finalized = await this.payoutRepo.save(saved);

      // نشر حدث المعالجة
      this.eventEmitter.emit(
        'payout.processed',
        new PayoutProcessedEvent(
          finalized.id,
          finalized.creator_id,
          Number(finalized.net_amount),
          finalized.currency,
          finalized.processed_at!,
        ),
      );

      // نشر حدث الدفع الناجح
      this.eventEmitter.emit(
        'payout.paid',
        new PayoutPaidEvent(
          finalized.id,
          finalized.creator_id,
          Number(finalized.net_amount),
          finalized.currency,
          finalized.transaction_id,
          finalized.processed_at!,
        ),
      );

      return finalized;
    } catch (error) {
      // فشل المعالجة
      saved.status = PayoutStatus.FAILED;
      saved.failure_reason = error instanceof Error ? error.message : 'Unknown error';
      return this.payoutRepo.save(saved);
    }
  }

  /**
   * الموافقة على سحب (قبل المعالجة)
   */
  async approvePayout(payoutId: string): Promise<CreatorPayout> {
    const payout = await this.getPayout(payoutId);

    if (payout.status !== PayoutStatus.PENDING) {
      throw new BadRequestException('Only pending payouts can be approved');
    }

    payout.status = PayoutStatus.APPROVED;
    return this.payoutRepo.save(payout);
  }

  /**
   * رفض سحب
   */
  async rejectPayout(
    payoutId: string,
    reason: string,
  ): Promise<CreatorPayout> {
    const payout = await this.getPayout(payoutId);

    if (payout.status !== PayoutStatus.PENDING) {
      throw new BadRequestException('Only pending payouts can be rejected');
    }

    payout.status = PayoutStatus.REVERSED;
    payout.failure_reason = reason;
    return this.payoutRepo.save(payout);
  }

  // ── استعراض ────────────────────────────────────────────────────

  /**
   * جلب سحب بواسطة المعرف
   */
  async getPayout(payoutId: string): Promise<CreatorPayout> {
    const payout = await this.payoutRepo.findOne({
      where: { id: payoutId },
      relations: ['creator'],
    });
    if (!payout) {
      throw new NotFoundException(`Payout ${payoutId} not found`);
    }
    return payout;
  }

  /**
   * جلب تاريخ السحب لصانع محتوى
   */
  async getPayoutHistory(
    creatorId: string,
    filters: GetPayoutHistoryDto,
  ): Promise<{
    items: CreatorPayout[];
    total: number;
    page: number;
    limit: number;
  }> {
    const where: Record<string, unknown> = { creator_id: creatorId };

    if (filters.status) {
      where.status = filters.status;
    }

    const [items, total] = await this.payoutRepo.findAndCount({
      where,
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
   * جلب إيرادات غير مسحوبة
   */
  async getUnpaidRevenue(
    creatorId: string,
  ): Promise<{
    total: number;
    currency: string;
    items: RevenueSplit[];
  }> {
    const items = await this.revenueRepo.find({
      where: {
        creator_id: creatorId,
        is_paid_out: false,
      },
      order: { created_at: 'DESC' },
    });

    const total = items.reduce(
      (sum, item) => sum + Number(item.creator_amount),
      0,
    );

    const currency = items.length > 0 ? items[0].currency : 'USD';

    return {
      total: Math.round(total * 100) / 100,
      currency,
      items,
    };
  }

  /**
   * وضع علامة "تم الدفع" على الإيرادات المرتبطة بدفعة
   */
  async markRevenueAsPaid(
    creatorId: string,
    payoutId: string,
  ): Promise<number> {
    const result = await this.revenueRepo.update(
      {
        creator_id: creatorId,
        is_paid_out: false,
      },
      {
        is_paid_out: true,
        payout_id: payoutId,
      },
    );

    return result.affected ?? 0;
  }

  // ── مساعدات ────────────────────────────────────────────────────

  /**
   * حساب رس بوابة الدفع حسب الطريقة
   */
  private calculateGatewayFee(method: PayoutMethod, amount: number): number {
    switch (method) {
      case PayoutMethod.STRIPE_CONNECT:
        // Stripe: 0.25% + $0.25
        return amount * 0.0025 + 0.25;
      case PayoutMethod.PAYPAL:
        // PayPal: 2% (للتحويلات الدولية)
        return amount * 0.02;
      case PayoutMethod.BANK_TRANSFER:
        // تحويل بنكي: $5 ثابت
        return 5;
      default:
        return 0;
    }
  }
}
