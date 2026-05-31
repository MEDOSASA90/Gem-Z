/**
 * Operations Center Controller - مركز العمليات
 * DLQ + Escalations + Refund Approvals
 */
import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DLQMonitorService, DLQFilter } from './dlq-monitor.service';
import { EscalationService, EscalationFilter } from './escalation.service';
import {
  RefundApprovalService,
  RefundStatus,
} from './refund-approval.service';

@ApiTags('Operations Center')
@ApiBearerAuth()
@Controller('api/v1/admin')
export class OpsController {
  constructor(
    private readonly dlqService: DLQMonitorService,
    private readonly escalationService: EscalationService,
    private readonly refundService: RefundApprovalService,
  ) {}

  // ─── DLQ Monitoring ─────────────────────────────────────────────

  @Get('dlq')
  @ApiOperation({ summary: 'الأحداث الفاشلة في DLQ' })
  async getFailedEvents(@Query() filters: DLQFilter) {
    return this.dlqService.getFailedEvents(filters);
  }

  @Post('dlq/:id/replay')
  @ApiOperation({ summary: 'إعادة تشغيل حدث فاشل' })
  async replayEvent(@Param('id') eventId: string) {
    return this.dlqService.replay(eventId);
  }

  @Get('dlq/analytics')
  @ApiOperation({ summary: 'تحليلات DLQ' })
  async getDLQAnalytics() {
    return this.dlqService.getAnalytics();
  }

  // ─── Escalations ────────────────────────────────────────────────

  @Post('escalations')
  @ApiOperation({ summary: 'إنشاء تصعيد جديد' })
  async createEscalation(
    @Body('issue_id') issueId: string,
    @Body('level') level: number,
    @Body('reason') reason: string,
    @Body('created_by') createdBy: string,
  ) {
    return this.escalationService.escalate(issueId, level, reason, createdBy);
  }

  @Get('escalations')
  @ApiOperation({ summary: 'التصعيدات' })
  async getEscalations(@Query() filters: EscalationFilter) {
    return this.escalationService.getEscalations(filters);
  }

  @Post('escalations/:id/assign')
  @ApiOperation({ summary: 'تعيين تصعيد لموظف' })
  async assignEscalation(
    @Param('id') escalationId: string,
    @Body('assignee_id', ParseUUIDPipe) assigneeId: string,
  ) {
    return this.escalationService.assign(escalationId, assigneeId);
  }

  @Post('escalations/:id/resolve')
  @ApiOperation({ summary: 'حل تصعيد' })
  async resolveEscalation(
    @Param('id') escalationId: string,
    @Body('resolution') resolution: string,
  ) {
    return this.escalationService.resolve(escalationId, resolution);
  }

  // ─── Refund Approvals ───────────────────────────────────────────

  @Post('refunds')
  @ApiOperation({ summary: 'طلب استرداد' })
  async requestRefund(
    @Body('order_id') orderId: string,
    @Body('amount') amount: number,
    @Body('currency') currency: string,
    @Body('reason') reason: string,
    @Body('requested_by') requestedBy: string,
  ) {
    return this.refundService.requestRefund(orderId, amount, currency, reason, requestedBy);
  }

  @Get('refunds')
  @ApiOperation({ summary: 'طلبات الاسترداد' })
  async getRefunds(
    @Query('status') status?: RefundStatus,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.refundService.getAll(status, +page, +limit);
  }

  @Get('refunds/pending')
  @ApiOperation({ summary: 'طلبات الاسترداد المعلقة' })
  async getPendingRefunds() {
    return this.refundService.getPending();
  }

  @Post('refunds/:id/approve')
  @ApiOperation({ summary: 'الموافقة على استرداد (موافقة مزدوجة للمبالغ >$500)' })
  async approveRefund(
    @Param('id') refundId: string,
    @Body('approved_by') approvedBy: string,
  ) {
    return this.refundService.approve(refundId, approvedBy);
  }

  @Post('refunds/:id/reject')
  @ApiOperation({ summary: 'رفض استرداد' })
  async rejectRefund(
    @Param('id') refundId: string,
    @Body('reason') reason: string,
    @Body('rejected_by') rejectedBy: string,
  ) {
    return this.refundService.reject(refundId, reason, rejectedBy);
  }
}
