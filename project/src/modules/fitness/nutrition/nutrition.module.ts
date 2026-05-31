/**
 * Nutrition Module - وحدة التغذية
 * تدير خطط الوجبات وتتبع السعرات
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NutritionController } from './nutrition.controller';
import { NutritionService } from './nutrition.service';
import { MealPlan } from './meal-plan.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MealPlan])],
  controllers: [NutritionController],
  providers: [NutritionService],
  exports: [NutritionService],
})
export class NutritionModule {}
