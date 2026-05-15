/**
 * GEM Z — Meal Planning Controller
 *
 * Handles meal plan generation, retrieval, and grocery list.
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../core/middlewares/auth.middleware';
import { MealService } from './meal.service';
import { db } from '../../core/database/db';
import { success } from '../../core/utils/api-response';
import { createLogger } from '../../core/logging/logger';

const mealService = new MealService(db);
const log = createLogger('meal-controller');

export class MealController {
    /**
     * POST /api/v1/meals/generate
     * Generate a new weekly meal plan via OpenAI.
     */
    static async generateMealPlan(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const { calorieTarget, dietaryPreference, allergies, weekStart } = req.body;

            log.info({ userId, calorieTarget, dietaryPreference }, 'Generating meal plan');

            const plan = await mealService.generateMealPlan(userId, {
                calorieTarget,
                dietaryPreference,
                allergies,
                weekStart: weekStart ? new Date(weekStart) : undefined,
            });

            res.status(201).json(success(plan, 'Meal plan generated'));
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/v1/meals
     * List all meal plans for the authenticated user.
     */
    static async listMealPlans(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const plans = await mealService.listMealPlans(userId);
            res.status(200).json(success(plans, 'Meal plans retrieved'));
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/v1/meals/:id
     * Get a specific meal plan with all meals.
     */
    static async getMealPlan(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const { id } = req.params;
            const plan = await mealService.getMealPlan(id, userId);
            res.status(200).json(success(plan, 'Meal plan retrieved'));
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/v1/meals/:id/archive
     * Archive a meal plan.
     */
    static async archiveMealPlan(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const { id } = req.params;
            await mealService.archiveMealPlan(id, userId);
            res.status(200).json(success(null, 'Meal plan archived'));
        } catch (error) {
            next(error);
        }
    }

    /**
     * DELETE /api/v1/meals/:id
     * Delete a meal plan.
     */
    static async deleteMealPlan(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const { id } = req.params;
            await mealService.deleteMealPlan(id, userId);
            res.status(200).json(success(null, 'Meal plan deleted'));
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/v1/meals/:id/grocery-list
     * Get aggregated grocery list for a meal plan.
     */
    static async getGroceryList(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const { id } = req.params;
            const groceryList = await mealService.getGroceryList(id, userId);
            res.status(200).json(success(groceryList, 'Grocery list retrieved'));
        } catch (error) {
            next(error);
        }
    }
}
