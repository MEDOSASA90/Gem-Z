import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FXService } from './fx.service';
import { FXController } from './fx.controller';
import { FXRate } from './fx-rate.entity';
import { FXRateRepository } from './fx.repository';

/**
 * وحدة صرف العملات - FX Module
 * 
 * توفر خدمات تحويل العملات مع:
 * - أسعار مباشرة وcross-rate
 * - رسوم تحويل شفافة
 * - تحديث دوري للأسعار
 */
@Module({
  imports: [TypeOrmModule.forFeature([FXRate])],
  controllers: [FXController],
  providers: [FXService, FXRateRepository],
  exports: [FXService, FXRateRepository],
})
export class FXModule {}
