import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { GEMPoints } from './points-balance.entity';
import { PointsTransaction } from './points-transaction.entity';
import { PointsSource, PointsTransactionType, PointsSpendPurpose, Currency } from '../../../common/enums';
import { WalletService } from '../wallet/wallet.service';

/** نسبة تحويل النقاط لمحفظة (100 نقطة = 1 وحدة عملة) */
const POINTS_TO_WALLET_RATE = 100;

/**
 * خدمة النقاط - إدارة GEM Points
 * Points Service - Manages GEM Points earning and spending
 * 
 * - كسب النقاط من التمارين والحضور والتحديات
 * - إنفاق النقاط للخصومات والمميزات
 * - تحويل النقاط لرصيد محفظة
 */
@Injectable()
export class PointsService {
  private readonly logger = new Logger(PointsService.name);

  constructor(
    @InjectRepository(GEMPoints)
    private readonly pointsRepo: Repository<GEMPoints>,
    @InjectRepository(PointsTransaction)
    private readonly txRepo: Repository<PointsTransaction>,
    private readonly walletService: WalletService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * كسب نقاط
   * Earn points for a user
   */
  async earn(
    userId: string,
    amount: number,
    source: PointsSource,
    description?: string,
    referenceId?: string,
  ): Promise<{ balance: number; earned: number }> {
    if (amount <= 0) {
      throw new BadRequestException('عدد النقاط يجب أن يكون أكبر من صفر');
    }

    // جلب أو إنشاء رصيد النقاط
    let pointsBalance = await this.pointsRepo.findOne({
      where: { user_id: userId },
    });

    if (!pointsBalance) {
      pointsBalance = this.pointsRepo.create({
        user_id: userId,
        balance: 0,
        lifetime_earned: 0,
        lifetime_spent: 0,
      });
    }

    const newBalance = pointsBalance.balance + amount;

    // تحديث الرصيد
    await this.pointsRepo.update(pointsBalance.id, {
      balance: newBalance,
      lifetime_earned: pointsBalance.lifetime_earned + amount,
    });

    // تسجيل المعاملة
    const tx = this.txRepo.create({
      user_id: userId,
      type: PointsTransactionType.EARN,
      amount,
      source,
      description: description ?? `كسب ${amount} نقطة من ${source}`,
      reference_id: referenceId ?? null,
      balance_after: newBalance,
    });
    await this.txRepo.save(tx);

    // نشر حدث
    this.eventEmitter.emit('points.earned', {
      event_id: crypto.randomUUID(),
      correlation_id: referenceId ?? crypto.randomUUID(),
      actor_id: userId,
      source_module: 'economy',
      event_type: 'PointsEarned',
      timestamp: new Date().toISOString(),
      payload: {
        user_id: userId,
        amount,
        source,
        new_balance: newBalance,
        transaction_id: tx.id,
      },
    });

    this.logger.log(`Points earned: +${amount} for user ${userId} from ${source}`);

    return { balance: newBalance, earned: amount };
  }

  /**
   * إنفاق نقاط
   * Spend points from user's balance
   */
  async spend(
    userId: string,
    amount: number,
    purpose: PointsSpendPurpose,
    description?: string,
  ): Promise<{ balance: number; spent: number }> {
    if (amount <= 0) {
      throw new BadRequestException('عدد النقاط يجب أن يكون أكبر من صفر');
    }

    // جلب رصيد النقاط
    const pointsBalance = await this.pointsRepo.findOne({
      where: { user_id: userId },
    });

    if (!pointsBalance || pointsBalance.balance < amount) {
      throw new BadRequestException(
        `رصيد نقاط غير كافٍ: المتاح ${pointsBalance?.balance ?? 0}، المطلوب ${amount}`,
      );
    }

    const newBalance = pointsBalance.balance - amount;

    // تحديث الرصيد
    await this.pointsRepo.update(pointsBalance.id, {
      balance: newBalance,
      lifetime_spent: pointsBalance.lifetime_spent + amount,
    });

    // تسجيل المعاملة
    const tx = this.txRepo.create({
      user_id: userId,
      type: PointsTransactionType.SPEND,
      amount,
      source: 'PURCHASE' as PointsSource,
      description: description ?? `إنفاق ${amount} نقطة لـ ${purpose}`,
      balance_after: newBalance,
    });
    await this.txRepo.save(tx);

    // نشر حدث
    this.eventEmitter.emit('points.spent', {
      event_id: crypto.randomUUID(),
      correlation_id: crypto.randomUUID(),
      actor_id: userId,
      source_module: 'economy',
      event_type: 'PointsSpent',
      timestamp: new Date().toISOString(),
      payload: {
        user_id: userId,
        amount,
        purpose,
        new_balance: newBalance,
        transaction_id: tx.id,
      },
    });

    this.logger.log(`Points spent: -${amount} for user ${userId} (${purpose})`);

    return { balance: newBalance, spent: amount };
  }

  /**
   * الحصول على رصيد النقاط
   * Get user's points balance
   */
  async getBalance(userId: string): Promise<{
    user_id: string;
    balance: number;
    lifetime_earned: number;
    lifetime_spent: number;
  }> {
    const pointsBalance = await this.pointsRepo.findOne({
      where: { user_id: userId },
    });

    if (!pointsBalance) {
      return {
        user_id: userId,
        balance: 0,
        lifetime_earned: 0,
        lifetime_spent: 0,
      };
    }

    return {
      user_id: pointsBalance.user_id,
      balance: pointsBalance.balance,
      lifetime_earned: pointsBalance.lifetime_earned,
      lifetime_spent: pointsBalance.lifetime_spent,
    };
  }

  /**
   * تحويل نقاط لرصيد محفظة
   * Convert points to wallet credit
   * 
   * 100 نقطة = 1 وحدة من العملة المختارة
   */
  async convertToWallet(
    userId: string,
    points: number,
    currency: Currency,
  ): Promise<{ wallet_credit: number; points_used: number }> {
    if (points <= 0) {
      throw new BadRequestException('عدد النقاط يجب أن يكون أكبر من صفر');
    }

    if (points % POINTS_TO_WALLET_RATE !== 0) {
      throw new BadRequestException(
        `عدد النقاط يجب أن يكون مضاعف ${POINTS_TO_WALLET_RATE}`,
      );
    }

    // إنفاق النقاط أولاً
    await this.spend(
      userId,
      points,
      'CONVERT_TO_WALLET' as PointsSpendPurpose,
      `تحويل ${points} نقطة لمحفظة ${currency}`,
    );

    // حساب الرصيد
    const walletCredit = points / POINTS_TO_WALLET_RATE;

    // إيجاد أو إنشاء محفظة المستخدم
    let wallet = await this.walletService.getUserWalletByCurrency(userId, currency);
    if (!wallet) {
      wallet = await this.walletService.create(userId, currency);
    }

    // إيداع الرصيد في المحفظة
    await this.walletService.deposit(
      wallet.id,
      walletCredit,
      undefined,
      'points_conversion',
      `تحويل ${points} نقطة لرصيد محفظة`,
    );

    this.logger.log(
      `Points converted: ${points} -> ${walletCredit} ${currency} for user ${userId}`,
    );

    return { wallet_credit: walletCredit, points_used: points };
  }

  /**
   * الحصول على تاريخ معاملات النقاط
   */
  async getTransactionHistory(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ transactions: PointsTransaction[]; total: number }> {
    const [transactions, total] = await this.txRepo.findAndCount({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { transactions, total };
  }
}
