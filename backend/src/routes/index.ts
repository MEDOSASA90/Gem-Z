import express from 'express';
import authRoutes from '../modules/auth/auth.routes';
import financialRoutes from '../modules/financial/financial.routes';
import { TraineeController } from '../modules/trainee/trainee.controller';
import { CoinsController } from '../modules/coins/coins.controller';
import { ChallengeController } from '../modules/challenges/challenge.controller';
import { StoreController } from '../modules/store/store.controller';
import { SocialController } from '../modules/social/social.controller';
import { RecipeController } from '../modules/recipes/recipe.controller';
import { PaymentWebhookController } from '../modules/payment/payment.controller';
import { TurnstileController } from '../modules/gym/turnstile.controller';
import { BiddingController } from '../modules/bidding/bidding.controller';
import { SquadController } from '../modules/squads/squad.controller';
import { verifyToken as authenticate } from '../core/middlewares/auth.middleware';

const authenticateRequest = authenticate; // Alias for consistency

const router = express.Router();

// Existing Modules
router.use('/auth', authRoutes);
router.use('/finance', financialRoutes);

// Health Check
router.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'GEM Z API is running optimally.' });
});

// Trainee Routes
router.get('/trainee/dashboard', authenticateRequest, TraineeController.getDashboardData);

// IoT Turnstile Access
router.post('/gym/turnstile/verify', TurnstileController.verifyAccess);

// Coins Routes
router.post('/coins/earn', authenticateRequest, CoinsController.earnCoins);
router.post('/coins/redeem', authenticateRequest, CoinsController.redeemReward);

// Challenges Routes
router.get('/challenges', authenticateRequest, ChallengeController.listChallenges);
router.post('/challenges/:id/join', authenticateRequest, ChallengeController.joinChallenge);

// Store Routes
router.get('/store/products', authenticateRequest, StoreController.getProducts);
router.post('/store/checkout', authenticateRequest, StoreController.checkoutCart);

// Social Routes
router.get('/social/feed', authenticateRequest, SocialController.getFeed);
router.post('/social/posts', authenticateRequest, SocialController.createPost);

// Recipe Routes
router.get('/recipes', authenticateRequest, RecipeController.listRecipes);
router.post('/recipes/:id/toggle-save', authenticateRequest, RecipeController.toggleSave);

// Trainer Bidding System
router.post('/bidding/requests', authenticateRequest, BiddingController.createRequest);
router.get('/bidding/requests', authenticateRequest, BiddingController.getOpenRequests);
router.post('/bidding/requests/:id/bid', authenticateRequest, BiddingController.submitBid);

// Squads / Guilds
router.post('/squads', authenticateRequest, SquadController.createSquad);
router.get('/squads', authenticateRequest, SquadController.listSquads);
router.post('/squads/:id/join', authenticateRequest, SquadController.joinSquad);

// Payment Webhooks
router.post('/payment/webhook/fawry', PaymentWebhookController.fawryWebhook);
router.post('/payment/webhook/paymob', PaymentWebhookController.paymobWebhook);

export default router;
