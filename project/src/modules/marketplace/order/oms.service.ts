import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { OrderService } from './order.service';
import { EscrowService } from '../../economy/escrow/escrow.service';
import { WalletService } from '../../economy/wallet/wallet.service';
import { CashbackService } from '../../economy/rewards/cashback.service';
import { ProductService } from '../product/product.service';
import { OrderStatus } from '../../../common/enums';

/**
 * خدمة إدارة دورة حياة الطلب - OMS (Order Management System)
 * 
 * تستمع للأحداث وتدير انتقالات حالة الطلب:
 * - OrderCreated → حجز مخزون
 * - PaymentConfirmed → إنشاء ضمان
 * - Shipped → تحديث حالة الشحن
 * - Delivered → تحرير الضمان بعد فترة السماح
 * - Dispute → تجميد الضمان
 * 
 * Lifecycle: CREATED → CONFIRMED → PACKED → SHIPPED → DELIVERED → ESCROW_RELEASED
 */
@Injectable()
export class OMSService {
  private readonly logger = new Logger(OMSService.name);

  constructor(
    private readonly orderService: OrderService,
    private readonly escrowService: EscrowService,
    private readonly walletService: WalletService,
    private readonly cashbackService: CashbackService,
    private readonly productService: ProductService,
  ) {}

  // =========================================================================
  // Event Handlers - معالجات الأحداث
  // =========================================================================

  /**
   * معالجة إنشاء الطلب
   * حالة أولية - الطلب تم إنشاؤه
   */
  @OnEvent('order.created', { async: true })
  async processOrderCreated(payload: { payload: { order_id: string } }): Promise<void> {
    const { order_id } = payload.payload;
    this.logger.log(`OMS: Processing OrderCreated for ${order_id}`);

    // يمكن إضافة منطق هنا: إرسال إشعار للبائع، التحقق من المخزون، إلخ
    // المخزون يتم حجزه في OrderService.create()

    // التحقق من صحة الطلب
    try {
      const order = await this.orderService.getById(order_id);
      this.logger.log(`OMS: Order ${order_id} validated | Items: ${order.items.length}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`OMS: Failed to validate order ${order_id}: ${message}`);
    }
  }

  /**
   * معالجة تأكيد الدفع
   * إنشاء ضمان بعد تأكيد الدفع
   */
  @OnEvent('order.payment.confirmed', { async: true })
  async processPaymentConfirmed(payload: {
    payload: { order_id: string; wallet_id: string };
  }): Promise<void> {
    const { order_id, wallet_id } = payload.payload;
    this.logger.log(`OMS: Processing PaymentConfirmed for ${order_id}`);

    try {
      const order = await this.orderService.getById(order_id);

      // تحديث حالة الطلب إلى مؤكد
      if (order.status === OrderStatus.CREATED) {
        await this.orderService.updateStatus(order_id, {
          status: OrderStatus.CONFIRMED,
          notes: 'تم تأكيد الدفع',
        });
      }

      // إنشاء ضمان
      await this.escrowService.hold(
        wallet_id,
        order_id,
        order.seller_id,
        order.total,
        order.currency,
        undefined,
        `طلب #${order_id}`,
      );

      this.logger.log(`OMS: Escrow held for order ${order_id} | Amount: ${order.total}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`OMS: Payment processing failed for ${order_id}: ${message}`);
    }
  }

  /**
   * معالجة الشحن
   * تحديث حالة الطلب إلى مشحون
   */
  @OnEvent('order.shipped', { async: true })
  async processShipped(payload: {
    payload: { order_id: string; tracking_number?: string; carrier?: string };
  }): Promise<void> {
    const { order_id, tracking_number, carrier } = payload.payload;
    this.logger.log(`OMS: Processing Shipped for ${order_id}`);

    try {
      const order = await this.orderService.getById(order_id);

      // الانتقال من CONFIRMED أو PACKED إلى SHIPPED
      if (order.status === OrderStatus.CONFIRMED || order.status === OrderStatus.PACKED) {
        await this.orderService.updateStatus(order_id, {
          status: OrderStatus.SHIPPED,
          notes: `شحنت بواسطة ${carrier ?? 'N/A'} | Tracking: ${tracking_number ?? 'N/A'}`,
        });
      }

      this.logger.log(`OMS: Order ${order_id} marked as SHIPPED`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`OMS: Ship processing failed for ${order_id}: ${message}`);
    }
  }

  /**
   * معالجة التوصيل
   * تحديث حالة الطلب إلى تم التوصيل
   * جدولة تحرير الضمان بعد فترة السماح
   */
  @OnEvent('order.delivered', { async: true })
  async processDelivered(payload: { payload: { order_id: string } }): Promise<void> {
    const { order_id } = payload.payload;
    this.logger.log(`OMS: Processing Delivered for ${order_id}`);

    try {
      const order = await this.orderService.getById(order_id);

      if (order.status === OrderStatus.SHIPPED) {
        await this.orderService.updateStatus(order_id, {
          status: OrderStatus.DELIVERED,
          notes: 'تم التوصيل بنجاح',
        });
      }

      // تحرير الضمان للبائع
      const escrowStatus = await this.escrowService.getStatus(order_id);
      if (escrowStatus.escrow?.status === 'HELD') {
        await this.escrowService.release(escrowStatus.escrow.id, 'order_delivered');

        // تحديث حالة الطلب
        await this.orderService.updateStatus(order_id, {
          status: OrderStatus.ESCROW_RELEASED,
          notes: 'تم تحرير الضمان بعد التوصيل',
        });

        // حساب كاش باك للمشتري
        const cashback = await this.cashbackService.calculateCashback(
          order.buyer_id,
          order.subtotal,
          'marketplace',
        );

        if (cashback && cashback.cashback_amount > 0) {
          const buyerWallets = await this.walletService.getUserWallets(order.buyer_id);
          const buyerWallet = buyerWallets.find((w) => w.currency === order.currency);

          if (buyerWallet) {
            await this.cashbackService.issueCashback(
              buyerWallet.id,
              cashback.cashback_amount,
              order_id,
            );
          }
        }

        // زيادة عدد مبيعات المنتجات
        for (const item of order.items) {
          await this.productService.incrementSales(item.product_id);
        }
      }

      this.logger.log(`OMS: Order ${order_id} delivered, escrow released`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`OMS: Delivery processing failed for ${order_id}: ${message}`);
    }
  }

  /**
   * معالجة النزاع
   * تجميد الضمان عند فتح نزاع
   */
  @OnEvent('order.disputed', { async: true })
  async processDispute(payload: {
    payload: { order_id: string; reason: string };
  }): Promise<void> {
    const { order_id, reason } = payload.payload;
    this.logger.log(`OMS: Processing Dispute for ${order_id}`);

    try {
      const order = await this.orderService.getById(order_id);

      // تحديث حالة الطلب
      if (order.status !== OrderStatus.REFUNDED && order.status !== OrderStatus.CANCELLED) {
        await this.orderService.updateStatus(order_id, {
          status: OrderStatus.DISPUTED,
          notes: `نزاع: ${reason}`,
        });
      }

      // تحديث حالة الضمان
      const escrowStatus = await this.escrowService.getStatus(order_id);
      if (escrowStatus.escrow?.status === 'HELD') {
        await this.escrowService.markDisputed(escrowStatus.escrow.id, reason);
      }

      this.logger.log(`OMS: Order ${order_id} marked as DISPUTED | Reason: ${reason}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`OMS: Dispute processing failed for ${order_id}: ${message}`);
    }
  }

  /**
   * معالجة استرداد المبلغ
   */
  @OnEvent('order.refunded', { async: true })
  async processRefund(payload: {
    payload: { order_id: string; reason: string };
  }): Promise<void> {
    const { order_id, reason } = payload.payload;
    this.logger.log(`OMS: Processing Refund for ${order_id}`);

    try {
      const order = await this.orderService.getById(order_id);

      // استرداد الضمان
      const escrowStatus = await this.escrowService.getStatus(order_id);
      if (escrowStatus.escrow?.status === 'HELD' || escrowStatus.escrow?.status === 'DISPUTED') {
        await this.escrowService.refund(escrowStatus.escrow.id, reason);
      }

      // تحديث حالة الطلب
      await this.orderService.updateStatus(order_id, {
        status: OrderStatus.REFUNDED,
        notes: `استرداد: ${reason}`,
      });

      // إرجاع المخزون
      for (const item of order.items) {
        await this.productService.releaseInventory(item.product_id, item.quantity);
      }

      this.logger.log(`OMS: Order ${order_id} refunded | Reason: ${reason}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`OMS: Refund processing failed for ${order_id}: ${message}`);
    }
  }
}
