/**
 * Migration 002 — Wallets, Transactions & Ledger System
 *
 * Creates: wallets, transactions, ledger_entries, withdrawal_requests,
 *          transaction_reversals, wallet_audit_log, daily_wallet_snapshots,
 *          idempotency_keys
 */

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    // ─── ENUM Types ──────────────────────────────────────────────

    await knex.raw(`
        DO $$ BEGIN
            CREATE TYPE wallet_owner_type AS ENUM ('user', 'gym', 'store', 'platform');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
    `);

    await knex.raw(`
        DO $$ BEGIN
            CREATE TYPE currency AS ENUM ('EGP', 'USD');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
    `);

    await knex.raw(`
        DO $$ BEGIN
            CREATE TYPE ledger_entry_type AS ENUM ('debit', 'credit');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
    `);

    await knex.raw(`
        DO $$ BEGIN
            CREATE TYPE txn_status AS ENUM ('pending', 'completed', 'failed', 'reversed');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
    `);

    await knex.raw(`
        DO $$ BEGIN
            CREATE TYPE txn_type AS ENUM (
                'subscription_payment', 'order_payment', 'trainer_session_payment',
                'platform_fee', 'gym_settlement', 'store_settlement', 'trainer_settlement',
                'wallet_topup', 'wallet_withdrawal', 'referral_bonus', 'flash_sale_discount',
                'refund', 'adjustment', 'p2p_transfer', 'challenge_entry_fee',
                'challenge_prize_payout', 'freeze', 'unfreeze', 'coins_redemption',
                'platform_credit'
            );
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
    `);

    await knex.raw(`
        DO $$ BEGIN
            CREATE TYPE withdrawal_status AS ENUM ('requested', 'processing', 'paid', 'rejected');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
    `);

    // ─── Wallets ─────────────────────────────────────────────────

    const hasWallets = await knex.schema.hasTable('wallets');
    if (!hasWallets) {
        await knex.schema.createTable('wallets', (table) => {
            table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
            table.string('owner_type', 20).notNullable();
            table.uuid('owner_id').notNullable();
            table.string('currency', 5).notNullable().defaultTo('EGP');
            table.decimal('available_bal', 19, 4).notNullable().defaultTo(0);
            table.decimal('pending_bal', 19, 4).notNullable().defaultTo(0);
            table.decimal('frozen_bal', 19, 4).notNullable().defaultTo(0);
            table.decimal('lifetime_earned', 19, 4).notNullable().defaultTo(0);
            table.decimal('lifetime_spent', 19, 4).notNullable().defaultTo(0);
            table.decimal('daily_topup_limit', 19, 4).notNullable().defaultTo(50000);
            table.decimal('daily_withdraw_limit', 19, 4).notNullable().defaultTo(25000);
            table.boolean('is_frozen').notNullable().defaultTo(false);
            table.text('frozen_reason');
            table.timestamp('frozen_at', { useTz: true });
            table.uuid('frozen_by').references('id').inTable('users');
            table.bigint('version').notNullable().defaultTo(1);
            table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.raw('NOW()'));
            table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.raw('NOW()'));

            table.unique(['owner_type', 'owner_id', 'currency']);
        });

        await knex.schema.raw(`CREATE INDEX idx_wallets_owner ON wallets(owner_type, owner_id)`);
        await knex.schema.raw(`CREATE INDEX idx_wallets_frozen ON wallets(is_frozen) WHERE is_frozen = TRUE`);

        // Insert platform wallet
        await knex.raw(`
            INSERT INTO wallets (owner_type, owner_id, currency)
            SELECT 'platform', uuid_generate_v4(), 'EGP'
            WHERE NOT EXISTS (
                SELECT 1 FROM wallets WHERE owner_type = 'platform' AND currency = 'EGP'
            );
        `);
    }

    // ─── Transactions ────────────────────────────────────────────

    const hasTransactions = await knex.schema.hasTable('transactions');
    if (!hasTransactions) {
        await knex.schema.createTable('transactions', (table) => {
            table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
            table.string('reference_no', 64).notNullable().unique().defaultTo(knex.raw("'TXN-' || upper(substr(md5(random()::text), 1, 12))"));
            table.string('txn_type', 50).notNullable();
            table.string('status', 20).notNullable().defaultTo('pending');
            table.decimal('total_amount', 19, 4).notNullable();
            table.string('currency', 5).notNullable().defaultTo('EGP');
            table.text('description');
            table.uuid('initiator_user_id').references('id').inTable('users');
            table.string('payment_gateway', 50);
            table.text('gateway_ref');
            table.jsonb('metadata');
            table.string('idempotency_key', 128).unique();
            table.uuid('parent_txn_id').references('id').inTable('transactions');
            table.jsonb('gateway_response');
            table.timestamp('failed_at', { useTz: true });
            table.text('failure_reason');
            table.specificType('ip_address', 'INET');
            table.text('user_agent');
            table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.raw('NOW()'));
            table.timestamp('completed_at', { useTz: true });
        });

        await knex.schema.raw(`CREATE INDEX idx_txn_status ON transactions(status)`);
        await knex.schema.raw(`CREATE INDEX idx_txn_type ON transactions(txn_type)`);
        await knex.schema.raw(`CREATE INDEX idx_txn_created ON transactions(created_at DESC)`);
        await knex.schema.raw(`CREATE INDEX idx_txn_initiator ON transactions(initiator_user_id)`);
        await knex.schema.raw(`CREATE INDEX idx_txn_idempotency ON transactions(idempotency_key) WHERE idempotency_key IS NOT NULL`);
        await knex.schema.raw(`CREATE INDEX idx_txn_gateway_ref ON transactions(gateway_ref) WHERE gateway_ref IS NOT NULL`);
        await knex.schema.raw(`CREATE INDEX idx_txn_parent ON transactions(parent_txn_id) WHERE parent_txn_id IS NOT NULL`);
    }

    // ─── Ledger Entries ──────────────────────────────────────────

    const hasLedger = await knex.schema.hasTable('ledger_entries');
    if (!hasLedger) {
        await knex.schema.createTable('ledger_entries', (table) => {
            table.bigIncrements('id').primary();
            table.uuid('txn_id').notNullable().references('id').inTable('transactions');
            table.uuid('wallet_id').notNullable().references('id').inTable('wallets');
            table.string('entry_type', 10).notNullable();
            table.decimal('amount', 19, 4).notNullable();
            table.decimal('running_balance', 19, 4).notNullable();
            table.text('note');
            table.string('balance_field', 20).notNullable().defaultTo('available');
            table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.raw('NOW()'));
        });

        await knex.schema.raw(`CREATE INDEX idx_ledger_txn ON ledger_entries(txn_id)`);
        await knex.schema.raw(`CREATE INDEX idx_ledger_wallet ON ledger_entries(wallet_id)`);

        // Immutability triggers
        await knex.raw(`
            CREATE OR REPLACE FUNCTION prevent_ledger_mutation()
            RETURNS TRIGGER LANGUAGE plpgsql AS $$
            BEGIN
                RAISE EXCEPTION 'LEDGER VIOLATION: ledger_entries is append-only.';
            END;
            $$;

            DO $$ BEGIN
                CREATE TRIGGER trg_ledger_no_update
                    BEFORE UPDATE ON ledger_entries
                    FOR EACH ROW EXECUTE FUNCTION prevent_ledger_mutation();
            EXCEPTION WHEN duplicate_object THEN NULL;
            END $$;

            DO $$ BEGIN
                CREATE TRIGGER trg_ledger_no_delete
                    BEFORE DELETE ON ledger_entries
                    FOR EACH ROW EXECUTE FUNCTION prevent_ledger_mutation();
            EXCEPTION WHEN duplicate_object THEN NULL;
            END $$;
        `);
    }

    // ─── Withdrawal Requests ─────────────────────────────────────

    const hasWithdrawals = await knex.schema.hasTable('withdrawal_requests');
    if (!hasWithdrawals) {
        await knex.schema.createTable('withdrawal_requests', (table) => {
            table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
            table.uuid('wallet_id').notNullable().references('id').inTable('wallets');
            table.uuid('txn_id').references('id').inTable('transactions');
            table.decimal('amount', 19, 4).notNullable();
            table.decimal('fee', 19, 4).notNullable().defaultTo(0);
            table.decimal('net_amount', 19, 4);
            table.string('method', 50).notNullable();
            table.string('account_number', 100);
            table.string('account_name', 255);
            table.string('bank_name', 100);
            table.string('status', 20).notNullable().defaultTo('requested');
            table.text('admin_note');
            table.text('rejection_reason');
            table.decimal('risk_score', 4, 2);
            table.boolean('flagged').notNullable().defaultTo(false);
            table.uuid('requested_by').references('id').inTable('users');
            table.uuid('processed_by').references('id').inTable('users');
            table.timestamp('processed_at', { useTz: true });
            table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.raw('NOW()'));
        });

        await knex.schema.raw(`CREATE INDEX idx_withdrawal_wallet ON withdrawal_requests(wallet_id)`);
        await knex.schema.raw(`CREATE INDEX idx_withdrawal_status ON withdrawal_requests(status)`);
    }

    // ─── Transaction Reversals ───────────────────────────────────

    const hasReversals = await knex.schema.hasTable('transaction_reversals');
    if (!hasReversals) {
        await knex.schema.createTable('transaction_reversals', (table) => {
            table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
            table.uuid('original_txn_id').notNullable().references('id').inTable('transactions');
            table.uuid('reversal_txn_id').notNullable().references('id').inTable('transactions');
            table.text('reason').notNullable();
            table.string('reversal_type', 30).notNullable();
            table.decimal('amount', 19, 4).notNullable();
            table.uuid('initiated_by').notNullable().references('id').inTable('users');
            table.uuid('approved_by').references('id').inTable('users');
            table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.raw('NOW()'));
        });

        await knex.schema.raw(`CREATE INDEX idx_reversals_original ON transaction_reversals(original_txn_id)`);
    }

    // ─── Wallet Audit Log ────────────────────────────────────────

    const hasAuditLog = await knex.schema.hasTable('wallet_audit_log');
    if (!hasAuditLog) {
        await knex.schema.createTable('wallet_audit_log', (table) => {
            table.bigIncrements('id').primary();
            table.uuid('wallet_id').notNullable().references('id').inTable('wallets');
            table.string('action', 50).notNullable();
            table.uuid('actor_user_id').references('id').inTable('users');
            table.string('actor_type', 20).notNullable();
            table.jsonb('old_values');
            table.jsonb('new_values');
            table.specificType('ip_address', 'INET');
            table.text('user_agent');
            table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.raw('NOW()'));
        });

        await knex.schema.raw(`CREATE INDEX idx_audit_wallet ON wallet_audit_log(wallet_id, created_at DESC)`);
        await knex.schema.raw(`CREATE INDEX idx_audit_actor ON wallet_audit_log(actor_user_id)`);
    }

    // ─── Daily Wallet Snapshots ──────────────────────────────────

    const hasSnapshots = await knex.schema.hasTable('daily_wallet_snapshots');
    if (!hasSnapshots) {
        await knex.schema.createTable('daily_wallet_snapshots', (table) => {
            table.bigIncrements('id').primary();
            table.uuid('wallet_id').notNullable().references('id').inTable('wallets');
            table.date('snapshot_date').notNullable();
            table.decimal('available_bal', 19, 4).notNullable();
            table.decimal('pending_bal', 19, 4).notNullable();
            table.decimal('frozen_bal', 19, 4).notNullable();
            table.decimal('ledger_computed_bal', 19, 4).notNullable();
            table.boolean('is_reconciled').notNullable().defaultTo(false);
            table.decimal('discrepancy', 19, 4);
            table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.raw('NOW()'));

            table.unique(['wallet_id', 'snapshot_date']);
        });

        await knex.schema.raw(`CREATE INDEX idx_snapshot_unreconciled ON daily_wallet_snapshots(is_reconciled) WHERE is_reconciled = FALSE`);
    }

    // ─── Idempotency Keys ────────────────────────────────────────

    const hasIdempotency = await knex.schema.hasTable('idempotency_keys');
    if (!hasIdempotency) {
        await knex.schema.createTable('idempotency_keys', (table) => {
            table.string('key', 128).primary();
            table.uuid('txn_id').references('id').inTable('transactions');
            table.uuid('user_id').notNullable().references('id').inTable('users');
            table.integer('response_code').notNullable();
            table.jsonb('response_body').notNullable();
            table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.raw('NOW()'));
            table.timestamp('expires_at', { useTz: true }).notNullable().defaultTo(knex.raw("NOW() + INTERVAL '24 hours'"));
        });

        await knex.schema.raw(`CREATE INDEX idx_idempotency_expires ON idempotency_keys(expires_at)`);
    }

    // ─── Wallet Version Bump Trigger ─────────────────────────────

    await knex.raw(`
        CREATE OR REPLACE FUNCTION trg_wallet_version_bump()
        RETURNS TRIGGER LANGUAGE plpgsql AS $$
        BEGIN
            NEW.version := COALESCE(OLD.version, 0) + 1;
            NEW.updated_at := NOW();
            RETURN NEW;
        END;
        $$;

        DO $$ BEGIN
            CREATE TRIGGER trg_wallets_version
                BEFORE UPDATE ON wallets
                FOR EACH ROW EXECUTE FUNCTION trg_wallet_version_bump();
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
    `);
}

export async function down(knex: Knex): Promise<void> {
    const tables = [
        'idempotency_keys',
        'daily_wallet_snapshots',
        'wallet_audit_log',
        'transaction_reversals',
        'withdrawal_requests',
        'ledger_entries',
        'transactions',
        'wallets',
    ];

    for (const table of tables) {
        await knex.schema.dropTableIfExists(table);
    }

    await knex.raw(`
        DROP TYPE IF EXISTS withdrawal_status CASCADE;
        DROP TYPE IF EXISTS txn_type CASCADE;
        DROP TYPE IF EXISTS txn_status CASCADE;
        DROP TYPE IF EXISTS ledger_entry_type CASCADE;
        DROP TYPE IF EXISTS currency CASCADE;
        DROP TYPE IF EXISTS wallet_owner_type CASCADE;
    `);

    await knex.raw(`DROP FUNCTION IF EXISTS prevent_ledger_mutation() CASCADE;`);
    await knex.raw(`DROP FUNCTION IF EXISTS trg_wallet_version_bump() CASCADE;`);
}
