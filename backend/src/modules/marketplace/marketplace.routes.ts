/**
 * GEM Z — Gym Equipment Marketplace Routes
 *
 * Routes:
 *   POST /api/v1/marketplace/create          — Create listing
 *   GET  /api/v1/marketplace/listings        — Browse listings
 *   GET  /api/v1/marketplace/listings/:id    — Get listing
 *   PUT  /api/v1/marketplace/listings/:id    — Update listing
 *   DELETE /api/v1/marketplace/listings/:id  — Delete listing
 *   POST /api/v1/marketplace/:id/buy         — Buy listing
 *   GET  /api/v1/marketplace/orders/buyer    — Buyer orders
 *   GET  /api/v1/marketplace/orders/seller   — Seller orders
 *   GET  /api/v1/marketplace/my-listings     — My listings
 *   PUT  /api/v1/marketplace/orders/:id/status — Update order status
 */

import express from 'express';
import { verifyToken as authenticate } from '../../core/middlewares/auth.middleware';
import { MarketplaceController } from './marketplace.controller';

const router = express.Router();
const auth = authenticate as any;

router.post('/create', auth, MarketplaceController.createListing);
router.get('/listings', auth, MarketplaceController.listListings);
router.get('/my-listings', auth, MarketplaceController.getMyListings);
router.get('/listings/:id', auth, MarketplaceController.getListing);
router.put('/listings/:id', auth, MarketplaceController.updateListing);
router.delete('/listings/:id', auth, MarketplaceController.deleteListing);
router.post('/:id/buy', auth, MarketplaceController.buy);
router.get('/orders/buyer', auth, MarketplaceController.getBuyerOrders);
router.get('/orders/seller', auth, MarketplaceController.getSellerOrders);
router.put('/orders/:id/status', auth, MarketplaceController.updateOrderStatus);

export default router;
