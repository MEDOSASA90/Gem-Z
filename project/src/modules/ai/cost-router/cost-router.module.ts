import { Module } from '@nestjs/common';
import { AICostRouterService } from './ai-cost-router.service';

@Module({
  imports: [],
  controllers: [],
  providers: [AICostRouterService],
  exports: [AICostRouterService],
})
export class AiCostRouterModule {}
