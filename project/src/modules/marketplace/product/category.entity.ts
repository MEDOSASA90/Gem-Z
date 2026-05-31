import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';

/**
 * كيان فئة المنتجات
 * Product Category Entity - Hierarchical product categories
 */
@Entity('product_categories')
@Index(['slug'], { unique: true })
@Index(['is_active'])
export class ProductCategory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** الفئة الأب (للفئات الفرعية) */
  @Column('uuid', { nullable: true })
  parent_id!: string | null;

  /** اسم الفئة */
  @Column({ type: 'varchar', length: 200 })
  name!: string;

  /** slug فريد */
  @Column({ type: 'varchar', length: 200 })
  slug!: string;

  /** الوصف */
  @Column({ type: 'text', nullable: true })
  description!: string | null;

  /** رابط صورة الفئة */
  @Column({ type: 'text', nullable: true })
  image_url!: string | null;

  /** ترتيب الفرز */
  @Column({ type: 'integer', default: 0 })
  sort_order!: number;

  /** هل الفئة نشطة */
  @Column({ type: 'boolean', default: true })
  is_active!: boolean;

  @CreateDateColumn()
  created_at!: Date;

  /** الفئة الأب */
  @ManyToOne(() => ProductCategory, (category) => category.children)
  @JoinColumn({ name: 'parent_id' })
  parent!: ProductCategory | null;

  /** الفئات الفرعية */
  @OneToMany(() => ProductCategory, (category) => category.parent)
  children!: ProductCategory[];
}
