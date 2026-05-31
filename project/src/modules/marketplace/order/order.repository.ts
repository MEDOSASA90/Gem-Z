import { Repository, DataSource } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { Order } from './order.entity';
import { OrderItem } from './order-item.entity';
import { OrderStatus, PaymentStatus, FulfillmentStatus } from '../../../common/enums';

/**
 * مستودع الطلبات - Order Repository
 */
@Injectable()
export class OrderRepository extends Repository<Order> {
  constructor(private dataSource: DataSource) {
    super(Order, dataSource.createEntityManager());
  }

  /**
   * إيجاد طلب بالمعرف مع عناصره
   */
  async findById(id: string): Promise<Order | null> {
    return this.findOne({
      where: { id },
      relations: ['items'],
    });
  }

  /**
   * إيجاد طلبات المشتري
   */
  async findByBuyerId(
    buyerId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<[Order[], number]> {
    return this.findAndCount({
      where: { buyer_id: buyerId },
      relations: ['items'],
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  /**
   * إيجاد طلبات البائع
   */
  async findBySellerId(
    sellerId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<[Order[], number]> {
    return this.findAndCount({
      where: { seller_id: sellerId },
      relations: ['items'],
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  /**
   * تحديث حالة الطلب
   */
  async updateStatus(id: string, status: OrderStatus): Promise<void> {
    await this.update(id, { status });
  }

  /**
   * تحديث حالة الدفع
   */
  async updatePaymentStatus(
    id: string,
    paymentStatus: PaymentStatus,
  ): Promise<void> {
    await this.update(id, { payment_status: paymentStatus });
  }

  /**
   * تحديث حالة التنفيذ
   */
  async updateFulfillmentStatus(
    id: string,
    fulfillmentStatus: FulfillmentStatus,
  ): Promise<void> {
    await this.update(id, { fulfillment_status: fulfillmentStatus });
  }
}

/**
 * مستودع عناصر الطلب - Order Item Repository
 */
@Injectable()
export class OrderItemRepository extends Repository<OrderItem> {
  constructor(private dataSource: DataSource) {
    super(OrderItem, dataSource.createEntityManager());
  }

  /**
   * إيجاد عناصر طلب
   */
  async findByOrderId(orderId: string): Promise<OrderItem[]> {
    return this.find({ where: { order_id: orderId } });
  }
}
