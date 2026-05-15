/**
 * GEM Z — Meal Planning Service
 *
 * Business logic for AI-powered meal planning:
 * - Generate weekly meal plans via OpenAI GPT-4o
 * - Calorie-targeted meal planning
 * - Grocery list aggregation
 * - Meal plan CRUD operations
 */

import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '../../core/logging/logger';
import {
    AppError,
    NotFoundError,
    ValidationError,
    ErrorCode,
} from '../../core/errors';
import { config } from '../../config';

const log = createLogger('meal-service');

// ─── Types ──────────────────────────────────────────────────────

export interface MealItem {
    id: string;
    planId: string;
    dayOfWeek: number; // 0 = Sunday, 6 = Saturday
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    name: string;
    description: string | null;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    ingredients: string[];
    prepTime: number;
    recipeUrl: string | null;
    createdAt: Date;
}

export interface MealPlan {
    id: string;
    userId: string;
    weekStart: Date;
    calorieTarget: number;
    dietaryPreference: string;
    status: 'active' | 'archived';
    createdAt: Date;
    updatedAt: Date;
    meals?: MealItem[];
    groceryList?: GroceryItem[];
}

export interface GroceryItem {
    name: string;
    quantity: string;
    category: string;
    checked: boolean;
}

interface AIMealResponse {
    meals: {
        dayOfWeek: number;
        mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
        name: string;
        description: string;
        calories: number;
        protein: number;
        carbs: number;
        fats: number;
        ingredients: string[];
        prepTime: number;
    }[];
    groceryList: GroceryItem[];
}

// ─── Service ────────────────────────────────────────────────────

export class MealService {
    constructor(private pool: Pool) {}

    // ─── Meal Plan CRUD ───────────────────────────────────────

    /**
     * Generate a weekly meal plan using OpenAI GPT-4o.
     */
    async generateMealPlan(
        userId: string,
        data: {
            calorieTarget: number;
            dietaryPreference?: string;
            allergies?: string[];
            weekStart?: Date;
        }
    ): Promise<MealPlan> {
        const calorieTarget = data.calorieTarget;
        if (!calorieTarget || calorieTarget < 800 || calorieTarget > 8000) {
            throw new ValidationError(
                'Calorie target must be between 800 and 8000',
                ErrorCode.INVALID_INPUT
            );
        }

        const dietaryPreference = data.dietaryPreference || 'balanced';
        const allergies = data.allergies || [];
        const weekStart = data.weekStart || this.getWeekStart();

        // Generate AI meal plan
        const aiResponse = await this.callOpenAIMealPlanner(
            calorieTarget,
            dietaryPreference,
            allergies
        );

        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');

            // Create meal plan
            const planId = uuidv4();
            const planResult = await client.query(
                `
                INSERT INTO meal_plans (id, user_id, week_start, calorie_target, dietary_preference, status)
                VALUES ($1, $2, $3, $4, $5, 'active')
                RETURNING
                    id,
                    user_id as "userId",
                    week_start as "weekStart",
                    calorie_target as "calorieTarget",
                    dietary_preference as "dietaryPreference",
                    status,
                    created_at as "createdAt",
                    updated_at as "updatedAt"
                `,
                [planId, userId, weekStart, calorieTarget, dietaryPreference]
            );

            // Insert meal items
            const meals: MealItem[] = [];
            for (const meal of aiResponse.meals) {
                const mealId = uuidv4();
                await client.query(
                    `
                    INSERT INTO meal_items (
                        id, plan_id, day_of_week, meal_type, name, description,
                        calories, protein, carbs, fats, ingredients, prep_time
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                    `,
                    [
                        mealId,
                        planId,
                        meal.dayOfWeek,
                        meal.mealType,
                        meal.name,
                        meal.description,
                        meal.calories,
                        meal.protein,
                        meal.carbs,
                        meal.fats,
                        meal.ingredients,
                        meal.prepTime,
                    ]
                );

                meals.push({
                    id: mealId,
                    planId,
                    dayOfWeek: meal.dayOfWeek,
                    mealType: meal.mealType,
                    name: meal.name,
                    description: meal.description || null,
                    calories: meal.calories,
                    protein: meal.protein,
                    carbs: meal.carbs,
                    fats: meal.fats,
                    ingredients: meal.ingredients,
                    prepTime: meal.prepTime,
                    recipeUrl: null,
                    createdAt: new Date(),
                });
            }

            await client.query('COMMIT');

            log.info(
                { planId, userId, calorieTarget, mealsGenerated: meals.length },
                'Meal plan generated'
            );

            return {
                ...planResult.rows[0],
                meals,
                groceryList: aiResponse.groceryList,
            };
        } catch (error) {
            await client.query('ROLLBACK');
            log.error({ error, userId }, 'Failed to generate meal plan');
            if (error instanceof AppError) throw error;
            throw new AppError('Failed to generate meal plan', 500, ErrorCode.DATABASE_ERROR);
        } finally {
            client.release();
        }
    }

    /**
     * Get meal plan by ID with all meals.
     */
    async getMealPlan(planId: string, userId: string): Promise<MealPlan> {
        const planResult = await this.pool.query(
            `
            SELECT
                id,
                user_id as "userId",
                week_start as "weekStart",
                calorie_target as "calorieTarget",
                dietary_preference as "dietaryPreference",
                status,
                created_at as "createdAt",
                updated_at as "updatedAt"
            FROM meal_plans
            WHERE id = $1 AND user_id = $2
            `,
            [planId, userId]
        );

        if (planResult.rows.length === 0) {
            throw new NotFoundError('Meal plan not found', ErrorCode.NOT_FOUND_RESOURCE);
        }

        const mealsResult = await this.pool.query(
            `
            SELECT
                id,
                plan_id as "planId",
                day_of_week as "dayOfWeek",
                meal_type as "mealType",
                name,
                description,
                calories,
                protein,
                carbs,
                fats,
                ingredients,
                prep_time as "prepTime",
                recipe_url as "recipeUrl",
                created_at as "createdAt"
            FROM meal_items
            WHERE plan_id = $1
            ORDER BY day_of_week, CASE meal_type
                WHEN 'breakfast' THEN 1
                WHEN 'lunch' THEN 2
                WHEN 'dinner' THEN 3
                WHEN 'snack' THEN 4
            END
            `,
            [planId]
        );

        const groceryList = this.aggregateGroceryList(mealsResult.rows);

        return {
            ...planResult.rows[0],
            meals: mealsResult.rows,
            groceryList,
        };
    }

    /**
     * List meal plans for a user.
     */
    async listMealPlans(userId: string): Promise<MealPlan[]> {
        const result = await this.pool.query(
            `
            SELECT
                id,
                user_id as "userId",
                week_start as "weekStart",
                calorie_target as "calorieTarget",
                dietary_preference as "dietaryPreference",
                status,
                created_at as "createdAt",
                updated_at as "updatedAt"
            FROM meal_plans
            WHERE user_id = $1
            ORDER BY week_start DESC, created_at DESC
            LIMIT 50
            `,
            [userId]
        );

        return result.rows;
    }

    /**
     * Archive a meal plan.
     */
    async archiveMealPlan(planId: string, userId: string): Promise<void> {
        const result = await this.pool.query(
            `
            UPDATE meal_plans
            SET status = 'archived', updated_at = NOW()
            WHERE id = $1 AND user_id = $2
            RETURNING id
            `,
            [planId, userId]
        );

        if (result.rows.length === 0) {
            throw new NotFoundError('Meal plan not found', ErrorCode.NOT_FOUND_RESOURCE);
        }

        log.info({ planId, userId }, 'Meal plan archived');
    }

    /**
     * Delete a meal plan and all associated meals.
     */
    async deleteMealPlan(planId: string, userId: string): Promise<void> {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');

            // Verify ownership
            const planCheck = await client.query(
                'SELECT id FROM meal_plans WHERE id = $1 AND user_id = $2',
                [planId, userId]
            );
            if (planCheck.rows.length === 0) {
                throw new NotFoundError('Meal plan not found', ErrorCode.NOT_FOUND_RESOURCE);
            }

            await client.query('DELETE FROM meal_items WHERE plan_id = $1', [planId]);
            await client.query('DELETE FROM meal_plans WHERE id = $1', [planId]);

            await client.query('COMMIT');
            log.info({ planId, userId }, 'Meal plan deleted');
        } catch (error) {
            await client.query('ROLLBACK');
            if (error instanceof AppError) throw error;
            throw new AppError('Failed to delete meal plan', 500, ErrorCode.DATABASE_ERROR);
        } finally {
            client.release();
        }
    }

    // ─── Grocery List ─────────────────────────────────────────

    /**
     * Get aggregated grocery list for a meal plan.
     */
    async getGroceryList(planId: string, userId: string): Promise<GroceryItem[]> {
        // Verify ownership
        const planCheck = await this.pool.query(
            'SELECT id FROM meal_plans WHERE id = $1 AND user_id = $2',
            [planId, userId]
        );
        if (planCheck.rows.length === 0) {
            throw new NotFoundError('Meal plan not found', ErrorCode.NOT_FOUND_RESOURCE);
        }

        const mealsResult = await this.pool.query(
            'SELECT ingredients, name FROM meal_items WHERE plan_id = $1',
            [planId]
        );

        return this.aggregateGroceryList(mealsResult.rows);
    }

    // ─── OpenAI Integration ───────────────────────────────────

    /**
     * Call OpenAI GPT-4o to generate a weekly meal plan.
     */
    private async callOpenAIMealPlanner(
        calorieTarget: number,
        dietaryPreference: string,
        allergies: string[]
    ): Promise<AIMealResponse> {
        const apiKey = config.openaiApiKey;
        if (!apiKey) {
            log.warn('OpenAI API key not configured, using fallback meal plan');
            return this.generateFallbackMealPlan(calorieTarget);
        }

        try {
            const allergyNote = allergies.length > 0
                ? `Avoid these allergens: ${allergies.join(', ')}.`
                : '';

            const prompt = `Generate a 7-day meal plan with calorie target ${calorieTarget} kcal/day.
Dietary preference: ${dietaryPreference}. ${allergyNote}

For each day provide: breakfast, lunch, dinner, and 1 snack.
Return ONLY valid JSON with this exact structure:
{
  "meals": [
    {
      "dayOfWeek": 0-6 (0=Sunday),
      "mealType": "breakfast|lunch|dinner|snack",
      "name": "dish name",
      "description": "brief description",
      "calories": number,
      "protein": grams,
      "carbs": grams,
      "fats": grams,
      "ingredients": ["ingredient 1", "ingredient 2"],
      "prepTime": minutes
    }
  ],
  "groceryList": [
    {"name": "ingredient", "quantity": "amount", "category": "produce|protein|dairy|grains|pantry|frozen", "checked": false}
  ]
}`;

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model: 'gpt-4o',
                    messages: [
                        {
                            role: 'system',
                            content:
                                'You are a professional nutritionist. Generate healthy, balanced meal plans with accurate macro breakdowns.',
                        },
                        { role: 'user', content: prompt },
                    ],
                    temperature: 0.7,
                    max_tokens: 4000,
                }),
            });

            if (!response.ok) {
                throw new AppError(
                    `OpenAI API error: ${response.status}`,
                    500,
                    ErrorCode.SERVER_ERROR
                );
            }

            const openAiData = await response.json();
            const content = openAiData.choices?.[0]?.message?.content || '';

            // Extract JSON from potential markdown
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            const jsonStr = jsonMatch ? jsonMatch[0] : content;

            const parsed: AIMealResponse = JSON.parse(jsonStr);

            // Validate response
            if (!parsed.meals || parsed.meals.length === 0) {
                throw new Error('Invalid meal plan response');
            }

            return parsed;
        } catch (error) {
            log.error({ error, calorieTarget }, 'OpenAI meal planning failed, using fallback');
            return this.generateFallbackMealPlan(calorieTarget);
        }
    }

    // ─── Helpers ──────────────────────────────────────────────

    /**
     * Generate a fallback meal plan when OpenAI is unavailable.
     */
    private generateFallbackMealPlan(calorieTarget: number): AIMealResponse {
        const mealsPerDay = 4; // breakfast, lunch, dinner, snack
        const caloriesPerMeal = Math.round(calorieTarget / mealsPerDay);

        const fallbackMeals = [
            { type: 'breakfast' as const, names: ['Oatmeal with Berries', 'Scrambled Eggs with Toast', 'Greek Yogurt Parfait', 'Smoothie Bowl', 'Avocado Toast'] },
            { type: 'lunch' as const, names: ['Grilled Chicken Salad', 'Quinoa Bowl', 'Turkey Sandwich', 'Salmon with Rice', 'Pasta Primavera'] },
            { type: 'dinner' as const, names: ['Baked Salmon with Vegetables', 'Chicken Stir-Fry', 'Beef Tacos', 'Vegetable Curry', 'Grilled Steak with Potatoes'] },
            { type: 'snack' as const, names: ['Mixed Nuts', 'Apple with Peanut Butter', 'Protein Bar', 'Hummus with Carrots', 'Cottage Cheese'] },
        ];

        const meals: AIMealResponse['meals'] = [];

        for (let day = 0; day < 7; day++) {
            for (const mealType of fallbackMeals) {
                const name = mealType.names[day % mealType.names.length];
                meals.push({
                    dayOfWeek: day,
                    mealType: mealType.type,
                    name,
                    description: `Healthy ${mealType.type} option`,
                    calories: caloriesPerMeal,
                    protein: Math.round(caloriesPerMeal * 0.25 / 4),
                    carbs: Math.round(caloriesPerMeal * 0.5 / 4),
                    fats: Math.round(caloriesPerMeal * 0.25 / 9),
                    ingredients: ['Fresh ingredients', 'Seasonings'],
                    prepTime: 20,
                });
            }
        }

        const groceryList: GroceryItem[] = [
            { name: 'Chicken Breast', quantity: '1 kg', category: 'protein', checked: false },
            { name: 'Salmon Fillet', quantity: '500g', category: 'protein', checked: false },
            { name: 'Eggs', quantity: '12 count', category: 'protein', checked: false },
            { name: 'Greek Yogurt', quantity: '500g', category: 'dairy', checked: false },
            { name: 'Mixed Vegetables', quantity: '1 kg', category: 'produce', checked: false },
            { name: 'Berries', quantity: '500g', category: 'produce', checked: false },
            { name: 'Oats', quantity: '500g', category: 'grains', checked: false },
            { name: 'Quinoa', quantity: '500g', category: 'grains', checked: false },
            { name: 'Rice', quantity: '1 kg', category: 'grains', checked: false },
            { name: 'Olive Oil', quantity: '250ml', category: 'pantry', checked: false },
            { name: 'Mixed Nuts', quantity: '250g', category: 'pantry', checked: false },
        ];

        return { meals, groceryList };
    }

    /**
     * Aggregate ingredients from meals into a grocery list.
     */
    private aggregateGroceryList(meals: { ingredients: string[]; name: string }[]): GroceryItem[] {
        const ingredientMap = new Map<string, GroceryItem>();

        for (const meal of meals) {
            if (!meal.ingredients) continue;
            for (const ingredient of meal.ingredients) {
                if (!ingredientMap.has(ingredient)) {
                    ingredientMap.set(ingredient, {
                        name: ingredient,
                        quantity: 'As needed',
                        category: this.categorizeIngredient(ingredient),
                        checked: false,
                    });
                }
            }
        }

        return Array.from(ingredientMap.values()).sort((a, b) =>
            a.category.localeCompare(b.category)
        );
    }

    /**
     * Categorize an ingredient into a grocery category.
     */
    private categorizeIngredient(name: string): string {
        const lower = name.toLowerCase();
        const categories: Record<string, string[]> = {
            produce: ['apple', 'banana', 'berry', 'tomato', 'lettuce', 'spinach', 'onion', 'garlic', 'carrot', 'broccoli', 'pepper', 'cucumber', 'lemon', 'lime', 'avocado', 'potato', 'mushroom'],
            protein: ['chicken', 'beef', 'salmon', 'fish', 'egg', 'tofu', 'shrimp', 'turkey', 'pork', 'tuna'],
            dairy: ['milk', 'cheese', 'yogurt', 'butter', 'cream', 'feta', 'mozzarella', 'cheddar'],
            grains: ['rice', 'pasta', 'bread', 'oats', 'quinoa', 'flour', 'tortilla', 'noodles'],
            pantry: ['oil', 'salt', 'pepper', 'sugar', 'honey', 'vinegar', 'sauce', 'spice', 'herb', 'nut', 'seed'],
            frozen: ['frozen', 'ice'],
        };

        for (const [category, keywords] of Object.entries(categories)) {
            if (keywords.some(k => lower.includes(k))) return category;
        }

        return 'other';
    }

    /**
     * Get the start of the current week (Sunday).
     */
    private getWeekStart(): Date {
        const now = new Date();
        const day = now.getDay();
        const diff = now.getDate() - day;
        const sunday = new Date(now.setDate(diff));
        sunday.setHours(0, 0, 0, 0);
        return sunday;
    }
}
