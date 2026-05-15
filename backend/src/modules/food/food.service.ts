/**
 * GEM Z — Food Delivery Integration Service
 *
 * Business logic for healthy food delivery:
 * - Browse nearby healthy restaurants (mock Talabat/Elmenus integration)
 * - View restaurant menus with nutritional info
 * - Place food orders
 * - Order tracking
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

const log = createLogger('food-service');

// ─── Types ──────────────────────────────────────────────────────

export interface FoodRestaurant {
    id: string;
    name: string;
    cuisineType: string;
    rating: number;
    deliveryTimeMin: number;
    deliveryFeeEgp: number;
    minOrderEgp: number;
    imageUrl: string | null;
    isHealthy: boolean;
    tags: string[];
    address: string | null;
    lat: number | null;
    lng: number | null;
    isActive: boolean;
    createdAt: Date;
}

export interface FoodMenuItem {
    id: string;
    restaurantId: string;
    name: string;
    description: string | null;
    priceEgp: number;
    category: string;
    calories: number | null;
    proteinG: number | null;
    carbsG: number | null;
    fatsG: number | null;
    imageUrl: string | null;
    isAvailable: boolean;
    isHealthy: boolean;
    createdAt: Date;
}

export interface CartItem {
    menuItemId: string;
    name: string;
    priceEgp: number;
    quantity: number;
    calories: number | null;
}

export interface FoodOrder {
    id: string;
    userId: string;
    restaurantId: string;
    restaurantName?: string;
    items: CartItem[];
    subtotalEgp: number;
    deliveryFeeEgp: number;
    totalEgp: number;
    status: 'pending' | 'confirmed' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled';
    deliveryAddress: string;
    paymentMethod: string;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
}

// ─── Service ────────────────────────────────────────────────────

export class FoodService {
    constructor(private pool: Pool) {}

    // ─── Restaurants ──────────────────────────────────────────

    async listRestaurants(filters?: { cuisine?: string; isHealthy?: boolean; search?: string }): Promise<FoodRestaurant[]> {
        let query = `
            SELECT
                id, name, cuisine_type as "cuisineType", rating,
                delivery_time_min as "deliveryTimeMin", delivery_fee_egp as "deliveryFeeEgp",
                min_order_egp as "minOrderEgp", image_url as "imageUrl",
                is_healthy as "isHealthy", tags, address, lat, lng,
                is_active as "isActive", created_at as "createdAt"
            FROM food_restaurants
            WHERE is_active = true
        `;
        const params: any[] = [];
        let paramIdx = 1;

        if (filters?.cuisine) {
            query += ` AND cuisine_type ILIKE $${paramIdx}`;
            params.push(`%${filters.cuisine}%`);
            paramIdx++;
        }

        if (filters?.isHealthy !== undefined) {
            query += ` AND is_healthy = $${paramIdx}`;
            params.push(filters.isHealthy);
            paramIdx++;
        }

        if (filters?.search) {
            query += ` AND (name ILIKE $${paramIdx} OR tags::text ILIKE $${paramIdx} OR cuisine_type ILIKE $${paramIdx})`;
            params.push(`%${filters.search}%`);
            paramIdx++;
        }

        query += ` ORDER BY rating DESC, created_at DESC LIMIT 100`;

        const result = await this.pool.query(query, params);
        return result.rows;
    }

    // ─── Restaurant Menu ──────────────────────────────────────

    async getRestaurantMenu(restaurantId: string): Promise<{ restaurant: FoodRestaurant; menu: FoodMenuItem[] }> {
        const restaurantResult = await this.pool.query(
            `
            SELECT
                id, name, cuisine_type as "cuisineType", rating,
                delivery_time_min as "deliveryTimeMin", delivery_fee_egp as "deliveryFeeEgp",
                min_order_egp as "minOrderEgp", image_url as "imageUrl",
                is_healthy as "isHealthy", tags, address, lat, lng,
                is_active as "isActive", created_at as "createdAt"
            FROM food_restaurants
            WHERE id = $1 AND is_active = true
            `,
            [restaurantId]
        );

        if (restaurantResult.rows.length === 0) {
            throw new NotFoundError('Restaurant not found', ErrorCode.NOT_FOUND_RESOURCE);
        }

        const menuResult = await this.pool.query(
            `
            SELECT
                id, restaurant_id as "restaurantId", name, description,
                price_egp as "priceEgp", category, calories,
                protein_g as "proteinG", carbs_g as "carbsG", fats_g as "fatsG",
                image_url as "imageUrl", is_available as "isAvailable",
                is_healthy as "isHealthy", created_at as "createdAt"
            FROM food_menu_items
            WHERE restaurant_id = $1 AND is_available = true
            ORDER BY category, name
            `,
            [restaurantId]
        );

        return {
            restaurant: restaurantResult.rows[0],
            menu: menuResult.rows,
        };
    }

    // ─── Place Order ──────────────────────────────────────────

    async placeOrder(
        userId: string,
        data: {
            restaurantId: string;
            items: { menuItemId: string; quantity: number }[];
            deliveryAddress: string;
            paymentMethod: string;
            notes?: string;
        }
    ): Promise<FoodOrder> {
        const { restaurantId, items, deliveryAddress, paymentMethod, notes } = data;

        // Validate
        if (!items || items.length === 0) {
            throw new ValidationError('Order must contain at least one item', ErrorCode.INVALID_INPUT);
        }
        if (!deliveryAddress || deliveryAddress.trim().length === 0) {
            throw new ValidationError('Delivery address is required', ErrorCode.INVALID_INPUT);
        }

        // Verify restaurant exists
        const restaurantResult = await this.pool.query(
            'SELECT id, name, delivery_fee_egp, min_order_egp FROM food_restaurants WHERE id = $1 AND is_active = true',
            [restaurantId]
        );
        if (restaurantResult.rows.length === 0) {
            throw new NotFoundError('Restaurant not found', ErrorCode.NOT_FOUND_RESOURCE);
        }
        const restaurant = restaurantResult.rows[0];

        // Fetch menu items and calculate totals
        const menuItemIds = items.map(i => i.menuItemId);
        const menuResult = await this.pool.query(
            `
            SELECT id, name, price_egp, calories, is_available
            FROM food_menu_items
            WHERE id = ANY($1) AND restaurant_id = $2
            `,
            [menuItemIds, restaurantId]
        );

        const menuItemMap = new Map(menuResult.rows.map(r => [r.id, r]));
        const orderItems: CartItem[] = [];
        let subtotal = 0;
        let totalCalories = 0;

        for (const item of items) {
            const menuItem = menuItemMap.get(item.menuItemId);
            if (!menuItem) {
                throw new ValidationError(`Menu item ${item.menuItemId} not found`, ErrorCode.NOT_FOUND_RESOURCE);
            }
            if (!menuItem.is_available) {
                throw new ValidationError(`Menu item "${menuItem.name}" is not available`, ErrorCode.INVALID_INPUT);
            }
            const qty = Math.min(Math.max(item.quantity, 1), 50);
            const lineTotal = Number(menuItem.price_egp) * qty;
            subtotal += lineTotal;
            if (menuItem.calories) totalCalories += menuItem.calories * qty;

            orderItems.push({
                menuItemId: item.menuItemId,
                name: menuItem.name,
                priceEgp: Number(menuItem.price_egp),
                quantity: qty,
                calories: menuItem.calories,
            });
        }

        // Check minimum order
        if (subtotal < Number(restaurant.min_order_egp)) {
            throw new ValidationError(
                `Minimum order is ${restaurant.min_order_egp} EGP`,
                ErrorCode.INVALID_INPUT
            );
        }

        const deliveryFee = Number(restaurant.delivery_fee_egp);
        const total = subtotal + deliveryFee;

        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');

            const orderId = uuidv4();
            const orderResult = await client.query(
                `
                INSERT INTO food_orders (
                    id, user_id, restaurant_id, items, subtotal_egp,
                    delivery_fee_egp, total_egp, status, delivery_address,
                    payment_method, notes
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'confirmed', $8, $9, $10)
                RETURNING
                    id, user_id as "userId", restaurant_id as "restaurantId",
                    items, subtotal_egp as "subtotalEgp",
                    delivery_fee_egp as "deliveryFeeEgp", total_egp as "totalEgp",
                    status, delivery_address as "deliveryAddress",
                    payment_method as "paymentMethod", notes,
                    created_at as "createdAt", updated_at as "updatedAt"
                `,
                [
                    orderId, userId, restaurantId,
                    JSON.stringify(orderItems),
                    subtotal, deliveryFee, total,
                    deliveryAddress.trim(),
                    paymentMethod || 'cash',
                    notes || null,
                ]
            );

            await client.query('COMMIT');

            log.info(
                { orderId, userId, restaurantId, total, items: orderItems.length },
                'Food order placed'
            );

            return {
                ...orderResult.rows[0],
                restaurantName: restaurant.name,
            };
        } catch (error) {
            await client.query('ROLLBACK');
            if (error instanceof AppError) throw error;
            throw new AppError('Failed to place order', 500, ErrorCode.DATABASE_ERROR);
        } finally {
            client.release();
        }
    }

    // ─── Get User Orders ──────────────────────────────────────

    async getUserOrders(userId: string): Promise<FoodOrder[]> {
        const result = await this.pool.query(
            `
            SELECT
                fo.id, fo.user_id as "userId", fo.restaurant_id as "restaurantId",
                fr.name as "restaurantName",
                fo.items, fo.subtotal_egp as "subtotalEgp",
                fo.delivery_fee_egp as "deliveryFeeEgp", fo.total_egp as "totalEgp",
                fo.status, fo.delivery_address as "deliveryAddress",
                fo.payment_method as "paymentMethod", fo.notes,
                fo.created_at as "createdAt", fo.updated_at as "updatedAt"
            FROM food_orders fo
            JOIN food_restaurants fr ON fo.restaurant_id = fr.id
            WHERE fo.user_id = $1
            ORDER BY fo.created_at DESC
            LIMIT 50
            `,
            [userId]
        );

        return result.rows;
    }

    // ─── Get Order by ID ──────────────────────────────────────

    async getOrder(orderId: string, userId: string): Promise<FoodOrder> {
        const result = await this.pool.query(
            `
            SELECT
                fo.id, fo.user_id as "userId", fo.restaurant_id as "restaurantId",
                fr.name as "restaurantName",
                fo.items, fo.subtotal_egp as "subtotalEgp",
                fo.delivery_fee_egp as "deliveryFeeEgp", fo.total_egp as "totalEgp",
                fo.status, fo.delivery_address as "deliveryAddress",
                fo.payment_method as "paymentMethod", fo.notes,
                fo.created_at as "createdAt", fo.updated_at as "updatedAt"
            FROM food_orders fo
            JOIN food_restaurants fr ON fo.restaurant_id = fr.id
            WHERE fo.id = $1 AND fo.user_id = $2
            `,
            [orderId, userId]
        );

        if (result.rows.length === 0) {
            throw new NotFoundError('Order not found', ErrorCode.NOT_FOUND_ORDER);
        }

        return result.rows[0];
    }

    // ─── Cancel Order ─────────────────────────────────────────

    async cancelOrder(orderId: string, userId: string): Promise<void> {
        const result = await this.pool.query(
            `
            UPDATE food_orders
            SET status = 'cancelled', updated_at = NOW()
            WHERE id = $1 AND user_id = $2 AND status IN ('pending', 'confirmed')
            RETURNING id
            `,
            [orderId, userId]
        );

        if (result.rows.length === 0) {
            throw new NotFoundError('Order not found or cannot be cancelled', ErrorCode.NOT_FOUND_ORDER);
        }

        log.info({ orderId, userId }, 'Food order cancelled');
    }
}
