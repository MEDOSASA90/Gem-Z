import { Response } from 'express';
import { AuthRequest } from '../../core/middlewares/auth.middleware';
import { db } from '../../core/database/db';
import { WalletService } from './wallet.service';
import { TransactionService } from './transaction.service';
import { WithdrawalService } from './withdrawal.service';
import { WebhookService } from './webhook.service';
import { ReconciliationService } from './reconciliation.service';
import {
    validateTopUpRequest, validatePaymentRequest, validateWithdrawRequest,
    validateP2PTransfer, validateCoinsRedemption, validateAdjustment,
    validateFreezeRequest, validateHistoryQuery
} from './wallet.validator';
import { toMoney } from './wallet.types';

// Initialize services with the shared pool
const walletService = new WalletService(db);
const transactionService = new TransactionService(db);
const withdrawalService = new WithdrawalService(db);
const webhookService = new WebhookService(db);
const reconciliationService = new ReconciliationService(db);

// ─── Coins exchange rate (configurable) ──────────────────────
const COINS_TO_EGP_RATE = 0.10;  // 1 coin = 0.10 EGP

/**
 * GEM Z — Wallet Controller
 * 
 * HTTP handlers for all wallet API endpoints.
 * Each handler validates input, delegates to services, and returns
 * consistent JSON responses.
 */
export class WalletController {

    // ═══════════════════════════════════════════════════════════
    // WALLET MANAGEMENT
    // ═══════════════════════════════════════════════════════════

    /**
     * GET /api/v1/wallet
     * Get the authenticated user's wallet summary.
     */
    static async getWallet(req: AuthRequest, res: Response) {
        try {
            const userId = req.user?.userId;
            if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

            const summary = await walletService.getWalletSummary(userId);

            return res.status(200).json({
                success: true,
                data: {
                    wallet: {
                        id: summary.wallet.id,
                        available_bal: summary.wallet.available_bal,
                        pending_bal: summary.wallet.pending_bal,
                        frozen_bal: summary.wallet.frozen_bal,
                        lifetime_earned: summary.wallet.lifetime_earned,
                        lifetime_spent: summary.wallet.lifetime_spent,
                        currency: summary.wallet.currency,
                        is_frozen: summary.wallet.is_frozen,
                        version: summary.wallet.version
                    },
                    limits: {
                        daily_topup_limit: summary.wallet.daily_topup_limit,
                        daily_topup_used: summary.todayTopups,
                        daily_topup_remaining: toMoney(summary.wallet.daily_topup_limit - summary.todayTopups),
                        daily_withdraw_limit: summary.wallet.daily_withdraw_limit,
                        daily_withdraw_used: summary.todayWithdrawals,
                        daily_withdraw_remaining: toMoney(summary.wallet.daily_withdraw_limit - summary.todayWithdrawals)
                    },
                    recent_transactions: summary.recentTransactions
                }
            });
        } catch (error: any) {
            console.error('[WalletController] getWallet:', error);
            return res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }

    /**
     * GET /api/v1/wallet/history
     * Paginated ledger history with optional filters.
     * Query: ?entryType=debit|credit&fromDate=&toDate=&limit=50&offset=0
     */
    static async getHistory(req: AuthRequest, res: Response) {
        try {
            const userId = req.user?.userId;
            if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

            const validation = validateHistoryQuery(req.query);
            if (!validation.valid) {
                return res.status(400).json({ success: false, errors: validation.errors });
            }

            const wallet = await walletService.getOrCreateWallet('user', userId);

            const history = await walletService.getWalletHistory({
                walletId: wallet.id,
                entryType: req.query.entryType as any,
                fromDate: req.query.fromDate ? new Date(req.query.fromDate as string) : undefined,
                toDate: req.query.toDate ? new Date(req.query.toDate as string) : undefined,
                limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
                offset: req.query.offset ? parseInt(req.query.offset as string) : 0
            });

            return res.status(200).json({ success: true, data: history });
        } catch (error: any) {
            console.error('[WalletController] getHistory:', error);
            return res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }

    // ═══════════════════════════════════════════════════════════
    // PAYMENTS
    // ═══════════════════════════════════════════════════════════

    /**
     * POST /api/v1/wallet/topup
     * Initiate a wallet top-up via payment gateway.
     * Body: { amount, gateway }
     */
    static async topUp(req: AuthRequest, res: Response) {
        try {
            const userId = req.user?.userId;
            if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

            const validation = validateTopUpRequest(req.body);
            if (!validation.valid) {
                return res.status(400).json({ success: false, errors: validation.errors });
            }

            // Check daily limit
            const limitCheck = await walletService.checkTopUpLimit(userId, req.body.amount);
            if (!limitCheck.allowed) {
                return res.status(400).json({
                    success: false,
                    message: `Exceeds daily top-up limit. Remaining today: ${limitCheck.remaining} EGP.`
                });
            }

            // In production: initiate payment with gateway and return payment URL.
            // The actual crediting happens via webhook callback.
            // For now, return a simulated payment intent.
            const paymentIntent = {
                gateway: req.body.gateway,
                amount: req.body.amount,
                currency: 'EGP',
                merchantRef: `TOPUP-${userId}`,
                // In production, this would be the gateway's checkout URL
                paymentUrl: `https://gateway.example.com/pay?ref=TOPUP-${userId}&amount=${req.body.amount}`,
                expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString()  // 30 min
            };

            return res.status(200).json({
                success: true,
                message: 'Payment intent created. Complete payment via the gateway.',
                data: paymentIntent
            });
        } catch (error: any) {
            console.error('[WalletController] topUp:', error);
            return res.status(500).json({ success: false, message: error.message || 'Internal server error' });
        }
    }

    /**
     * POST /api/v1/wallet/pay/subscription
     * Pay for a gym or trainer subscription from wallet.
     */
    static async paySubscription(req: AuthRequest, res: Response) {
        try {
            const userId = req.user?.userId;
            if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

            const { amount, receiverId, receiverType, planId, description } = req.body;

            const validation = validatePaymentRequest(req.body);
            if (!validation.valid) {
                return res.status(400).json({ success: false, errors: validation.errors });
            }

            // Get platform fee percentage for this business
            let platformFeePct = 15.00;  // default
            if (receiverType === 'gym') {
                const gymResult = await db.query(`SELECT platform_fee_pct FROM gyms WHERE id = $1`, [receiverId]);
                if (gymResult.rowCount && gymResult.rowCount > 0) {
                    platformFeePct = Number(gymResult.rows[0].platform_fee_pct);
                }
            }

            const result = await transactionService.processPayment({
                payerUserId: userId,
                receiverOwnerId: receiverId,
                receiverOwnerType: receiverType,
                amount: Number(amount),
                txnType: 'subscription_payment',
                platformFeePct,
                description: description || `Subscription payment for plan ${planId}`,
                idempotencyKey: (req as any).idempotencyKey,
                metadata: { planId },
                ipAddress: req.ip,
                userAgent: req.headers['user-agent']
            });

            return res.status(200).json({
                success: true,
                message: 'Payment processed successfully.',
                data: result
            });
        } catch (error: any) {
            console.error('[WalletController] paySubscription:', error);
            const status = error.message.includes('Insufficient') ? 400 : 500;
            return res.status(status).json({ success: false, message: error.message });
        }
    }

    /**
     * POST /api/v1/wallet/pay/order
     * Pay for a store order from wallet.
     */
    static async payOrder(req: AuthRequest, res: Response) {
        try {
            const userId = req.user?.userId;
            if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

            const { amount, storeId, orderId, description } = req.body;

            if (!amount || !storeId) {
                return res.status(400).json({ success: false, message: 'amount and storeId are required.' });
            }

            let platformFeePct = 17.50;  // default for stores
            const storeResult = await db.query(`SELECT platform_fee_pct FROM stores WHERE id = $1`, [storeId]);
            if (storeResult.rowCount && storeResult.rowCount > 0) {
                platformFeePct = Number(storeResult.rows[0].platform_fee_pct);
            }

            const result = await transactionService.processPayment({
                payerUserId: userId,
                receiverOwnerId: storeId,
                receiverOwnerType: 'store',
                amount: Number(amount),
                txnType: 'order_payment',
                platformFeePct,
                description: description || `Order payment #${orderId}`,
                idempotencyKey: (req as any).idempotencyKey,
                metadata: { orderId },
                ipAddress: req.ip,
                userAgent: req.headers['user-agent']
            });

            return res.status(200).json({ success: true, message: 'Order payment processed.', data: result });
        } catch (error: any) {
            console.error('[WalletController] payOrder:', error);
            const status = error.message.includes('Insufficient') ? 400 : 500;
            return res.status(status).json({ success: false, message: error.message });
        }
    }

    /**
     * POST /api/v1/wallet/pay/p2p
     * Transfer money to another user.
     */
    static async p2pTransfer(req: AuthRequest, res: Response) {
        try {
            const userId = req.user?.userId;
            if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

            const validation = validateP2PTransfer(req.body);
            if (!validation.valid) {
                return res.status(400).json({ success: false, errors: validation.errors });
            }

            if (req.body.recipientUserId === userId) {
                return res.status(400).json({ success: false, message: 'Cannot transfer to yourself.' });
            }

            const result = await transactionService.processP2PTransfer({
                senderUserId: userId,
                recipientUserId: req.body.recipientUserId,
                amount: Number(req.body.amount),
                description: req.body.description,
                idempotencyKey: (req as any).idempotencyKey,
                ipAddress: req.ip,
                userAgent: req.headers['user-agent']
            });

            return res.status(200).json({ success: true, message: 'Transfer completed.', data: result });
        } catch (error: any) {
            console.error('[WalletController] p2pTransfer:', error);
            const status = error.message.includes('Insufficient') ? 400 : 500;
            return res.status(status).json({ success: false, message: error.message });
        }
    }

    /**
     * POST /api/v1/wallet/redeem-coins
     * Convert Gem Z coins to wallet balance.
     */
    static async redeemCoins(req: AuthRequest, res: Response) {
        try {
            const userId = req.user?.userId;
            if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

            const validation = validateCoinsRedemption(req.body);
            if (!validation.valid) {
                return res.status(400).json({ success: false, errors: validation.errors });
            }

            const coins = Number(req.body.coinsAmount);
            const egpValue = toMoney(coins * COINS_TO_EGP_RATE);

            const result = await transactionService.processCoinsRedemption(
                userId, coins, egpValue, (req as any).idempotencyKey
            );

            return res.status(200).json({
                success: true,
                message: `Redeemed ${coins} coins for ${egpValue} EGP.`,
                data: { ...result, coinsRedeemed: coins, egpCredited: egpValue }
            });
        } catch (error: any) {
            console.error('[WalletController] redeemCoins:', error);
            const status = error.message.includes('Insufficient') ? 400 : 500;
            return res.status(status).json({ success: false, message: error.message });
        }
    }

    // ═══════════════════════════════════════════════════════════
    // WITHDRAWALS
    // ═══════════════════════════════════════════════════════════

    /**
     * POST /api/v1/wallet/withdraw
     * Request a withdrawal from wallet.
     */
    static async requestWithdrawal(req: AuthRequest, res: Response) {
        try {
            const userId = req.user?.userId;
            if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

            const validation = validateWithdrawRequest(req.body);
            if (!validation.valid) {
                return res.status(400).json({ success: false, errors: validation.errors });
            }

            const wallet = await walletService.getOrCreateWallet('user', userId);

            const withdrawal = await withdrawalService.requestWithdrawal({
                userId,
                walletId: wallet.id,
                amount: Number(req.body.amount),
                method: req.body.method,
                accountNumber: req.body.accountNumber,
                accountName: req.body.accountName,
                bankName: req.body.bankName
            });

            return res.status(201).json({
                success: true,
                message: 'Withdrawal request submitted. Funds have been frozen pending approval.',
                data: withdrawal
            });
        } catch (error: any) {
            console.error('[WalletController] requestWithdrawal:', error);
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    /**
     * GET /api/v1/wallet/withdrawals
     * List user's withdrawal requests.
     */
    static async listWithdrawals(req: AuthRequest, res: Response) {
        try {
            const userId = req.user?.userId;
            if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

            const wallet = await walletService.getOrCreateWallet('user', userId);
            const withdrawals = await withdrawalService.listWithdrawals(wallet.id);

            return res.status(200).json({ success: true, data: withdrawals });
        } catch (error: any) {
            console.error('[WalletController] listWithdrawals:', error);
            return res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }

    /**
     * PUT /api/v1/wallet/withdrawals/:id/cancel
     * Cancel a pending withdrawal.
     */
    static async cancelWithdrawal(req: AuthRequest, res: Response) {
        try {
            const userId = req.user?.userId;
            if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

            await withdrawalService.cancelWithdrawal(req.params.id, userId);

            return res.status(200).json({
                success: true,
                message: 'Withdrawal cancelled. Funds have been returned to your available balance.'
            });
        } catch (error: any) {
            console.error('[WalletController] cancelWithdrawal:', error);
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    // ═══════════════════════════════════════════════════════════
    // WEBHOOKS (Payment Gateways)
    // ═══════════════════════════════════════════════════════════

    /**
     * POST /api/v1/webhooks/fawry
     */
    static async fawryWebhook(req: AuthRequest, res: Response) {
        try {
            const result = await webhookService.handleFawryCallback(req.body);
            return res.status(200).json({ received: true, ...result });
        } catch (error: any) {
            console.error('[Webhook:Fawry] Error:', error);
            // Always return 200 to prevent gateway retries on our errors
            return res.status(200).json({ received: true, error: error.message });
        }
    }

    /**
     * POST /api/v1/webhooks/paymob
     */
    static async paymobWebhook(req: AuthRequest, res: Response) {
        try {
            const result = await webhookService.handlePaymobCallback(req.body);
            return res.status(200).json({ received: true, ...result });
        } catch (error: any) {
            console.error('[Webhook:Paymob] Error:', error);
            return res.status(200).json({ received: true, error: error.message });
        }
    }

    /**
     * POST /api/v1/webhooks/instapay
     */
    static async instapayWebhook(req: AuthRequest, res: Response) {
        try {
            const result = await webhookService.handleInstapayCallback(req.body);
            return res.status(200).json({ received: true, ...result });
        } catch (error: any) {
            console.error('[Webhook:InstaPay] Error:', error);
            return res.status(200).json({ received: true, error: error.message });
        }
    }

    // ═══════════════════════════════════════════════════════════
    // ADMIN OPERATIONS
    // ═══════════════════════════════════════════════════════════

    /**
     * POST /api/v1/admin/wallet/:walletId/freeze
     */
    static async freezeWallet(req: AuthRequest, res: Response) {
        try {
            const adminId = req.user?.userId;
            if (!adminId) return res.status(401).json({ success: false, message: 'Unauthorized' });

            const validation = validateFreezeRequest(req.body);
            if (!validation.valid) {
                return res.status(400).json({ success: false, errors: validation.errors });
            }

            await walletService.freezeWallet(
                req.params.walletId, adminId, req.body.reason,
                req.ip, req.headers['user-agent']
            );

            return res.status(200).json({ success: true, message: 'Wallet frozen successfully.' });
        } catch (error: any) {
            console.error('[WalletController] freezeWallet:', error);
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    /**
     * POST /api/v1/admin/wallet/:walletId/unfreeze
     */
    static async unfreezeWallet(req: AuthRequest, res: Response) {
        try {
            const adminId = req.user?.userId;
            if (!adminId) return res.status(401).json({ success: false, message: 'Unauthorized' });

            await walletService.unfreezeWallet(
                req.params.walletId, adminId,
                req.ip, req.headers['user-agent']
            );

            return res.status(200).json({ success: true, message: 'Wallet unfrozen successfully.' });
        } catch (error: any) {
            console.error('[WalletController] unfreezeWallet:', error);
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    /**
     * POST /api/v1/admin/wallet/:walletId/adjust
     * Manual admin balance adjustment.
     */
    static async adjustBalance(req: AuthRequest, res: Response) {
        try {
            const adminId = req.user?.userId;
            if (!adminId) return res.status(401).json({ success: false, message: 'Unauthorized' });

            const validation = validateAdjustment({ ...req.body, walletId: req.params.walletId });
            if (!validation.valid) {
                return res.status(400).json({ success: false, errors: validation.errors });
            }

            const result = await transactionService.processAdjustment(
                req.params.walletId,
                Number(req.body.amount),
                req.body.direction,
                req.body.reason,
                adminId,
                req.ip
            );

            return res.status(200).json({
                success: true,
                message: `Balance adjusted: ${req.body.direction} ${req.body.amount} EGP.`,
                data: result
            });
        } catch (error: any) {
            console.error('[WalletController] adjustBalance:', error);
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    /**
     * PUT /api/v1/admin/withdrawals/:id/approve
     */
    static async approveWithdrawal(req: AuthRequest, res: Response) {
        try {
            const adminId = req.user?.userId;
            if (!adminId) return res.status(401).json({ success: false, message: 'Unauthorized' });

            await withdrawalService.approveWithdrawal(req.params.id, adminId);

            return res.status(200).json({ success: true, message: 'Withdrawal approved and marked as paid.' });
        } catch (error: any) {
            console.error('[WalletController] approveWithdrawal:', error);
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    /**
     * PUT /api/v1/admin/withdrawals/:id/reject
     */
    static async rejectWithdrawal(req: AuthRequest, res: Response) {
        try {
            const adminId = req.user?.userId;
            if (!adminId) return res.status(401).json({ success: false, message: 'Unauthorized' });

            if (!req.body.reason) {
                return res.status(400).json({ success: false, message: 'reason is required.' });
            }

            await withdrawalService.rejectWithdrawal(req.params.id, adminId, req.body.reason);

            return res.status(200).json({
                success: true,
                message: 'Withdrawal rejected. Funds returned to available balance.'
            });
        } catch (error: any) {
            console.error('[WalletController] rejectWithdrawal:', error);
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    /**
     * GET /api/v1/admin/reconciliation/daily
     * Get daily reconciliation report.
     */
    static async getDailyReconciliation(req: AuthRequest, res: Response) {
        try {
            const date = (req.query.date as string) || new Date().toISOString().split('T')[0];
            const report = await reconciliationService.getReportByDate(date);

            return res.status(200).json({ success: true, data: report });
        } catch (error: any) {
            console.error('[WalletController] getDailyReconciliation:', error);
            return res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }

    /**
     * POST /api/v1/admin/reconciliation/run
     * Trigger reconciliation manually.
     */
    static async runReconciliation(req: AuthRequest, res: Response) {
        try {
            const report = await reconciliationService.snapshotAndReconcile();

            return res.status(200).json({
                success: true,
                message: `Reconciliation complete. ${report.reconciled}/${report.totalWallets} wallets match. ${report.discrepancies.length} discrepancies.`,
                data: report
            });
        } catch (error: any) {
            console.error('[WalletController] runReconciliation:', error);
            return res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }
}
