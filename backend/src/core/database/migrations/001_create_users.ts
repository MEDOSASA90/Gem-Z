/**
 * Migration 001 — Users, Profiles & Authentication
 *
 * Creates: users, trainee_profiles, trainer_profiles tables
 * With: indexes, triggers, and updated_at automation
 */

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    // Enable UUID extension
    await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    await knex.raw('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

    // ─── ENUM Types ──────────────────────────────────────────────

    await knex.raw(`
        DO $$ BEGIN
            CREATE TYPE user_role AS ENUM ('trainee', 'trainer', 'gym_admin', 'store_admin', 'super_admin');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
    `);

    await knex.raw(`
        DO $$ BEGIN
            CREATE TYPE account_status AS ENUM ('pending_verification', 'active', 'suspended', 'banned');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
    `);

    await knex.raw(`
        DO $$ BEGIN
            CREATE TYPE gender AS ENUM ('male', 'female', 'other');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
    `);

    // ─── Users Table ─────────────────────────────────────────────

    const hasUsers = await knex.schema.hasTable('users');
    if (!hasUsers) {
        await knex.schema.createTable('users', (table) => {
            table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
            table.string('email', 255).notNullable().unique();
            table.string('phone', 20).unique();
            table.text('password_hash').notNullable();

            // Role — use raw to avoid Knex enum issues
            table.string('role', 20).notNullable().defaultTo('trainee');
            table.string('status', 30).notNullable().defaultTo('pending_verification');

            table.string('full_name', 255).notNullable();
            table.text('avatar_url');
            table.string('gender', 10);
            table.date('date_of_birth');
            table.string('country', 100).defaultTo('Egypt');
            table.string('city', 100);
            table.string('country_code', 10);
            table.string('fitness_level', 50);

            // Referral system
            table.string('referral_code', 32).unique().defaultTo(knex.raw("substr(md5(random()::text), 1, 8)"));
            table.uuid('referred_by_user_id').references('id').inTable('users').onDelete('SET NULL');

            // Verification
            table.timestamp('email_verified_at', { useTz: true });
            table.timestamp('phone_verified_at', { useTz: true });
            table.timestamp('last_login_at', { useTz: true });

            // Timestamps
            table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.raw('NOW()'));
            table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.raw('NOW()'));
        });

        // Indexes
        await knex.schema.raw('CREATE INDEX idx_users_role ON users(role)');
        await knex.schema.raw('CREATE INDEX idx_users_email ON users(email)');
        await knex.schema.raw('CREATE INDEX idx_users_referral ON users(referral_code)');
    }

    // ─── Trainee Profiles ────────────────────────────────────────

    const hasTraineeProfiles = await knex.schema.hasTable('trainee_profiles');
    if (!hasTraineeProfiles) {
        await knex.schema.createTable('trainee_profiles', (table) => {
            table.uuid('user_id').primary().references('id').inTable('users').onDelete('CASCADE');
            table.decimal('height_cm', 5, 2);
            table.decimal('weight_kg', 5, 2);
            table.decimal('body_fat_pct', 4, 2);
            table.string('fitness_goal', 100);
            table.string('activity_level', 50);
            table.text('health_notes');
            table.string('qr_code_token', 128).unique().defaultTo(knex.raw("encode(gen_random_bytes(48), 'base64')"));
            table.integer('streak_days').notNullable().defaultTo(0);
            table.integer('total_points').notNullable().defaultTo(0);
            table.integer('gems_coins').notNullable().defaultTo(0);
            table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.raw('NOW()'));
        });
    }

    // ─── Trainer Profiles ────────────────────────────────────────

    const hasTrainerProfiles = await knex.schema.hasTable('trainer_profiles');
    if (!hasTrainerProfiles) {
        await knex.schema.createTable('trainer_profiles', (table) => {
            table.uuid('user_id').primary().references('id').inTable('users').onDelete('CASCADE');
            table.text('bio');
            table.specificType('specializations', 'TEXT[]');
            table.specificType('certifications', 'TEXT[]');
            table.smallint('years_experience');
            table.decimal('hourly_rate_egp', 10, 2);
            table.decimal('rating', 3, 2).defaultTo(0.00);
            table.integer('total_reviews').defaultTo(0);
            table.boolean('is_verified').defaultTo(false);
            table.decimal('commission_pct', 4, 2).defaultTo(80.00);
            table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.raw('NOW()'));
        });
    }

    // ─── Updated At Trigger ──────────────────────────────────────

    await knex.raw(`
        CREATE OR REPLACE FUNCTION set_updated_at()
        RETURNS TRIGGER LANGUAGE plpgsql AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$;
    `);

    // Apply triggers to tables
    const tablesWithUpdatedAt = ['users'];
    for (const tableName of tablesWithUpdatedAt) {
        await knex.raw(`
            DO $$ BEGIN
                CREATE TRIGGER trg_${tableName}_updated_at
                    BEFORE UPDATE ON ${tableName}
                    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
            EXCEPTION WHEN duplicate_object THEN NULL;
            END $$;
        `);
    }
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('trainer_profiles');
    await knex.schema.dropTableIfExists('trainee_profiles');
    await knex.schema.dropTableIfExists('users');

    await knex.raw(`
        DROP TYPE IF EXISTS gender CASCADE;
        DROP TYPE IF EXISTS account_status CASCADE;
        DROP TYPE IF EXISTS user_role CASCADE;
    `);

    await knex.raw(`DROP FUNCTION IF EXISTS set_updated_at() CASCADE;`);
}
