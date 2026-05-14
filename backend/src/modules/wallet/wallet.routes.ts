import express from 'express';
import { WalletController } from './wallet.controller';
import { verifyToken as authenticate } from '../../core/middlewares/auth.middleware';
import { idempotencyMiddleware } from '../../core/middlewares/idempotency.middleware';
import {
    walletReadLimiter, walletWriteLimiter,
    withdrawalLimiter, webhookLimiter
} from '../../core/middlewares/rate-limit.middleware';

const router = express.Router();

// Alias for type casting (Express middleware compatibility)
const auth = authenticate as any;

// ═══════════════════════════════════════════════════════════
// USER WALLET ENDPOINTS
// ═══════════════════════════════════════════════════════════

// Wallet balance & summary
router.get('/',
    auth, walletReadLimiter,
    WalletController.getWallet as any
);

// Ledger history (paginated)
router.get('/history',
    auth, walletReadLimiter,
    WalletController.getHistory as any
);

// Initiate top-up
router.post('/topup',
    auth, walletWriteLimiter, idempotencyMiddleware,
    WalletController.topUp as any
);

// ═══════════════════════════════════════════════════════════
// PAYMENT ENDPOINTS (all require idempotency support)
// ═══════════════════════════════════════════════════════════

// Pay for gym/trainer subscription
router.post('/pay/subscription',
    auth, walletWriteLimiter, idempotencyMiddleware,
    WalletController.paySubscription as any
);

// Pay for store order
router.post('/pay/order',
    auth, walletWriteLimiter, idempotencyMiddleware,
    WalletController.payOrder as any
);

// P2P transfer (squad support)
router.post('/pay/p2p',
    auth, walletWriteLimiter, idempotencyMiddleware,
    WalletController.p2pTransfer as any
);

// Redeem coins to wallet
router.post('/redeem-coins',
    auth, walletWriteLimiter, idempotencyMiddleware,
    WalletController.redeemCoins as any
);

// ═══════════════════════════════════════════════════════════
// WITHDRAWAL ENDPOINTS
// ═══════════════════════════════════════════════════════════

// Request withdrawal
router.post('/withdraw',
    auth, withdrawalLimiter,
    WalletController.requestWithdrawal as any
);

// List own withdrawals
router.get('/withdrawals',
    auth, walletReadLimiter,
    WalletController.listWithdrawals as any
);

// Cancel pending withdrawal
router.put('/withdrawals/:id/cancel',
    auth, walletWriteLimiter,
    WalletController.cancelWithdrawal as any
);

// ═══════════════════════════════════════════════════════════
// WEBHOOK ENDPOINTS (no user auth — gateway signature verified internally)
// ═══════════════════════════════════════════════════════════

router.post('/webhooks/fawry',
    webhookLimiter,
    WalletController.fawryWebhook as any
);

router.post('/webhooks/paymob',
    webhookLimiter,
    WalletController.paymobWebhook as any
);

router.post('/webhooks/instapay',
    webhookLimiter,
    WalletController.instapayWebhook as any
);

// ═══════════════════════════════════════════════════════════
// ADMIN ENDPOINTS (require super_admin role)
// ═══════════════════════════════════════════════════════════

import { requireRole } from '../../core/middlewares/role.middleware';

// Freeze wallet
router.post('/admin/:walletId/freeze',
    auth,
    requireRole(['super_admin']),
    walletWriteLimiter,
    WalletController.freezeWallet as any
);

// Unfreeze wallet
router.post('/admin/:walletId/unfreeze',
    auth,
    requireRole(['super_admin']),
    walletWriteLimiter,
    WalletController.unfreezeWallet as any
);

// Manual balance adjustment
router.post('/admin/:walletId/adjust',
    auth,
    requireRole(['super_admin']),
    walletWriteLimiter,
    idempotencyMiddleware,
    WalletController.adjustBalance as any
);

// Withdrawal approval
router.put('/admin/withdrawals/:id/approve',
    auth,
    requireRole(['super_admin']),
    walletWriteLimiter,
    WalletController.approveWithdrawal as any
);

// Withdrawal rejection
router.put('/admin/withdrawals/:id/reject',
    auth,
    requireRole(['super_admin']),
    walletWriteLimiter,
    WalletController.rejectWithdrawal as any
);

// Reconciliation (daily report)
router.get('/admin/reconciliation/daily',
    auth,
    requireRole(['super_admin']),
    walletReadLimiter,
    WalletController.getDailyReconciliation as any
);

// Run reconciliation
router.post('/admin/reconciliation/run',
    auth,
    requireRole(['super_admin']),
    walletWriteLimiter,
    WalletController.runReconciliation as any
);

export default router;
