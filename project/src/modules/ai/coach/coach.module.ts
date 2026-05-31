import { Module } from '@nestjs/common';
import { AiCoachService } from './coach.service';
import { AiCoachController } from './coach.controller';

@Module({
  imports: [],
  controllers: [AiCoachController],
  providers: [AiCoachService],
  exports: [AiCoachService],
})
export class AiCoachModule {}
