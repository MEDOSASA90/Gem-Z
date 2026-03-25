import express from 'express';
import { FinancialController } from './financial.controller';
import { verifyToken as authenticate } from '../../core/middlewares/auth.middleware';

const router = express.Router();

router.get('/wallet', authenticate as any, FinancialController.getWalletBalance as any);
router.post('/payout', authenticate as any, FinancialController.requestPayout as any);

export default router;
