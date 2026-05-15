/**
 * GEM Z — Affiliate Program Routes
 *
 * Routes:
 *   POST /api/v1/affiliate/join              — Become an affiliate
 *   GET  /api/v1/affiliate/me                — Get affiliate info
 *   GET  /api/v1/affiliate/dashboard         — Dashboard stats
 *   GET  /api/v1/affiliate/payouts           — Payout history
 *   POST /api/v1/affiliate/payouts           — Request payout
 *   PUT  /api/v1/affiliate/payout-settings   — Update payout settings
 *   POST /api/v1/affiliate/track-click/:code — Track referral click (public)
 */

import express from 'express';
import { verifyToken as authenticate } from '../../core/middlewares/auth.middleware';
import { AffiliateController } from './affiliate.controller';

const router = express.Router();
const auth = authenticate as any;

router.post('/join', auth, AffiliateController.join);
router.get('/me', auth, AffiliateController.getMe);
router.get('/dashboard', auth, AffiliateController.getDashboard);
router.get('/payouts', auth, AffiliateController.getPayouts);
router.post('/payouts', auth, AffiliateController.requestPayout);
router.put('/payout-settings', auth, AffiliateController.updatePayoutSettings);
router.post('/track-click/:code', AffiliateController.trackClick);

export default router;
