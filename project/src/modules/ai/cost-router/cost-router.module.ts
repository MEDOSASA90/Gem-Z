import { Module } from '@nestjs/common';
import { AICostRouterService } from './ai-cost-router.service';
import { AICostRouterController } from './ai-cost-router.controller';

@Module({
  imports: [],
  controllers: [AICostRouterController],
  providers: [AICostRouterService],
  exports: [AICostRouterService],
})
export class AiCostRouterModule {}
