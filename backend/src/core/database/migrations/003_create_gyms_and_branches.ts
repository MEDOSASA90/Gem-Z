/**
 * Migration 003 — Gyms, Branches, Stores & Subscriptions
 *
 * Creates: gyms, gym_branches, gym_pricing_rules, gym_subscription_plans,
 *          gym_subscriptions, stores, store_products, orders, order_items,
 *          trainer_subscription_plans, trainer_subscriptions, attendance_logs
 */

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    // ─── Business Status ENUM ────────────────────────────────────

    await knex.raw(`
        DO $$ BEGIN
            CREATE TYPE business_status AS ENUM ('pending_approval', 'active', 'suspended');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
    `);

    // ─── Subscription Status ENUM ────────────────────────────────

    await knex.raw(`
        DO $$ BEGIN
            CREATE TYPE subscription_status AS ENUM ('active', 'expired', 'cancelled', 'paused', 'pending_payment');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
    `);

    // ─── Order Status ENUM ───────────────────────────────────────

    await knex.raw(`
        DO $$ BEGIN
            CREATE TYPE order_status AS ENUM (
                'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'
            );
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
    `);

    // ─── Gyms ────────────────────────────────────────────────────

    const hasGyms = await knex.schema.hasTable('gyms');
    if (!hasGyms) {
        await knex.schema.createTable('gyms', (table) => {
            table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
            table.uuid('owner_user_id').notNullable().references('id').inTable('users');
            table.string('name', 255).notNullable();
            table.text('logo_url');
            table.text('cover_url');
            table.text('description');
            table.string('status', 20).notNullable().defaultTo('pending_approval');
            table.decimal('platform_fee_pct', 4, 2).notNullable().defaultTo(15.00);
            table.decimal('rating', 3, 2).defaultTo(0.00);
            table.integer('total_reviews').defaultTo(0);
            table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.raw('NOW()'));
            table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.raw('NOW()'));
        });
    }

    // ─── Gym Branches ────────────────────────────────────────────

    const hasBranches = await knex.schema.hasTable('gym_branches');
    if (!hasBranches) {
        await knex.schema.createTable('gym_branches', (table) => {
            table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
            table.uuid('gym_id').notNullable().references('id').inTable('gyms').onDelete('CASCADE');
            table.string('name', 255).notNullable();
            table.text('address').notNullable();
            table.string('city', 100);
            table.decimal('latitude', 10, 8);
            table.decimal('longitude', 11, 8);
            table.string('phone', 20);
            table.integer('capacity');
            table.time('opens_at');
            table.time('closes_at');
            table.specificType('amenities', 'TEXT[]');
            table.string('qr_scanner_token', 128).unique().defaultTo(knex.raw("encode(gen_random_bytes(48), 'base64')"));
            table.boolean('is_active').notNullable().defaultTo(true);
            table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.raw('NOW()'));
        });

        await knex.schema.raw(`CREATE INDEX idx_gym_branches_location ON gym_branches(latitude, longitude)`);
    }

    // ─── Gym Pricing Rules ───────────────────────────────────────

    const hasPricingRules = await knex.schema.hasTable('gym_pricing_rules');
    if (!hasPricingRules) {
        await knex.schema.createTable('gym_pricing_rules', (table) => {
            table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
            table.uuid('branch_id').notNullable().references('id').inTable('gym_branches').onDelete('CASCADE');
            table.string('name', 100).notNullable();
            table.decimal('discount_pct', 4, 2).notNullable();
            table.specificType('valid_days', 'SMALLINT[]').notNullable();
            table.time('start_time').notNullable();
            table.time('end_time').notNullable();
            table.boolean('is_active').notNullable().defaultTo(true);
            table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.raw('NOW()'));
        });
    }

    // ─── Gym Subscription Plans ──────────────────────────────────

    const hasGymPlans = await knex.schema.hasTable('gym_subscription_plans');
    if (!hasGymPlans) {
        await knex.schema.createTable('gym_subscription_plans', (table) => {
            table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
            table.uuid('gym_id').notNullable().references('id').inTable('gyms').onDelete('CASCADE');
            table.uuid('branch_id').references('id').inTable('gym_branches').onDelete('CASCADE');
            table.string('name', 100).notNullable();
            table.integer('duration_days').notNullable();
            table.decimal('base_price_egp', 12, 2).notNullable();
            table.specificType('features', 'TEXT[]');
            table.smallint('max_freezes').defaultTo(0);
            table.boolean('is_active').notNullable().defaultTo(true);
            table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.raw('NOW()'));
        });
    }

    // ─── Gym Subscriptions ───────────────────────────────────────

    const hasGymSubs = await knex.schema.hasTable('gym_subscriptions');
    if (!hasGymSubs) {
        await knex.schema.createTable('gym_subscriptions', (table) => {
            table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
            table.uuid('trainee_id').notNullable().references('id').inTable('users');
            table.uuid('plan_id').notNullable().references('id').inTable('gym_subscription_plans');
            table.uuid('branch_id').references('id').inTable('gym_branches');
            table.uuid('transaction_id').notNullable().references('id').inTable('transactions');
            table.string('status', 20).notNullable().defaultTo('pending_payment');
            table.decimal('amount_paid', 12, 2).notNullable();
            table.decimal('discount_applied', 12, 2).defaultTo(0);
            table.timestamp('starts_at', { useTz: true });
            table.timestamp('expires_at', { useTz: true });
            table.smallint('freeze_days_used').defaultTo(0);
            table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.raw('NOW()'));
        });

        await knex.schema.raw(`CREATE INDEX idx_gym_sub_trainee ON gym_subscriptions(trainee_id)`);
        await knex.schema.raw(`CREATE INDEX idx_gym_sub_expires ON gym_subscriptions(expires_at)`);
    }

    // ─── Trainer Subscription Plans ──────────────────────────────

    const hasTrainerPlans = await knex.schema.hasTable('trainer_subscription_plans');
    if (!hasTrainerPlans) {
        await knex.schema.createTable('trainer_subscription_plans', (table) => {
            table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
            table.uuid('trainer_id').notNullable().references('id').inTable('users');
            table.string('name', 100).notNullable();
            table.integer('duration_days').notNullable();
            table.decimal('price_egp', 12, 2).notNullable();
            table.integer('sessions_count');
            table.boolean('is_online').defaultTo(true);
            table.text('description');
            table.boolean('is_active').notNullable().defaultTo(true);
            table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.raw('NOW()'));
        });
    }

    // ─── Trainer Subscriptions ───────────────────────────────────

    const hasTrainerSubs = await knex.schema.hasTable('trainer_subscriptions');
    if (!hasTrainerSubs) {
        await knex.schema.createTable('trainer_subscriptions', (table) => {
            table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
            table.uuid('trainee_id').notNullable().references('id').inTable('users');
            table.uuid('trainer_id').notNullable().references('id').inTable('users');
            table.uuid('plan_id').notNullable().references('id').inTable('trainer_subscription_plans');
            table.uuid('transaction_id').notNullable().references('id').inTable('transactions');
            table.string('status', 20).notNullable().defaultTo('pending_payment');
            table.decimal('amount_paid', 12, 2).notNullable();
            table.timestamp('starts_at', { useTz: true });
            table.timestamp('expires_at', { useTz: true });
            table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.raw('NOW()'));
        });
    }

    // ─── Attendance Logs ─────────────────────────────────────────

    const hasAttendance = await knex.schema.hasTable('attendance_logs');
    if (!hasAttendance) {
        await knex.schema.createTable('attendance_logs', (table) => {
            table.bigIncrements('id').primary();
            table.uuid('trainee_id').notNullable().references('id').inTable('users');
            table.uuid('branch_id').notNullable().references('id').inTable('gym_branches');
            table.uuid('subscription_id').notNullable().references('id').inTable('gym_subscriptions');
            table.timestamp('checked_in_at', { useTz: true }).notNullable().defaultTo(knex.raw('NOW()'));
            table.timestamp('checked_out_at', { useTz: true });
            table.string('method', 20).defaultTo('qr');
        });

        await knex.schema.raw(`CREATE INDEX idx_attendance_trainee ON attendance_logs(trainee_id)`);
        await knex.schema.raw(`CREATE INDEX idx_attendance_branch ON attendance_logs(branch_id, checked_in_at DESC)`);
    }

    // ─── Stores ──────────────────────────────────────────────────

    const hasStores = await knex.schema.hasTable('stores');
    if (!hasStores) {
        await knex.schema.createTable('stores', (table) => {
            table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
            table.uuid('owner_user_id').notNullable().references('id').inTable('users');
            table.string('name', 255).notNullable();
            table.text('logo_url');
            table.text('description');
            table.string('status', 20).notNullable().defaultTo('pending_approval');
            table.decimal('platform_fee_pct', 4, 2).notNullable().defaultTo(17.50);
            table.decimal('rating', 3, 2).defaultTo(0.00);
            table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.raw('NOW()'));
            table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.raw('NOW()'));
        });
    }

    // ─── Store Products ──────────────────────────────────────────

    const hasProducts = await knex.schema.hasTable('store_products');
    if (!hasProducts) {
        await knex.schema.createTable('store_products', (table) => {
            table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
            table.uuid('store_id').notNullable().references('id').inTable('stores').onDelete('CASCADE');
            table.string('name', 255).notNullable();
            table.text('description');
            table.string('category', 100);
            table.decimal('price_egp', 12, 2).notNullable();
            table.decimal('discount_pct', 4, 2).defaultTo(0.00);
            table.integer('stock_qty').notNullable().defaultTo(0);
            table.specificType('images', 'TEXT[]');
            table.string('sku', 128).unique();
            table.boolean('is_active').notNullable().defaultTo(true);
            table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.raw('NOW()'));
            table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.raw('NOW()'));
        });

        await knex.schema.raw(`CREATE INDEX idx_products_store ON store_products(store_id)`);
        await knex.schema.raw(`CREATE INDEX idx_products_category ON store_products(category)`);
    }

    // ─── Cart Items ──────────────────────────────────────────────

    const hasCartItems = await knex.schema.hasTable('cart_items');
    if (!hasCartItems) {
        await knex.schema.createTable('cart_items', (table) => {
            table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
            table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
            table.uuid('product_id').notNullable().references('id').inTable('store_products').onDelete('CASCADE');
            table.integer('quantity').notNullable().defaultTo(1);
            table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.raw('NOW()'));
        });
    }

    // ─── Orders ──────────────────────────────────────────────────

    const hasOrders = await knex.schema.hasTable('orders');
    if (!hasOrders) {
        await knex.schema.createTable('orders', (table) => {
            table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
            table.uuid('buyer_id').notNullable().references('id').inTable('users');
            table.uuid('store_id').notNullable().references('id').inTable('stores');
            table.uuid('transaction_id').notNullable().references('id').inTable('transactions');
            table.string('status', 20).notNullable().defaultTo('pending');
            table.decimal('subtotal_egp', 12, 2).notNullable();
            table.decimal('discount_egp', 12, 2).defaultTo(0);
            table.decimal('shipping_egp', 12, 2).defaultTo(0);
            table.decimal('total_egp', 12, 2).notNullable();
            table.text('shipping_address');
            table.text('notes');
            table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.raw('NOW()'));
            table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.raw('NOW()'));
        });
    }

    // ─── Order Items ─────────────────────────────────────────────

    const hasOrderItems = await knex.schema.hasTable('order_items');
    if (!hasOrderItems) {
        await knex.schema.createTable('order_items', (table) => {
            table.bigIncrements('id').primary();
            table.uuid('order_id').notNullable().references('id').inTable('orders').onDelete('CASCADE');
            table.uuid('product_id').notNullable().references('id').inTable('store_products');
            table.integer('quantity').notNullable().checkPositive();
            table.decimal('unit_price_egp', 12, 2).notNullable();
            table.decimal('discount_pct', 4, 2).defaultTo(0);
            table.decimal('subtotal_egp', 12, 2).notNullable();
        });
    }

    // ─── Gym Daily Passes ────────────────────────────────────────

    const hasDailyPasses = await knex.schema.hasTable('gym_daily_passes');
    if (!hasDailyPasses) {
        await knex.schema.createTable('gym_daily_passes', (table) => {
            table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
            table.uuid('gym_id').notNullable().references('id').inTable('gyms').onDelete('CASCADE');
            table.uuid('trainee_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
            table.decimal('price_paid', 10, 2).notNullable();
            table.string('qr_code', 255).notNullable().unique();
            table.boolean('is_used').defaultTo(false);
            table.timestamp('scanned_at', { useTz: true });
            table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.raw('NOW()'));
            table.timestamp('expires_at', { useTz: true });
        });
    }

    // ─── Chat Rooms ──────────────────────────────────────────────

    const hasChatRooms = await knex.schema.hasTable('chat_rooms');
    if (!hasChatRooms) {
        await knex.schema.createTable('chat_rooms', (table) => {
            table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
            table.uuid('participant_one').references('id').inTable('users').onDelete('CASCADE');
            table.uuid('participant_two').references('id').inTable('users').onDelete('CASCADE');
            table.timestamp('last_message_at', { useTz: true }).defaultTo(knex.raw('NOW()'));
            table.unique(['participant_one', 'participant_two']);
        });
    }

    // ─── Chat Messages ───────────────────────────────────────────

    const hasChatMessages = await knex.schema.hasTable('chat_messages');
    if (!hasChatMessages) {
        await knex.schema.createTable('chat_messages', (table) => {
            table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
            table.uuid('room_id').notNullable().references('id').inTable('chat_rooms').onDelete('CASCADE');
            table.uuid('sender_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
            table.text('content').notNullable();
            table.string('media_url', 1000);
            table.boolean('is_read').defaultTo(false);
            table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.raw('NOW()'));
        });
    }

    // ─── Trigger: set_updated_at ─────────────────────────────────

    await knex.raw(`
        DO $$ BEGIN
            CREATE TRIGGER trg_gyms_updated_at
                BEFORE UPDATE ON gyms
                FOR EACH ROW EXECUTE FUNCTION set_updated_at();
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;

        DO $$ BEGIN
            CREATE TRIGGER trg_stores_updated_at
                BEFORE UPDATE ON stores
                FOR EACH ROW EXECUTE FUNCTION set_updated_at();
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;

        DO $$ BEGIN
            CREATE TRIGGER trg_store_products_updated_at
                BEFORE UPDATE ON store_products
                FOR EACH ROW EXECUTE FUNCTION set_updated_at();
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;

        DO $$ BEGIN
            CREATE TRIGGER trg_orders_updated_at
                BEFORE UPDATE ON orders
                FOR EACH ROW EXECUTE FUNCTION set_updated_at();
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
    `);
}

export async function down(knex: Knex): Promise<void> {
    const tables = [
        'chat_messages', 'chat_rooms', 'gym_daily_passes', 'order_items', 'orders',
        'cart_items', 'store_products', 'stores', 'attendance_logs',
        'trainer_subscriptions', 'trainer_subscription_plans',
        'gym_subscriptions', 'gym_subscription_plans', 'gym_pricing_rules',
        'gym_branches', 'gyms',
    ];

    for (const table of tables) {
        await knex.schema.dropTableIfExists(table);
    }

    await knex.raw(`
        DROP TYPE IF EXISTS order_status CASCADE;
        DROP TYPE IF EXISTS subscription_status CASCADE;
        DROP TYPE IF EXISTS business_status CASCADE;
    `);
}
