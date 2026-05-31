import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { EscrowService } from './escrow.service';
import { Escrow } from './escrow.entity';
import { EscrowRepository } from './escrow.repository';
import { WalletModule } from '../wallet/wallet.module';

/**
 * وحدة الضمان - Escrow Module
 * 
 * توفر إدارة أموال الضمان مع:
 * - حجز الأموال لمدة 14 يوم
 * - تحرير تلقائي بعد انتهاء المدة
 * - استرداد للمشتري عند الإلغاء
 * - دعم النزاعات
 */
@Module({
  imports: [TypeOrmModule.forFeature([Escrow]), WalletModule, ScheduleModule.forRoot()],
  providers: [EscrowService, EscrowRepository],
  exports: [EscrowService, EscrowRepository],
})
export class EscrowModule {}
