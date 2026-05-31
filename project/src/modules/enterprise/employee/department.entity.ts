/**
 * كيان القسم (Department Entity)
 * يمثل قسماً إدارياً في المؤسسة
 */
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('departments')
export class Department {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, nullable: false })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'uuid', nullable: true, name: 'parent_id' })
  parent_id: string | null;

  @ManyToOne(() => Department, (dept) => dept.id, { nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent: Department | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  created_at: Date;
}
