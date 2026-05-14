"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReconciliationService = void 0;
const wallet_types_1 = require("./wallet.types");
const ledger_engine_1 = require("./ledger.engine");
/**
 * GEM Z — Reconciliation Service
 *
 * Daily reconciliation to ensure the denormalized wallet balances
 * match the ground truth computed from ledger entries.
 *
 * Should be run via cron job at end-of-day (e.g., 02:00 UTC).
 */
class ReconciliationService {
    pool;
    ledgerEngine;
    constructor(pool) {
        this.pool = pool;
        this.ledgerEngine = new ledger_engine_1.LedgerEngine(pool);
    }
    /**
     * Take a daily snapshot of all wallets and compare against ledger.
     */
    async snapshotAndReconcile() {
        const today = new Date().toISOString().split('T')[0];
        // Get all wallets
        const wallets = await this.pool.query(`SELECT * FROM wallets ORDER BY id`);
        const discrepancies = [];
        let reconciled = 0;
        for (const wallet of wallets.rows) {
            // Compute balance from ledger entries
            const computedAvailable = await this.ledgerEngine.computeBalanceFromLedger(wallet.id, 'available');
            const storedAvailable = (0, wallet_types_1.toMoney)(wallet.available_bal);
            const discrepancy = (0, wallet_types_1.toMoney)(Math.abs(storedAvailable - computedAvailable));
            const isReconciled = discrepancy < 0.01;
            if (isReconciled) {
                reconciled++;
            }
            else {
                discrepancies.push({
                    walletId: wallet.id,
                    ownerType: wallet.owner_type,
                    ownerId: wallet.owner_id,
                    storedBalance: storedAvailable,
                    computedBalance: computedAvailable,
                    discrepancy
                });
                console.error(`[RECONCILIATION] DISCREPANCY in wallet ${wallet.id} ` +
                    `(${wallet.owner_type}:${wallet.owner_id}): ` +
                    `stored=${storedAvailable}, computed=${computedAvailable}, diff=${discrepancy}`);
            }
            // Save snapshot
            await this.pool.query(`
                INSERT INTO daily_wallet_snapshots 
                    (wallet_id, snapshot_date, available_bal, pending_bal, frozen_bal,
                     ledger_computed_bal, is_reconciled, discrepancy)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                ON CONFLICT (wallet_id, snapshot_date) DO UPDATE SET
                    available_bal = EXCLUDED.available_bal,
                    pending_bal = EXCLUDED.pending_bal,
                    frozen_bal = EXCLUDED.frozen_bal,
                    ledger_computed_bal = EXCLUDED.ledger_computed_bal,
                    is_reconciled = EXCLUDED.is_reconciled,
                    discrepancy = EXCLUDED.discrepancy
            `, [
                wallet.id, today, wallet.available_bal, wallet.pending_bal,
                wallet.frozen_bal || 0, computedAvailable, isReconciled, discrepancy
            ]);
        }
        const report = {
            date: today,
            totalWallets: wallets.rows.length,
            reconciled,
            discrepancies
        };
        console.log(`[RECONCILIATION] ${today}: ${reconciled}/${wallets.rows.length} wallets reconciled. ` +
            `${discrepancies.length} discrepancies found.`);
        return report;
    }
    /**
     * Detect anomalies: unusually large transactions, sudden balance changes.
     */
    async detectAnomalies() {
        const anomalies = [];
        // 1. Find transactions over 10,000 EGP in the last 24 hours
        const largeTransactions = await this.pool.query(`
            SELECT t.*, u.full_name, u.email
            FROM transactions t
            LEFT JOIN users u ON u.id = t.initiator_user_id
            WHERE t.total_amount > 10000 AND t.created_at >= NOW() - INTERVAL '24 hours'
            ORDER BY t.total_amount DESC
        `);
        for (const txn of largeTransactions.rows) {
            anomalies.push({
                type: 'large_transaction',
                severity: 'medium',
                txnId: txn.id,
                amount: txn.total_amount,
                user: txn.full_name || txn.email,
                txnType: txn.txn_type,
                when: txn.created_at
            });
        }
        // 2. Find wallets with > 5 transactions in the last hour (velocity check)
        const highVelocity = await this.pool.query(`
            SELECT t.initiator_user_id, u.full_name, COUNT(*) as txn_count, 
                   SUM(t.total_amount) as total_volume
            FROM transactions t
            LEFT JOIN users u ON u.id = t.initiator_user_id
            WHERE t.created_at >= NOW() - INTERVAL '1 hour'
              AND t.initiator_user_id IS NOT NULL
            GROUP BY t.initiator_user_id, u.full_name
            HAVING COUNT(*) > 5
        `);
        for (const row of highVelocity.rows) {
            anomalies.push({
                type: 'high_velocity',
                severity: 'high',
                userId: row.initiator_user_id,
                user: row.full_name,
                transactionCount: parseInt(row.txn_count),
                totalVolume: row.total_volume,
                window: '1 hour'
            });
        }
        // 3. Find unreconciled wallets from yesterday
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        const unreconciled = await this.pool.query(`
            SELECT * FROM daily_wallet_snapshots 
            WHERE snapshot_date = $1 AND is_reconciled = FALSE
        `, [yesterdayStr]);
        for (const snapshot of unreconciled.rows) {
            anomalies.push({
                type: 'unreconciled_wallet',
                severity: 'critical',
                walletId: snapshot.wallet_id,
                date: yesterdayStr,
                storedBalance: snapshot.available_bal,
                computedBalance: snapshot.ledger_computed_bal,
                discrepancy: snapshot.discrepancy
            });
        }
        return { anomalies };
    }
    /**
     * Get reconciliation report for a specific date.
     */
    async getReportByDate(date) {
        const snapshots = await this.pool.query(`
            SELECT dws.*, w.owner_type, w.owner_id
            FROM daily_wallet_snapshots dws
            JOIN wallets w ON w.id = dws.wallet_id
            WHERE dws.snapshot_date = $1
            ORDER BY dws.is_reconciled ASC, dws.discrepancy DESC NULLS LAST
        `, [date]);
        const totalWallets = snapshots.rows.length;
        const reconciled = snapshots.rows.filter((s) => s.is_reconciled).length;
        const discrepancyRows = snapshots.rows.filter((s) => !s.is_reconciled);
        return {
            date,
            totalWallets,
            reconciled,
            discrepancyCount: discrepancyRows.length,
            snapshots: snapshots.rows
        };
    }
    /**
     * Cleanup old idempotency keys (call via cron).
     */
    async cleanupExpiredKeys() {
        const result = await this.pool.query(`DELETE FROM idempotency_keys WHERE expires_at < NOW()`);
        const deleted = result.rowCount || 0;
        if (deleted > 0) {
            console.log(`[CLEANUP] Removed ${deleted} expired idempotency keys.`);
        }
        return deleted;
    }
}
exports.ReconciliationService = ReconciliationService;
