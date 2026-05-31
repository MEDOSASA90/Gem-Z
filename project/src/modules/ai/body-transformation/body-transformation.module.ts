import { Module } from '@nestjs/common';
import { AiBodyTransformationService } from './body-transformation.service';
import { AiBodyTransformationController } from './body-transformation.controller';

@Module({
  imports: [],
  controllers: [AiBodyTransformationController],
  providers: [AiBodyTransformationService],
  exports: [AiBodyTransformationService],
})
export class AiBodyTransformationModule {}
