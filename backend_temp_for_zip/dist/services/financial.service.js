"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinancialEngine = void 0;
const uuid_1 = require("uuid");
/**
 * Strict Double-Entry Financial Engine for GEM Z
 */
class FinancialEngine {
    pool;
    constructor(pool) {
        this.pool = pool;
    }
    /**
     * Processes a subscription payment (e.g., Gym Subscription).
     * Takes the total amount, calculates the gym's cut vs platform fee dynamically,
     * handles the debit from trainee's wallet and credits to gym/platform.
     */
    async processSubscriptionPayment(traineeId, gymId, totalAmountPaid, platformFeePct, // e.g., 15.00
    description) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN'); // START TRANSACTION
            // 1. Calculate splits (precision to 4 decimal places)
            const platformFee = Number(((totalAmountPaid * platformFeePct) / 100).toFixed(4));
            const gymRevenue = Number((totalAmountPaid - platformFee).toFixed(4));
            if (platformFee + gymRevenue !== totalAmountPaid) {
                throw new Error('CRITICAL FATAL DEVIATION: Split sum does not match total amount paid.');
            }
            // 2. Fetch involved wallets, WITH ROW-LEVEL LOCK (FOR UPDATE) to prevent race conditions
            // We need trainee's available wallet, gym's pending wallet, and platform wallet.
            const walletsRes = await client.query(`
        SELECT id, owner_type, owner_id, available_bal, pending_bal 
        FROM wallets 
        WHERE (owner_type = 'user' AND owner_id = $1)
           OR (owner_type = 'gym' AND owner_id = $2)
           OR (owner_type = 'platform')
        FOR UPDATE
      `, [traineeId, gymId]);
            const traineeWallet = walletsRes.rows.find((w) => w.owner_type === 'user');
            const gymWallet = walletsRes.rows.find((w) => w.owner_type === 'gym');
            const platformWallet = walletsRes.rows.find((w) => w.owner_type === 'platform');
            if (!traineeWallet || !gymWallet || !platformWallet) {
                throw new Error('Wallet not found for one of the entities.');
            }
            // 3. Verify balance (Prevent Overdrafts)
            if (Number(traineeWallet.available_bal) < totalAmountPaid) {
                throw new Error('Insufficient funds in trainee wallet.');
            }
            // 4. Create Master Transaction Record
            const txnId = (0, uuid_1.v4)();
            const refNo = `TXN-SUB-${(0, uuid_1.v4)().substring(0, 8).toUpperCase()}`;
            await client.query(`
        INSERT INTO transactions (id, reference_no, txn_type, status, total_amount, currency, description, initiator_user_id, completed_at)
        VALUES ($1, $2, 'subscription_payment', 'completed', $3, 'EGP', $4, $5, NOW())
      `, [txnId, refNo, totalAmountPaid, description, traineeId]);
            // 5. Build Ledger Entries
            // --- DEBIT Trainee ---
            const newTraineeBal = Number(traineeWallet.available_bal) - totalAmountPaid;
            await this.insertLedgerEntryAndMutateWallet(client, txnId, traineeWallet.id, 'debit', totalAmountPaid, newTraineeBal, 'TRAINEE_AVAILABLE');
            // --- CREDIT Gym (To Pending Balance) ---
            const newGymPendingBal = Number(gymWallet.pending_bal) + gymRevenue;
            await this.insertLedgerEntryAndMutateWallet(client, txnId, gymWallet.id, 'credit', gymRevenue, newGymPendingBal, 'GYM_PENDING', Number(gymWallet.lifetime_earned) + gymRevenue);
            // --- CREDIT Platform (To Available Balance) ---
            const newPlatformBal = Number(platformWallet.available_bal) + platformFee;
            await this.insertLedgerEntryAndMutateWallet(client, txnId, platformWallet.id, 'credit', platformFee, newPlatformBal, 'PLATFORM_AVAILABLE', Number(platformWallet.lifetime_earned) + platformFee);
            // 6. Enforce Double-Entry Check
            await this.verifyDoubleEntryOrThrow(client, txnId);
            await client.query('COMMIT'); // SUCCESS
            return txnId;
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
     * Helper: Inserts the immutable ledger row AND updates the target wallet balance.
     */
    async insertLedgerEntryAndMutateWallet(client, txnId, walletId, entryType, amount, runningBalance, targetBalance, newLifetimeEarned) {
        // Insert immutable line
        await client.query(`
      INSERT INTO ledger_entries (txn_id, wallet_id, entry_type, amount, running_balance)
      VALUES ($1, $2, $3, $4, $5)
    `, [txnId, walletId, entryType, amount, runningBalance]);
        // Mutate the actual wallet record
        let updateQuery = '';
        let params = [];
        if (targetBalance === 'TRAINEE_AVAILABLE') {
            updateQuery = 'UPDATE wallets SET available_bal = $1, updated_at = NOW() WHERE id = $2';
            params = [runningBalance, walletId];
        }
        else if (targetBalance === 'GYM_PENDING') {
            updateQuery = 'UPDATE wallets SET pending_bal = $1, lifetime_earned = $2, updated_at = NOW() WHERE id = $3';
            params = [runningBalance, newLifetimeEarned, walletId];
        }
        else if (targetBalance === 'PLATFORM_AVAILABLE') {
            updateQuery = 'UPDATE wallets SET available_bal = $1, lifetime_earned = $2, updated_at = NOW() WHERE id = $3';
            params = [runningBalance, newLifetimeEarned, walletId];
        }
        await client.query(updateQuery, params);
    }
    /**
     * Helper: Hard validation just before commit to ensure total DEBIT == total CREDIT.
     */
    async verifyDoubleEntryOrThrow(client, txnId) {
        const result = await client.query(`
      SELECT 
        COALESCE(SUM(amount) FILTER (WHERE entry_type = 'debit'), 0) as total_debits,
        COALESCE(SUM(amount) FILTER (WHERE entry_type = 'credit'), 0) as total_credits
      FROM ledger_entries
      WHERE txn_id = $1
    `, [txnId]);
        const { total_debits, total_credits } = result.rows[0];
        if (Number(total_debits) !== Number(total_credits)) {
            throw new Error(`LEDGER VIOLATION: Transaction ${txnId} is unbalanced! Debits: ${total_debits}, Credits: ${total_credits}`);
        }
    }
    /**
     * Helper: Deposits platform credit (e.g., from redeeming coins)
     */
    async depositPlatformCredit(userId, amount, description) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            const txnId = (0, uuid_1.v4)();
            await client.query(`
                INSERT INTO transactions (id, reference_no, txn_type, status, total_amount, currency, description, initiator_user_id)
                VALUES ($1, $2, 'platform_credit', 'completed', $3, 'EGP', $4, $5)
            `, [txnId, `TXN-CRD-${(0, uuid_1.v4)().substring(0, 8).toUpperCase()}`, amount, description, userId]);
            await client.query(`
                UPDATE wallets SET available_bal = available_bal + $1 WHERE owner_type = 'user' AND owner_id = $2
            `, [amount, userId]);
            await client.query('COMMIT');
            return txnId;
        }
        catch (e) {
            await client.query('ROLLBACK');
            throw e;
        }
        finally {
            client.release();
        }
    }
}
exports.FinancialEngine = FinancialEngine;
