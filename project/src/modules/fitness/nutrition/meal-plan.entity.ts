/**
 * كيان خطة الوجبات (Meal Plan Entity)
 * يمثل خطة غذائية مخصصة لمستخدم
 */
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('meal_plans')
export class MealPlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: false, name: 'user_id' })
  user_id: string;

  @Column({ type: 'varchar', length: 200, nullable: false })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  /** تفاصيل الوجبات (JSONB) */
  @Column({ type: 'jsonb', default: {} })
  meals: Record<string, {
    name: string;
    items: Array<{
      food: string;
      quantity: number;
      unit: string;
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
    }>;
  }>;

  /** الهدف اليومي للسعرات */
  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true, name: 'calories_target' })
  calories_target: number | null;

  /** الهدف اليومي للبروتين */
  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true, name: 'protein_target' })
  protein_target: number | null;

  /** الهدف اليومي للكربوهيدرات */
  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true, name: 'carbs_target' })
  carbs_target: number | null;

  /** الهدف اليومي للدهون */
  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true, name: 'fat_target' })
  fat_target: number | null;

  /** القيود الغذائية */
  @Column({ type: 'text', array: true, default: [], name: 'dietary_restrictions' })
  dietary_restrictions: string[];

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  is_active: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updated_at: Date;
}
