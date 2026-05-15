/**
 * GEM Z — Gym Equipment Marketplace Service
 *
 * Business logic for equipment marketplace:
 * - Listings for used/new gym equipment
 * - Categories: weights, machines, accessories, supplements
 * - Checkout and order management
 */

import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '../../core/logging/logger';
import { AppError, ValidationError, NotFoundError, ConflictError } from '../../core/errors';

const log = createLogger('marketplace-service');

// ─── Types ──────────────────────────────────────────────────────

export type EquipmentCategory = 'weights' | 'machines' | 'accessories' | 'supplements';
export type EquipmentCondition = 'new' | 'like_new' | 'good' | 'fair' | 'used';

export interface MarketplaceListing {
    id: string;
    sellerId: string;
    sellerName: string | null;
    title: string;
    description: string;
    category: EquipmentCategory;
    condition: EquipmentCondition;
    price: number;
    originalPrice: number | null;
    currency: string;
    images: string[];
    location: string | null;
    brand: string | null;
    model: string | null;
    quantity: number;
    negotiable: boolean;
    shippingAvailable: boolean;
    shippingCost: number | null;
    featured: boolean;
    viewCount: number;
    status: 'active' | 'sold' | 'reserved' | 'deleted';
    createdAt: string;
    updatedAt: string;
}

export interface MarketplaceOrder {
    id: string;
    buyerId: string;
    listingId: string;
    listingTitle: string;
    sellerId: string;
    quantity: number;
    unitPrice: number;
    shippingCost: number;
    totalAmount: number;
    status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
    deliveryAddress: Record<string, any> | null;
    paymentMethod: string | null;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface ListingFilters {
    category?: EquipmentCategory | 'all';
    condition?: EquipmentCondition | 'all';
    minPrice?: number;
    maxPrice?: number;
    location?: string;
    search?: string;
    sortBy?: 'newest' | 'price_asc' | 'price_desc' | 'popular';
    page?: number;
    limit?: number;
}

// ─── Service ────────────────────────────────────────────────────

export class MarketplaceService {
    constructor(private pool: Pool) {}

    // ─── Listings ───────────────────────────────────────────────

    /**
     * Create a new listing.
     */
    async createListing(
        sellerId: string,
        data: {
            title: string;
            description: string;
            category: EquipmentCategory;
            condition: EquipmentCondition;
            price: number;
            originalPrice?: number;
            images?: string[];
            location?: string;
            brand?: string;
            model?: string;
            quantity?: number;
            negotiable?: boolean;
            shippingAvailable?: boolean;
            shippingCost?: number;
        }
    ): Promise<MarketplaceListing> {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');

            // Validate category
            const validCategories: EquipmentCategory[] = ['weights', 'machines', 'accessories', 'supplements'];
            if (!validCategories.includes(data.category)) {
                throw new ValidationError('Invalid category. Must be: weights, machines, accessories, supplements');
            }

            const listingId = uuidv4();
            const result = await client.query(
                `INSERT INTO marketplace_listings (id, seller_id, title, description, category, condition, price, original_price, images, location, brand, model, quantity, negotiable, shipping_available, shipping_cost, status)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'active')
                 RETURNING id, seller_id as "sellerId", title, description, category, condition, price,
                           original_price as "originalPrice", images, location, brand, model, quantity,
                           negotiable, shipping_available as "shippingAvailable", shipping_cost as "shippingCost",
                           featured, view_count as "viewCount", status, created_at as "createdAt", updated_at as "updatedAt"`,
                [
                    listingId, sellerId, data.title, data.description, data.category, data.condition,
                    data.price, data.originalPrice || null,
                    data.images || [], data.location || null, data.brand || null,
                    data.model || null, data.quantity || 1, data.negotiable || false,
                    data.shippingAvailable || false, data.shippingCost || null,
                ]
            );

            await client.query('COMMIT');

            log.info({ sellerId, listingId }, 'Marketplace listing created');
            return result.rows[0];
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * List all active listings with filters.
     */
    async listListings(filters: ListingFilters): Promise<{ listings: MarketplaceListing[]; total: number; page: number; totalPages: number }> {
        const {
            category, condition, minPrice, maxPrice, location, search, sortBy = 'newest', page = 1, limit = 20,
        } = filters;

        let whereClause = `WHERE status = 'active'`;
        const params: any[] = [];
        let paramIndex = 1;

        if (category && category !== 'all') {
            whereClause += ` AND category = $${paramIndex++}`;
            params.push(category);
        }

        if (condition && condition !== 'all') {
            whereClause += ` AND condition = $${paramIndex++}`;
            params.push(condition);
        }

        if (minPrice !== undefined) {
            whereClause += ` AND price >= $${paramIndex++}`;
            params.push(minPrice);
        }

        if (maxPrice !== undefined) {
            whereClause += ` AND price <= $${paramIndex++}`;
            params.push(maxPrice);
        }

        if (location) {
            whereClause += ` AND location ILIKE $${paramIndex++}`;
            params.push(`%${location}%`);
        }

        if (search) {
            whereClause += ` AND (title ILIKE $${paramIndex} OR description ILIKE $${paramIndex} OR brand ILIKE $${paramIndex})`;
            params.push(`%${search}%`);
            paramIndex++;
        }

        const sortMap: Record<string, string> = {
            newest: 'created_at DESC',
            price_asc: 'price ASC',
            price_desc: 'price DESC',
            popular: 'view_count DESC',
        };
        const orderBy = sortMap[sortBy] || sortMap.newest;

        const offset = (page - 1) * limit;

        const countResult = await this.pool.query(
            `SELECT COUNT(*) FROM marketplace_listings ${whereClause}`,
            params
        );
        const total = parseInt(countResult.rows[0].count, 10);

        const result = await this.pool.query(
            `SELECT l.id, l.seller_id as "sellerId", u.full_name as "sellerName", l.title, l.description, l.category, l.condition,
                    l.price, l.original_price as "originalPrice", l.currency as "currency", l.images, l.location, l.brand, l.model,
                    l.quantity, l.negotiable, l.shipping_available as "shippingAvailable", l.shipping_cost as "shippingCost",
                    l.featured, l.view_count as "viewCount", l.status, l.created_at as "createdAt", l.updated_at as "updatedAt"
             FROM marketplace_listings l
             LEFT JOIN users u ON l.seller_id = u.id
             ${whereClause}
             ORDER BY l.featured DESC, ${orderBy}
             LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
            [...params, limit, offset]
        );

        const listings = result.rows.map(row => ({
            ...row,
            currency: row.currency || 'EGP',
        }));

        return { listings, total, page, totalPages: Math.ceil(total / limit) };
    }

    /**
     * Get a single listing.
     */
    async getListing(listingId: string): Promise<MarketplaceListing> {
        const result = await this.pool.query(
            `SELECT l.id, l.seller_id as "sellerId", u.full_name as "sellerName", l.title, l.description, l.category, l.condition,
                    l.price, l.original_price as "originalPrice", l.currency as "currency", l.images, l.location, l.brand, l.model,
                    l.quantity, l.negotiable, l.shipping_available as "shippingAvailable", l.shipping_cost as "shippingCost",
                    l.featured, l.view_count as "viewCount", l.status, l.created_at as "createdAt", l.updated_at as "updatedAt"
             FROM marketplace_listings l
             LEFT JOIN users u ON l.seller_id = u.id
             WHERE l.id = $1 AND l.status = 'active'`,
            [listingId]
        );

        if (result.rowCount === 0) {
            throw new NotFoundError('Listing not found');
        }

        // Increment view count
        await this.pool.query(
            `UPDATE marketplace_listings SET view_count = view_count + 1 WHERE id = $1`,
            [listingId]
        );

        return { ...result.rows[0], currency: result.rows[0].currency || 'EGP' };
    }

    /**
     * Update a listing.
     */
    async updateListing(sellerId: string, listingId: string, data: Partial<MarketplaceListing>): Promise<MarketplaceListing> {
        const allowedUpdates = ['title', 'description', 'price', 'originalPrice', 'images', 'location', 'brand', 'model', 'quantity', 'negotiable', 'shippingAvailable', 'shippingCost'];
        const updates: string[] = [];
        const values: any[] = [];

        for (const key of Object.keys(data)) {
            if (allowedUpdates.includes(key)) {
                const dbKey = key.replace(/[A-Z]/g, l => `_${l.toLowerCase()}`);
                values.push((data as any)[key]);
                updates.push(`${dbKey} = $${values.length}`);
            }
        }

        if (updates.length === 0) {
            throw new ValidationError('No valid fields to update');
        }

        values.push(listingId, sellerId);
        const result = await this.pool.query(
            `UPDATE marketplace_listings SET ${updates.join(', ')}, updated_at = NOW()
             WHERE id = $${values.length - 1} AND seller_id = $${values.length}
             RETURNING id, seller_id as "sellerId", title, description, category, condition, price,
                       original_price as "originalPrice", currency as "currency", images, location, brand, model, quantity,
                       negotiable, shipping_available as "shippingAvailable", shipping_cost as "shippingCost",
                       featured, view_count as "viewCount", status, created_at as "createdAt", updated_at as "updatedAt"`,
            values
        );

        if (result.rowCount === 0) {
            throw new NotFoundError('Listing not found or you do not own it');
        }

        return { ...result.rows[0], currency: result.rows[0].currency || 'EGP' };
    }

    /**
     * Delete a listing (soft delete).
     */
    async deleteListing(sellerId: string, listingId: string): Promise<void> {
        const result = await this.pool.query(
            `UPDATE marketplace_listings SET status = 'deleted', updated_at = NOW()
             WHERE id = $1 AND seller_id = $2 RETURNING id`,
            [listingId, sellerId]
        );

        if (result.rowCount === 0) {
            throw new NotFoundError('Listing not found or you do not own it');
        }

        log.info({ sellerId, listingId }, 'Listing deleted');
    }

    // ─── Orders ─────────────────────────────────────────────────

    /**
     * Create an order (buy).
     */
    async createOrder(
        buyerId: string,
        listingId: string,
        quantity: number = 1,
        options?: { deliveryAddress?: Record<string, any>; paymentMethod?: string; notes?: string }
    ): Promise<MarketplaceOrder> {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');

            // Get listing with lock
            const listingResult = await client.query(
                `SELECT id, seller_id, title, price, quantity, shipping_cost, status FROM marketplace_listings WHERE id = $1 FOR UPDATE`,
                [listingId]
            );

            if (listingResult.rowCount === 0) {
                await client.query('ROLLBACK');
                throw new NotFoundError('Listing not found');
            }

            const listing = listingResult.rows[0];

            if (listing.status !== 'active') {
                await client.query('ROLLBACK');
                throw new ValidationError('This item is no longer available');
            }

            if (listing.quantity < quantity) {
                await client.query('ROLLBACK');
                throw new ValidationError('Insufficient quantity available');
            }

            if (listing.seller_id === buyerId) {
                await client.query('ROLLBACK');
                throw new ValidationError('You cannot buy your own listing');
            }

            const unitPrice = parseFloat(listing.price);
            const shippingCost = parseFloat(listing.shipping_cost || 0);
            const totalAmount = (unitPrice * quantity) + shippingCost;

            const orderId = uuidv4();
            const orderResult = await client.query(
                `INSERT INTO marketplace_orders (id, buyer_id, listing_id, listing_title, seller_id, quantity, unit_price, shipping_cost, total_amount, delivery_address, payment_method, notes)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                 RETURNING id, buyer_id as "buyerId", listing_id as "listingId", listing_title as "listingTitle", seller_id as "sellerId",
                           quantity, unit_price as "unitPrice", shipping_cost as "shippingCost", total_amount as "totalAmount",
                           status, delivery_address as "deliveryAddress", payment_method as "paymentMethod", notes,
                           created_at as "createdAt", updated_at as "updatedAt"`,
                [
                    orderId, buyerId, listingId, listing.title, listing.seller_id,
                    quantity, unitPrice, shippingCost, totalAmount,
                    options?.deliveryAddress ? JSON.stringify(options.deliveryAddress) : null,
                    options?.paymentMethod || null, options?.notes || null,
                ]
            );

            // Decrease listing quantity
            const newQuantity = listing.quantity - quantity;
            await client.query(
                `UPDATE marketplace_listings SET quantity = $1, status = CASE WHEN $1 = 0 THEN 'sold' ELSE status END, updated_at = NOW() WHERE id = $2`,
                [newQuantity, listingId]
            );

            await client.query('COMMIT');

            log.info({ buyerId, listingId, orderId }, 'Marketplace order created');
            return orderResult.rows[0];
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Get buyer's orders.
     */
    async getBuyerOrders(buyerId: string): Promise<MarketplaceOrder[]> {
        const result = await this.pool.query(
            `SELECT id, buyer_id as "buyerId", listing_id as "listingId", listing_title as "listingTitle", seller_id as "sellerId",
                    quantity, unit_price as "unitPrice", shipping_cost as "shippingCost", total_amount as "totalAmount",
                    status, delivery_address as "deliveryAddress", payment_method as "paymentMethod", notes,
                    created_at as "createdAt", updated_at as "updatedAt"
             FROM marketplace_orders WHERE buyer_id = $1 ORDER BY created_at DESC`,
            [buyerId]
        );
        return result.rows;
    }

    /**
     * Get seller's orders.
     */
    async getSellerOrders(sellerId: string): Promise<MarketplaceOrder[]> {
        const result = await this.pool.query(
            `SELECT id, buyer_id as "buyerId", listing_id as "listingId", listing_title as "listingTitle", seller_id as "sellerId",
                    quantity, unit_price as "unitPrice", shipping_cost as "shippingCost", total_amount as "totalAmount",
                    status, delivery_address as "deliveryAddress", payment_method as "paymentMethod", notes,
                    created_at as "createdAt", updated_at as "updatedAt"
             FROM marketplace_orders WHERE seller_id = $1 ORDER BY created_at DESC`,
            [sellerId]
        );
        return result.rows;
    }

    /**
     * Update order status.
     */
    async updateOrderStatus(userId: string, orderId: string, status: MarketplaceOrder['status']): Promise<MarketplaceOrder> {
        const result = await this.pool.query(
            `UPDATE marketplace_orders SET status = $1, updated_at = NOW()
             WHERE id = $2 AND (buyer_id = $3 OR seller_id = $3)
             RETURNING id, buyer_id as "buyerId", listing_id as "listingId", listing_title as "listingTitle", seller_id as "sellerId",
                       quantity, unit_price as "unitPrice", shipping_cost as "shippingCost", total_amount as "totalAmount",
                       status, delivery_address as "deliveryAddress", payment_method as "paymentMethod", notes,
                       created_at as "createdAt", updated_at as "updatedAt"`,
            [status, orderId, userId]
        );

        if (result.rowCount === 0) {
            throw new NotFoundError('Order not found');
        }

        return result.rows[0];
    }

    /**
     * Get seller's listings.
     */
    async getMyListings(sellerId: string): Promise<MarketplaceListing[]> {
        const result = await this.pool.query(
            `SELECT l.id, l.seller_id as "sellerId", u.full_name as "sellerName", l.title, l.description, l.category, l.condition,
                    l.price, l.original_price as "originalPrice", l.currency as "currency", l.images, l.location, l.brand, l.model,
                    l.quantity, l.negotiable, l.shipping_available as "shippingAvailable", l.shipping_cost as "shippingCost",
                    l.featured, l.view_count as "viewCount", l.status, l.created_at as "createdAt", l.updated_at as "updatedAt"
             FROM marketplace_listings l
             LEFT JOIN users u ON l.seller_id = u.id
             WHERE l.seller_id = $1 AND l.status != 'deleted'
             ORDER BY l.created_at DESC`,
            [sellerId]
        );
        return result.rows.map(row => ({ ...row, currency: row.currency || 'EGP' }));
    }
}
