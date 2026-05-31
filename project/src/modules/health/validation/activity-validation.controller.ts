import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ActivityValidationService, ActivitySessionDto } from './activity-validation.service';

@ApiTags('الصحة واللياقة - Move-to-Earn')
@ApiBearerAuth()
@Controller('health/m2e')
export class ActivityValidationController {
  constructor(private readonly validationService: ActivityValidationService) {}

  @Post('sync')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'مزامنة نشاط رياضي والحصول على مكافأة (Move-to-Earn)' })
  @ApiResponse({ status: 200, description: 'تم التحقق من النشاط وإيداع المكافأة بنجاح' })
  @ApiResponse({ status: 400, description: 'فشل التحقق بسبب نشاط مشبوه أو رمز غير صالح' })
  @ApiResponse({ status: 429, description: 'العملية قيد التنفيذ حالياً' })
  async syncActivity(@Body() dto: ActivitySessionDto) {
    return this.validationService.validateAndRewardActivity(dto);
  }
}
