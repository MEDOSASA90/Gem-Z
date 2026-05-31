import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';

@Entity('corporate_clients')
@Index(['hr_admin_id'])
@Index(['tenant_id'])
export class CorporateClient {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** اسم الشركة */
  @Column({ type: 'varchar', length: 255, nullable: false })
  name: string;

  /** معرف مستخدم مدير الموارد البشرية HR Admin */
  @Column({ type: 'uuid', nullable: false })
  hr_admin_id: string;

  /** معرف المستأجر لعزل البيانات (Multi-tenant Tenant ID) */
  @Column({ type: 'uuid', nullable: false })
  tenant_id: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date;

  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deleted_at: Date | null;
}
