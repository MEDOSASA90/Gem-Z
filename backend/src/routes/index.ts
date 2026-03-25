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

import multer from 'multer';
import path from 'path';

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../../../public/uploads'));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

const router = express.Router();

// Existing Modules
router.use('/auth', authRoutes);
router.use('/finance', financialRoutes);

// Health Check
router.get('/health', (req: any, res: any) => {
    res.status(200).json({ status: 'OK', message: 'GEM Z API is running optimally.' });
});

// File Upload
router.post('/upload', upload.single('image'), (req: any, res: any) => {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const url = `http://localhost:5000/uploads/${req.file.filename}`;
    res.json({ success: true, url });
});

// Trainee Routes
router.get('/trainee/dashboard', authenticateRequest, TraineeController.getDashboardData);

// Gym Routes
import { getGymStats, buyDailyPass, scanDailyPass, getTraineePasses, unlockSmartLocker, getLiveCrowdTracker, getEquipmentTutorial } from '../modules/gym/gym.controller';
router.get('/gym/stats', authenticateRequest, getGymStats);
router.post('/gym/passes/buy', authenticateRequest, buyDailyPass);
router.post('/gym/passes/scan', authenticateRequest, scanDailyPass);
router.get('/trainee/passes', authenticateRequest, getTraineePasses);
router.post('/gym/lockers/unlock', authenticateRequest, unlockSmartLocker);
router.get('/gym/crowd', authenticateRequest, getLiveCrowdTracker);
router.get('/gym/equipment/:qrCode', authenticateRequest, getEquipmentTutorial);
// IoT Turnstile Access
router.post('/gym/turnstile/verify', TurnstileController.verifyAccess);

// Coins Routes
router.post('/coins/earn', authenticateRequest, CoinsController.earnCoins);
router.post('/coins/redeem', authenticateRequest, CoinsController.redeemReward);
router.post('/coins/stake', authenticateRequest, CoinsController.stakeCoinsForGoal);

// Challenges Routes
router.get('/challenges', authenticateRequest, ChallengeController.listChallenges);
router.post('/challenges/:id/join', authenticateRequest, ChallengeController.joinChallenge);
router.post('/challenges/live-squad', authenticateRequest, ChallengeController.createLiveSquadChallenge);
router.post('/challenges/track-habit', authenticateRequest, ChallengeController.trackUserHabit);
router.get('/challenges/corporate', authenticateRequest, ChallengeController.getCorporateLeaderboard);

// Store Routes
router.post('/store/products', authenticateRequest, StoreController.addProduct);
router.get('/store/products', authenticateRequest, StoreController.getProducts);
router.post('/store/checkout', authenticateRequest, StoreController.checkoutCart);
router.post('/store/marketplace/item', authenticateRequest, StoreController.listMarketplaceItem);
router.get('/store/marketplace/items', authenticateRequest, StoreController.getMarketplaceItems);
router.post('/store/templates', authenticateRequest, StoreController.listWorkoutTemplate);
router.post('/store/nft/mint', authenticateRequest, StoreController.mintFitnessNFT);

// Social Routes
router.get('/social/feed', authenticateRequest, SocialController.getFeed);
router.post('/social/posts', authenticateRequest, SocialController.createPost);
router.get('/social/buddy-match', authenticateRequest, SocialController.findWorkoutBuddy);

// Recipe Routes
router.get('/recipes', authenticateRequest, RecipeController.listRecipes);
router.post('/recipes/:id/toggle-save', authenticateRequest, RecipeController.toggleSave);
router.get('/recipes/grocery-list', authenticateRequest, RecipeController.generateGroceryList);
router.post('/recipes/live-stream', authenticateRequest, RecipeController.startLiveCookAlong);

// Trainer Routes
import { getTrainerStats, assignPlanToClient, getChurnPrediction } from '../modules/trainer/trainer.controller';
router.get('/trainer/stats', authenticateRequest, getTrainerStats);
router.post('/trainer/assign', authenticateRequest, assignPlanToClient);
router.get('/trainer/churn-prediction', authenticateRequest, getChurnPrediction);

// Trainer Bidding System
router.post('/bidding/requests', authenticateRequest, BiddingController.createRequest);
router.get('/bidding/requests', authenticateRequest, BiddingController.getOpenRequests);
router.post('/bidding/requests/:id/bid', authenticateRequest, BiddingController.submitBid);
router.post('/bidding/bid/:bidId/accept', authenticateRequest, BiddingController.acceptBid);

// Squads / Guilds
router.post('/squads', authenticateRequest, SquadController.createSquad);
router.get('/squads', authenticateRequest, SquadController.listSquads);
router.post('/squads/:id/join', authenticateRequest, SquadController.joinSquad);

// Payment Webhooks
router.post('/payment/webhook/fawry', PaymentWebhookController.fawryWebhook);
router.post('/payment/webhook/paymob', PaymentWebhookController.paymobWebhook);

// AI Generator Routes
import aiRoutes from '../modules/ai/ai.routes';
router.use('/ai', aiRoutes);

// Real-Time Chat Routes
import chatRoutes from '../modules/chat/chat.routes';
router.use('/chat', chatRoutes);

// Integrations
import { IntegrationController } from '../modules/trainee/integration.controller';
router.post('/integrations/wearables/sync', authenticateRequest, IntegrationController.syncWearableData);
router.post('/integrations/notifications/trigger', authenticateRequest, IntegrationController.triggerPushNotification);

export default router;
