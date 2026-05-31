import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  VersionColumn,
  Index,
} from 'typeorm';

/**
 * كيان رصيد النقاط (GEM Points)
 * Points Balance Entity - User's GEM points balance
 */
@Entity('gem_points')
@Index(['user_id'], { unique: true })
export class GEMPoints {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** معرف المستخدم */
  @Column('uuid')
  user_id!: string;

  /** الرصيد الحالي */
  @Column({ type: 'integer', default: 0 })
  balance!: number;

  /** إجمالي النقاط المكتسبة */
  @Column({ type: 'integer', default: 0 })
  lifetime_earned!: number;

  /** إجمالي النقاط المنفقة */
  @Column({ type: 'integer', default: 0 })
  lifetime_spent!: number;

  /** نسخة اللقطة */
  @VersionColumn({ default: 0 })
  snapshot_version!: number;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
