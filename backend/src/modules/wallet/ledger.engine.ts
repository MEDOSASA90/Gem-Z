import { Pool, PoolClient } from 'pg';
import { LedgerInstruction, toMoney } from './wallet.types';

/**
 * GEM Z — Double-Entry Ledger Engine
 * 
 * The core atomic unit of the financial system. Every money movement
 * goes through this engine. Guarantees:
 * 
 * 1. Sum of all debits == Sum of all credits for every transaction
 * 2. No wallet ever goes below zero (DB CHECK constraint + app validation)
 * 3. Ledger entries are immutable (DB triggers prevent UPDATE/DELETE)
 * 4. All operations happen inside the caller's transaction boundary
 */
export class LedgerEngine {
    constructor(private pool: Pool) {}

    /**
     * Execute a set of ledger instructions atomically.
     * 
     * IMPORTANT: Must be called with a PoolClient that already has
     * an active transaction (BEGIN has been called).
     * 
     * The wallet rows MUST already be locked with FOR UPDATE before
     * calling this method.
     * 
     * @param client - Active pg transaction client
     * @param txnId - The transaction ID these entries belong to
     * @param instructions - Array of debit/credit instructions
     */
    async executeTransfer(
        client: PoolClient,
        txnId: string,
        instructions: LedgerInstruction[]
    ): Promise<void> {
        if (instructions.length < 2) {
            throw new Error('LEDGER ERROR: A transfer requires at least 2 entries (1 debit + 1 credit).');
        }

        // ── Pre-validate: debits must equal credits ──
        const totalDebits = instructions
            .filter(i => i.entryType === 'debit')
            .reduce((sum, i) => sum + i.amount, 0);
        const totalCredits = instructions
            .filter(i => i.entryType === 'credit')
            .reduce((sum, i) => sum + i.amount, 0);

        if (Math.abs(toMoney(totalDebits) - toMoney(totalCredits)) > 0.0001) {
            throw new Error(
                `LEDGER PRE-CHECK FAILED: debits(${totalDebits}) ≠ credits(${totalCredits}) for txn ${txnId}`
            );
        }

        // ── Execute each instruction ──
        for (const instr of instructions) {
            if (instr.amount <= 0) {
                throw new Error(`LEDGER ERROR: Amount must be positive. Got ${instr.amount} for wallet ${instr.walletId}`);
            }

            const balCol = `${instr.balanceField}_bal`;
            const sign = instr.entryType === 'debit' ? -1 : 1;
            const lifetimeCol = instr.entryType === 'credit' ? 'lifetime_earned' : 'lifetime_spent';

            // Update wallet balance atomically
            const walletResult = await client.query(`
                UPDATE wallets
                SET ${balCol} = ${balCol} + $1,
                    ${lifetimeCol} = ${lifetimeCol} + ABS($1)
                WHERE id = $2 AND is_frozen = FALSE
                RETURNING ${balCol} as new_balance, id
            `, [sign * instr.amount, instr.walletId]);

            if (walletResult.rowCount === 0) {
                throw new Error(
                    `LEDGER ERROR: Wallet ${instr.walletId} not found or is frozen. Cannot ${instr.entryType} ${instr.amount}.`
                );
            }

            const newBalance = toMoney(walletResult.rows[0].new_balance);

            // Defense-in-depth: application-level negative balance check
            // (DB CHECK constraint is the primary guard, this is secondary)
            if (newBalance < 0) {
                throw new Error(
                    `INSUFFICIENT FUNDS: Wallet ${instr.walletId} would go to ${newBalance} after ${instr.entryType} of ${instr.amount}.`
                );
            }

            // Insert immutable ledger line
            await client.query(`
                INSERT INTO ledger_entries 
                    (txn_id, wallet_id, entry_type, amount, running_balance, balance_field, note)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, [
                txnId,
                instr.walletId,
                instr.entryType,
                instr.amount,
                newBalance,
                instr.balanceField,
                instr.note || null
            ]);
        }

        // ── Final DB-level verification ──
        await this.verifyDoubleEntry(client, txnId);
    }

    /**
     * Verify that all ledger entries for a transaction sum to zero.
     * Called after all entries are inserted, before COMMIT.
     */
    async verifyDoubleEntry(client: PoolClient, txnId: string): Promise<void> {
        const result = await client.query(`
            SELECT
                COALESCE(SUM(amount) FILTER (WHERE entry_type = 'debit'), 0) as total_debits,
                COALESCE(SUM(amount) FILTER (WHERE entry_type = 'credit'), 0) as total_credits
            FROM ledger_entries
            WHERE txn_id = $1
        `, [txnId]);

        const { total_debits, total_credits } = result.rows[0];

        if (Math.abs(Number(total_debits) - Number(total_credits)) > 0.0001) {
            throw new Error(
                `LEDGER VIOLATION: Transaction ${txnId} is unbalanced! ` +
                `Debits: ${total_debits}, Credits: ${total_credits}. ROLLING BACK.`
            );
        }
    }

    /**
     * Compute the true balance of a wallet by summing all ledger entries.
     * Used for reconciliation — compares against the denormalized balance.
     */
    async computeBalanceFromLedger(
        walletId: string,
        balanceField: string = 'available'
    ): Promise<number> {
        const result = await this.pool.query(`
            SELECT
                COALESCE(SUM(CASE WHEN entry_type = 'credit' THEN amount ELSE 0 END), 0) -
                COALESCE(SUM(CASE WHEN entry_type = 'debit' THEN amount ELSE 0 END), 0) as computed_balance
            FROM ledger_entries
            WHERE wallet_id = $1 AND balance_field = $2
        `, [walletId, balanceField]);

        return toMoney(result.rows[0].computed_balance);
    }

    /**
     * Get the last N ledger entries for a wallet (for history display).
     */
    async getWalletLedgerHistory(
        walletId: string,
        limit: number = 50,
        offset: number = 0
    ) {
        const result = await this.pool.query(`
            SELECT 
                le.id, le.txn_id, le.entry_type, le.amount, 
                le.running_balance, le.balance_field, le.note, le.created_at,
                t.reference_no, t.txn_type, t.description, t.status
            FROM ledger_entries le
            JOIN transactions t ON t.id = le.txn_id
            WHERE le.wallet_id = $1
            ORDER BY le.created_at DESC, le.id DESC
            LIMIT $2 OFFSET $3
        `, [walletId, limit, offset]);

        return result.rows;
    }
}
