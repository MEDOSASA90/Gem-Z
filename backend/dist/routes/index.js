"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_routes_1 = __importDefault(require("../modules/auth/auth.routes"));
const financial_routes_1 = __importDefault(require("../modules/financial/financial.routes"));
const trainee_controller_1 = require("../modules/trainee/trainee.controller");
const coins_controller_1 = require("../modules/coins/coins.controller");
const challenge_controller_1 = require("../modules/challenges/challenge.controller");
const store_controller_1 = require("../modules/store/store.controller");
const social_controller_1 = require("../modules/social/social.controller");
const recipe_controller_1 = require("../modules/recipes/recipe.controller");
const payment_controller_1 = require("../modules/payment/payment.controller");
const turnstile_controller_1 = require("../modules/gym/turnstile.controller");
const bidding_controller_1 = require("../modules/bidding/bidding.controller");
const squad_controller_1 = require("../modules/squads/squad.controller");
const auth_middleware_1 = require("../core/middlewares/auth.middleware");
const authenticateRequest = auth_middleware_1.verifyToken; // Alias for consistency
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
const upload = (0, multer_1.default)({ storage });
const router = express_1.default.Router();
// Existing Modules
router.use('/auth', auth_routes_1.default);
router.use('/finance', financial_routes_1.default);
// Health Check
router.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'GEM Z API is running optimally.' });
});
// File Upload
router.post('/upload', upload.single('image'), (req, res) => {
    if (!req.file)
        return res.status(400).json({ success: false, message: 'No file uploaded' });
    const url = `http://localhost:5000/uploads/${req.file.filename}`;
    res.json({ success: true, url });
});
// Trainee Routes
router.get('/trainee/dashboard', authenticateRequest, trainee_controller_1.TraineeController.getDashboardData);
// Gym Routes
const gym_controller_1 = require("../modules/gym/gym.controller");
router.get('/gym/stats', authenticateRequest, gym_controller_1.getGymStats);
router.post('/gym/passes/buy', authenticateRequest, gym_controller_1.buyDailyPass);
router.post('/gym/passes/scan', authenticateRequest, gym_controller_1.scanDailyPass);
router.get('/trainee/passes', authenticateRequest, gym_controller_1.getTraineePasses);
router.post('/gym/lockers/unlock', authenticateRequest, gym_controller_1.unlockSmartLocker);
router.get('/gym/crowd', authenticateRequest, gym_controller_1.getLiveCrowdTracker);
router.get('/gym/equipment/:qrCode', authenticateRequest, gym_controller_1.getEquipmentTutorial);
// IoT Turnstile Access
router.post('/gym/turnstile/verify', turnstile_controller_1.TurnstileController.verifyAccess);
// Coins Routes
router.post('/coins/earn', authenticateRequest, coins_controller_1.CoinsController.earnCoins);
router.post('/coins/redeem', authenticateRequest, coins_controller_1.CoinsController.redeemReward);
router.post('/coins/stake', authenticateRequest, coins_controller_1.CoinsController.stakeCoinsForGoal);
// Challenges Routes
router.get('/challenges', authenticateRequest, challenge_controller_1.ChallengeController.listChallenges);
router.post('/challenges/:id/join', authenticateRequest, challenge_controller_1.ChallengeController.joinChallenge);
router.post('/challenges/live-squad', authenticateRequest, challenge_controller_1.ChallengeController.createLiveSquadChallenge);
router.post('/challenges/track-habit', authenticateRequest, challenge_controller_1.ChallengeController.trackUserHabit);
router.get('/challenges/corporate', authenticateRequest, challenge_controller_1.ChallengeController.getCorporateLeaderboard);
// Store Routes
router.post('/store/products', authenticateRequest, store_controller_1.StoreController.addProduct);
router.get('/store/products', authenticateRequest, store_controller_1.StoreController.getProducts);
router.post('/store/checkout', authenticateRequest, store_controller_1.StoreController.checkoutCart);
router.post('/store/marketplace/item', authenticateRequest, store_controller_1.StoreController.listMarketplaceItem);
router.get('/store/marketplace/items', authenticateRequest, store_controller_1.StoreController.getMarketplaceItems);
router.post('/store/templates', authenticateRequest, store_controller_1.StoreController.listWorkoutTemplate);
router.post('/store/nft/mint', authenticateRequest, store_controller_1.StoreController.mintFitnessNFT);
// Social Routes
router.get('/social/feed', authenticateRequest, social_controller_1.SocialController.getFeed);
router.post('/social/posts', authenticateRequest, social_controller_1.SocialController.createPost);
router.get('/social/buddy-match', authenticateRequest, social_controller_1.SocialController.findWorkoutBuddy);
// Recipe Routes
router.get('/recipes', authenticateRequest, recipe_controller_1.RecipeController.listRecipes);
router.post('/recipes/:id/toggle-save', authenticateRequest, recipe_controller_1.RecipeController.toggleSave);
router.get('/recipes/grocery-list', authenticateRequest, recipe_controller_1.RecipeController.generateGroceryList);
router.post('/recipes/live-stream', authenticateRequest, recipe_controller_1.RecipeController.startLiveCookAlong);
// Trainer Routes
const trainer_controller_1 = require("../modules/trainer/trainer.controller");
router.get('/trainer/stats', authenticateRequest, trainer_controller_1.getTrainerStats);
router.post('/trainer/assign', authenticateRequest, trainer_controller_1.assignPlanToClient);
router.get('/trainer/churn-prediction', authenticateRequest, trainer_controller_1.getChurnPrediction);
// Trainer Bidding System
router.post('/bidding/requests', authenticateRequest, bidding_controller_1.BiddingController.createRequest);
router.get('/bidding/requests', authenticateRequest, bidding_controller_1.BiddingController.getOpenRequests);
router.post('/bidding/requests/:id/bid', authenticateRequest, bidding_controller_1.BiddingController.submitBid);
router.post('/bidding/bid/:bidId/accept', authenticateRequest, bidding_controller_1.BiddingController.acceptBid);
// Squads / Guilds
router.post('/squads', authenticateRequest, squad_controller_1.SquadController.createSquad);
router.get('/squads', authenticateRequest, squad_controller_1.SquadController.listSquads);
router.post('/squads/:id/join', authenticateRequest, squad_controller_1.SquadController.joinSquad);
// Payment Webhooks
router.post('/payment/webhook/fawry', payment_controller_1.PaymentWebhookController.fawryWebhook);
router.post('/payment/webhook/paymob', payment_controller_1.PaymentWebhookController.paymobWebhook);
// AI Generator Routes
const ai_routes_1 = __importDefault(require("../modules/ai/ai.routes"));
router.use('/ai', ai_routes_1.default);
// Real-Time Chat Routes
const chat_routes_1 = __importDefault(require("../modules/chat/chat.routes"));
router.use('/chat', chat_routes_1.default);
// Integrations
const integration_controller_1 = require("../modules/trainee/integration.controller");
router.post('/integrations/wearables/sync', authenticateRequest, integration_controller_1.IntegrationController.syncWearableData);
router.post('/integrations/notifications/trigger', authenticateRequest, integration_controller_1.IntegrationController.triggerPushNotification);
exports.default = router;
