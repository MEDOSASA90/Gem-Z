import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CashbackRule } from './cashback-rule.entity';
import { WalletService } from '../wallet/wallet.service';

/**
 * خدمة الكاش باك - حساب وإصدار المكافآت النقدية
 * Cashback Service - Calculates and issues cashback rewards
 * 
 * - حساب الكاش باك بناءً على قواعد نشطة
 * - إيداع الكاش باك في المحفظة
 * - إدارة قواعد الكاش باك
 */
@Injectable()
export class CashbackService {
  private readonly logger = new Logger(CashbackService.name);

  constructor(
    @InjectRepository(CashbackRule)
    private readonly ruleRepo: Repository<CashbackRule>,
    private readonly walletService: WalletService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * حساب الكاش باك لمبلغ وفئة معينة
   * Calculate cashback for a given amount and category
   */
  async calculateCashback(
    _userId: string,
    amount: number,
    category: string,
  ): Promise<{
    eligible_amount: number;
    cashback_amount: number;
    percentage: number;
    rule_name: string;
    rule_id: string;
  } | null> {
    // البحث عن قاعدة نشطة للفئة
    const rule = await this.ruleRepo.findOne({
      where: { category, is_active: true },
    });

    if (!rule) {
      return null; // لا توجد قاعدة لهذه الفئة
    }

    // التحقق من الحد الأدنى
    if (amount < rule.min_amount) {
      return null;
    }

    // حساب الكاش باك
    const cashbackAmount = amount * rule.percentage;

    // تطبيق الحد الأقصى
    const finalCashback = rule.max_cashback > 0
      ? Math.min(cashbackAmount, rule.max_cashback)
      : cashbackAmount;

    return {
      eligible_amount: amount,
      cashback_amount: parseFloat(finalCashback.toFixed(4)),
      percentage: rule.percentage,
      rule_name: rule.name,
      rule_id: rule.id,
    };
  }

  /**
   * إصدار كاش باك لمحفظة
   * Issue cashback to a wallet
   */
  async issueCashback(
    walletId: string,
    amount: number,
    referenceId?: string,
  ): Promise<void> {
    if (amount <= 0) return;

    await this.walletService.deposit(
      walletId,
      amount,
      referenceId ?? undefined,
      'cashback',
      `كاش باك: ${amount.toFixed(4)}`,
    );

    // نشر حدث
    this.eventEmitter.emit('cashback.issued', {
      event_id: crypto.randomUUID(),
      correlation_id: referenceId ?? crypto.randomUUID(),
      source_module: 'economy',
      event_type: 'CashbackIssued',
      timestamp: new Date().toISOString(),
      payload: {
        wallet_id: walletId,
        amount,
        reference_id: referenceId,
      },
    });

    this.logger.log(`Cashback issued: ${amount} to wallet ${walletId}`);
  }

  /**
   * الحصول على القواعد النشطة
   */
  async getActiveRules(): Promise<CashbackRule[]> {
    return this.ruleRepo.find({
      where: { is_active: true },
      order: { category: 'ASC', created_at: 'DESC' },
    });
  }

  /**
   * إنشاء قاعدة كاش باك جديدة
   */
  async createRule(data: Partial<CashbackRule>): Promise<CashbackRule> {
    const rule = this.ruleRepo.create(data);
    return this.ruleRepo.save(rule);
  }

  /**
   * تفعيل/تعطيل قاعدة
   */
  async toggleRuleStatus(ruleId: string, isActive: boolean): Promise<void> {
    await this.ruleRepo.update(ruleId, { is_active: isActive });
  }
}
