import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AICostRouterService, AICostRecord } from './ai-cost-router.service';

@ApiTags('إدارة تكاليف وحصص الذكاء الاصطناعي - AI Cost Management')
@ApiBearerAuth()
@Controller('ai/cost-router')
export class AICostRouterController {
  constructor(private readonly costRouter: AICostRouterService) {}

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'التحقق من الرصيد والحد اليومي للتوكنز الرياضية قبل إرسال الطلب لـ LLM' })
  @ApiResponse({ status: 200, description: 'الحد سليم ويمكن متابعة الطلب' })
  @ApiResponse({ status: 429, description: 'تم استهلاك الحد اليومي المسموح به للتوكنز' })
  async validateBudget(
    @Body('userId') userId: string,
    @Body('tokensRequested') tokensRequested: number,
  ) {
    return this.costRouter.validateTokenBudget(userId, tokensRequested);
  }

  @Post('log')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'تسجيل التكاليف المالية للتوكنز المستهلكة فعلياً في Clickhouse بعد إتمام الطلب' })
  @ApiResponse({ status: 200, description: 'تم تسجيل التكاليف بنجاح' })
  async logCost(@Body() record: AICostRecord) {
    return this.costRouter.routeRequestAndLog(record);
  }
}
