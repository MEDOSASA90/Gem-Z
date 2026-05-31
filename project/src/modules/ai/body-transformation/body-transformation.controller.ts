import { Controller, Post, Body, HttpCode, HttpStatus, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AiBodyTransformationService, BiometricFrameDto } from './body-transformation.service';

@ApiTags('ذكاء الحركة والكمبيوتر - Computer Vision AI')
@ApiBearerAuth()
@Controller('ai/cv')
export class AiBodyTransformationController {
  constructor(private readonly cvService: AiBodyTransformationService) {}

  @Post('frame')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'مزامنة إطار الحركة الرياضية والتحقق الفوري من الوضعية وتحديث التكرارات' })
  @ApiResponse({ status: 200, description: 'تم معالجة الإطار وحساب التكرار بنجاح' })
  async processFrame(@Body() dto: BiometricFrameDto) {
    return this.cvService.processBiometricFrame(dto);
  }

  @Post('session/:sessionId/end')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'إغلاق جلسة التمرين وحساب دقة الأداء ورفع السجلات لـ ClickHouse' })
  @ApiResponse({ status: 200, description: 'تم إغلاق الجلسة واحتساب السجلات الإحصائية' })
  async endSession(
    @Param('sessionId') sessionId: string,
    @Body('userId') userId: string,
    @Body('exerciseType') exerciseType: string,
  ) {
    return this.cvService.endWorkoutSession(userId, sessionId, exerciseType);
  }
}
