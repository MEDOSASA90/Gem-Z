import express from 'express';
import { verifyToken as authenticate } from '../../core/middlewares/auth.middleware';
import { StoreController } from './store.controller';

const router = express.Router();

router.post('/products', authenticate as any, StoreController.addProduct as any);
router.get('/products', authenticate as any, StoreController.getProducts as any);
router.post('/checkout', authenticate as any, StoreController.checkoutCart as any);
router.post('/marketplace/item', authenticate as any, StoreController.listMarketplaceItem as any);
router.get('/marketplace/items', authenticate as any, StoreController.getMarketplaceItems as any);

export default router;
