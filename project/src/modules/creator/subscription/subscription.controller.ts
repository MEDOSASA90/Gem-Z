/**
 * =============================================================================
 * Subscription Controller - متحكم الاشتراكات
 * =============================================================================
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { SubscriptionService } from './subscription.service';
import {
  CreateSubscriptionPlanDto,
  UpdateSubscriptionPlanDto,
  SubscribeDto,
  CancelSubscriptionDto,
  GetCreatorSubscribersDto,
  GetActiveSubscriptionsDto,
  SubscriptionPlanResponseDto,
  CreatorSubscriptionResponseDto,
} from './subscription.dto';
import { SubscriptionPlan } from './subscription-plan.entity';
import { CreatorSubscription } from './creator-subscription.entity';

@ApiTags('Creator Subscriptions')
@Controller('creator/subscriptions')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  // ── خطط الاشتراك ───────────────────────────────────────────────

  @Post('plans')
  @ApiOperation({
    summary: 'Create subscription plan',
    description: 'إنشاء خطة اشتراك جديدة (لصانع محتوى)',
  })
  @ApiResponse({ status: 201, description: 'Plan created', type: SubscriptionPlanResponseDto })
  @ApiResponse({ status: 409, description: 'Plan with same name exists' })
  async createPlan(
    @Body('creator_id', ParseUUIDPipe) creatorId: string,
    @Body() dto: CreateSubscriptionPlanDto,
  ): Promise<SubscriptionPlan> {
    return this.subscriptionService.createPlan(creatorId, dto);
  }

  @Get('plans/creator/:creatorId')
  @ApiOperation({
    summary: 'Get creator subscription plans',
    description: 'جلب خطط اشتراك صانع محتوى',
  })
  @ApiParam({ name: 'creatorId', description: 'Creator profile ID' })
  @ApiResponse({ status: 200, description: 'List of plans' })
  async getCreatorPlans(
    @Param('creatorId', ParseUUIDPipe) creatorId: string,
  ): Promise<SubscriptionPlan[]> {
    return this.subscriptionService.getCreatorPlans(creatorId);
  }

  @Get('plans/:planId')
  @ApiOperation({
    summary: 'Get subscription plan details',
    description: 'جلب تفاصيل خطة اشتراك',
  })
  @ApiParam({ name: 'planId', description: 'Subscription plan ID' })
  @ApiResponse({ status: 200, description: 'Plan details' })
  async getPlan(
    @Param('planId', ParseUUIDPipe) planId: string,
  ): Promise<SubscriptionPlan> {
    return this.subscriptionService.getPlan(planId);
  }

  @Patch('plans/:planId')
  @ApiOperation({
    summary: 'Update subscription plan',
    description: 'تحديث خطة اشتراك',
  })
  @ApiParam({ name: 'planId', description: 'Subscription plan ID' })
  @ApiResponse({ status: 200, description: 'Plan updated' })
  async updatePlan(
    @Param('planId', ParseUUIDPipe) planId: string,
    @Body() dto: UpdateSubscriptionPlanDto,
  ): Promise<SubscriptionPlan> {
    return this.subscriptionService.updatePlan(planId, dto);
  }

  @Delete('plans/:planId')
  @ApiOperation({
    summary: 'Delete subscription plan',
    description: 'حذف خطة اشتراك',
  })
  @ApiParam({ name: 'planId', description: 'Subscription plan ID' })
  @ApiResponse({ status: 200, description: 'Plan deleted' })
  async deletePlan(
    @Param('planId', ParseUUIDPipe) planId: string,
  ): Promise<{ deleted: boolean }> {
    await this.subscriptionService.deletePlan(planId);
    return { deleted: true };
  }

  // ── الاشتراكات ─────────────────────────────────────────────────

  @Post()
  @ApiOperation({
    summary: 'Subscribe to a plan',
    description: 'الاشتراك في خطة صانع محتوى (يدعم الفترة التجريبية)',
  })
  @ApiResponse({ status: 201, description: 'Subscribed successfully', type: CreatorSubscriptionResponseDto })
  @ApiResponse({ status: 409, description: 'Already subscribed' })
  async subscribe(
    @Body() dto: SubscribeDto,
  ): Promise<CreatorSubscription> {
    return this.subscriptionService.subscribe(dto.user_id ?? '', dto.plan_id);
  }

  @Patch(':subscriptionId/cancel')
  @ApiOperation({
    summary: 'Cancel subscription',
    description: 'إلغاء الاشتراك (إيقاف التجديد)',
  })
  @ApiParam({ name: 'subscriptionId', description: 'Subscription ID' })
  @ApiResponse({ status: 200, description: 'Subscription cancelled' })
  async cancel(
    @Param('subscriptionId', ParseUUIDPipe) subscriptionId: string,
    @Body() dto: CancelSubscriptionDto,
  ): Promise<CreatorSubscription> {
    return this.subscriptionService.cancel(subscriptionId, dto);
  }

  @Post(':subscriptionId/renew')
  @ApiOperation({
    summary: 'Renew subscription',
    description: 'تجديد الاشتراك يدوياً',
  })
  @ApiParam({ name: 'subscriptionId', description: 'Subscription ID' })
  @ApiResponse({ status: 200, description: 'Subscription renewed' })
  async renew(
    @Param('subscriptionId', ParseUUIDPipe) subscriptionId: string,
  ): Promise<CreatorSubscription> {
    return this.subscriptionService.renew(subscriptionId);
  }

  // ── استعراض الاشتراكات ────────────────────────────────────────

  @Get('active/:userId')
  @ApiOperation({
    summary: 'Get active subscriptions for user',
    description: 'جلب الاشتراكات النشطة لمستخدم',
  })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'List of active subscriptions' })
  async getActiveSubscriptions(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query() query: GetActiveSubscriptionsDto,
  ): Promise<{
    items: CreatorSubscription[];
    total: number;
    page: number;
    limit: number;
  }> {
    return this.subscriptionService.getActiveSubscriptions(
      userId,
      query.page,
      query.limit,
    );
  }

  @Get('subscribers/:creatorId')
  @ApiOperation({
    summary: 'Get creator subscribers',
    description: 'جلب مشتركي صانع محتوى',
  })
  @ApiParam({ name: 'creatorId', description: 'Creator profile ID' })
  @ApiResponse({ status: 200, description: 'List of subscribers' })
  async getCreatorSubscribers(
    @Param('creatorId', ParseUUIDPipe) creatorId: string,
    @Query() filters: GetCreatorSubscribersDto,
  ): Promise<{
    items: CreatorSubscription[];
    total: number;
    page: number;
    limit: number;
  }> {
    return this.subscriptionService.getCreatorSubscribers(creatorId, filters);
  }

  @Get(':subscriptionId')
  @ApiOperation({
    summary: 'Get subscription details',
    description: 'جلب تفاصيل اشتراك',
  })
  @ApiParam({ name: 'subscriptionId', description: 'Subscription ID' })
  @ApiResponse({ status: 200, description: 'Subscription details' })
  async getSubscription(
    @Param('subscriptionId', ParseUUIDPipe) subscriptionId: string,
  ): Promise<CreatorSubscription> {
    return this.subscriptionService.getSubscription(subscriptionId);
  }
}
