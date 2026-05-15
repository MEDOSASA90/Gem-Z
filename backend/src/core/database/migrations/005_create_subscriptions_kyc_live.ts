/**
 * Migration 005 — Subscriptions, KYC & Live Streaming Tables
 *
 * Creates: plans, subscriptions, kyc_submissions, kyc_documents,
 *          live_streams, stream_chat_messages
 */

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    // ─── Subscription Status ENUM ────────────────────────────────

    await knex.raw(`
        DO $$ BEGIN
            CREATE TYPE subscription_status AS ENUM ('active', 'expired', 'cancelled', 'paused', 'pending_payment', 'expiring_soon', 'grace_period');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
    `);

    // ─── Plans ───────────────────────────────────────────────────

    const hasPlans = await knex.schema.hasTable('plans');
    if (!hasPlans) {
        await knex.schema.createTable('plans', (table) => {
            table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
            table.string('name', 100).notNullable();
            table.text('description');
            table.integer('duration_days').notNullable().defaultTo(30);
            table.decimal('price_egp', 12, 2).notNullable();
            table.specificType('features', 'TEXT[]');
            table.boolean('is_active').notNullable().defaultTo(true);
            table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.raw('NOW()'));
            table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.raw('NOW()'));
        });

        // Seed default plans
        await knex('plans').insert([
            {
                name: 'Basic Monthly',
                description: 'Access to gym facilities during off-peak hours',
                duration_days: 30,
                price_egp: 500,
                features: JSON.stringify(['gym_access', 'locker_room', 'off_peak_hours']),
            },
            {
                name: 'Standard Monthly',
                description: 'Full access to gym facilities and group classes',
                duration_days: 30,
                price_egp: 800,
                features: JSON.stringify(['gym_access', 'locker_room', 'all_hours', 'group_classes', 'sauna']),
            },
            {
                name: 'Premium Monthly',
                description: 'Full access plus personal training sessions',
                duration_days: 30,
                price_egp: 1500,
                features: JSON.stringify(['gym_access', 'locker_room', 'all_hours', 'group_classes', 'sauna', 'personal_training', 'nutrition_plan']),
            },
        ]).onConflict().ignore();
    }

    // ─── Subscriptions ───────────────────────────────────────────

    const hasSubscriptions = await knex.schema.hasTable('subscriptions');
    if (!hasSubscriptions) {
        await knex.schema.createTable('subscriptions', (table) => {
            table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
            table.uuid('user_id').notNullable().references('id').inTable('users');
            table.uuid('plan_id').notNullable().references('id').inTable('plans');
            table.string('status', 20).notNullable().defaultTo('active');
            table.timestamp('start_date', { useTz: true }).notNullable().defaultTo(knex.raw('NOW()'));
            table.timestamp('end_date', { useTz: true }).notNullable();
            table.boolean('auto_renew').notNullable().defaultTo(true);
            table.smallint('retry_count').notNullable().defaultTo(0);
            table.timestamp('grace_period_end', { useTz: true });
            table.timestamp('paused_at', { useTz: true });
            table.timestamp('cancelled_at', { useTz: true });
            table.text('cancellation_reason');
            table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.raw('NOW()'));
            table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.raw('NOW()'));
        });

        await knex.schema.raw(`CREATE INDEX idx_subscriptions_user ON subscriptions(user_id)`);
        await knex.schema.raw(`CREATE INDEX idx_subscriptions_status ON subscriptions(status)`);
        await knex.schema.raw(`CREATE INDEX idx_subscriptions_end_date ON subscriptions(end_date)`);
    }

    // ─── KYC Status ENUM ─────────────────────────────────────────

    await knex.raw(`
        DO $$ BEGIN
            CREATE TYPE kyc_status AS ENUM ('pending', 'under_review', 'approved', 'rejected', 'resubmitted');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
    `);

    // ─── KYC Submissions ─────────────────────────────────────────

    const hasKycSubmissions = await knex.schema.hasTable('kyc_submissions');
    if (!hasKycSubmissions) {
        await knex.schema.createTable('kyc_submissions', (table) => {
            table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
            table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
            table.string('status', 20).notNullable().defaultTo('pending');
            table.string('full_name', 255).notNullable();
            table.string('national_id', 14);
            table.date('date_of_birth');
            table.text('address');
            table.string('city', 100);
            table.timestamp('reviewed_at', { useTz: true });
            table.uuid('reviewed_by').references('id').inTable('users');
            table.text('rejection_reason');
            table.text('notes');
            table.smallint('resubmission_count').notNullable().defaultTo(0);
            table.timestamp('submitted_at', { useTz: true }).notNullable().defaultTo(knex.raw('NOW()'));
            table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.raw('NOW()'));
        });

        await knex.schema.raw(`CREATE INDEX idx_kyc_user ON kyc_submissions(user_id)`);
        await knex.schema.raw(`CREATE INDEX idx_kyc_status ON kyc_submissions(status)`);
    }

    // ─── KYC Documents ───────────────────────────────────────────

    const hasKycDocuments = await knex.schema.hasTable('kyc_documents');
    if (!hasKycDocuments) {
        await knex.schema.createTable('kyc_documents', (table) => {
            table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
            table.uuid('submission_id').notNullable().references('id').inTable('kyc_submissions').onDelete('CASCADE');
            table.string('type', 50).notNullable();
            table.text('url').notNullable();
            table.timestamp('uploaded_at', { useTz: true }).notNullable().defaultTo(knex.raw('NOW()'));
        });

        await knex.schema.raw(`CREATE INDEX idx_kyc_docs_submission ON kyc_documents(submission_id)`);
    }

    // ─── Stream Status ENUM ──────────────────────────────────────

    await knex.raw(`
        DO $$ BEGIN
            CREATE TYPE stream_status AS ENUM ('live', 'ended', 'scheduled');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
    `);

    // ─── Live Streams ────────────────────────────────────────────

    const hasLiveStreams = await knex.schema.hasTable('live_streams');
    if (!hasLiveStreams) {
        await knex.schema.createTable('live_streams', (table) => {
            table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
            table.uuid('host_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
            table.string('title', 255).notNullable();
            table.text('description');
            table.text('thumbnail_url');
            table.string('status', 20).notNullable().defaultTo('live');
            table.text('stream_url');
            table.string('room_token', 255).notNullable();
            table.specificType('tags', 'TEXT[]');
            table.timestamp('started_at', { useTz: true }).notNullable().defaultTo(knex.raw('NOW()'));
            table.timestamp('ended_at', { useTz: true });
            table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.raw('NOW()'));
        });

        await knex.schema.raw(`CREATE INDEX idx_live_streams_host ON live_streams(host_id)`);
        await knex.schema.raw(`CREATE INDEX idx_live_streams_status ON live_streams(status)`);
    }

    // ─── Stream Chat Messages ────────────────────────────────────

    const hasStreamChat = await knex.schema.hasTable('stream_chat_messages');
    if (!hasStreamChat) {
        await knex.schema.createTable('stream_chat_messages', (table) => {
            table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
            table.uuid('stream_id').notNullable().references('id').inTable('live_streams').onDelete('CASCADE');
            table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
            table.string('user_name', 255).notNullable();
            table.text('message').notNullable();
            table.timestamp('sent_at', { useTz: true }).notNullable().defaultTo(knex.raw('NOW()'));
        });

        await knex.schema.raw(`CREATE INDEX idx_stream_chat_stream ON stream_chat_messages(stream_id, sent_at DESC)`);
        await knex.schema.raw(`CREATE INDEX idx_stream_chat_user ON stream_chat_messages(user_id)`);
    }

    // ─── Financial Transactions type update ──────────────────────

    // Add subscription_renewal to txn_type if not exists (handled gracefully)
    await knex.raw(`
        DO $$ BEGIN
            ALTER TYPE txn_type ADD VALUE IF NOT EXISTS 'subscription_renewal';
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
    `);

    await knex.raw(`
        DO $$ BEGIN
            ALTER TYPE txn_type ADD VALUE IF NOT EXISTS 'subscription_purchase';
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
    `);

    await knex.raw(`
        DO $$ BEGIN
            ALTER TYPE txn_type ADD VALUE IF NOT EXISTS 'gym_pass';
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
    `);

    // ─── Triggers ────────────────────────────────────────────────

    await knex.raw(`
        DO $$ BEGIN
            CREATE TRIGGER trg_plans_updated_at
                BEFORE UPDATE ON plans
                FOR EACH ROW EXECUTE FUNCTION set_updated_at();
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;

        DO $$ BEGIN
            CREATE TRIGGER trg_subscriptions_updated_at
                BEFORE UPDATE ON subscriptions
                FOR EACH ROW EXECUTE FUNCTION set_updated_at();
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;

        DO $$ BEGIN
            CREATE TRIGGER trg_kyc_submissions_updated_at
                BEFORE UPDATE ON kyc_submissions
                FOR EACH ROW EXECUTE FUNCTION set_updated_at();
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;

        DO $$ BEGIN
            CREATE TRIGGER trg_live_streams_updated_at
                BEFORE UPDATE ON live_streams
                FOR EACH ROW EXECUTE FUNCTION set_updated_at();
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
    `);
}

export async function down(knex: Knex): Promise<void> {
    const tables = [
        'stream_chat_messages',
        'live_streams',
        'kyc_documents',
        'kyc_submissions',
        'subscriptions',
        'plans',
    ];

    for (const table of tables) {
        await knex.schema.dropTableIfExists(table);
    }

    await knex.raw(`
        DROP TYPE IF EXISTS stream_status CASCADE;
        DROP TYPE IF EXISTS kyc_status CASCADE;
        DROP TYPE IF EXISTS subscription_status CASCADE;
    `);
}
