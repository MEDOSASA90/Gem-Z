import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EscrowRepository } from './escrow.repository';
import { WalletService } from '../wallet/wallet.service';
import { Escrow, ReleaseCondition } from './escrow.entity';
import { Currency, EscrowStatus } from '../../../common/enums';

/** مدة الضمان الافتراضية بالأيام (14 يوم) */
const ESCROW_HOLD_DAYS = 14;

/**
 * خدمة الضمان - إدارة أموال الضمان
 * Escrow Service - Manages escrow funds
 * 
 * تحجز الأموال لمدة 14 يوم كحد أدنى، ثم تُحرر تلقائياً
 * Funds held for 14 days minimum, then auto-released
 */
@Injectable()
export class EscrowService {
  private readonly logger = new Logger(EscrowService.name);

  constructor(
    private readonly escrowRepo: EscrowRepository,
    private readonly walletService: WalletService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * حجز أموال في الضمان
   * Hold funds in escrow
   */
  async hold(
    walletId: string,
    orderId: string,
    sellerId: string,
    amount: number,
    currency: Currency,
    conditions?: ReleaseCondition[],
    holdReason: string = 'طلب شراء',
  ): Promise<Escrow> {
    if (amount <= 0) {
      throw new BadRequestException('المبلغ يجب أن يكون أكبر من صفر');
    }

    // التحقق من عدم وجود ضمان سابق للطلب
    const existing = await this.escrowRepo.findByOrderId(orderId);
    if (existing) {
      throw new BadRequestException('الطلب لديه ضمان سابق');
    }

    // حجز الأموال في المحفظة (خصم + زيادة المحجوز)
    await this.walletService.withdraw(
      walletId,
      amount,
      null,
      'escrow_hold',
      `حجز ضمان للطلب ${orderId}`,
    );

    // إنشاء سجل الضمان
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + ESCROW_HOLD_DAYS);

    const defaultConditions: ReleaseCondition[] = [
      {
        type: 'DELIVERY_CONFIRMED',
        description: 'تأكيد استلام الطلب',
        required: true,
        fulfilled: false,
      },
      {
        type: 'TIME_EXPIRED',
        description: `انتهاء فترة الضمان (${ESCROW_HOLD_DAYS} يوم)`,
        required: false,
        fulfilled: false,
      },
    ];

    const escrow = await this.escrowRepo.createEscrow({
      wallet_id: walletId,
      amount,
      currency,
      order_id: orderId,
      seller_id: sellerId,
      status: EscrowStatus.HELD,
      hold_reason: holdReason,
      release_conditions: conditions ?? defaultConditions,
      expires_at: expiresAt,
    });

    // نشر حدث
    this.eventEmitter.emit('escrow.held', {
      event_id: crypto.randomUUID(),
      correlation_id: orderId,
      source_module: 'economy',
      event_type: 'EscrowHeld',
      timestamp: new Date().toISOString(),
      payload: {
        escrow_id: escrow.id,
        order_id: orderId,
        wallet_id: walletId,
        seller_id: sellerId,
        amount,
        currency,
        expires_at: expiresAt.toISOString(),
      },
    });

    this.logger.log(
      `Escrow held: ${escrow.id} | Order: ${orderId} | Amount: ${amount} ${currency}`,
    );

    return escrow;
  }

  /**
   * تحرير الضمان للبائع
   * Release escrow funds to seller
   */
  async release(escrowId: string, reason?: string): Promise<void> {
    const escrow = await this.escrowRepo.findById(escrowId);
    if (!escrow) throw new NotFoundException('الضمان غير موجود');
    if (escrow.status !== EscrowStatus.HELD && escrow.status !== EscrowStatus.DISPUTED) {
      throw new BadRequestException(`لا يمكن تحرير ضمان بحالة ${escrow.status}`);
    }

    // تحويل الأموال لمحفظة البائع
    // البحث عن محفظة البائع بنفس العملة
    const sellerWallets = await this.walletService.getUserWallets(escrow.seller_id);
    const sellerWallet = sellerWallets.find((w) => w.currency === escrow.currency);

    if (!sellerWallet) {
      // إنشاء محفظة للبائع إذا لم تكن موجودة
      const newWallet = await this.walletService.create(escrow.seller_id, escrow.currency);
      await this.walletService.deposit(
        newWallet.id,
        escrow.amount,
        escrow.order_id ?? undefined,
        'escrow_release',
        `تحرير ضمان للطلب ${escrow.order_id}`,
      );
    } else {
      await this.walletService.deposit(
        sellerWallet.id,
        escrow.amount,
        escrow.order_id ?? undefined,
        'escrow_release',
        `تحرير ضمان للطلب ${escrow.order_id}`,
      );
    }

    // تحديث حالة الضمان
    await this.escrowRepo.updateStatus(escrowId, EscrowStatus.RELEASED, new Date());

    // تحديث شروط التحرير
    await this.fulfillCondition(escrowId, 'MANUAL_RELEASE');

    // نشر حدث
    this.eventEmitter.emit('escrow.released', {
      event_id: crypto.randomUUID(),
      correlation_id: escrow.order_id ?? undefined,
      source_module: 'economy',
      event_type: 'EscrowReleased',
      timestamp: new Date().toISOString(),
      payload: {
        escrow_id: escrowId,
        order_id: escrow.order_id,
        seller_id: escrow.seller_id,
        amount: escrow.amount,
        currency: escrow.currency,
        reason: reason ?? 'manual',
      },
    });

    this.logger.log(`Escrow released: ${escrowId} | Order: ${escrow.order_id}`);
  }

  /**
   * استرداد الضمان للمشتري
   * Refund escrow funds to buyer
   */
  async refund(escrowId: string, reason: string): Promise<void> {
    const escrow = await this.escrowRepo.findById(escrowId);
    if (!escrow) throw new NotFoundException('الضمان غير موجود');
    if (escrow.status !== EscrowStatus.HELD && escrow.status !== EscrowStatus.DISPUTED) {
      throw new BadRequestException(`لا يمكن استرداد ضمان بحالة ${escrow.status}`);
    }

    // إعادة الأموال لمحفظة المشتري
    await this.walletService.deposit(
      escrow.wallet_id,
      escrow.amount,
      escrow.order_id ?? undefined,
      'escrow_refund',
      `استرداد ضمان للطلب ${escrow.order_id}: ${reason}`,
    );

    // تحديث حالة الضمان
    await this.escrowRepo.updateStatus(escrowId, EscrowStatus.REFUNDED, new Date());

    // نشر حدث
    this.eventEmitter.emit('escrow.refunded', {
      event_id: crypto.randomUUID(),
      correlation_id: escrow.order_id ?? undefined,
      source_module: 'economy',
      event_type: 'EscrowRefunded',
      timestamp: new Date().toISOString(),
      payload: {
        escrow_id: escrowId,
        order_id: escrow.order_id,
        wallet_id: escrow.wallet_id,
        amount: escrow.amount,
        currency: escrow.currency,
        reason,
      },
    });

    this.logger.log(`Escrow refunded: ${escrowId} | Reason: ${reason}`);
  }

  /**
   * الحصول على حالة ضمان طلب
   */
  async getStatus(orderId: string): Promise<{ escrow: Escrow | null; status: string }> {
    const escrow = await this.escrowRepo.findByOrderId(orderId);
    return {
      escrow,
      status: escrow?.status ?? 'NOT_FOUND',
    };
  }

  /**
   * تحديث حالة نزاع
   */
  async markDisputed(escrowId: string, reason: string): Promise<void> {
    const escrow = await this.escrowRepo.findById(escrowId);
    if (!escrow) throw new NotFoundException('الضمان غير موجود');
    if (escrow.status !== EscrowStatus.HELD) {
      throw new BadRequestException('يمكن فقط تنزاع ضمان محجوز');
    }

    await this.escrowRepo.updateStatus(escrowId, EscrowStatus.DISPUTED);

    this.eventEmitter.emit('escrow.disputed', {
      event_id: crypto.randomUUID(),
      correlation_id: escrow.order_id ?? undefined,
      source_module: 'economy',
      event_type: 'EscrowDisputed',
      timestamp: new Date().toISOString(),
      payload: { escrow_id: escrowId, order_id: escrow.order_id, reason },
    });

    this.logger.log(`Escrow disputed: ${escrowId} | Reason: ${reason}`);
  }

  /**
   * التحرير التلقائي للضمانات المنتهية
   * Cron job: يعمل كل ساعة
   */
  @Cron(CronExpression.EVERY_HOUR)
  async autoRelease(): Promise<void> {
    this.logger.log('Running auto-release check for expired escrows...');

    const expiredEscrows = await this.escrowRepo.findExpiredHeld();
    let released = 0;

    for (const escrow of expiredEscrows) {
      try {
        // تحديث شرط انتهاء الوقت
        await this.fulfillCondition(escrow.id, 'TIME_EXPIRED');

        // تحرير الأموال
        await this.release(escrow.id, 'auto_release_after_expiry');
        released++;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`Failed to auto-release escrow ${escrow.id}: ${message}`);
      }
    }

    if (released > 0) {
      this.logger.log(`Auto-released ${released} expired escrows`);
    }
  }

  /**
   * استيفاء شرط تحرير
   */
  private async fulfillCondition(
    escrowId: string,
    conditionType: string,
  ): Promise<void> {
    const escrow = await this.escrowRepo.findById(escrowId);
    if (!escrow || !escrow.release_conditions) return;

    const updated = escrow.release_conditions.map((c: ReleaseCondition) =>
      c.type === conditionType
        ? { ...c, fulfilled: true, fulfilled_at: new Date().toISOString() }
        : c,
    );

    await this.escrowRepo.update(escrowId, { release_conditions: updated });
  }
}
