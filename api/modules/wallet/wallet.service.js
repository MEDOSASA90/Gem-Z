"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletService = void 0;
const wallet_types_1 = require("./wallet.types");
const ledger_engine_1 = require("./ledger.engine");
/**
 * GEM Z — Wallet Service
 *
 * Manages wallet lifecycle: creation, balance queries, freezing,
 * history, and daily limit enforcement.
 */
class WalletService {
    pool;
    ledgerEngine;
    constructor(pool) {
        this.pool = pool;
        this.ledgerEngine = new ledger_engine_1.LedgerEngine(pool);
    }
    // ─── Wallet Retrieval ────────────────────────────────────
    /**
     * Get a user's wallet. Creates one automatically if it doesn't exist.
     */
    async getOrCreateWallet(ownerType, ownerId, currency = 'EGP') {
        // Try to find existing wallet
        const existing = await this.pool.query(`SELECT * FROM wallets WHERE owner_type = $1 AND owner_id = $2 AND currency = $3`, [ownerType, ownerId, currency]);
        if (existing.rowCount && existing.rowCount > 0) {
            return this.mapWalletRow(existing.rows[0]);
        }
        // Auto-create wallet for the owner
        const created = await this.pool.query(`INSERT INTO wallets (owner_type, owner_id, currency) 
             VALUES ($1, $2, $3) 
             ON CONFLICT (owner_type, owner_id, currency) DO UPDATE SET updated_at = NOW()
             RETURNING *`, [ownerType, ownerId, currency]);
        return this.mapWalletRow(created.rows[0]);
    }
    /**
     * Get wallet by ID with ownership verification.
     */
    async getWalletById(walletId) {
        const result = await this.pool.query(`SELECT * FROM wallets WHERE id = $1`, [walletId]);
        return result.rowCount && result.rowCount > 0 ? this.mapWalletRow(result.rows[0]) : null;
    }
    /**
     * Get the platform singleton wallet.
     */
    async getPlatformWallet(currency = 'EGP') {
        const result = await this.pool.query(`SELECT * FROM wallets WHERE owner_type = 'platform' AND currency = $1 LIMIT 1`, [currency]);
        if (!result.rowCount || result.rowCount === 0) {
            throw new Error('CRITICAL: Platform wallet not found. Run schema_v6_wallet_system.sql first.');
        }
        return this.mapWalletRow(result.rows[0]);
    }
    /**
     * Full wallet summary including today's activity and recent transactions.
     */
    async getWalletSummary(userId) {
        const wallet = await this.getOrCreateWallet('user', userId);
        // Today's top-ups
        const topupResult = await this.pool.query(`
            SELECT COALESCE(SUM(total_amount), 0) as total
            FROM transactions
            WHERE initiator_user_id = $1 
              AND txn_type = 'wallet_topup' 
              AND status = 'completed'
              AND created_at >= CURRENT_DATE
        `, [userId]);
        // Today's withdrawals
        const withdrawResult = await this.pool.query(`
            SELECT COALESCE(SUM(amount), 0) as total
            FROM withdrawal_requests
            WHERE requested_by = $1
              AND status IN ('requested', 'processing', 'paid')
              AND created_at >= CURRENT_DATE
        `, [userId]);
        // Recent transactions
        const txnResult = await this.pool.query(`
            SELECT t.id, t.reference_no, t.txn_type, t.status, t.total_amount,
                   t.currency, t.description, t.created_at, t.completed_at,
                   le.entry_type, le.amount as ledger_amount
            FROM transactions t
            JOIN ledger_entries le ON le.txn_id = t.id
            JOIN wallets w ON w.id = le.wallet_id
            WHERE w.owner_type = 'user' AND w.owner_id = $1
            ORDER BY t.created_at DESC
            LIMIT 20
        `, [userId]);
        return {
            wallet,
            todayTopups: (0, wallet_types_1.toMoney)(topupResult.rows[0].total),
            todayWithdrawals: (0, wallet_types_1.toMoney)(withdrawResult.rows[0].total),
            recentTransactions: txnResult.rows
        };
    }
    // ─── Wallet History ──────────────────────────────────────
    /**
     * Paginated ledger history with optional filters.
     */
    async getWalletHistory(filters) {
        const conditions = ['le.wallet_id = $1'];
        const params = [filters.walletId];
        let paramIdx = 2;
        if (filters.entryType) {
            conditions.push(`le.entry_type = $${paramIdx}`);
            params.push(filters.entryType);
            paramIdx++;
        }
        if (filters.fromDate) {
            conditions.push(`le.created_at >= $${paramIdx}`);
            params.push(filters.fromDate);
            paramIdx++;
        }
        if (filters.toDate) {
            conditions.push(`le.created_at <= $${paramIdx}`);
            params.push(filters.toDate);
            paramIdx++;
        }
        const limit = Math.min(filters.limit || 50, 100);
        const offset = filters.offset || 0;
        const whereClause = conditions.join(' AND ');
        const countResult = await this.pool.query(`SELECT COUNT(*) as total FROM ledger_entries le WHERE ${whereClause}`, params);
        const result = await this.pool.query(`
            SELECT 
                le.id, le.txn_id, le.entry_type, le.amount, 
                le.running_balance, le.balance_field, le.note, le.created_at,
                t.reference_no, t.txn_type, t.description, t.status as txn_status
            FROM ledger_entries le
            JOIN transactions t ON t.id = le.txn_id
            WHERE ${whereClause}
            ORDER BY le.created_at DESC, le.id DESC
            LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
        `, [...params, limit, offset]);
        return {
            entries: result.rows,
            total: parseInt(countResult.rows[0].total),
            limit,
            offset
        };
    }
    // ─── Freeze / Unfreeze ───────────────────────────────────
    /**
     * Freeze a wallet (admin action). Prevents all outbound transactions.
     */
    async freezeWallet(walletId, adminUserId, reason, ipAddress, userAgent) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            // Get current state for audit
            const current = await client.query(`SELECT * FROM wallets WHERE id = $1 FOR UPDATE`, [walletId]);
            if (!current.rowCount || current.rowCount === 0) {
                throw new Error(`Wallet ${walletId} not found.`);
            }
            if (current.rows[0].is_frozen) {
                throw new Error(`Wallet ${walletId} is already frozen.`);
            }
            // Freeze the wallet
            await client.query(`
                UPDATE wallets 
                SET is_frozen = TRUE, frozen_reason = $1, frozen_at = NOW(), frozen_by = $2
                WHERE id = $3
            `, [reason, adminUserId, walletId]);
            // Audit log
            await client.query(`
                INSERT INTO wallet_audit_log 
                    (wallet_id, action, actor_user_id, actor_type, old_values, new_values, ip_address, user_agent)
                VALUES ($1, 'freeze', $2, 'admin', $3, $4, $5, $6)
            `, [
                walletId,
                adminUserId,
                JSON.stringify({ is_frozen: false }),
                JSON.stringify({ is_frozen: true, frozen_reason: reason }),
                ipAddress || null,
                userAgent || null
            ]);
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
     * Unfreeze a wallet (admin action).
     */
    async unfreezeWallet(walletId, adminUserId, ipAddress, userAgent) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            const current = await client.query(`SELECT * FROM wallets WHERE id = $1 FOR UPDATE`, [walletId]);
            if (!current.rowCount || current.rowCount === 0) {
                throw new Error(`Wallet ${walletId} not found.`);
            }
            if (!current.rows[0].is_frozen) {
                throw new Error(`Wallet ${walletId} is not frozen.`);
            }
            await client.query(`
                UPDATE wallets 
                SET is_frozen = FALSE, frozen_reason = NULL, frozen_at = NULL, frozen_by = NULL
                WHERE id = $1
            `, [walletId]);
            await client.query(`
                INSERT INTO wallet_audit_log 
                    (wallet_id, action, actor_user_id, actor_type, old_values, new_values, ip_address, user_agent)
                VALUES ($1, 'unfreeze', $2, 'admin', $3, $4, $5, $6)
            `, [
                walletId,
                adminUserId,
                JSON.stringify({ is_frozen: true, frozen_reason: current.rows[0].frozen_reason }),
                JSON.stringify({ is_frozen: false }),
                ipAddress || null,
                userAgent || null
            ]);
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
    // ─── Daily Limits ────────────────────────────────────────
    /**
     * Check if a top-up would exceed today's daily limit.
     */
    async checkTopUpLimit(userId, amount) {
        const wallet = await this.getOrCreateWallet('user', userId);
        const result = await this.pool.query(`
            SELECT COALESCE(SUM(total_amount), 0) as today_total
            FROM transactions
            WHERE initiator_user_id = $1 
              AND txn_type = 'wallet_topup'
              AND status = 'completed'
              AND created_at >= CURRENT_DATE
        `, [userId]);
        const todayTotal = (0, wallet_types_1.toMoney)(result.rows[0].today_total);
        const remaining = (0, wallet_types_1.toMoney)(wallet.daily_topup_limit - todayTotal);
        return {
            allowed: amount <= remaining,
            remaining: Math.max(0, remaining)
        };
    }
    /**
     * Check if a withdrawal would exceed today's daily limit.
     */
    async checkWithdrawLimit(userId, walletId, amount) {
        const wallet = await this.getWalletById(walletId);
        if (!wallet)
            throw new Error('Wallet not found');
        const result = await this.pool.query(`
            SELECT COALESCE(SUM(amount), 0) as today_total
            FROM withdrawal_requests
            WHERE wallet_id = $1
              AND status IN ('requested', 'processing', 'paid')
              AND created_at >= CURRENT_DATE
        `, [walletId]);
        const todayTotal = (0, wallet_types_1.toMoney)(result.rows[0].today_total);
        const remaining = (0, wallet_types_1.toMoney)(wallet.daily_withdraw_limit - todayTotal);
        return {
            allowed: amount <= remaining,
            remaining: Math.max(0, remaining)
        };
    }
    // ─── Internal Helpers ────────────────────────────────────
    mapWalletRow(row) {
        return {
            id: row.id,
            owner_type: row.owner_type,
            owner_id: row.owner_id,
            currency: row.currency,
            available_bal: (0, wallet_types_1.toMoney)(row.available_bal),
            pending_bal: (0, wallet_types_1.toMoney)(row.pending_bal),
            frozen_bal: (0, wallet_types_1.toMoney)(row.frozen_bal || 0),
            lifetime_earned: (0, wallet_types_1.toMoney)(row.lifetime_earned),
            lifetime_spent: (0, wallet_types_1.toMoney)(row.lifetime_spent || 0),
            daily_topup_limit: (0, wallet_types_1.toMoney)(row.daily_topup_limit || 50000),
            daily_withdraw_limit: (0, wallet_types_1.toMoney)(row.daily_withdraw_limit || 25000),
            is_frozen: row.is_frozen || false,
            frozen_reason: row.frozen_reason || null,
            frozen_at: row.frozen_at || null,
            frozen_by: row.frozen_by || null,
            version: Number(row.version || 1),
            created_at: row.created_at,
            updated_at: row.updated_at
        };
    }
}
exports.WalletService = WalletService;
