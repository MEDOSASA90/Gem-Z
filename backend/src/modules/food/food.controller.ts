/**
 * GEM Z — Food Delivery Controller
 *
 * Handles restaurant browsing, menu viewing, and food ordering.
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../core/middlewares/auth.middleware';
import { FoodService } from './food.service';
import { db } from '../../core/database/db';
import { success } from '../../core/utils/api-response';
import { createLogger } from '../../core/logging/logger';

const foodService = new FoodService(db);
const log = createLogger('food-controller');

export class FoodController {
    /**
     * GET /api/v1/food/restaurants
     * List nearby healthy restaurants.
     */
    static async listRestaurants(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { cuisine, search } = req.query;
            const restaurants = await foodService.listRestaurants({
                cuisine: cuisine as string | undefined,
                isHealthy: true,
                search: search as string | undefined,
            });
            res.status(200).json(success(restaurants, 'Restaurants retrieved'));
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/v1/food/menu/:restaurantId
     * Get a restaurant's full menu.
     */
    static async getMenu(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { restaurantId } = req.params;
            const data = await foodService.getRestaurantMenu(restaurantId);
            res.status(200).json(success(data, 'Menu retrieved'));
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/v1/food/order
     * Place a food order.
     */
    static async placeOrder(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const { restaurant_id, items, delivery_address, payment_method, notes } = req.body;

            log.info({ userId, restaurant_id }, 'Placing food order');

            const order = await foodService.placeOrder(userId, {
                restaurantId: restaurant_id,
                items,
                deliveryAddress: delivery_address,
                paymentMethod: payment_method,
                notes,
            });

            res.status(201).json(success(order, 'Order placed'));
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/v1/food/orders
     * Get user's order history.
     */
    static async getOrders(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const orders = await foodService.getUserOrders(userId);
            res.status(200).json(success(orders, 'Orders retrieved'));
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/v1/food/orders/:id
     * Get a specific order.
     */
    static async getOrder(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const { id } = req.params;
            const order = await foodService.getOrder(id, userId);
            res.status(200).json(success(order, 'Order retrieved'));
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/v1/food/orders/:id/cancel
     * Cancel an order.
     */
    static async cancelOrder(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const { id } = req.params;
            await foodService.cancelOrder(id, userId);
            res.status(200).json(success(null, 'Order cancelled'));
        } catch (error) {
            next(error);
        }
    }
}
