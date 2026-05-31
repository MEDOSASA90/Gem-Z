import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Currency } from '../../../common/enums';

export enum SettlementStatus {
  CREATED = 'CREATED',
  CALCULATED = 'CALCULATED',
  COMPLIANCE_SCREENED = 'COMPLIANCE_SCREENED',
  PROCESSING = 'PROCESSING',
  DISBURSED = 'DISBURSED',
  FAILED = 'FAILED',
  RECONCILED = 'RECONCILED',
}

export enum PayoutSchedule {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
}

@Entity('settlements')
export class Settlement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  recipientId: string;

  @Column()
  recipientType: 'TRAINER' | 'GYM' | 'CREATOR' | 'MERCHANT';

  @Column()
  userCountry: string;

  @Column()
  recipientCountry: string;

  @Column('decimal', { precision: 18, scale: 4 })
  grossAmount: number;

  @Column('decimal', { precision: 18, scale: 4 })
  platformCommission: number;

  @Column('decimal', { precision: 18, scale: 4 })
  vatAmount: number;

  @Column('decimal', { precision: 18, scale: 4 })
  gatewayFee: number;

  @Column('decimal', { precision: 18, scale: 8 })
  fxRate: number;

  @Column('decimal', { precision: 18, scale: 4 })
  netPayout: number;

  @Column({ type: 'enum', enum: Currency })
  currency: Currency;

  @Column({ type: 'enum', enum: SettlementStatus, default: SettlementStatus.CREATED })
  status: SettlementStatus;

  @Column({ type: 'enum', enum: PayoutSchedule })
  payoutSchedule: PayoutSchedule;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
