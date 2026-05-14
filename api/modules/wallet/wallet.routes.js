"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const wallet_controller_1 = require("./wallet.controller");
const auth_middleware_1 = require("../../core/middlewares/auth.middleware");
const idempotency_middleware_1 = require("../../core/middlewares/idempotency.middleware");
const rate_limit_middleware_1 = require("../../core/middlewares/rate-limit.middleware");
const router = express_1.default.Router();
// Alias for type casting (Express middleware compatibility)
const auth = auth_middleware_1.verifyToken;
// ═══════════════════════════════════════════════════════════
// USER WALLET ENDPOINTS
// ═══════════════════════════════════════════════════════════
// Wallet balance & summary
router.get('/', auth, rate_limit_middleware_1.walletReadLimiter, wallet_controller_1.WalletController.getWallet);
// Ledger history (paginated)
router.get('/history', auth, rate_limit_middleware_1.walletReadLimiter, wallet_controller_1.WalletController.getHistory);
// Initiate top-up
router.post('/topup', auth, rate_limit_middleware_1.walletWriteLimiter, idempotency_middleware_1.idempotencyMiddleware, wallet_controller_1.WalletController.topUp);
// ═══════════════════════════════════════════════════════════
// PAYMENT ENDPOINTS (all require idempotency support)
// ═══════════════════════════════════════════════════════════
// Pay for gym/trainer subscription
router.post('/pay/subscription', auth, rate_limit_middleware_1.walletWriteLimiter, idempotency_middleware_1.idempotencyMiddleware, wallet_controller_1.WalletController.paySubscription);
// Pay for store order
router.post('/pay/order', auth, rate_limit_middleware_1.walletWriteLimiter, idempotency_middleware_1.idempotencyMiddleware, wallet_controller_1.WalletController.payOrder);
// P2P transfer (squad support)
router.post('/pay/p2p', auth, rate_limit_middleware_1.walletWriteLimiter, idempotency_middleware_1.idempotencyMiddleware, wallet_controller_1.WalletController.p2pTransfer);
// Redeem coins to wallet
router.post('/redeem-coins', auth, rate_limit_middleware_1.walletWriteLimiter, idempotency_middleware_1.idempotencyMiddleware, wallet_controller_1.WalletController.redeemCoins);
// ═══════════════════════════════════════════════════════════
// WITHDRAWAL ENDPOINTS
// ═══════════════════════════════════════════════════════════
// Request withdrawal
router.post('/withdraw', auth, rate_limit_middleware_1.withdrawalLimiter, wallet_controller_1.WalletController.requestWithdrawal);
// List own withdrawals
router.get('/withdrawals', auth, rate_limit_middleware_1.walletReadLimiter, wallet_controller_1.WalletController.listWithdrawals);
// Cancel pending withdrawal
router.put('/withdrawals/:id/cancel', auth, rate_limit_middleware_1.walletWriteLimiter, wallet_controller_1.WalletController.cancelWithdrawal);
// ═══════════════════════════════════════════════════════════
// WEBHOOK ENDPOINTS (no user auth — gateway signature verified internally)
// ═══════════════════════════════════════════════════════════
router.post('/webhooks/fawry', rate_limit_middleware_1.webhookLimiter, wallet_controller_1.WalletController.fawryWebhook);
router.post('/webhooks/paymob', rate_limit_middleware_1.webhookLimiter, wallet_controller_1.WalletController.paymobWebhook);
router.post('/webhooks/instapay', rate_limit_middleware_1.webhookLimiter, wallet_controller_1.WalletController.instapayWebhook);
// ═══════════════════════════════════════════════════════════
// ADMIN ENDPOINTS (require super_admin role)
// ═══════════════════════════════════════════════════════════
const role_middleware_1 = require("../../core/middlewares/role.middleware");
// Freeze wallet
router.post('/admin/:walletId/freeze', auth, (0, role_middleware_1.requireRole)(['super_admin']), rate_limit_middleware_1.walletWriteLimiter, wallet_controller_1.WalletController.freezeWallet);
// Unfreeze wallet
router.post('/admin/:walletId/unfreeze', auth, (0, role_middleware_1.requireRole)(['super_admin']), rate_limit_middleware_1.walletWriteLimiter, wallet_controller_1.WalletController.unfreezeWallet);
// Manual balance adjustment
router.post('/admin/:walletId/adjust', auth, (0, role_middleware_1.requireRole)(['super_admin']), rate_limit_middleware_1.walletWriteLimiter, idempotency_middleware_1.idempotencyMiddleware, wallet_controller_1.WalletController.adjustBalance);
// Withdrawal approval
router.put('/admin/withdrawals/:id/approve', auth, (0, role_middleware_1.requireRole)(['super_admin']), rate_limit_middleware_1.walletWriteLimiter, wallet_controller_1.WalletController.approveWithdrawal);
// Withdrawal rejection
router.put('/admin/withdrawals/:id/reject', auth, (0, role_middleware_1.requireRole)(['super_admin']), rate_limit_middleware_1.walletWriteLimiter, wallet_controller_1.WalletController.rejectWithdrawal);
// Reconciliation (daily report)
router.get('/admin/reconciliation/daily', auth, (0, role_middleware_1.requireRole)(['super_admin']), rate_limit_middleware_1.walletReadLimiter, wallet_controller_1.WalletController.getDailyReconciliation);
// Run reconciliation
router.post('/admin/reconciliation/run', auth, (0, role_middleware_1.requireRole)(['super_admin']), rate_limit_middleware_1.walletWriteLimiter, wallet_controller_1.WalletController.runReconciliation);
exports.default = router;
