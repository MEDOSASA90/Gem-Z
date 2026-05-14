import { Pool, PoolClient } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import {
    PaymentRequest, TopUpRequest, RefundRequest, P2PTransferRequest,
    LedgerInstruction, TxnType, toMoney, generateRefNo
} from './wallet.types';
import { LedgerEngine } from './ledger.engine';
import { WalletService } from './wallet.service';

/**
 * GEM Z — Transaction Service
 * 
 * Orchestrates all financial flows: payments, top-ups, refunds, P2P transfers,
 * and coins redemptions. Every operation is fully atomic with double-entry integrity.
 */
export class TransactionService {
    private ledgerEngine: LedgerEngine;
    private walletService: WalletService;

    constructor(private pool: Pool) {
        this.ledgerEngine = new LedgerEngine(pool);
        this.walletService = new WalletService(pool);
    }

    // ─── Payment Processing ──────────────────────────────────

    /**
     * Process a payment from a user wallet to a business wallet (gym/store/trainer).
     * Automatically calculates platform fee split.
     * 
     * Flow: Payer Wallet → [Business Wallet + Platform Wallet]
     * Debit:  payer.available_bal -= total_amount
     * Credit: receiver.pending_bal += (total_amount - platform_fee)
     * Credit: platform.available_bal += platform_fee
     */
    async processPayment(request: PaymentRequest): Promise<{ txnId: string; referenceNo: string }> {
        const client: PoolClient = await this.pool.connect();

        try {
            await client.query('BEGIN');

            // 1. Check idempotency
            if (request.idempotencyKey) {
                const existing = await this.checkIdempotency(client, request.idempotencyKey);
                if (existing) {
                    await client.query('ROLLBACK');
                    return existing;
                }
            }

            // 2. Lock all involved wallets (ORDER BY id to prevent deadlocks)
            const walletsResult = await client.query(`
                SELECT id, owner_type, owner_id, available_bal, pending_bal, is_frozen
                FROM wallets
                WHERE (owner_type = 'user' AND owner_id = $1)
                   OR (owner_type = $2 AND owner_id = $3)
                   OR (owner_type = 'platform')
                ORDER BY id
                FOR UPDATE
            `, [request.payerUserId, request.receiverOwnerType, request.receiverOwnerId]);

            const payerWallet = walletsResult.rows.find((w: any) => w.owner_type === 'user' && w.owner_id === request.payerUserId);
            const receiverWallet = walletsResult.rows.find((w: any) => w.owner_type === request.receiverOwnerType && w.owner_id === request.receiverOwnerId);
            const platformWallet = walletsResult.rows.find((w: any) => w.owner_type === 'platform');

            if (!payerWallet || !receiverWallet || !platformWallet) {
                throw new Error('One or more wallets not found. Ensure wallets exist for all parties.');
            }

            if (payerWallet.is_frozen) {
                throw new Error('Your wallet is frozen. Contact support for assistance.');
            }

            // 3. Validate balance
            if (toMoney(payerWallet.available_bal) < request.amount) {
                throw new Error(`Insufficient funds. Available: ${payerWallet.available_bal}, Required: ${request.amount}`);
            }

            // 4. Calculate splits
            const platformFee = toMoney((request.amount * request.platformFeePct) / 100);
            const receiverNet = toMoney(request.amount - platformFee);

            // Sanity check
            if (Math.abs(toMoney(platformFee + receiverNet) - request.amount) > 0.0001) {
                throw new Error(`CRITICAL: Split calculation error. Fee(${platformFee}) + Net(${receiverNet}) ≠ Total(${request.amount})`);
            }

            // 5. Create transaction record
            const txnId = uuidv4();
            const referenceNo = generateRefNo('TXN');

            await client.query(`
                INSERT INTO transactions 
                    (id, reference_no, idempotency_key, txn_type, status, total_amount, currency, 
                     description, initiator_user_id, metadata, ip_address, user_agent, completed_at)
                VALUES ($1, $2, $3, $4, 'completed', $5, 'EGP', $6, $7, $8, $9, $10, NOW())
            `, [
                txnId, referenceNo, request.idempotencyKey || null,
                request.txnType, request.amount, request.description,
                request.payerUserId, JSON.stringify(request.metadata || {}),
                request.ipAddress || null, request.userAgent || null
            ]);

            // 6. Execute double-entry ledger transfer
            const instructions: LedgerInstruction[] = [
                {
                    walletId: payerWallet.id,
                    entryType: 'debit',
                    amount: request.amount,
                    balanceField: 'available',
                    note: `Payment: ${request.description}`
                },
                {
                    walletId: receiverWallet.id,
                    entryType: 'credit',
                    amount: receiverNet,
                    balanceField: 'pending',
                    note: `Revenue from ${request.txnType} (net of ${request.platformFeePct}% fee)`
                },
                {
                    walletId: platformWallet.id,
                    entryType: 'credit',
                    amount: platformFee,
                    balanceField: 'available',
                    note: `Platform fee (${request.platformFeePct}%) on ${request.txnType}`
                }
            ];

            await this.ledgerEngine.executeTransfer(client, txnId, instructions);

            // 7. Audit log
            await this.insertAuditLog(client, payerWallet.id, 'payment_sent', request.payerUserId, 'user', {
                txnId, amount: request.amount, txnType: request.txnType
            }, request.ipAddress, request.userAgent);

            await client.query('COMMIT');
            return { txnId, referenceNo };

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // ─── Top-Up (External Money In) ──────────────────────────

    /**
     * Credit a user's wallet after payment gateway confirms.
     * Called by webhook handlers after signature verification.
     * 
     * Flow: [External] → User Wallet
     * Credit: user.available_bal += amount
     * Debit:  platform.available_bal += amount (representing external funds received)
     */
    async processTopUp(request: TopUpRequest): Promise<{ txnId: string; referenceNo: string }> {
        const client = await this.pool.connect();

        try {
            await client.query('BEGIN');

            // Idempotency check (critical for webhooks that may be called multiple times)
            if (request.idempotencyKey) {
                const existing = await this.checkIdempotency(client, request.idempotencyKey);
                if (existing) {
                    await client.query('ROLLBACK');
                    return existing;
                }
            }

            // Also check by gateway ref (prevents double-funding even without idempotency key)
            if (request.gatewayRef) {
                const existingByRef = await client.query(
                    `SELECT id, reference_no FROM transactions WHERE gateway_ref = $1 AND status = 'completed'`,
                    [request.gatewayRef]
                );
                if (existingByRef.rowCount && existingByRef.rowCount > 0) {
                    await client.query('ROLLBACK');
                    return {
                        txnId: existingByRef.rows[0].id,
                        referenceNo: existingByRef.rows[0].reference_no
                    };
                }
            }

            // Lock wallets
            const walletsResult = await client.query(`
                SELECT id, owner_type, owner_id, available_bal, is_frozen
                FROM wallets
                WHERE (owner_type = 'user' AND owner_id = $1)
                   OR (owner_type = 'platform')
                ORDER BY id
                FOR UPDATE
            `, [request.userId]);

            const userWallet = walletsResult.rows.find((w: any) => w.owner_type === 'user' && w.owner_id === request.userId);
            const platformWallet = walletsResult.rows.find((w: any) => w.owner_type === 'platform');

            if (!userWallet) {
                // Auto-create user wallet
                const newWallet = await client.query(
                    `INSERT INTO wallets (owner_type, owner_id, currency) VALUES ('user', $1, 'EGP') RETURNING *`,
                    [request.userId]
                );
                walletsResult.rows.push(newWallet.rows[0]);
            }

            const targetWallet = userWallet || walletsResult.rows.find((w: any) => w.owner_type === 'user');

            if (!targetWallet || !platformWallet) {
                throw new Error('Required wallets not found for top-up.');
            }

            if (targetWallet.is_frozen) {
                throw new Error('Wallet is frozen. Top-up rejected.');
            }

            // Create transaction
            const txnId = uuidv4();
            const referenceNo = generateRefNo('TOP');

            await client.query(`
                INSERT INTO transactions
                    (id, reference_no, idempotency_key, txn_type, status, total_amount, currency,
                     description, initiator_user_id, payment_gateway, gateway_ref, gateway_response,
                     ip_address, user_agent, completed_at)
                VALUES ($1, $2, $3, 'wallet_topup', 'completed', $4, 'EGP', $5, $6, $7, $8, $9, $10, $11, NOW())
            `, [
                txnId, referenceNo, request.idempotencyKey || null,
                request.amount, `Wallet top-up via ${request.gateway}`,
                request.userId, request.gateway, request.gatewayRef,
                JSON.stringify(request.gatewayResponse || {}),
                request.ipAddress || null, request.userAgent || null
            ]);

            // Double-entry: Platform receives external funds, User gets credit
            const instructions: LedgerInstruction[] = [
                {
                    walletId: platformWallet.id,
                    entryType: 'debit',
                    amount: request.amount,
                    balanceField: 'available',
                    note: `External funds received via ${request.gateway} (ref: ${request.gatewayRef})`
                },
                {
                    walletId: targetWallet.id,
                    entryType: 'credit',
                    amount: request.amount,
                    balanceField: 'available',
                    note: `Top-up via ${request.gateway}`
                }
            ];

            await this.ledgerEngine.executeTransfer(client, txnId, instructions);

            await this.insertAuditLog(client, targetWallet.id, 'topup', request.userId, 'webhook', {
                txnId, amount: request.amount, gateway: request.gateway
            }, request.ipAddress, request.userAgent);

            await client.query('COMMIT');
            return { txnId, referenceNo };

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // ─── Refund Processing ───────────────────────────────────

    /**
     * Process a full or partial refund on a prior transaction.
     * Reverses the original ledger entries proportionally.
     */
    async processRefund(request: RefundRequest): Promise<{ txnId: string; referenceNo: string }> {
        const client = await this.pool.connect();

        try {
            await client.query('BEGIN');

            // 1. Load original transaction
            const originalTxn = await client.query(
                `SELECT * FROM transactions WHERE id = $1 AND status = 'completed'`,
                [request.originalTxnId]
            );

            if (!originalTxn.rowCount || originalTxn.rowCount === 0) {
                throw new Error(`Original transaction ${request.originalTxnId} not found or not completed.`);
            }

            const original = originalTxn.rows[0];

            // 2. Validate refund amount
            if (request.amount > Number(original.total_amount)) {
                throw new Error(`Refund amount ${request.amount} exceeds original amount ${original.total_amount}.`);
            }

            // Check for existing refunds on this transaction
            const existingRefunds = await client.query(`
                SELECT COALESCE(SUM(amount), 0) as total_refunded
                FROM transaction_reversals WHERE original_txn_id = $1
            `, [request.originalTxnId]);

            const totalRefunded = toMoney(existingRefunds.rows[0].total_refunded);
            if (totalRefunded + request.amount > Number(original.total_amount)) {
                throw new Error(
                    `Total refunds (${totalRefunded} + ${request.amount}) would exceed ` +
                    `original amount (${original.total_amount}).`
                );
            }

            // 3. Load original ledger entries to determine which wallets were involved
            const originalEntries = await client.query(
                `SELECT * FROM ledger_entries WHERE txn_id = $1 ORDER BY id`,
                [request.originalTxnId]
            );

            // 4. Lock all involved wallets
            const walletIds = [...new Set(originalEntries.rows.map((e: any) => e.wallet_id))];
            await client.query(
                `SELECT id FROM wallets WHERE id = ANY($1) ORDER BY id FOR UPDATE`,
                [walletIds]
            );

            // 5. Calculate proportional refund
            const refundRatio = request.amount / Number(original.total_amount);

            // 6. Create refund transaction
            const txnId = uuidv4();
            const referenceNo = generateRefNo('RFD');

            await client.query(`
                INSERT INTO transactions
                    (id, reference_no, txn_type, status, total_amount, currency,
                     description, initiator_user_id, parent_txn_id, completed_at)
                VALUES ($1, $2, 'refund', 'completed', $3, 'EGP', $4, $5, $6, NOW())
            `, [txnId, referenceNo, request.amount, request.reason, request.initiatedBy, request.originalTxnId]);

            // 7. Reverse the ledger entries (swap debit/credit)
            const refundInstructions: LedgerInstruction[] = originalEntries.rows.map((entry: any) => ({
                walletId: entry.wallet_id,
                entryType: entry.entry_type === 'debit' ? 'credit' as const : 'debit' as const,
                amount: toMoney(Number(entry.amount) * refundRatio),
                balanceField: entry.balance_field,
                note: `Refund of ${referenceNo}: ${request.reason}`
            }));

            await this.ledgerEngine.executeTransfer(client, txnId, refundInstructions);

            // 8. Record the reversal
            await client.query(`
                INSERT INTO transaction_reversals
                    (original_txn_id, reversal_txn_id, reason, reversal_type, amount, initiated_by)
                VALUES ($1, $2, $3, $4, $5, $6)
            `, [
                request.originalTxnId, txnId, request.reason,
                request.isPartial ? 'partial_refund' : 'full_refund',
                request.amount, request.initiatedBy
            ]);

            // 9. If full refund, mark original as reversed
            if (!request.isPartial && totalRefunded + request.amount >= Number(original.total_amount)) {
                await client.query(
                    `UPDATE transactions SET status = 'reversed' WHERE id = $1`,
                    [request.originalTxnId]
                );
            }

            await client.query('COMMIT');
            return { txnId, referenceNo };

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // ─── P2P Transfer ────────────────────────────────────────

    /**
     * Transfer funds between two user wallets (e.g., squad financial support).
     */
    async processP2PTransfer(request: P2PTransferRequest): Promise<{ txnId: string; referenceNo: string }> {
        const client = await this.pool.connect();

        try {
            await client.query('BEGIN');

            if (request.idempotencyKey) {
                const existing = await this.checkIdempotency(client, request.idempotencyKey);
                if (existing) {
                    await client.query('ROLLBACK');
                    return existing;
                }
            }

            if (request.senderUserId === request.recipientUserId) {
                throw new Error('Cannot transfer to yourself.');
            }

            // Lock wallets in consistent order
            const walletsResult = await client.query(`
                SELECT id, owner_type, owner_id, available_bal, is_frozen
                FROM wallets
                WHERE owner_type = 'user' AND owner_id IN ($1, $2)
                ORDER BY id
                FOR UPDATE
            `, [request.senderUserId, request.recipientUserId]);

            const senderWallet = walletsResult.rows.find((w: any) => w.owner_id === request.senderUserId);
            const recipientWallet = walletsResult.rows.find((w: any) => w.owner_id === request.recipientUserId);

            if (!senderWallet || !recipientWallet) {
                throw new Error('Sender or recipient wallet not found.');
            }

            if (senderWallet.is_frozen) {
                throw new Error('Your wallet is frozen. Contact support.');
            }

            if (toMoney(senderWallet.available_bal) < request.amount) {
                throw new Error(`Insufficient funds. Available: ${senderWallet.available_bal}`);
            }

            const txnId = uuidv4();
            const referenceNo = generateRefNo('P2P');

            await client.query(`
                INSERT INTO transactions
                    (id, reference_no, idempotency_key, txn_type, status, total_amount, currency,
                     description, initiator_user_id, ip_address, user_agent, completed_at)
                VALUES ($1, $2, $3, 'p2p_transfer', 'completed', $4, 'EGP', $5, $6, $7, $8, NOW())
            `, [
                txnId, referenceNo, request.idempotencyKey || null,
                request.amount, request.description || 'P2P transfer',
                request.senderUserId, request.ipAddress || null, request.userAgent || null
            ]);

            const instructions: LedgerInstruction[] = [
                {
                    walletId: senderWallet.id,
                    entryType: 'debit',
                    amount: request.amount,
                    balanceField: 'available',
                    note: `Transfer to user`
                },
                {
                    walletId: recipientWallet.id,
                    entryType: 'credit',
                    amount: request.amount,
                    balanceField: 'available',
                    note: `Transfer from user`
                }
            ];

            await this.ledgerEngine.executeTransfer(client, txnId, instructions);

            await client.query('COMMIT');
            return { txnId, referenceNo };

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // ─── Coins Redemption ────────────────────────────────────

    /**
     * Convert Gem Z coins to wallet credit.
     * Atomically deducts coins and credits the wallet.
     */
    async processCoinsRedemption(
        userId: string,
        coinsToRedeem: number,
        egpValue: number,
        idempotencyKey?: string
    ): Promise<{ txnId: string; referenceNo: string }> {
        const client = await this.pool.connect();

        try {
            await client.query('BEGIN');

            if (idempotencyKey) {
                const existing = await this.checkIdempotency(client, idempotencyKey);
                if (existing) {
                    await client.query('ROLLBACK');
                    return existing;
                }
            }

            // Lock the trainee profile AND wallet atomically
            const profileResult = await client.query(
                `SELECT total_points FROM trainee_profiles WHERE user_id = $1 FOR UPDATE`,
                [userId]
            );

            if (!profileResult.rowCount || profileResult.rowCount === 0) {
                throw new Error('Trainee profile not found.');
            }

            if (profileResult.rows[0].total_points < coinsToRedeem) {
                throw new Error(`Insufficient coins. Have: ${profileResult.rows[0].total_points}, Need: ${coinsToRedeem}`);
            }

            // Lock wallets
            const walletsResult = await client.query(`
                SELECT id, owner_type, owner_id, available_bal
                FROM wallets
                WHERE (owner_type = 'user' AND owner_id = $1)
                   OR (owner_type = 'platform')
                ORDER BY id
                FOR UPDATE
            `, [userId]);

            const userWallet = walletsResult.rows.find((w: any) => w.owner_type === 'user' && w.owner_id === userId);
            const platformWallet = walletsResult.rows.find((w: any) => w.owner_type === 'platform');

            if (!userWallet || !platformWallet) {
                throw new Error('Required wallets not found.');
            }

            // Deduct coins
            await client.query(
                `UPDATE trainee_profiles SET total_points = total_points - $1 WHERE user_id = $2`,
                [coinsToRedeem, userId]
            );

            // Create transaction
            const txnId = uuidv4();
            const referenceNo = generateRefNo('CRD');

            await client.query(`
                INSERT INTO transactions
                    (id, reference_no, idempotency_key, txn_type, status, total_amount, currency,
                     description, initiator_user_id, metadata, completed_at)
                VALUES ($1, $2, $3, 'coins_redemption', 'completed', $4, 'EGP', $5, $6, $7, NOW())
            `, [
                txnId, referenceNo, idempotencyKey || null,
                egpValue, `Redeemed ${coinsToRedeem} coins for ${egpValue} EGP`,
                userId, JSON.stringify({ coins_redeemed: coinsToRedeem })
            ]);

            const instructions: LedgerInstruction[] = [
                {
                    walletId: platformWallet.id,
                    entryType: 'debit',
                    amount: egpValue,
                    balanceField: 'available',
                    note: `Coins redemption: ${coinsToRedeem} coins`
                },
                {
                    walletId: userWallet.id,
                    entryType: 'credit',
                    amount: egpValue,
                    balanceField: 'available',
                    note: `Redeemed ${coinsToRedeem} coins`
                }
            ];

            await this.ledgerEngine.executeTransfer(client, txnId, instructions);

            await client.query('COMMIT');
            return { txnId, referenceNo };

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // ─── Admin Adjustment ────────────────────────────────────

    /**
     * Manual balance adjustment by admin (for corrections/disputes).
     */
    async processAdjustment(
        walletId: string,
        amount: number,
        direction: 'credit' | 'debit',
        reason: string,
        adminUserId: string,
        ipAddress?: string
    ): Promise<{ txnId: string; referenceNo: string }> {
        const client = await this.pool.connect();

        try {
            await client.query('BEGIN');

            // Lock wallets
            const walletsResult = await client.query(`
                SELECT id, owner_type, owner_id, available_bal FROM wallets
                WHERE id = $1 OR owner_type = 'platform'
                ORDER BY id FOR UPDATE
            `, [walletId]);

            const targetWallet = walletsResult.rows.find((w: any) => w.id === walletId);
            const platformWallet = walletsResult.rows.find((w: any) => w.owner_type === 'platform');

            if (!targetWallet || !platformWallet) {
                throw new Error('Wallet not found.');
            }

            const txnId = uuidv4();
            const referenceNo = generateRefNo('ADJ');

            await client.query(`
                INSERT INTO transactions
                    (id, reference_no, txn_type, status, total_amount, currency,
                     description, initiator_user_id, ip_address, completed_at)
                VALUES ($1, $2, 'adjustment', 'completed', $3, 'EGP', $4, $5, $6, NOW())
            `, [txnId, referenceNo, amount, `Admin adjustment: ${reason}`, adminUserId, ipAddress || null]);

            const instructions: LedgerInstruction[] = direction === 'credit'
                ? [
                    { walletId: platformWallet.id, entryType: 'debit', amount, balanceField: 'available', note: `Admin adjustment to wallet ${walletId}` },
                    { walletId: targetWallet.id, entryType: 'credit', amount, balanceField: 'available', note: `Admin credit: ${reason}` }
                ]
                : [
                    { walletId: targetWallet.id, entryType: 'debit', amount, balanceField: 'available', note: `Admin debit: ${reason}` },
                    { walletId: platformWallet.id, entryType: 'credit', amount, balanceField: 'available', note: `Admin adjustment from wallet ${walletId}` }
                ];

            await this.ledgerEngine.executeTransfer(client, txnId, instructions);

            // Audit log
            await this.insertAuditLog(client, walletId, 'admin_adjustment', adminUserId, 'admin', {
                txnId, amount, direction, reason
            }, ipAddress);

            await client.query('COMMIT');
            return { txnId, referenceNo };

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // ─── Helpers ─────────────────────────────────────────────

    private async checkIdempotency(
        client: PoolClient,
        key: string
    ): Promise<{ txnId: string; referenceNo: string } | null> {
        const existing = await client.query(
            `SELECT t.id, t.reference_no 
             FROM transactions t 
             WHERE t.idempotency_key = $1 AND t.status = 'completed'`,
            [key]
        );

        if (existing.rowCount && existing.rowCount > 0) {
            return {
                txnId: existing.rows[0].id,
                referenceNo: existing.rows[0].reference_no
            };
        }
        return null;
    }

    private async insertAuditLog(
        client: PoolClient,
        walletId: string,
        action: string,
        actorUserId: string,
        actorType: string,
        newValues: Record<string, any>,
        ipAddress?: string,
        userAgent?: string
    ): Promise<void> {
        await client.query(`
            INSERT INTO wallet_audit_log 
                (wallet_id, action, actor_user_id, actor_type, new_values, ip_address, user_agent)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [walletId, action, actorUserId, actorType, JSON.stringify(newValues), ipAddress || null, userAgent || null]);
    }
}
