import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Order } from './order.entity';
import { Currency } from '../../../common/enums';

/**
 * كيان عنصر الطلب
 * Order Item Entity - Individual items within an order
 */
@Entity('order_items')
@Index(['order_id'])
@Index(['product_id'])
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** معرف الطلب */
  @Column('uuid')
  order_id!: string;

  /** معرف المنتج */
  @Column('uuid')
  product_id!: string;

  /** اسم المنتج (للأرشفة) */
  @Column({ type: 'varchar', length: 300 })
  product_name!: string;

  /** صورة المنتج */
  @Column({ type: 'text', nullable: true })
  product_image!: string | null;

  /** الكمية */
  @Column({ type: 'integer' })
  quantity!: number;

  /** السعر لكل وحدة */
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
  unit_price!: number;

  /** السعر الإجمالي */
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
  total_price!: number;

  /** العملة */
  @Column({
    type: 'enum',
    enum: Currency,
  })
  currency!: Currency;

  /** بيانات إضافية */
  @Column({ type: 'jsonb', default: {} })
  metadata!: Record<string, unknown>;

  /** الطلب المرتبط */
  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order!: Order;
}
