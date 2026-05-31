/**
 * Nutrition Controller - نقاط النهاية للتغذية
 */
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NutritionService } from './nutrition.service';
import {
  CreateMealPlanDto,
  UpdateMealPlanDto,
  LogMealDto,
} from './nutrition.dto';

@ApiTags('Nutrition')
@ApiBearerAuth()
@Controller('api/v1/nutrition')
export class NutritionController {
  constructor(private readonly nutritionService: NutritionService) {}

  @Post('plans')
  @ApiOperation({ summary: 'إنشاء خطة وجبات' })
  async createPlan(
    @Body('user_id', ParseUUIDPipe) userId: string,
    @Body() dto: CreateMealPlanDto,
  ) {
    return this.nutritionService.createMealPlan(userId, dto);
  }

  @Get('plans')
  @ApiOperation({ summary: 'خطط الوجبات لمستخدم' })
  async getPlans(@Query('user_id', ParseUUIDPipe) userId: string) {
    return this.nutritionService.getMealPlans(userId);
  }

  @Get('plans/:id')
  @ApiOperation({ summary: 'تفاصيل خطة وجبات' })
  async getPlan(@Param('id', ParseUUIDPipe) id: string) {
    return this.nutritionService.getMealPlanById(id);
  }

  @Put('plans/:id')
  @ApiOperation({ summary: 'تحديث خطة وجبات' })
  async updatePlan(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMealPlanDto,
  ) {
    return this.nutritionService.updateMealPlan(id, dto);
  }

  @Delete('plans/:id')
  @ApiOperation({ summary: 'حذف خطة وجبات' })
  async deletePlan(@Param('id', ParseUUIDPipe) id: string) {
    await this.nutritionService.deleteMealPlan(id);
  }

  @Post('log')
  @ApiOperation({ summary: 'تسجيل وجبة يومية' })
  async logMeal(
    @Body('user_id', ParseUUIDPipe) userId: string,
    @Body() dto: LogMealDto,
  ) {
    return this.nutritionService.logMeal(userId, dto);
  }

  @Get('log')
  @ApiOperation({ summary: 'السجل اليومي' })
  async getDailyLog(
    @Query('user_id', ParseUUIDPipe) userId: string,
    @Query('date') date: string,
  ) {
    return this.nutritionService.getDailyLog(userId, date);
  }
}
