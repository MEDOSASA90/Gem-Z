"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
// import authRoutes from '../modules/auth/auth.routes';
// import financialRoutes from '../modules/financial/financial.routes';
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
const router = express_1.default.Router();
// Existing Modules (Assuming they have separate router files in a real app)
// router.use('/auth', authRoutes);
// router.use('/finance', financialRoutes);
// Health Check
router.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'GEM Z API is running optimally.' });
});
// Trainee Routes
router.get('/trainee/dashboard', authenticateRequest, trainee_controller_1.TraineeController.getDashboardData);
// IoT Turnstile Access
router.post('/gym/turnstile/verify', turnstile_controller_1.TurnstileController.verifyAccess);
// Coins Routes
router.post('/coins/earn', authenticateRequest, coins_controller_1.CoinsController.earnCoins);
router.post('/coins/redeem', authenticateRequest, coins_controller_1.CoinsController.redeemReward);
// Challenges Routes
router.get('/challenges', authenticateRequest, challenge_controller_1.ChallengeController.listChallenges);
router.post('/challenges/:id/join', authenticateRequest, challenge_controller_1.ChallengeController.joinChallenge);
// Store Routes
router.get('/store/products', authenticateRequest, store_controller_1.StoreController.getProducts);
router.post('/store/checkout', authenticateRequest, store_controller_1.StoreController.checkoutCart);
// Social Routes
router.get('/social/feed', authenticateRequest, social_controller_1.SocialController.getFeed);
router.post('/social/posts', authenticateRequest, social_controller_1.SocialController.createPost);
// Recipe Routes
router.get('/recipes', authenticateRequest, recipe_controller_1.RecipeController.listRecipes);
router.post('/recipes/:id/toggle-save', authenticateRequest, recipe_controller_1.RecipeController.toggleSave);
// Trainer Bidding System
router.post('/bidding/requests', authenticateRequest, bidding_controller_1.BiddingController.createRequest);
router.get('/bidding/requests', authenticateRequest, bidding_controller_1.BiddingController.getOpenRequests);
router.post('/bidding/requests/:id/bid', authenticateRequest, bidding_controller_1.BiddingController.submitBid);
// Squads / Guilds
router.post('/squads', authenticateRequest, squad_controller_1.SquadController.createSquad);
router.get('/squads', authenticateRequest, squad_controller_1.SquadController.listSquads);
router.post('/squads/:id/join', authenticateRequest, squad_controller_1.SquadController.joinSquad);
// Payment Webhooks
router.post('/payment/webhook/fawry', payment_controller_1.PaymentWebhookController.fawryWebhook);
router.post('/payment/webhook/paymob', payment_controller_1.PaymentWebhookController.paymobWebhook);
exports.default = router;
