import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { OrderItem } from './order-item.entity';
import { Currency, OrderStatus, PaymentStatus, FulfillmentStatus } from '../../../common/enums';

/**
 * عنوان الشحن/الفوترة
 */
export interface OrderAddress {
  full_name: string;
  phone: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state?: string;
  country: string;
  postal_code?: string;
}

/**
 * كيان الطلب
 * Order Entity - Marketplace order
 * 
 * دورة حياة الطلب: CREATED → CONFIRMED → PACKED → SHIPPED → DELIVERED → ESCROW_RELEASED
 */
@Entity('orders')
@Index(['buyer_id'])
@Index(['seller_id'])
@Index(['store_id'])
@Index(['status'])
@Index(['created_at'])
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** معرف المشتري */
  @Column('uuid')
  buyer_id!: string;

  /** معرف البائع */
  @Column('uuid')
  seller_id!: string;

  /** معرف المتجر */
  @Column('uuid', { nullable: true })
  store_id!: string | null;

  /** حالة الطلب */
  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.CREATED,
  })
  status!: OrderStatus;

  /** حالة الدفع */
  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  payment_status!: PaymentStatus;

  /** حالة التنفيذ */
  @Column({
    type: 'enum',
    enum: FulfillmentStatus,
    default: FulfillmentStatus.PENDING,
  })
  fulfillment_status!: FulfillmentStatus;

  /** عملة الطلب */
  @Column({
    type: 'enum',
    enum: Currency,
  })
  currency!: Currency;

  /** المجموع الفرعي */
  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    transformer: {
      to: (value: number | string): string => {
        if (typeof value === 'string') return value;
        return value?.toFixed(2) ?? '0.00';
      },
      from: (value: string): number => parseFloat(value),
    },
  })
  subtotal!: number;

  /** تكلفة الشحن */
  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: {
      to: (value: number | string): string => {
        if (typeof value === 'string') return value;
        return value?.toFixed(2) ?? '0.00';
      },
      from: (value: string): number => parseFloat(value),
    },
  })
  shipping_cost!: number;

  /** مبلغ الضريبة */
  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: {
      to: (value: number | string): string => {
        if (typeof value === 'string') return value;
        return value?.toFixed(2) ?? '0.00';
      },
      from: (value: string): number => parseFloat(value),
    },
  })
  tax_amount!: number;

  /** مبلغ الخصم */
  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    transformer: {
      to: (value: number | string): string => {
        if (typeof value === 'string') return value;
        return value?.toFixed(2) ?? '0.00';
      },
      from: (value: string): number => parseFloat(value),
    },
  })
  discount_amount!: number;

  /** الإجمالي */
  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    transformer: {
      to: (value: number | string): string => {
        if (typeof value === 'string') return value;
        return value?.toFixed(2) ?? '0.00';
      },
      from: (value: string): number => parseFloat(value),
    },
  })
  total!: number;

  /** عنوان الشحن */
  @Column({ type: 'jsonb' })
  shipping_address!: OrderAddress;

  /** عنوان الفوترة */
  @Column({ type: 'jsonb' })
  billing_address!: OrderAddress;

  /** ملاحظات */
  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  /** بيانات إضافية */
  @Column({ type: 'jsonb', default: {} })
  metadata!: Record<string, unknown>;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  /** عناصر الطلب */
  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
  items!: OrderItem[];
}
