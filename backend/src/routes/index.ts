import express from 'express';
import authRoutes from '../modules/auth/auth.routes';
import financialRoutes from '../modules/financial/financial.routes';
import walletRoutes from '../modules/wallet/wallet.routes';
import userRoutes from '../modules/user/user.routes';
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
import { uploadLimiter } from '../core/middlewares/rate-limit.middleware';
import { db } from '../core/database/db';

const authenticateRequest = authenticate;

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

// File type filter: only allow images and PDFs
const fileFilter = (req: any, file: any, cb: any) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
    if (allowed.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('File type not allowed. Only images and PDFs are accepted.'), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB max
});

const router = express.Router();

// ─── Core Modules ─────────────────────────────────────────────

router.use('/auth', authRoutes);
router.use('/user', userRoutes);
router.use('/finance', financialRoutes);      // ✅ Re-enabled financial routes
router.use('/wallet', walletRoutes);           // Unified ledger-based wallet system

// ─── Health Check ─────────────────────────────────────────────

router.get('/health', (req: any, res: any) => {
    res.status(200).json({
        status: 'OK',
        message: 'GEM Z API is running optimally.',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

router.get('/search', authenticateRequest, async (req: any, res: any) => {
    try {
        const query = String(req.query.query || '').trim();
        if (query.length < 2) {
            return res.status(200).json({ success: true, results: { users: [], products: [], gyms: [] } });
        }

        const pattern = `%${query}%`;
        const [gymsResult, usersResult, productsResult] = await Promise.all([
            db.query(`
                SELECT id, name as full_name, 'gym' as role, logo_url as avatar_url, rating
                FROM gyms
                WHERE status = 'approved' AND (name ILIKE $1 OR description ILIKE $1)
                ORDER BY rating DESC NULLS LAST, created_at DESC
                LIMIT 20
            `, [pattern]),
            db.query(`
                SELECT id, full_name, role, avatar_url, NULL::numeric as rating
                FROM users
                WHERE full_name ILIKE $1 AND status = 'active'
                ORDER BY created_at DESC
                LIMIT 20
            `, [pattern]),
            db.query(`
                SELECT p.id, p.name, p.price_egp as price, p.images, s.name as store_name
                FROM store_products p
                JOIN stores s ON p.store_id = s.id
                WHERE p.is_active = TRUE AND p.stock_qty > 0 AND p.name ILIKE $1
                ORDER BY p.created_at DESC
                LIMIT 20
            `, [pattern])
        ]);

        return res.status(200).json({
            success: true,
            results: {
                users: [...gymsResult.rows, ...usersResult.rows],
                products: productsResult.rows,
                gyms: gymsResult.rows
            }
        });
    } catch (error) {
        console.error('[Routes] search:', error);
        return res.status(500).json({ success: false, message: 'Search failed' });
    }
});

// ─── File Upload ──────────────────────────────────────────────

// API_URL from env — no more hardcoded localhost!
const API_URL = process.env.API_URL || 'http://localhost:5000';

router.post(
    '/upload',
    authenticateRequest,
    uploadLimiter,
    upload.single('image'),
    (req: any, res: any) => {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }
        const url = `${API_URL}/uploads/${req.file.filename}`;
        res.json({ success: true, url });
    }
);

router.post(
    '/upload/document',
    authenticateRequest,
    uploadLimiter,
    upload.single('document'),
    (req: any, res: any) => {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No document uploaded' });
        }
        const url = `${API_URL}/uploads/${req.file.filename}`;
        res.json({ success: true, url });
    }
);

// ─── Trainee Routes ───────────────────────────────────────────

router.get('/trainee/dashboard', authenticateRequest, TraineeController.getDashboardData);

// ─── Gym Routes ───────────────────────────────────────────────

import {
    getGymStats, buyDailyPass, scanDailyPass, scanGymBarcode, setOffPeakPricing, getTraineePasses,
    unlockSmartLocker, getLiveCrowdTracker, getEquipmentTutorial
} from '../modules/gym/gym.controller';

router.get('/gym/stats',              authenticateRequest, getGymStats);
router.post('/gym/passes/buy',        authenticateRequest, buyDailyPass);
router.post('/gym/passes/scan',       authenticateRequest, scanDailyPass);
router.post('/gym/scan',              authenticateRequest, scanGymBarcode);
router.post('/gym/off-peak',          authenticateRequest, setOffPeakPricing);
router.get('/trainee/passes',         authenticateRequest, getTraineePasses);
router.post('/gym/lockers/unlock',    authenticateRequest, unlockSmartLocker);
router.get('/gym/crowd',              authenticateRequest, getLiveCrowdTracker);
router.get('/gym/equipment/:qrCode',  authenticateRequest, getEquipmentTutorial);

// IoT Turnstile Access (no auth — device authenticates via its own token)
router.post('/gym/turnstile/verify', TurnstileController.verifyAccess);

// ─── Coins Routes ─────────────────────────────────────────────

router.post('/coins/earn',   authenticateRequest, CoinsController.earnCoins);
router.post('/coins/redeem', authenticateRequest, CoinsController.redeemReward);
router.post('/coins/stake',  authenticateRequest, CoinsController.stakeCoinsForGoal);

// ─── Challenges Routes ────────────────────────────────────────

router.get('/challenges',                     authenticateRequest, ChallengeController.listChallenges);
router.post('/challenges/:id/join',           authenticateRequest, ChallengeController.joinChallenge);
router.post('/challenges/live-squad',         authenticateRequest, ChallengeController.createLiveSquadChallenge);
router.post('/challenges/track-habit',        authenticateRequest, ChallengeController.trackUserHabit);
router.get('/challenges/corporate',           authenticateRequest, ChallengeController.getCorporateLeaderboard);

// ─── Store Routes ─────────────────────────────────────────────

router.post('/store/products',              authenticateRequest, StoreController.addProduct);
router.get('/store/products',               authenticateRequest, StoreController.getProducts);
router.get('/store/products/:id',           authenticateRequest, StoreController.getProductById);
router.post('/store/checkout',              authenticateRequest, StoreController.checkoutCart);
router.post('/store/marketplace/item',      authenticateRequest, StoreController.listMarketplaceItem);
router.get('/store/marketplace/items',      authenticateRequest, StoreController.getMarketplaceItems);
router.post('/store/templates',             authenticateRequest, StoreController.listWorkoutTemplate);
router.post('/store/nft/mint',              authenticateRequest, StoreController.mintFitnessNFT);

// ─── Social Routes ────────────────────────────────────────────

router.get('/social/feed',          authenticateRequest, SocialController.getFeed);
router.post('/social/posts',        authenticateRequest, SocialController.createPost);
router.get('/social/buddy-match',   authenticateRequest, SocialController.findWorkoutBuddy);

// ─── Recipe Routes ────────────────────────────────────────────

router.get('/recipes',                    authenticateRequest, RecipeController.listRecipes);
router.post('/recipes/:id/toggle-save',   authenticateRequest, RecipeController.toggleSave);
router.get('/recipes/grocery-list',       authenticateRequest, RecipeController.generateGroceryList);
router.post('/recipes/live-stream',       authenticateRequest, RecipeController.startLiveCookAlong);

// ─── Trainer Routes ───────────────────────────────────────────

import { getTrainerStats, getTrainerRevenue, getTrainerClients, assignPlanToClient, getChurnPrediction } from '../modules/trainer/trainer.controller';
router.get('/trainer/stats',              authenticateRequest, getTrainerStats);
router.get('/trainer/revenue',            authenticateRequest, getTrainerRevenue);
router.get('/trainer/clients',            authenticateRequest, getTrainerClients);
router.post('/trainer/assign',            authenticateRequest, assignPlanToClient);
router.get('/trainer/churn-prediction',   authenticateRequest, getChurnPrediction);

// ─── Trainer Bidding System ───────────────────────────────────

router.post('/bidding/requests',              authenticateRequest, BiddingController.createRequest);
router.get('/bidding/requests',               authenticateRequest, BiddingController.getOpenRequests);
router.post('/bidding/requests/:id/bid',      authenticateRequest, BiddingController.submitBid);
router.post('/bidding/bid/:bidId/accept',     authenticateRequest, BiddingController.acceptBid);

// ─── Squads / Guilds ──────────────────────────────────────────

router.post('/squads',          authenticateRequest, SquadController.createSquad);
router.get('/squads',           authenticateRequest, SquadController.listSquads);
router.post('/squads/:id/join', authenticateRequest, SquadController.joinSquad);

// ─── Payment Webhooks ─────────────────────────────────────────
// ⚠️  DISABLED until official payment gateway registration is complete
// router.post('/payment/webhook/fawry',  webhookLimiter, PaymentWebhookController.fawryWebhook);
// router.post('/payment/webhook/paymob', webhookLimiter, PaymentWebhookController.paymobWebhook);

// ─── AI Generator Routes ──────────────────────────────────────

import aiRoutes from '../modules/ai/ai.routes';
router.use('/ai', aiRoutes);

// ─── Real-Time Chat Routes ────────────────────────────────────

import chatRoutes from '../modules/chat/chat.routes';
router.use('/chat', chatRoutes);

// ─── Wearable & Notification Integrations ────────────────────

import { IntegrationController } from '../modules/trainee/integration.controller';
router.post('/integrations/wearables/sync',          authenticateRequest, IntegrationController.syncWearableData);
router.post('/integrations/notifications/trigger',   authenticateRequest, IntegrationController.triggerPushNotification);

export default router;
