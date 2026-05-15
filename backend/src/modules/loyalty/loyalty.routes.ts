/**
 * GEM Z — Loyalty Program Routes
 *
 * Routes:
 *   GET  /api/v1/loyalty/points      — Current points summary
 *   GET  /api/v1/loyalty/tiers       — All loyalty tiers
 *   GET  /api/v1/loyalty/tier-status — User's tier with progress
 *   GET  /api/v1/loyalty/rewards     — Redeemable rewards catalog
 *   POST /api/v1/loyalty/redeem      — Redeem a reward
 *   GET  /api/v1/loyalty/redemptions — Redemption history
 *   POST /api/v1/loyalty/award       — Award points (internal)
 */

import express from 'express';
import { verifyToken as authenticate } from '../../core/middlewares/auth.middleware';
import { LoyaltyController } from './loyalty.controller';

const router = express.Router();
const auth = authenticate as any;

router.get('/points', auth, LoyaltyController.getPoints);
router.get('/tiers', auth, LoyaltyController.getTiers);
router.get('/tier-status', auth, LoyaltyController.getTierStatus);
router.get('/rewards', auth, LoyaltyController.getRewards);
router.post('/redeem', auth, LoyaltyController.redeemReward);
router.get('/redemptions', auth, LoyaltyController.getRedemptionHistory);
router.post('/award', auth, LoyaltyController.awardPoints);

export default router;
