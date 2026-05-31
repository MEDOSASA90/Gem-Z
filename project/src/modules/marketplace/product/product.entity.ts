import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ProductCategory } from './category.entity';
import { Currency, ProductType, ProductStatus } from '../../../common/enums';

/**
 * كيان المنتج
 * Product Entity - Marketplace product catalog
 * 
 * يدعم: منتجات مادية، رقمية، خدمات، اشتراكات
 */
@Entity('products')
@Index(['seller_id'])
@Index(['store_id'])
@Index(['category_id'])
@Index(['status'])
@Index(['slug'])
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** معرف البائع */
  @Column('uuid')
  seller_id!: string;

  /** معرف المتجر */
  @Column('uuid', { nullable: true })
  store_id!: string | null;

  /** اسم المنتج */
  @Column({ type: 'varchar', length: 300 })
  name!: string;

  /** slug فريد */
  @Column({ type: 'varchar', length: 300 })
  slug!: string;

  /** الوصف */
  @Column({ type: 'text', nullable: true })
  description!: string | null;

  /** نوع المنتج */
  @Column({
    type: 'enum',
    enum: ProductType,
    default: ProductType.PHYSICAL,
  })
  type!: ProductType;

  /** معرف الفئة */
  @Column('uuid', { nullable: true })
  category_id!: string | null;

  /** السعر */
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
  price!: number;

  /** العملة */
  @Column({
    type: 'enum',
    enum: Currency,
    default: Currency.EGP,
  })
  currency!: Currency;

  /** السعر قبل الخصم (لعرض الخصم) */
  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
    transformer: {
      to: (value: number | string | null): string | null => {
        if (value === null || value === undefined) return null;
        if (typeof value === 'string') return value;
        return value.toFixed(2);
      },
      from: (value: string | null): number | null => value === null ? null : parseFloat(value),
    },
  })
  compare_at_price!: number | null;

  /** التكلفة لكل وحدة */
  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
    transformer: {
      to: (value: number | string | null): string | null => {
        if (value === null || value === undefined) return null;
        if (typeof value === 'string') return value;
        return value.toFixed(2);
      },
      from: (value: string | null): number | null => value === null ? null : parseFloat(value),
    },
  })
  cost_per_item!: number | null;

  /** SKU */
  @Column({ type: 'varchar', length: 100, nullable: true })
  sku!: string | null;

  /** الباركود */
  @Column({ type: 'varchar', length: 100, nullable: true })
  barcode!: string | null;

  /** تتبع الكمية */
  @Column({ type: 'boolean', default: true })
  track_quantity!: boolean;

  /** الكمية المتاحة */
  @Column({ type: 'integer', default: 0 })
  quantity!: number;

  /** الوزن بالكيلوجرام */
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    transformer: {
      to: (value: number | string | null): string | null => {
        if (value === null || value === undefined) return null;
        if (typeof value === 'string') return value;
        return value.toFixed(2);
      },
      from: (value: string | null): number | null => value === null ? null : parseFloat(value),
    },
  })
  weight!: number | null;

  /** صور المنتج */
  @Column({ type: 'text', array: true, default: [] })
  images!: string[];

  /** سمات المنتج (JSON) */
  @Column({ type: 'jsonb', default: {} })
  attributes!: Record<string, unknown>;

  /** حالة المنتج */
  @Column({
    type: 'enum',
    enum: ProductStatus,
    default: ProductStatus.DRAFT,
  })
  status!: ProductStatus;

  /** عنوان SEO */
  @Column({ type: 'varchar', length: 200, nullable: true })
  seo_title!: string | null;

  /** وصف SEO */
  @Column({ type: 'text', nullable: true })
  seo_description!: string | null;

  /** الوسوم */
  @Column({ type: 'text', array: true, default: [] })
  tags!: string[];

  /** متوسط التقييم */
  @Column({
    type: 'decimal',
    precision: 3,
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
  rating_average!: number;

  /** عدد التقييمات */
  @Column({ type: 'integer', default: 0 })
  rating_count!: number;

  /** عدد المبيعات */
  @Column({ type: 'integer', default: 0 })
  sales_count!: number;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @DeleteDateColumn()
  deleted_at!: Date | null;

  /** الفئة */
  @ManyToOne(() => ProductCategory)
  @JoinColumn({ name: 'category_id' })
  category!: ProductCategory | null;
}
