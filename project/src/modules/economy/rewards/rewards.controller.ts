import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PointsService } from './points.service';
import { CashbackService } from './cashback.service';
import {
  EarnPointsDto,
  SpendPointsDto,
  ConvertPointsDto,
  PointsBalanceResponseDto,
  CalculateCashbackDto,
  IssueCashbackDto,
  CreateCashbackRuleDto,
} from './rewards.dto';

/**
 * متحكم المكافآت - Points & Cashback Controller
 */
@ApiTags('المكافآت - Rewards')
@ApiBearerAuth()
@Controller('rewards')
export class RewardsController {
  constructor(
    private readonly pointsService: PointsService,
    private readonly cashbackService: CashbackService,
  ) {}

  // ======================== Points Endpoints ========================

  /**
   * كسب نقاط
   */
  @Post('points/earn')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'كسب نقاط GEM' })
  @ApiResponse({ status: 200 })
  async earnPoints(@Body() dto: EarnPointsDto) {
    return this.pointsService.earn(
      dto.user_id,
      dto.amount,
      dto.source,
      dto.description,
      dto.reference_id,
    );
  }

  /**
   * إنفاق نقاط
   */
  @Post('points/spend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'إنفاق نقاط GEM' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 400, description: 'رصيد غير كافٍ' })
  async spendPoints(@Body() dto: SpendPointsDto) {
    return this.pointsService.spend(
      dto.user_id,
      dto.amount,
      dto.purpose,
      dto.description,
    );
  }

  /**
   * رصيد نقاط المستخدم
   */
  @Get('points/balance/:userId')
  @ApiOperation({ summary: 'رصيد نقاط المستخدم' })
  @ApiResponse({ status: 200, type: PointsBalanceResponseDto })
  async getPointsBalance(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.pointsService.getBalance(userId);
  }

  /**
   * تحويل نقاط لمحفظة
   */
  @Post('points/convert')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'تحويل نقاط لرصيد محفظة' })
  @ApiResponse({ status: 200 })
  async convertPoints(@Body() dto: ConvertPointsDto) {
    return this.pointsService.convertToWallet(dto.user_id, dto.points, dto.currency);
  }

  /**
   * تاريخ معاملات النقاط
   */
  @Get('points/history/:userId')
  @ApiOperation({ summary: 'تاريخ معاملات النقاط' })
  async getPointsHistory(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.pointsService.getTransactionHistory(
      userId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  // ======================== Cashback Endpoints ========================

  /**
   * حساب الكاش باك
   */
  @Post('cashback/calculate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'حساب الكاش باك المتوقع' })
  @ApiResponse({ status: 200 })
  async calculateCashback(@Body() dto: CalculateCashbackDto) {
    return this.cashbackService.calculateCashback(dto.user_id, dto.amount, dto.category);
  }

  /**
   * إصدار كاش باك
   */
  @Post('cashback/issue')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'إصدار كاش باك لمحفظة' })
  @ApiResponse({ status: 200 })
  async issueCashback(@Body() dto: IssueCashbackDto) {
    await this.cashbackService.issueCashback(dto.wallet_id, dto.amount, dto.reference_id);
    return { success: true, wallet_id: dto.wallet_id, amount: dto.amount };
  }

  /**
   * قائمة قواعد الكاش باك النشطة
   */
  @Get('cashback/rules')
  @ApiOperation({ summary: 'قواعد الكاش باك النشطة' })
  async getActiveRules() {
    return this.cashbackService.getActiveRules();
  }

  /**
   * إنشاء قاعدة كاش باك
   */
  @Post('cashback/rules')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'إنشاء قاعدة كاش باك جديدة' })
  async createCashbackRule(@Body() dto: CreateCashbackRuleDto) {
    return this.cashbackService.createRule({
      name: dto.name,
      category: dto.category,
      percentage: dto.percentage,
      min_amount: dto.min_amount ?? 0,
      max_cashback: dto.max_cashback ?? 0,
      is_active: dto.is_active ?? true,
    });
  }
}
