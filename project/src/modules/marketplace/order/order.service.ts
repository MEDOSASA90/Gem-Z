import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Cron, CronExpression } from '@nestjs/schedule';
import Redis from 'ioredis';
import { OrderRepository, OrderItemRepository } from './order.repository';
import { ProductService } from '../product/product.service';
import { EscrowService } from '../../economy/escrow/escrow.service';
import { WalletService } from '../../economy/wallet/wallet.service';
import { Order } from './order.entity';
import { OrderItem } from './order-item.entity';
import { OrderStatus, PaymentStatus, FulfillmentStatus } from '../../../common/enums';
import { CreateOrderDto, UpdateOrderStatusDto } from './order.dto';
import * as crypto from 'crypto';

/**
 * خدمة الطلبات - إدارة الطلبات
 * Order Service - Order management
 */
@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    private readonly orderRepo: OrderRepository,
    private readonly itemRepo: OrderItemRepository,
    private readonly productService: ProductService,
    private readonly escrowService: EscrowService,
    private readonly walletService: WalletService,
    @InjectRedis()
    private readonly redis: Redis,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // =========================================================================
  // Order CRUD
  // =========================================================================

  /**
   * إنشاء طلب جديد
   * Create a new order with used product balance verification and escrow state machine
   */
  async create(dto: CreateOrderDto): Promise<Order> {
    // حساب المجاميع
    const subtotal = dto.items.reduce((sum, item) => sum + item.total_price, 0);
    const shippingCost = dto.shipping_cost ?? 0;
    const taxAmount = dto.tax_amount ?? 0;
    const discountAmount = dto.discount_amount ?? 0;
    const total = subtotal + shippingCost + taxAmount - discountAmount;

    // ─── التحقق مما إذا كان الطلب يحتوي على سلع مستعملة ───
    let isUsedOrder = false;
    for (const item of dto.items) {
      const product = await this.productService.getById(item.product_id);
      if (product) {
        const isUsedAttr = product.attributes?.is_used === true || product.attributes?.is_used === 'true';
        const isUsedTag = product.tags?.includes('used') || product.tags?.includes('used-product');
        if (isUsedAttr || isUsedTag) {
          isUsedOrder = true;
          this.logger.log(`Used product detected: [${product.id}]`);
        }
      }
    }

    let buyerWallet = null;
    if (isUsedOrder) {
      // التحقق من وجود محفظة للمشتري وتوفر رصيد كافٍ
      buyerWallet = await this.walletService.getUserWalletByCurrency(dto.buyer_id, dto.currency);
      if (!buyerWallet) {
        throw new HttpException('Buyer does not have a wallet for this currency', HttpStatus.BAD_REQUEST);
      }
      
      const balanceObj = await this.walletService.getBalance(buyerWallet.id);
      if (balanceObj.available_balance < total) {
        // IF balance is insufficient => Throw HttpException("Insufficient funds", 400) and terminate workflow
        throw new HttpException('Insufficient funds', HttpStatus.BAD_REQUEST);
      }
    }

    // التحقق من المخزون وحجزه
    for (const item of dto.items) {
      try {
        await this.productService.holdInventory(item.product_id, item.quantity);
      } catch (error: unknown) {
        // إرجاع المخزون المحجوز في حالة فشل
        for (const held of dto.items) {
          if (held.product_id === item.product_id) break;
          await this.productService.releaseInventory(held.product_id, held.quantity);
        }
        const message = error instanceof Error ? error.message : String(error);
        throw new BadRequestException(`فشل حجز المخزون: ${message}`);
      }
    }

    // إنشاء الطلب
    const order = this.orderRepo.create({
      buyer_id: dto.buyer_id,
      seller_id: dto.seller_id,
      store_id: dto.store_id ?? null,
      status: isUsedOrder ? OrderStatus.FUNDS_ESCROWED : OrderStatus.CREATED,
      payment_status: isUsedOrder ? PaymentStatus.AUTHORIZED : PaymentStatus.PENDING,
      fulfillment_status: FulfillmentStatus.PENDING,
      currency: dto.currency,
      subtotal,
      shipping_cost: shippingCost,
      tax_amount: taxAmount,
      discount_amount: discountAmount,
      total,
      shipping_address: dto.shipping_address,
      billing_address: dto.billing_address,
      notes: dto.notes ?? null,
      metadata: { is_used_order: isUsedOrder },
      items: dto.items.map((item) =>
        this.itemRepo.create({
          product_id: item.product_id,
          product_name: item.product_name,
          product_image: item.product_image ?? null,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          currency: item.currency,
        }),
      ),
    });

    const saved = await this.orderRepo.save(order);

    // IF balance is sufficient => Deduct funds from buyer's wallet and move them into system-controlled EscrowAccount
    if (isUsedOrder && buyerWallet) {
      await this.escrowService.hold(
        buyerWallet.id,
        saved.id,
        dto.seller_id,
        total,
        dto.currency,
        undefined,
        'Used fitness product escrow hold',
      );
      this.logger.log(`Escrow established for used product order [${saved.id}]. Funds locked.`);
    }

    // نشر حدث إنشاء الطلب
    this.eventEmitter.emit('order.created', {
      event_id: crypto.randomUUID(),
      correlation_id: crypto.randomUUID(),
      actor_id: dto.buyer_id,
      source_module: 'marketplace',
      event_type: 'OrderCreated',
      timestamp: new Date().toISOString(),
      payload: {
        order_id: saved.id,
        buyer_id: dto.buyer_id,
        seller_id: dto.seller_id,
        total,
        currency: dto.currency,
        items_count: dto.items.length,
        is_used: isUsedOrder,
      },
    });

    this.logger.log(`Order created: ${saved.id} | Buyer: ${dto.buyer_id} | Total: ${total} | Used: ${isUsedOrder}`);

    return saved;
  }

  /**
   * تحديث حالة الطلب مع التحقق من الانتقال الصحيح
   */
  async updateStatus(
    orderId: string,
    dto: UpdateOrderStatusDto,
  ): Promise<Order> {
    const order = await this.orderRepo.findById(orderId);
    if (!order) throw new NotFoundException('الطلب غير موجود');

    // التحقق من صحة الانتقال بين الحالات
    const validTransitions = this.getValidTransitions(order.status);
    if (!validTransitions.includes(dto.status)) {
      throw new BadRequestException(
        `انتقال غير صالح من ${order.status} إلى ${dto.status}. ` +
        `الانتقالات المسموح بها: ${validTransitions.join(', ')}`,
      );
    }

    // تحديث الحالة
    await this.orderRepo.updateStatus(orderId, dto.status);

    // تحديث حالات فرعية
    if (dto.status === OrderStatus.CONFIRMED) {
      await this.orderRepo.updatePaymentStatus(orderId, PaymentStatus.AUTHORIZED);
      await this.orderRepo.updateFulfillmentStatus(orderId, FulfillmentStatus.PROCESSING);
    } else if (dto.status === OrderStatus.PACKED) {
      await this.orderRepo.updateFulfillmentStatus(orderId, FulfillmentStatus.PACKED);
    } else if (dto.status === OrderStatus.SHIPPED) {
      await this.orderRepo.updateFulfillmentStatus(orderId, FulfillmentStatus.SHIPPED);
      
      // When the order status changes to SHIPPED via logistics aggregator Webhooks:
      // Start a strict 14-day Redis-backed countdown timer (TTL)
      // 14 days in seconds = 1209600
      await this.redis.setex(`escrow:countdown:${orderId}`, 1209600, 'active');
      this.logger.log(`Strict 14-day Redis countdown timer (TTL) started for shipped order [${orderId}]`);
    } else if (dto.status === OrderStatus.DELIVERED) {
      await this.orderRepo.updateFulfillmentStatus(orderId, FulfillmentStatus.DELIVERED);
    }

    const updated = await this.orderRepo.findById(orderId);
    if (!updated) throw new NotFoundException('الطلب غير موجود');

    // نشر حدث
    this.eventEmitter.emit('order.status.updated', {
      event_id: crypto.randomUUID(),
      correlation_id: orderId,
      source_module: 'marketplace',
      event_type: 'OrderStatusUpdated',
      timestamp: new Date().toISOString(),
      payload: {
        order_id: orderId,
        old_status: order.status,
        new_status: dto.status,
        notes: dto.notes,
      },
    });

    this.logger.log(`Order ${orderId} status: ${order.status} -> ${dto.status}`);

    return updated;
  }

  /**
   * Confirm Delivery of used product
   */
  async confirmDelivery(orderId: string, buyerId: string): Promise<Order> {
    const order = await this.orderRepo.findById(orderId);
    if (!order) throw new NotFoundException('الطلب غير موجود');
    if (order.buyer_id !== buyerId) {
      throw new BadRequestException('أنت لست المشتري لهذا الطلب');
    }

    // Check if there is an active dispute filed for this order_id
    const disputeActive = (await this.redis.get(`dispute:active:${orderId}`)) === 'true' || order.status === OrderStatus.DISPUTED;

    if (disputeActive) {
      // IF dispute_active === true => Block execution, freeze funds, and notify Enterprise Operations Center dashboard immediately
      this.eventEmitter.emit('enterprise.ops.dispute_frozen', {
        event_id: crypto.randomUUID(),
        correlation_id: orderId,
        actor_id: buyerId,
        source_module: 'marketplace',
        event_type: 'DisputeFrozen',
        timestamp: new Date().toISOString(),
        payload: {
          order_id: orderId,
          buyer_id: buyerId,
          seller_id: order.seller_id,
          amount: order.total,
          message: 'Confirm Delivery blocked due to active dispute. Escrow funds frozen.',
        },
      });

      this.logger.warn(`Confirm delivery blocked for order [${orderId}]. Escrow funds frozen due to active dispute.`);
      throw new BadRequestException('لقد تم تجميد الأموال ووقف تأكيد الاستلام لوجود نزاع نشط على هذا الطلب.');
    }

    // IF dispute_active === false => Release funds from EscrowAccount, credit the Seller's balance
    const escrowStatus = await this.escrowService.getStatus(orderId);
    if (escrowStatus.escrow) {
      await this.escrowService.release(escrowStatus.escrow.id, 'Buyer manual confirm delivery');
    }

    // Update order status to ESCROW_RELEASED
    await this.orderRepo.updateStatus(orderId, OrderStatus.ESCROW_RELEASED);
    
    // Clean up Redis timer
    await this.redis.del(`escrow:countdown:${orderId}`);

    this.logger.log(`Escrow funds successfully released to seller for order [${orderId}] after manual confirmation.`);
    const updated = await this.orderRepo.findById(orderId);
    if (!updated) throw new NotFoundException('الطلب غير موجود');
    return updated;
  }

  /**
   * File a dispute for an order
   */
  async fileDispute(orderId: string, buyerId: string, reason: string): Promise<void> {
    const order = await this.orderRepo.findById(orderId);
    if (!order) throw new NotFoundException('الطلب غير موجود');
    if (order.buyer_id !== buyerId) {
      throw new BadRequestException('أنت لست المشتري لهذا الطلب لرفع نزاع');
    }

    await this.redis.set(`dispute:active:${orderId}`, 'true');
    await this.orderRepo.updateStatus(orderId, OrderStatus.DISPUTED);

    const escrow = await this.escrowService.getStatus(orderId);
    if (escrow.escrow) {
      await this.escrowService.markDisputed(escrow.escrow.id, reason);
    }

    this.logger.log(`Active dispute raised for order [${orderId}] by buyer [${buyerId}].`);
  }

  /**
   * Automated Escrow Release on 14-day expiry
   * Cron Job checking hourly
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handleExpiredEscrowTimers(): Promise<void> {
    this.logger.log('Checking for expired 14-day shipped escrows in Redis...');
    
    const shippedOrders = await this.orderRepo.find({
      where: [
        { status: OrderStatus.SHIPPED },
        { status: OrderStatus.DELIVERED }
      ]
    });

    for (const order of shippedOrders) {
      const escrow = await this.escrowService.getStatus(order.id);
      if (!escrow || escrow.status !== 'HELD') continue;

      // Check Redis countdown timer key
      const keyExists = await this.redis.exists(`escrow:countdown:${order.id}`);
      if (keyExists === 0) {
        // Redis TTL expired! No countdown key exists anymore.
        // Check if dispute is active
        const disputeActive = (await this.redis.get(`dispute:active:${order.id}`)) === 'true' || order.status === OrderStatus.DISPUTED;
        if (disputeActive) {
          this.logger.warn(`14-day timer expired for order [${order.id}] but dispute is active. Skipping auto-release.`);
          continue;
        }

        // IF 14-day timer expires AND no dispute is filed => Automate release of funds to seller
        this.logger.log(`Auto-releasing escrow for order [${order.id}]: 14-day shipped TTL expired without dispute.`);
        if (escrow.escrow) {
          await this.escrowService.release(escrow.escrow.id, 'Automatic release after 14 days shipped without dispute');
          await this.orderRepo.updateStatus(order.id, OrderStatus.ESCROW_RELEASED);
        }
      }
    }
  }

  /**
   * الحصول على طلب بالمعرف
   */
  async getById(id: string): Promise<Order> {
    const order = await this.orderRepo.findById(id);
    if (!order) throw new NotFoundException('الطلب غير موجود');
    return order;
  }

  /**
   * طلبات المشتري
   */
  async listByBuyer(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ orders: Order[]; total: number; page: number; limit: number }> {
    const [orders, total] = await this.orderRepo.findByBuyerId(userId, page, limit);
    return { orders, total, page, limit };
  }

  /**
   * طلبات البائع
   */
  async listBySeller(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ orders: Order[]; total: number; page: number; limit: number }> {
    const [orders, total] = await this.orderRepo.findBySellerId(userId, page, limit);
    return { orders, total, page, limit };
  }

  /**
   * إلغاء طلب
   */
  async cancel(orderId: string, reason?: string): Promise<void> {
    const order = await this.orderRepo.findById(orderId);
    if (!order) throw new NotFoundException('الطلب غير موجود');

    // يمكن إلغاء الطلبات في حالات محددة فقط
    const cancellableStatuses = [OrderStatus.CREATED, OrderStatus.CONFIRMED];
    if (!cancellableStatuses.includes(order.status)) {
      throw new BadRequestException(
        `لا يمكن إلغاء طلب بحالة ${order.status}`,
      );
    }

    // إرجاع المخزون
    for (const item of order.items) {
      await this.productService.releaseInventory(item.product_id, item.quantity);
    }

    // تحديث الحالة
    await this.orderRepo.updateStatus(orderId, OrderStatus.CANCELLED);
    await this.orderRepo.updatePaymentStatus(orderId, PaymentStatus.REFUNDED);

    // نشر حدث
    this.eventEmitter.emit('order.cancelled', {
      event_id: crypto.randomUUID(),
      correlation_id: orderId,
      source_module: 'marketplace',
      event_type: 'OrderCancelled',
      timestamp: new Date().toISOString(),
      payload: {
        order_id: orderId,
        reason: reason ?? 'cancelled_by_user',
        total: order.total,
        currency: order.currency,
      },
    });

    this.logger.log(`Order cancelled: ${orderId} | Reason: ${reason ?? 'N/A'}`);
  }

  // =========================================================================
  // Helpers
  // =========================================================================

  /**
   * الحصول على الانتقالات المسموح بها من حالة معينة
   */
  private getValidTransitions(currentStatus: OrderStatus): OrderStatus[] {
    const transitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.CREATED]: [
        OrderStatus.CONFIRMED,
        OrderStatus.CANCELLED,
      ],
      [OrderStatus.FUNDS_ESCROWED]: [
        OrderStatus.CONFIRMED,
        OrderStatus.CANCELLED,
        OrderStatus.SHIPPED,
        OrderStatus.DELIVERED,
      ],
      [OrderStatus.CONFIRMED]: [
        OrderStatus.PACKED,
        OrderStatus.CANCELLED,
        OrderStatus.DISPUTED,
      ],
      [OrderStatus.PACKED]: [
        OrderStatus.SHIPPED,
        OrderStatus.CANCELLED,
      ],
      [OrderStatus.SHIPPED]: [
        OrderStatus.DELIVERED,
        OrderStatus.DISPUTED,
      ],
      [OrderStatus.DELIVERED]: [
        OrderStatus.ESCROW_RELEASED,
        OrderStatus.RETURNED,
        OrderStatus.DISPUTED,
      ],
      [OrderStatus.RETURNED]: [
        OrderStatus.REFUNDED,
      ],
      [OrderStatus.DISPUTED]: [
        OrderStatus.ESCROW_RELEASED,
        OrderStatus.REFUNDED,
      ],
      [OrderStatus.REFUNDED]: [],
      [OrderStatus.ESCROW_RELEASED]: [
        OrderStatus.RETURNED,
      ],
      [OrderStatus.CANCELLED]: [],
    };

    return transitions[currentStatus] ?? [];
  }
}
