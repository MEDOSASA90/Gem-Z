import { Controller, Get, Post, Body, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { FXService } from './fx.service';
import { GetRateDto, ConvertAmountDto, ConversionResultDto } from './fx.dto';
import { Currency } from '../../../common/enums';

/**
 * متحكم صرف العملات - FX Controller
 */
@ApiTags('صرف العملات - FX')
@ApiBearerAuth()
@Controller('fx')
export class FXController {
  constructor(private readonly fxService: FXService) {}

  /**
   * قائمة العملات المدعومة
   */
  @Get('currencies')
  @ApiOperation({ summary: 'العملات المدعومة' })
  @ApiResponse({ status: 200 })
  getCurrencies() {
    return {
      currencies: this.fxService.getSupportedCurrencies(),
    };
  }

  /**
   * جميع الأسعار
   */
  @Get('rates')
  @ApiOperation({ summary: 'جميع أسعار الصرف النشطة' })
  @ApiResponse({ status: 200 })
  async getAllRates() {
    const rates = await this.fxService['fxRepo'].findAllActive();
    return { rates };
  }

  /**
   * سعر صرف زوج عملات
   */
  @Get('rates/:from/:to')
  @ApiOperation({ summary: 'سعر صرف بين عملتين' })
  @ApiResponse({ status: 200 })
  async getRate(
    @Query() _dto: GetRateDto,
    @Query('from') from: Currency,
    @Query('to') to: Currency,
  ) {
    const rate = await this.fxService.getRate(from, to);
    return {
      from_currency: from,
      to_currency: to,
      ...rate,
    };
  }

  /**
   * تحويل مبلغ
   */
  @Post('convert')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'تحويل مبلغ بين عملتين' })
  @ApiResponse({ status: 200, type: ConversionResultDto })
  async convert(@Body() dto: ConvertAmountDto) {
    return this.fxService.convert(dto.amount, dto.from, dto.to);
  }

  /**
   * تحديث الأسعار (mock)
   */
  @Post('rates/update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'تحديث أسعار الصرف (mock)' })
  @ApiResponse({ status: 200 })
  async updateRates() {
    const count = await this.fxService.updateRates('mock');
    return { updated: count, source: 'mock', timestamp: new Date().toISOString() };
  }
}
