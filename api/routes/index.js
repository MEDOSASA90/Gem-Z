"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_routes_1 = __importDefault(require("../modules/auth/auth.routes"));
const financial_routes_1 = __importDefault(require("../modules/financial/financial.routes"));
const wallet_routes_1 = __importDefault(require("../modules/wallet/wallet.routes"));
const user_routes_1 = __importDefault(require("../modules/user/user.routes"));
const trainee_controller_1 = require("../modules/trainee/trainee.controller");
const coins_controller_1 = require("../modules/coins/coins.controller");
const challenge_controller_1 = require("../modules/challenges/challenge.controller");
const store_controller_1 = require("../modules/store/store.controller");
const social_controller_1 = require("../modules/social/social.controller");
const recipe_controller_1 = require("../modules/recipes/recipe.controller");
const turnstile_controller_1 = require("../modules/gym/turnstile.controller");
const bidding_controller_1 = require("../modules/bidding/bidding.controller");
const squad_controller_1 = require("../modules/squads/squad.controller");
const auth_middleware_1 = require("../core/middlewares/auth.middleware");
const rate_limit_middleware_1 = require("../core/middlewares/rate-limit.middleware");
const db_1 = require("../core/database/db");
const authenticateRequest = auth_middleware_1.verifyToken;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path_1.default.join(__dirname, '../../../public/uploads'));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path_1.default.extname(file.originalname));
    }
});
// File type filter: only allow images and PDFs
const fileFilter = (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
    if (allowed.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        cb(new Error('File type not allowed. Only images and PDFs are accepted.'), false);
    }
};
const upload = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB max
});
const router = express_1.default.Router();
// ─── Core Modules ─────────────────────────────────────────────
router.use('/auth', auth_routes_1.default);
router.use('/user', user_routes_1.default);
router.use('/finance', financial_routes_1.default); // ✅ Re-enabled financial routes
router.use('/wallet', wallet_routes_1.default); // Unified ledger-based wallet system
// ─── Health Check ─────────────────────────────────────────────
router.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        message: 'GEM Z API is running optimally.',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});
router.get('/search', authenticateRequest, async (req, res) => {
    try {
        const query = String(req.query.query || '').trim();
        if (query.length < 2) {
            return res.status(200).json({ success: true, results: { users: [], products: [], gyms: [] } });
        }
        const pattern = `%${query}%`;
        const [gymsResult, usersResult, productsResult] = await Promise.all([
            db_1.db.query(`
                SELECT id, name as full_name, 'gym' as role, logo_url as avatar_url, rating
                FROM gyms
                WHERE status = 'approved' AND (name ILIKE $1 OR description ILIKE $1)
                ORDER BY rating DESC NULLS LAST, created_at DESC
                LIMIT 20
            `, [pattern]),
            db_1.db.query(`
                SELECT id, full_name, role, avatar_url, NULL::numeric as rating
                FROM users
                WHERE full_name ILIKE $1 AND status = 'active'
                ORDER BY created_at DESC
                LIMIT 20
            `, [pattern]),
            db_1.db.query(`
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
    }
    catch (error) {
        console.error('[Routes] search:', error);
        return res.status(500).json({ success: false, message: 'Search failed' });
    }
});
// ─── File Upload ──────────────────────────────────────────────
// API_URL from env — no more hardcoded localhost!
const API_URL = process.env.API_URL || 'http://localhost:5000';
router.post('/upload', authenticateRequest, rate_limit_middleware_1.uploadLimiter, upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    const url = `${API_URL}/uploads/${req.file.filename}`;
    res.json({ success: true, url });
});
router.post('/upload/document', authenticateRequest, rate_limit_middleware_1.uploadLimiter, upload.single('document'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No document uploaded' });
    }
    const url = `${API_URL}/uploads/${req.file.filename}`;
    res.json({ success: true, url });
});
// ─── Trainee Routes ───────────────────────────────────────────
router.get('/trainee/dashboard', authenticateRequest, trainee_controller_1.TraineeController.getDashboardData);
// ─── Gym Routes ───────────────────────────────────────────────
const gym_controller_1 = require("../modules/gym/gym.controller");
router.get('/gym/stats', authenticateRequest, gym_controller_1.getGymStats);
router.post('/gym/passes/buy', authenticateRequest, gym_controller_1.buyDailyPass);
router.post('/gym/passes/scan', authenticateRequest, gym_controller_1.scanDailyPass);
router.post('/gym/scan', authenticateRequest, gym_controller_1.scanGymBarcode);
router.post('/gym/off-peak', authenticateRequest, gym_controller_1.setOffPeakPricing);
router.get('/trainee/passes', authenticateRequest, gym_controller_1.getTraineePasses);
router.post('/gym/lockers/unlock', authenticateRequest, gym_controller_1.unlockSmartLocker);
router.get('/gym/crowd', authenticateRequest, gym_controller_1.getLiveCrowdTracker);
router.get('/gym/equipment/:qrCode', authenticateRequest, gym_controller_1.getEquipmentTutorial);
// IoT Turnstile Access (no auth — device authenticates via its own token)
router.post('/gym/turnstile/verify', turnstile_controller_1.TurnstileController.verifyAccess);
// ─── Coins Routes ─────────────────────────────────────────────
router.post('/coins/earn', authenticateRequest, coins_controller_1.CoinsController.earnCoins);
router.post('/coins/redeem', authenticateRequest, coins_controller_1.CoinsController.redeemReward);
router.post('/coins/stake', authenticateRequest, coins_controller_1.CoinsController.stakeCoinsForGoal);
// ─── Challenges Routes ────────────────────────────────────────
router.get('/challenges', authenticateRequest, challenge_controller_1.ChallengeController.listChallenges);
router.post('/challenges/:id/join', authenticateRequest, challenge_controller_1.ChallengeController.joinChallenge);
router.post('/challenges/live-squad', authenticateRequest, challenge_controller_1.ChallengeController.createLiveSquadChallenge);
router.post('/challenges/track-habit', authenticateRequest, challenge_controller_1.ChallengeController.trackUserHabit);
router.get('/challenges/corporate', authenticateRequest, challenge_controller_1.ChallengeController.getCorporateLeaderboard);
// ─── Store Routes ─────────────────────────────────────────────
router.post('/store/products', authenticateRequest, store_controller_1.StoreController.addProduct);
router.get('/store/products', authenticateRequest, store_controller_1.StoreController.getProducts);
router.get('/store/products/:id', authenticateRequest, store_controller_1.StoreController.getProductById);
router.post('/store/checkout', authenticateRequest, store_controller_1.StoreController.checkoutCart);
router.post('/store/marketplace/item', authenticateRequest, store_controller_1.StoreController.listMarketplaceItem);
router.get('/store/marketplace/items', authenticateRequest, store_controller_1.StoreController.getMarketplaceItems);
router.post('/store/templates', authenticateRequest, store_controller_1.StoreController.listWorkoutTemplate);
router.post('/store/nft/mint', authenticateRequest, store_controller_1.StoreController.mintFitnessNFT);
// ─── Social Routes ────────────────────────────────────────────
router.get('/social/feed', authenticateRequest, social_controller_1.SocialController.getFeed);
router.post('/social/posts', authenticateRequest, social_controller_1.SocialController.createPost);
router.get('/social/buddy-match', authenticateRequest, social_controller_1.SocialController.findWorkoutBuddy);
// ─── Recipe Routes ────────────────────────────────────────────
router.get('/recipes', authenticateRequest, recipe_controller_1.RecipeController.listRecipes);
router.post('/recipes/:id/toggle-save', authenticateRequest, recipe_controller_1.RecipeController.toggleSave);
router.get('/recipes/grocery-list', authenticateRequest, recipe_controller_1.RecipeController.generateGroceryList);
router.post('/recipes/live-stream', authenticateRequest, recipe_controller_1.RecipeController.startLiveCookAlong);
// ─── Trainer Routes ───────────────────────────────────────────
const trainer_controller_1 = require("../modules/trainer/trainer.controller");
router.get('/trainer/stats', authenticateRequest, trainer_controller_1.getTrainerStats);
router.get('/trainer/revenue', authenticateRequest, trainer_controller_1.getTrainerRevenue);
router.get('/trainer/clients', authenticateRequest, trainer_controller_1.getTrainerClients);
router.post('/trainer/assign', authenticateRequest, trainer_controller_1.assignPlanToClient);
router.get('/trainer/churn-prediction', authenticateRequest, trainer_controller_1.getChurnPrediction);
// ─── Trainer Bidding System ───────────────────────────────────
router.post('/bidding/requests', authenticateRequest, bidding_controller_1.BiddingController.createRequest);
router.get('/bidding/requests', authenticateRequest, bidding_controller_1.BiddingController.getOpenRequests);
router.post('/bidding/requests/:id/bid', authenticateRequest, bidding_controller_1.BiddingController.submitBid);
router.post('/bidding/bid/:bidId/accept', authenticateRequest, bidding_controller_1.BiddingController.acceptBid);
// ─── Squads / Guilds ──────────────────────────────────────────
router.post('/squads', authenticateRequest, squad_controller_1.SquadController.createSquad);
router.get('/squads', authenticateRequest, squad_controller_1.SquadController.listSquads);
router.post('/squads/:id/join', authenticateRequest, squad_controller_1.SquadController.joinSquad);
// ─── Payment Webhooks ─────────────────────────────────────────
// ⚠️  DISABLED until official payment gateway registration is complete
// router.post('/payment/webhook/fawry',  webhookLimiter, PaymentWebhookController.fawryWebhook);
// router.post('/payment/webhook/paymob', webhookLimiter, PaymentWebhookController.paymobWebhook);
// ─── AI Generator Routes ──────────────────────────────────────
const ai_routes_1 = __importDefault(require("../modules/ai/ai.routes"));
router.use('/ai', ai_routes_1.default);
// ─── Real-Time Chat Routes ────────────────────────────────────
const chat_routes_1 = __importDefault(require("../modules/chat/chat.routes"));
router.use('/chat', chat_routes_1.default);
// ─── Wearable & Notification Integrations ────────────────────
const integration_controller_1 = require("../modules/trainee/integration.controller");
router.post('/integrations/wearables/sync', authenticateRequest, integration_controller_1.IntegrationController.syncWearableData);
router.post('/integrations/notifications/trigger', authenticateRequest, integration_controller_1.IntegrationController.triggerPushNotification);
exports.default = router;
