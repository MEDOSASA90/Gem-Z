/**
 * NutritionService - خدمة التغذية وخطط الوجبات
 * تدير خطط الوجبات وتسجيل الوجبات اليومية
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MealPlan } from './meal-plan.entity';
import {
  CreateMealPlanDto,
  UpdateMealPlanDto,
  LogMealDto,
} from './nutrition.dto';

/** سجل يومي مؤقت (يمكن استبداله بجدول منفصل) */
export interface DailyLogEntry {
  date: string;
  meals: LogMealDto[];
  totals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

@Injectable()
export class NutritionService {
  /** تخزين مؤقت للسجل اليومي - في الإنتاج يُستخدم ClickHouse أو جدول مخصص */
  private dailyLogs = new Map<string, DailyLogEntry[]>();

  constructor(
    @InjectRepository(MealPlan)
    private readonly mealPlanRepo: Repository<MealPlan>,
  ) {}

  /** إنشاء خطة وجبات جديدة */
  async createMealPlan(userId: string, dto: CreateMealPlanDto): Promise<MealPlan> {
    const plan = this.mealPlanRepo.create({
      ...dto,
      user_id: userId,
      is_active: true,
    });
    return this.mealPlanRepo.save(plan);
  }

  /** جلب خطط الوجبات لمستخدم */
  async getMealPlans(userId: string): Promise<MealPlan[]> {
    return this.mealPlanRepo.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
    });
  }

  /** جلب خطة وجبات بالتفاصيل */
  async getMealPlanById(id: string): Promise<MealPlan> {
    const plan = await this.mealPlanRepo.findOne({ where: { id } });
    if (!plan) throw new NotFoundException('Meal plan not found');
    return plan;
  }

  /** تحديث خطة وجبات */
  async updateMealPlan(id: string, dto: UpdateMealPlanDto): Promise<MealPlan> {
    const plan = await this.getMealPlanById(id);
    Object.assign(plan, dto);
    return this.mealPlanRepo.save(plan);
  }

  /** حذف خطة وجبات */
  async deleteMealPlan(id: string): Promise<void> {
    const result = await this.mealPlanRepo.delete(id);
    if (result.affected === 0) throw new NotFoundException('Meal plan not found');
  }

  /** تسجيل وجبة في السجل اليومي */
  async logMeal(userId: string, dto: LogMealDto): Promise<DailyLogEntry> {
    const userLogs = this.dailyLogs.get(userId) || [];
    let entry = userLogs.find((l) => l.date === dto.date);

    if (!entry) {
      entry = {
        date: dto.date,
        meals: [],
        totals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      };
      userLogs.push(entry);
    }

    entry.meals.push(dto);

    // إعادة حساب الإجماليات
    entry.totals = entry.meals.reduce(
      (sum, m) => ({
        calories: sum.calories + (m.total_calories || this.calcMealCalories(m)),
        protein: sum.protein + m.items.reduce((s, i) => s + i.protein, 0),
        carbs: sum.carbs + m.items.reduce((s, i) => s + i.carbs, 0),
        fat: sum.fat + m.items.reduce((s, i) => s + i.fat, 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 },
    );

    this.dailyLogs.set(userId, userLogs);
    return entry;
  }

  /** جلب السجل اليومي */
  async getDailyLog(userId: string, date: string): Promise<DailyLogEntry | null> {
    const userLogs = this.dailyLogs.get(userId) || [];
    return userLogs.find((l) => l.date === date) || null;
  }

  /** حساب سعرات وجبة */
  private calcMealCalories(meal: LogMealDto): number {
    return meal.items.reduce((sum, item) => sum + item.calories, 0);
  }
}
