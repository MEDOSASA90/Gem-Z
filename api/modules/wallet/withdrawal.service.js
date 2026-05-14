"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WithdrawalService = void 0;
const uuid_1 = require("uuid");
const wallet_types_1 = require("./wallet.types");
const ledger_engine_1 = require("./ledger.engine");
const wallet_service_1 = require("./wallet.service");
/**
 * GEM Z — Withdrawal Service
 *
 * Manages the full withdrawal lifecycle:
 * 1. Request → Moves funds from available_bal to frozen_bal (escrow)
 * 2. Approve → Marks as processing, then paid
 * 3. Reject → Releases frozen funds back to available_bal
 */
class WithdrawalService {
    pool;
    ledgerEngine;
    walletService;
    constructor(pool) {
        this.pool = pool;
        this.ledgerEngine = new ledger_engine_1.LedgerEngine(pool);
        this.walletService = new wallet_service_1.WalletService(pool);
    }
    /**
     * Request a withdrawal. Freezes the requested amount immediately.
     */
    async requestWithdrawal(request) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            // Lock wallet
            const walletResult = await client.query(`SELECT * FROM wallets WHERE id = $1 FOR UPDATE`, [request.walletId]);
            if (!walletResult.rowCount || walletResult.rowCount === 0) {
                throw new Error('Wallet not found.');
            }
            const wallet = walletResult.rows[0];
            // Ownership check
            if (wallet.owner_id !== request.userId) {
                throw new Error('You do not own this wallet.');
            }
            if (wallet.is_frozen) {
                throw new Error('Wallet is frozen. Cannot request withdrawal.');
            }
            // Minimum withdrawal amount (configurable per owner type)
            const minimums = {
                user: 50,
                gym: 100,
                store: 100,
                trainer: 100,
                platform: 0
            };
            const minAmount = minimums[wallet.owner_type] || 100;
            if (request.amount < minAmount) {
                throw new Error(`Minimum withdrawal amount is ${minAmount} EGP.`);
            }
            // Balance check
            if ((0, wallet_types_1.toMoney)(wallet.available_bal) < request.amount) {
                throw new Error(`Insufficient available balance. Available: ${wallet.available_bal} EGP.`);
            }
            // Daily limit check
            const limitCheck = await this.walletService.checkWithdrawLimit(request.userId, request.walletId, request.amount);
            if (!limitCheck.allowed) {
                throw new Error(`Exceeds daily withdrawal limit. Remaining today: ${limitCheck.remaining} EGP.`);
            }
            // Calculate fee (0% for now, configurable)
            const fee = 0;
            const netAmount = (0, wallet_types_1.toMoney)(request.amount - fee);
            // Create the withdrawal request record
            const withdrawalId = (0, uuid_1.v4)();
            const insertResult = await client.query(`
                INSERT INTO withdrawal_requests 
                    (id, wallet_id, amount, fee, net_amount, method, account_number, 
                     account_name, bank_name, status, requested_by)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'requested', $10)
                RETURNING *
            `, [
                withdrawalId, request.walletId, request.amount, fee, netAmount,
                request.method, request.accountNumber || null,
                request.accountName || null, request.bankName || null,
                request.userId
            ]);
            // Freeze the funds: move from available to frozen
            // Create a freeze transaction in the ledger
            const txnId = (0, uuid_1.v4)();
            const referenceNo = (0, wallet_types_1.generateRefNo)('FRZ');
            await client.query(`
                INSERT INTO transactions
                    (id, reference_no, txn_type, status, total_amount, currency,
                     description, initiator_user_id, completed_at)
                VALUES ($1, $2, 'freeze', 'completed', $3, 'EGP', $4, $5, NOW())
            `, [txnId, referenceNo, request.amount, `Withdrawal freeze for request ${withdrawalId}`, request.userId]);
            // Move from available to frozen (within same wallet)
            // Debit available, credit frozen
            await client.query(`UPDATE wallets SET available_bal = available_bal - $1, frozen_bal = frozen_bal + $1 WHERE id = $2`, [request.amount, request.walletId]);
            // Insert ledger entries for the freeze
            const newAvailable = (0, wallet_types_1.toMoney)(Number(wallet.available_bal) - request.amount);
            const newFrozen = (0, wallet_types_1.toMoney)(Number(wallet.frozen_bal || 0) + request.amount);
            await client.query(`
                INSERT INTO ledger_entries (txn_id, wallet_id, entry_type, amount, running_balance, balance_field, note)
                VALUES ($1, $2, 'debit', $3, $4, 'available', 'Withdrawal freeze'),
                       ($1, $2, 'credit', $3, $5, 'frozen', 'Withdrawal freeze')
            `, [txnId, request.walletId, request.amount, newAvailable, newFrozen]);
            // Link transaction to withdrawal request
            await client.query(`UPDATE withdrawal_requests SET txn_id = $1 WHERE id = $2`, [txnId, withdrawalId]);
            // Audit
            await client.query(`
                INSERT INTO wallet_audit_log 
                    (wallet_id, action, actor_user_id, actor_type, new_values)
                VALUES ($1, 'withdrawal_requested', $2, 'user', $3)
            `, [request.walletId, request.userId, JSON.stringify({
                    withdrawalId, amount: request.amount, method: request.method
                })]);
            await client.query('COMMIT');
            return insertResult.rows[0];
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    /**
     * Admin approves a withdrawal request. Releases frozen funds.
     */
    async approveWithdrawal(requestId, adminUserId) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            // Lock the withdrawal request
            const reqResult = await client.query(`SELECT * FROM withdrawal_requests WHERE id = $1 FOR UPDATE`, [requestId]);
            if (!reqResult.rowCount || reqResult.rowCount === 0) {
                throw new Error('Withdrawal request not found.');
            }
            const req = reqResult.rows[0];
            if (req.status !== 'requested') {
                throw new Error(`Cannot approve a withdrawal with status: ${req.status}`);
            }
            // Lock the wallet
            await client.query(`SELECT id FROM wallets WHERE id = $1 FOR UPDATE`, [req.wallet_id]);
            // Update status
            await client.query(`
                UPDATE withdrawal_requests 
                SET status = 'paid', processed_by = $1, processed_at = NOW()
                WHERE id = $2
            `, [adminUserId, requestId]);
            // Release from frozen (the funds leave the system)
            await client.query(`UPDATE wallets SET frozen_bal = frozen_bal - $1 WHERE id = $2`, [req.amount, req.wallet_id]);
            // Create unfreeze transaction
            const txnId = (0, uuid_1.v4)();
            const referenceNo = (0, wallet_types_1.generateRefNo)('WTH');
            await client.query(`
                INSERT INTO transactions
                    (id, reference_no, txn_type, status, total_amount, currency,
                     description, initiator_user_id, completed_at)
                VALUES ($1, $2, 'wallet_withdrawal', 'completed', $3, 'EGP', $4, $5, NOW())
            `, [txnId, referenceNo, req.amount, `Withdrawal approved: ${requestId}`, adminUserId]);
            // Audit
            await client.query(`
                INSERT INTO wallet_audit_log 
                    (wallet_id, action, actor_user_id, actor_type, new_values)
                VALUES ($1, 'withdrawal_approved', $2, 'admin', $3)
            `, [req.wallet_id, adminUserId, JSON.stringify({ requestId, amount: req.amount })]);
            await client.query('COMMIT');
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    /**
     * Admin rejects a withdrawal. Returns frozen funds to available.
     */
    async rejectWithdrawal(requestId, adminUserId, reason) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            const reqResult = await client.query(`SELECT * FROM withdrawal_requests WHERE id = $1 FOR UPDATE`, [requestId]);
            if (!reqResult.rowCount || reqResult.rowCount === 0) {
                throw new Error('Withdrawal request not found.');
            }
            const req = reqResult.rows[0];
            if (req.status !== 'requested') {
                throw new Error(`Cannot reject a withdrawal with status: ${req.status}`);
            }
            // Lock wallet
            await client.query(`SELECT id FROM wallets WHERE id = $1 FOR UPDATE`, [req.wallet_id]);
            // Update status
            await client.query(`
                UPDATE withdrawal_requests 
                SET status = 'rejected', rejection_reason = $1, processed_by = $2, processed_at = NOW()
                WHERE id = $3
            `, [reason, adminUserId, requestId]);
            // Return frozen funds to available
            await client.query(`UPDATE wallets SET available_bal = available_bal + $1, frozen_bal = frozen_bal - $1 WHERE id = $2`, [req.amount, req.wallet_id]);
            // Create unfreeze transaction
            const txnId = (0, uuid_1.v4)();
            const referenceNo = (0, wallet_types_1.generateRefNo)('UFZ');
            await client.query(`
                INSERT INTO transactions
                    (id, reference_no, txn_type, status, total_amount, currency,
                     description, initiator_user_id, completed_at)
                VALUES ($1, $2, 'unfreeze', 'completed', $3, 'EGP', $4, $5, NOW())
            `, [txnId, referenceNo, req.amount, `Withdrawal rejected: ${reason}`, adminUserId]);
            // Audit
            await client.query(`
                INSERT INTO wallet_audit_log 
                    (wallet_id, action, actor_user_id, actor_type, new_values)
                VALUES ($1, 'withdrawal_rejected', $2, 'admin', $3)
            `, [req.wallet_id, adminUserId, JSON.stringify({ requestId, reason })]);
            await client.query('COMMIT');
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    /**
     * User cancels their own pending withdrawal.
     */
    async cancelWithdrawal(requestId, userId) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            const reqResult = await client.query(`SELECT * FROM withdrawal_requests WHERE id = $1 FOR UPDATE`, [requestId]);
            if (!reqResult.rowCount || reqResult.rowCount === 0) {
                throw new Error('Withdrawal request not found.');
            }
            const req = reqResult.rows[0];
            if (req.requested_by !== userId) {
                throw new Error('You can only cancel your own withdrawals.');
            }
            if (req.status !== 'requested') {
                throw new Error(`Cannot cancel a withdrawal with status: ${req.status}`);
            }
            // Lock wallet and return funds
            await client.query(`SELECT id FROM wallets WHERE id = $1 FOR UPDATE`, [req.wallet_id]);
            await client.query(`
                UPDATE withdrawal_requests SET status = 'rejected', rejection_reason = 'Cancelled by user'
                WHERE id = $1
            `, [requestId]);
            await client.query(`UPDATE wallets SET available_bal = available_bal + $1, frozen_bal = frozen_bal - $1 WHERE id = $2`, [req.amount, req.wallet_id]);
            const txnId = (0, uuid_1.v4)();
            await client.query(`
                INSERT INTO transactions
                    (id, reference_no, txn_type, status, total_amount, currency,
                     description, initiator_user_id, completed_at)
                VALUES ($1, $2, 'unfreeze', 'completed', $3, 'EGP', 'Withdrawal cancelled by user', $4, NOW())
            `, [txnId, (0, wallet_types_1.generateRefNo)('CXL'), req.amount, userId]);
            await client.query('COMMIT');
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    /**
     * List withdrawal requests for a wallet.
     */
    async listWithdrawals(walletId, limit = 20, offset = 0) {
        const result = await this.pool.query(`
            SELECT * FROM withdrawal_requests
            WHERE wallet_id = $1
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
        `, [walletId, limit, offset]);
        return result.rows;
    }
}
exports.WithdrawalService = WithdrawalService;
