/**
 * Operations Center Module - وحدة مركز العمليات
 * تشمل: DLQ Monitor + Escalation + Refund Approval
 */
import { Module } from '@nestjs/common';
import { OpsController } from './ops.controller';
import { DLQMonitorService } from './dlq-monitor.service';
import { EscalationService } from './escalation.service';
import { RefundApprovalService } from './refund-approval.service';

@Module({
  controllers: [OpsController],
  providers: [
    DLQMonitorService,
    EscalationService,
    RefundApprovalService,
  ],
  exports: [
    DLQMonitorService,
    EscalationService,
    RefundApprovalService,
  ],
})
export class OpsModule {}
