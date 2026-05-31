/**
 * =============================================================================
 * Payout Controller - متحكم المدفوعات
 * =============================================================================
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { PayoutService } from './payout.service';
import {
  RequestPayoutDto,
  ProcessPayoutDto,
  CalculateRevenueDto,
  GetPayoutHistoryDto,
  CreatorPayoutResponseDto,
  RevenueSummaryDto,
} from './payout.dto';
import { CreatorPayout } from './creator-payout.entity';
import { RevenueSplit } from './revenue-split.entity';

@ApiTags('Creator Payouts')
@Controller('creator/payouts')
export class PayoutController {
  constructor(private readonly payoutService: PayoutService) {}

  // ── حساب الإيرادات ─────────────────────────────────────────────

  @Post('revenue/:creatorId')
  @ApiOperation({
    summary: 'Calculate creator revenue',
    description: 'حساب إيرادات صانع المحتوى في فترة معينة',
  })
  @ApiParam({ name: 'creatorId', description: 'Creator profile ID' })
  @ApiResponse({ status: 200, description: 'Revenue summary', type: RevenueSummaryDto })
  async calculateRevenue(
    @Param('creatorId', ParseUUIDPipe) creatorId: string,
    @Body() dto: CalculateRevenueDto,
  ): Promise<RevenueSummaryDto> {
    return this.payoutService.calculateRevenue(creatorId, dto);
  }

  @Get('unpaid-revenue/:creatorId')
  @ApiOperation({
    summary: "Get creator's unpaid revenue",
    description: 'جلب الإيرادات غير المسحوبة لصانع محتوى',
  })
  @ApiParam({ name: 'creatorId', description: 'Creator profile ID' })
  @ApiResponse({ status: 200, description: 'Unpaid revenue details' })
  async getUnpaidRevenue(
    @Param('creatorId', ParseUUIDPipe) creatorId: string,
  ): Promise<{
    total: number;
    currency: string;
    items: RevenueSplit[];
  }> {
    return this.payoutService.getUnpaidRevenue(creatorId);
  }

  // ── طلب السحب ──────────────────────────────────────────────────

  @Post('request/:creatorId')
  @ApiOperation({
    summary: 'Request payout',
    description: 'طلب سحب من إيرادات صانع المحتوى',
  })
  @ApiParam({ name: 'creatorId', description: 'Creator profile ID' })
  @ApiResponse({ status: 201, description: 'Payout requested', type: CreatorPayoutResponseDto })
  @ApiResponse({ status: 400, description: 'Amount below minimum or insufficient balance' })
  async requestPayout(
    @Param('creatorId', ParseUUIDPipe) creatorId: string,
    @Body() dto: RequestPayoutDto,
  ): Promise<CreatorPayout> {
    return this.payoutService.requestPayout(creatorId, dto);
  }

  @Get('history/:creatorId')
  @ApiOperation({
    summary: 'Get payout history',
    description: 'جلب تاريخ السحب لصانع محتوى',
  })
  @ApiParam({ name: 'creatorId', description: 'Creator profile ID' })
  @ApiResponse({ status: 200, description: 'List of payouts' })
  async getPayoutHistory(
    @Param('creatorId', ParseUUIDPipe) creatorId: string,
    @Query() filters: GetPayoutHistoryDto,
  ): Promise<{
    items: CreatorPayout[];
    total: number;
    page: number;
    limit: number;
  }> {
    return this.payoutService.getPayoutHistory(creatorId, filters);
  }

  @Get(':payoutId')
  @ApiOperation({
    summary: 'Get payout details',
    description: 'جلب تفاصيل سحب',
  })
  @ApiParam({ name: 'payoutId', description: 'Payout ID' })
  @ApiResponse({ status: 200, description: 'Payout details' })
  async getPayout(
    @Param('payoutId', ParseUUIDPipe) payoutId: string,
  ): Promise<CreatorPayout> {
    return this.payoutService.getPayout(payoutId);
  }

  // ── إدارة السحب (للإدارة) ──────────────────────────────────────

  @Post(':payoutId/approve')
  @ApiOperation({
    summary: 'Approve payout (admin)',
    description: 'الموافقة على طلب سحب',
  })
  @ApiParam({ name: 'payoutId', description: 'Payout ID' })
  @ApiResponse({ status: 200, description: 'Payout approved' })
  async approvePayout(
    @Param('payoutId', ParseUUIDPipe) payoutId: string,
  ): Promise<CreatorPayout> {
    return this.payoutService.approvePayout(payoutId);
  }

  @Post(':payoutId/process')
  @ApiOperation({
    summary: 'Process approved payout (admin)',
    description: 'معالجة سحب معتمد وإرساله',
  })
  @ApiParam({ name: 'payoutId', description: 'Payout ID' })
  @ApiResponse({ status: 200, description: 'Payout processed' })
  async processPayout(
    @Param('payoutId', ParseUUIDPipe) payoutId: string,
    @Body() dto: ProcessPayoutDto,
  ): Promise<CreatorPayout> {
    return this.payoutService.processPayout(payoutId, dto);
  }

  @Post(':payoutId/reject')
  @ApiOperation({
    summary: 'Reject payout (admin)',
    description: 'رفض طلب سحب',
  })
  @ApiParam({ name: 'payoutId', description: 'Payout ID' })
  @ApiResponse({ status: 200, description: 'Payout rejected' })
  async rejectPayout(
    @Param('payoutId', ParseUUIDPipe) payoutId: string,
    @Body('reason') reason: string,
  ): Promise<CreatorPayout> {
    return this.payoutService.rejectPayout(payoutId, reason);
  }
}
