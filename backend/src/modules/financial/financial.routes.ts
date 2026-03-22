import express from 'express';
import { FinancialController } from './financial.controller';
import { verifyToken as authenticate } from '../../core/middlewares/auth.middleware';

const router = express.Router();

router.get('/wallet', authenticate as any, FinancialController.getWalletBalance as any);
router.post('/subscription', authenticate as any, FinancialController.purchaseGymSubscription as any);

export default router;
