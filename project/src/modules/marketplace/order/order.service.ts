import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OrderRepository, OrderItemRepository } from './order.repository';
import { ProductService } from '../product/product.service';
import { EscrowService } from '../../economy/escrow/escrow.service';
import { Order } from './order.entity';
import { OrderItem } from './order-item.entity';
import { OrderStatus, PaymentStatus, FulfillmentStatus } from '../../../common/enums';
import { CreateOrderDto, UpdateOrderStatusDto } from './order.dto';

/**
 * خدمة الطلبات - إدارة الطلبات
 * Order Service - Order management
 * 
 * - إنشاء وتحديث وحذف الطلبات
 * - إدارة دورة حياة الطلب
 * - التكامل مع المخزون والضمان
 */
@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    private readonly orderRepo: OrderRepository,
    private readonly itemRepo: OrderItemRepository,
    private readonly productService: ProductService,
    private readonly escrowService: EscrowService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // =========================================================================
  // Order CRUD
  // =========================================================================

  /**
   * إنشاء طلب جديد
   * Create a new order
   */
  async create(dto: CreateOrderDto): Promise<Order> {
    // حساب المجاميع
    const subtotal = dto.items.reduce((sum, item) => sum + item.total_price, 0);
    const shippingCost = dto.shipping_cost ?? 0;
    const taxAmount = dto.tax_amount ?? 0;
    const discountAmount = dto.discount_amount ?? 0;
    const total = subtotal + shippingCost + taxAmount - discountAmount;

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
      status: OrderStatus.CREATED,
      payment_status: PaymentStatus.PENDING,
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
      },
    });

    this.logger.log(`Order created: ${saved.id} | Buyer: ${dto.buyer_id} | Total: ${total}`);

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
