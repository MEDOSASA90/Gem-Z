import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AiFraudNetworkService, TelemetryEventDto } from './fraud-network.service';

@ApiTags('شبكة مكافحة الاحتيال بالذكاء الاصطناعي - AI Fraud Intelligence Network')
@ApiBearerAuth()
@Controller('ai/fraud')
export class AiFraudNetworkController {
  constructor(private readonly fraudService: AiFraudNetworkService) {}

  @Post('telemetry')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'إرسال بيانات التموضع الجغرافي والتحقق من التلاعب والسرعات المستحيلة' })
  @ApiResponse({ status: 200, description: 'تم التحقق بنجاح وإرجاع نتائج مؤشر الاحتيال' })
  async syncTelemetry(@Body() dto: TelemetryEventDto) {
    return this.fraudService.processTelemetry(dto);
  }

  @Post('resolve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'إلغاء تجميد المحافظ وإعادة تصفير مؤشر الاحتيال (للإدارة)' })
  @ApiResponse({ status: 200, description: 'تم إلغاء التجميد بنجاح' })
  async resolveFraud(@Body('userId') userId: string) {
    await this.fraudService.resolveFraudAlert(userId);
    return { success: true, message: 'Fraud alert resolved. Wallets unfrozen.' };
  }
}
