/**
 * =============================================================================
 * Dashboard Controller - متحكم لوحة التحكم
 * =============================================================================
 */

import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { DashboardService, AnalyticsPeriod } from './dashboard.service';

@ApiTags('Creator Dashboard')
@Controller('creator/dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  // ── ملخص لوحة التحكم ───────────────────────────────────────────

  @Get('summary/:creatorId')
  @ApiOperation({
    summary: 'Get dashboard summary',
    description: 'جلب ملخص لوحة تحكم صانع المحتوى',
  })
  @ApiParam({ name: 'creatorId', description: 'Creator profile ID' })
  @ApiResponse({ status: 200, description: 'Dashboard summary' })
  async getDashboardSummary(
    @Param('creatorId', ParseUUIDPipe) creatorId: string,
  ): Promise<{
    revenue: {
      today: number;
      this_month: number;
      total_unpaid: number;
    };
    subscribers: {
      total: number;
      new_this_month: number;
      churn_rate: number;
    };
    engagement: {
      today_views: number;
      today_visits: number;
      avg_rate: number;
    };
    programs: {
      total: number;
      total_enrollments: number;
      completion_rate: number;
    };
    live: {
      upcoming_sessions: number;
      tickets_sold_this_month: number;
    };
  }> {
    return this.dashboardService.getDashboardSummary(creatorId);
  }

  // ── تحليلات الإيرادات ──────────────────────────────────────────

  @Get('revenue/:creatorId')
  @ApiOperation({
    summary: 'Get revenue analytics',
    description: 'جلب تحليلات الإيرادات لفترة معينة',
  })
  @ApiParam({ name: 'creatorId', description: 'Creator profile ID' })
  @ApiResponse({ status: 200, description: 'Revenue analytics' })
  async getRevenueAnalytics(
    @Param('creatorId', ParseUUIDPipe) creatorId: string,
    @Query('period') period: AnalyticsPeriod = AnalyticsPeriod.LAST_30_DAYS,
  ): Promise<{
    total: number;
    subscriptions: number;
    programs: number;
    live: number;
    currency: string;
    daily_breakdown: { date: string; total: number; subscriptions: number; programs: number; live: number }[];
    period: AnalyticsPeriod;
  }> {
    return this.dashboardService.getRevenueAnalytics(creatorId, period);
  }

  // ── تحليلات المشتركين ──────────────────────────────────────────

  @Get('subscribers/:creatorId')
  @ApiOperation({
    summary: 'Get subscriber analytics',
    description: 'جلب تحليلات المشتركين والنمو/الاحتفاظ',
  })
  @ApiParam({ name: 'creatorId', description: 'Creator profile ID' })
  @ApiResponse({ status: 200, description: 'Subscriber analytics' })
  async getSubscriberAnalytics(
    @Param('creatorId', ParseUUIDPipe) creatorId: string,
    @Query('period') period: AnalyticsPeriod = AnalyticsPeriod.LAST_30_DAYS,
  ): Promise<{
    current_total: number;
    new_subscribers: number;
    lost_subscribers: number;
    net_growth: number;
    growth_rate_percent: number;
    daily_breakdown: { date: string; new: number; lost: number; total: number }[];
    period: AnalyticsPeriod;
  }> {
    return this.dashboardService.getSubscriberAnalytics(creatorId, period);
  }

  // ── تحليلات التفاعل ────────────────────────────────────────────

  @Get('engagement/:creatorId')
  @ApiOperation({
    summary: 'Get engagement analytics',
    description: 'جلب تحليلات التفاعل ومعدلات المشاهدة',
  })
  @ApiParam({ name: 'creatorId', description: 'Creator profile ID' })
  @ApiResponse({ status: 200, description: 'Engagement analytics' })
  async getEngagementAnalytics(
    @Param('creatorId', ParseUUIDPipe) creatorId: string,
    @Query('period') period: AnalyticsPeriod = AnalyticsPeriod.LAST_30_DAYS,
  ): Promise<{
    avg_engagement_rate: number;
    total_views: number;
    total_profile_visits: number;
    total_comments: number;
    total_likes: number;
    daily_breakdown: { date: string; engagement_rate: number; views: number; profile_visits: number; comments: number; likes: number }[];
    period: AnalyticsPeriod;
  }> {
    return this.dashboardService.getEngagementAnalytics(creatorId, period);
  }

  // ── تحليلات النمو ──────────────────────────────────────────────

  @Get('growth/:creatorId')
  @ApiOperation({
    summary: 'Get growth analytics',
    description: 'جلب تحليلات النgrowth والاتجاهات',
  })
  @ApiParam({ name: 'creatorId', description: 'Creator profile ID' })
  @ApiResponse({ status: 200, description: 'Growth analytics' })
  async getGrowthAnalytics(
    @Param('creatorId', ParseUUIDPipe) creatorId: string,
    @Query('period') period: AnalyticsPeriod = AnalyticsPeriod.LAST_30_DAYS,
  ): Promise<{
    revenue_growth: number;
    subscriber_growth: number;
    engagement_growth: number;
    program_enrollments: number;
    program_completions: number;
    live_tickets_sold: number;
    live_attendees: number;
    period: AnalyticsPeriod;
  }> {
    return this.dashboardService.getGrowthAnalytics(creatorId, period);
  }

  // ── تحديث الإحصائيات (للـ Cron) ────────────────────────────────

  @Post('update/:creatorId')
  @ApiOperation({
    summary: 'Update daily analytics (manual trigger)',
    description: 'تحديث الإحصائيات اليومية يدوياً',
  })
  @ApiParam({ name: 'creatorId', description: 'Creator profile ID' })
  @ApiResponse({ status: 200, description: 'Analytics updated' })
  async updateDailyAnalytics(
    @Param('creatorId', ParseUUIDPipe) creatorId: string,
  ): Promise<import('./creator-analytics.entity').CreatorAnalytics> {
    return this.dashboardService.updateDailyAnalytics(creatorId);
  }
}
