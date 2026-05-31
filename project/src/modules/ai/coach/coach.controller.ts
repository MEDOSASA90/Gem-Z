import { Controller, Post, Body, HttpCode, HttpStatus, Param, Get, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AiCoachService, CoachSessionDto } from './coach.service';

@ApiTags('المدرب الشخصي الذكي - AI Personal Coach')
@ApiBearerAuth()
@Controller('ai/coach')
export class AiCoachController {
  constructor(private readonly coachService: AiCoachService) {}

  @Post('plan')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'توليد برنامج التدريب والتغذية المخصص لليوم بناء على النشاط والمؤشرات البدنية' })
  @ApiResponse({ status: 200, description: 'تم توليد وتخزين البرنامج المخصص بنجاح' })
  async generatePlan(@Body() dto: CoachSessionDto) {
    return this.coachService.generateDailyPlan(dto);
  }

  @Post('chat/:sessionId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'التحدث مع المدرب الشخصي الذكي (محادثة مستمرة مدعومة بالذاكرة)' })
  @ApiResponse({ status: 200, description: 'تم إرجاع إجابة المدرب وحفظ سياق الجلسة' })
  async chat(
    @Param('sessionId') sessionId: string,
    @Body('userId') userId: string,
    @Body('message') message: string,
  ) {
    const reply = await this.coachService.chatWithCoach(userId, sessionId, message);
    return { reply };
  }

  @Delete('chat/:sessionId/clear')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'مسح سجل ذاكرة المحادثة الحالية' })
  async clearChat(
    @Param('sessionId') sessionId: string,
    @Body('userId') userId: string,
  ) {
    await this.coachService.clearChatHistory(userId, sessionId);
  }
}
