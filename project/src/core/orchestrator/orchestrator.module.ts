/**
 * =============================================================================
 * OrchestratorModule - موديول منسق العمليات الموزعة
 * =============================================================================
 */

import { Module, Global } from '@nestjs/common';
import { GemZOrchestrator } from './orchestrator.service';
import { CompensationService } from './compensation.service';
import { GlobalOperationsCenterService } from './goc.service';

@Global()
@Module({
  providers: [GemZOrchestrator, CompensationService, GlobalOperationsCenterService],
  exports: [GemZOrchestrator, CompensationService, GlobalOperationsCenterService],
})
export class OrchestratorModule {}
