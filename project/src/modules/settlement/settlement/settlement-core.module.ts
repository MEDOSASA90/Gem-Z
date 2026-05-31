import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Settlement } from './settlement.entity';
import { SettlementService } from './settlement.service';

@Module({
  imports: [TypeOrmModule.forFeature([Settlement])],
  controllers: [],
  providers: [SettlementService],
  exports: [SettlementService],
})
export class SettlementCoreModule {}
