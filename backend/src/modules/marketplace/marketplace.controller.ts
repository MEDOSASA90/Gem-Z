/**
 * GEM Z — Gym Equipment Marketplace Controller
 *
 * Handles equipment listings, browsing, and checkout.
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../core/middlewares/auth.middleware';
import { MarketplaceService } from './marketplace.service';
import { db } from '../../core/database/db';
import { success, paginated, buildPaginationMeta } from '../../core/utils/api-response';
import { createLogger } from '../../core/logging/logger';

const marketplaceService = new MarketplaceService(db);
const log = createLogger('marketplace-controller');

export class MarketplaceController {
    /**
     * POST /api/v1/marketplace/create
     * Create a new listing.
     */
    static async createListing(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const sellerId = req.user!.userId;
            const { title, description, category, condition, price, originalPrice, images, location, brand, model, quantity, negotiable, shippingAvailable, shippingCost } = req.body;

            if (!title || !description || !category || !condition || !price) {
                return res.status(400).json({ success: false, message: 'title, description, category, condition, and price are required' });
            }

            const listing = await marketplaceService.createListing(sellerId, {
                title, description, category, condition, price: Number(price),
                originalPrice: originalPrice ? Number(originalPrice) : undefined,
                images, location, brand, model,
                quantity: quantity ? Number(quantity) : undefined,
                negotiable, shippingAvailable,
                shippingCost: shippingCost ? Number(shippingCost) : undefined,
            });

            res.status(201).json(success(listing, 'Listing created successfully'));
        } catch (error: any) {
            if (error.name === 'ValidationError') {
                return res.status(400).json({ success: false, message: error.message });
            }
            next(error);
        }
    }

    /**
     * GET /api/v1/marketplace/listings
     * Browse all listings with filters.
     */
    static async listListings(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { category, condition, minPrice, maxPrice, location, search, sortBy, page, limit } = req.query;

            const filters = {
                category: category as any,
                condition: condition as any,
                minPrice: minPrice ? Number(minPrice) : undefined,
                maxPrice: maxPrice ? Number(maxPrice) : undefined,
                location: location as string | undefined,
                search: search as string | undefined,
                sortBy: sortBy as any,
                page: page ? Number(page) : 1,
                limit: limit ? Number(limit) : 20,
            };

            const { listings, total, page: pageNum, totalPages } = await marketplaceService.listListings(filters);

            res.status(200).json(paginated(listings, buildPaginationMeta(total, pageNum, filters.limit || 20), 'Listings retrieved'));
        } catch (error: any) {
            if (error.name === 'ValidationError') {
                return res.status(400).json({ success: false, message: error.message });
            }
            next(error);
        }
    }

    /**
     * GET /api/v1/marketplace/listings/:id
     * Get a single listing.
     */
    static async getListing(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const listing = await marketplaceService.getListing(id);
            res.status(200).json(success(listing, 'Listing retrieved'));
        } catch (error: any) {
            if (error.name === 'NotFoundError') {
                return res.status(404).json({ success: false, message: error.message });
            }
            next(error);
        }
    }

    /**
     * PUT /api/v1/marketplace/listings/:id
     * Update a listing.
     */
    static async updateListing(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const sellerId = req.user!.userId;
            const { id } = req.params;
            const listing = await marketplaceService.updateListing(sellerId, id, req.body);
            res.status(200).json(success(listing, 'Listing updated'));
        } catch (error: any) {
            if (error.name === 'NotFoundError' || error.name === 'ValidationError') {
                return res.status(400).json({ success: false, message: error.message });
            }
            next(error);
        }
    }

    /**
     * DELETE /api/v1/marketplace/listings/:id
     * Delete a listing.
     */
    static async deleteListing(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const sellerId = req.user!.userId;
            const { id } = req.params;
            await marketplaceService.deleteListing(sellerId, id);
            res.status(200).json(success(null, 'Listing deleted'));
        } catch (error: any) {
            if (error.name === 'NotFoundError') {
                return res.status(404).json({ success: false, message: error.message });
            }
            next(error);
        }
    }

    /**
     * POST /api/v1/marketplace/:id/buy
     * Buy a listing.
     */
    static async buy(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const buyerId = req.user!.userId;
            const { id } = req.params;
            const { quantity, deliveryAddress, paymentMethod, notes } = req.body;

            const order = await marketplaceService.createOrder(buyerId, id, quantity || 1, {
                deliveryAddress, paymentMethod, notes,
            });

            res.status(201).json(success(order, 'Order placed successfully'));
        } catch (error: any) {
            if (error.name === 'NotFoundError' || error.name === 'ValidationError') {
                return res.status(400).json({ success: false, message: error.message });
            }
            next(error);
        }
    }

    /**
     * GET /api/v1/marketplace/orders/buyer
     * Get buyer's orders.
     */
    static async getBuyerOrders(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const buyerId = req.user!.userId;
            const orders = await marketplaceService.getBuyerOrders(buyerId);
            res.status(200).json(success(orders, 'Buyer orders retrieved'));
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/v1/marketplace/orders/seller
     * Get seller's orders.
     */
    static async getSellerOrders(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const sellerId = req.user!.userId;
            const orders = await marketplaceService.getSellerOrders(sellerId);
            res.status(200).json(success(orders, 'Seller orders retrieved'));
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/v1/marketplace/my-listings
     * Get current user's listings.
     */
    static async getMyListings(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const sellerId = req.user!.userId;
            const listings = await marketplaceService.getMyListings(sellerId);
            res.status(200).json(success(listings, 'Your listings retrieved'));
        } catch (error) {
            next(error);
        }
    }

    /**
     * PUT /api/v1/marketplace/orders/:id/status
     * Update order status.
     */
    static async updateOrderStatus(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const { id } = req.params;
            const { status } = req.body;

            if (!status || !['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'].includes(status)) {
                return res.status(400).json({ success: false, message: 'Invalid status' });
            }

            const order = await marketplaceService.updateOrderStatus(userId, id, status);
            res.status(200).json(success(order, 'Order status updated'));
        } catch (error: any) {
            if (error.name === 'NotFoundError') {
                return res.status(404).json({ success: false, message: error.message });
            }
            next(error);
        }
    }
}
