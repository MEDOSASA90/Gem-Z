import express from 'express';
import { verifyToken as authenticate } from '../../core/middlewares/auth.middleware';
import { BiddingController } from './bidding.controller';

const router = express.Router();

router.post('/request', authenticate as any, BiddingController.createRequest as any);
router.get('/requests', authenticate as any, BiddingController.getOpenRequests as any);
router.post('/request/:id/bid', authenticate as any, BiddingController.submitBid as any);
router.post('/bid/:bidId/accept', authenticate as any, BiddingController.acceptBid as any);

export default router;
