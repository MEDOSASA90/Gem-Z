/**
 * Migration 004 — Social Network: Posts, Comments, Likes & Follows
 *
 * Creates: posts, post_comments, post_likes, comment_likes, follows,
 *          badges, user_badges, leaderboard_snapshots, referral_rewards,
 *          notifications, support_tickets, ticket_replies
 */

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    // ─── ENUM Types ──────────────────────────────────────────────

    await knex.raw(`
        DO $$ BEGIN
            CREATE TYPE post_visibility AS ENUM ('public', 'followers', 'private');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
    `);

    await knex.raw(`
        DO $$ BEGIN
            CREATE TYPE post_type AS ENUM ('update', 'progress_photo', 'achievement', 'question', 'video');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
    `);

    await knex.raw(`
        DO $$ BEGIN
            CREATE TYPE notification_type AS ENUM (
                'social', 'achievement', 'wallet', 'subscription', 'order', 'geofence', 'system'
            );
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
    `);

    await knex.raw(`
        DO $$ BEGIN
            CREATE TYPE ticket_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
    `);

    await knex.raw(`
        DO $$ BEGIN
            CREATE TYPE ticket_priority AS ENUM ('low', 'medium', 'high', 'urgent');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
    `);

    // ─── Posts ───────────────────────────────────────────────────

    const hasPosts = await knex.schema.hasTable('posts');
    if (!hasPosts) {
        await knex.schema.createTable('posts', (table) => {
            table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
            table.uuid('author_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
            table.text('content');
            table.specificType('media_urls', 'TEXT[]');
            table.string('post_type', 20).notNullable().defaultTo('update');
            table.string('visibility', 15).notNullable().defaultTo('public');
            table.integer('likes_count').notNullable().defaultTo(0);
            table.integer('comments_count').notNullable().defaultTo(0);
            table.integer('shares_count').notNullable().defaultTo(0);
            table.boolean('is_pinned').defaultTo(false);
            table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.raw('NOW()'));
            table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.raw('NOW()'));
        });

        await knex.schema.raw(`CREATE INDEX idx_posts_author ON posts(author_id, created_at DESC)`);
        await knex.schema.raw(`CREATE INDEX idx_posts_created ON posts(created_at DESC)`);
    }

    // ─── Post Comments ───────────────────────────────────────────

    const hasComments = await knex.schema.hasTable('post_comments');
    if (!hasComments) {
        await knex.schema.createTable('post_comments', (table) => {
            table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
            table.uuid('post_id').notNullable().references('id').inTable('posts').onDelete('CASCADE');
            table.uuid('author_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
            table.uuid('parent_id').references('id').inTable('post_comments').onDelete('CASCADE');
            table.text('content').notNullable();
            table.integer('likes_count').notNullable().defaultTo(0);
            table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.raw('NOW()'));
        });

        await knex.schema.raw(`CREATE INDEX idx_comments_post ON post_comments(post_id, created_at)`);
    }

    // ─── Post Likes ──────────────────────────────────────────────

    const hasPostLikes = await knex.schema.hasTable('post_likes');
    if (!hasPostLikes) {
        await knex.schema.createTable('post_likes', (table) => {
            table.uuid('post_id').notNullable().references('id').inTable('posts').onDelete('CASCADE');
            table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
            table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.raw('NOW()'));
            table.primary(['post_id', 'user_id']);
        });
    }

    // ─── Comment Likes ───────────────────────────────────────────

    const hasCommentLikes = await knex.schema.hasTable('comment_likes');
    if (!hasCommentLikes) {
        await knex.schema.createTable('comment_likes', (table) => {
            table.uuid('comment_id').notNullable().references('id').inTable('post_comments').onDelete('CASCADE');
            table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
            table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.raw('NOW()'));
            table.primary(['comment_id', 'user_id']);
        });
    }

    // ─── Follows ─────────────────────────────────────────────────

    const hasFollows = await knex.schema.hasTable('follows');
    if (!hasFollows) {
        await knex.schema.createTable('follows', (table) => {
            table.uuid('follower_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
            table.uuid('followee_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
            table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.raw('NOW()'));
            table.primary(['follower_id', 'followee_id']);
            table.check('follower_id <> followee_id');
        });

        await knex.schema.raw(`CREATE INDEX idx_follows_followee ON follows(followee_id)`);
    }

    // ─── Badges ──────────────────────────────────────────────────

    const hasBadges = await knex.schema.hasTable('badges');
    if (!hasBadges) {
        await knex.schema.createTable('badges', (table) => {
            table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
            table.string('name', 100).notNullable().unique();
            table.text('description');
            table.text('icon_url');
            table.string('category', 50);
            table.integer('points_reward').defaultTo(0);
            table.jsonb('trigger_rule');
        });
    }

    // ─── User Badges ─────────────────────────────────────────────

    const hasUserBadges = await knex.schema.hasTable('user_badges');
    if (!hasUserBadges) {
        await knex.schema.createTable('user_badges', (table) => {
            table.bigIncrements('id').primary();
            table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
            table.uuid('badge_id').notNullable().references('id').inTable('badges');
            table.timestamp('awarded_at', { useTz: true }).notNullable().defaultTo(knex.raw('NOW()'));
            table.unique(['user_id', 'badge_id']);
        });
    }

    // ─── Leaderboard Snapshots ───────────────────────────────────

    const hasLeaderboard = await knex.schema.hasTable('leaderboard_snapshots');
    if (!hasLeaderboard) {
        await knex.schema.createTable('leaderboard_snapshots', (table) => {
            table.bigIncrements('id').primary();
            table.string('scope', 30).notNullable();
            table.string('period', 20).notNullable();
            table.uuid('user_id').notNullable().references('id').inTable('users');
            table.integer('rank').notNullable();
            table.integer('score').notNullable();
            table.timestamp('snapped_at', { useTz: true }).notNullable().defaultTo(knex.raw('NOW()'));
        });

        await knex.schema.raw(`CREATE INDEX idx_leaderboard_scope ON leaderboard_snapshots(scope, period, snapped_at DESC)`);
    }

    // ─── Referral Rewards ────────────────────────────────────────

    const hasReferrals = await knex.schema.hasTable('referral_rewards');
    if (!hasReferrals) {
        await knex.schema.createTable('referral_rewards', (table) => {
            table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
            table.uuid('referrer_id').notNullable().references('id').inTable('users');
            table.uuid('referee_id').notNullable().references('id').inTable('users');
            table.string('discount_code', 32).notNullable().unique();
            table.decimal('discount_pct', 4, 2).defaultTo(10.00);
            table.smallint('max_uses').defaultTo(1);
            table.smallint('used_count').defaultTo(0);
            table.timestamp('expires_at', { useTz: true });
            table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.raw('NOW()'));
        });
    }

    // ─── Notifications ───────────────────────────────────────────

    const hasNotifications = await knex.schema.hasTable('notifications');
    if (!hasNotifications) {
        await knex.schema.createTable('notifications', (table) => {
            table.bigIncrements('id').primary();
            table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
            table.string('type', 20).notNullable();
            table.string('title', 200).notNullable();
            table.text('body');
            table.jsonb('data');
            table.boolean('is_read').notNullable().defaultTo(false);
            table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.raw('NOW()'));
        });

        await knex.schema.raw(`CREATE INDEX idx_notif_user_unread ON notifications(user_id, is_read, created_at DESC)`);
    }

    // ─── Support Tickets ─────────────────────────────────────────

    const hasTickets = await knex.schema.hasTable('support_tickets');
    if (!hasTickets) {
        await knex.schema.createTable('support_tickets', (table) => {
            table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
            table.uuid('user_id').notNullable().references('id').inTable('users');
            table.string('subject', 255).notNullable();
            table.text('description').notNullable();
            table.string('status', 15).notNullable().defaultTo('open');
            table.string('priority', 10).notNullable().defaultTo('medium');
            table.uuid('assigned_to').references('id').inTable('users');
            table.timestamp('resolved_at', { useTz: true });
            table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.raw('NOW()'));
        });
    }

    // ─── Ticket Replies ──────────────────────────────────────────

    const hasReplies = await knex.schema.hasTable('ticket_replies');
    if (!hasReplies) {
        await knex.schema.createTable('ticket_replies', (table) => {
            table.bigIncrements('id').primary();
            table.uuid('ticket_id').notNullable().references('id').inTable('support_tickets').onDelete('CASCADE');
            table.uuid('author_id').notNullable().references('id').inTable('users');
            table.text('message').notNullable();
            table.boolean('is_internal').defaultTo(false);
            table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.raw('NOW()'));
        });
    }

    // ─── Recipe Categories ───────────────────────────────────────

    const hasRecipeCategories = await knex.schema.hasTable('recipe_categories');
    if (!hasRecipeCategories) {
        await knex.schema.createTable('recipe_categories', (table) => {
            table.smallIncrements('id').primary();
            table.string('name', 100).notNullable().unique();
            table.string('name_ar', 100);
            table.text('icon');
        });

        // Seed default categories
        await knex('recipe_categories').insert([
            { name: 'Breakfast', name_ar: 'افطار', icon: '🌅' },
            { name: 'Lunch', name_ar: 'غداء', icon: '🍗' },
            { name: 'Dinner', name_ar: 'عشاء', icon: '🍽️' },
            { name: 'Snack', name_ar: 'سناك', icon: '🥪' },
            { name: 'Smoothie', name_ar: 'سموذي', icon: '🥤' },
            { name: 'Pre-Workout', name_ar: 'قبل التمرين', icon: '⚡' },
            { name: 'Post-Workout', name_ar: 'بعد التمرين', icon: '💪' },
        ]).onConflict('name').ignore();
    }

    // ─── Muscle Groups ───────────────────────────────────────────

    const hasMuscleGroups = await knex.schema.hasTable('muscle_groups');
    if (!hasMuscleGroups) {
        await knex.schema.createTable('muscle_groups', (table) => {
            table.smallIncrements('id').primary();
            table.string('name', 100).notNullable().unique();
            table.string('body_part', 50);
        });
    }

    // ─── Trigger: set_updated_at for posts ───────────────────────

    await knex.raw(`
        DO $$ BEGIN
            CREATE TRIGGER trg_posts_updated_at
                BEFORE UPDATE ON posts
                FOR EACH ROW EXECUTE FUNCTION set_updated_at();
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
    `);
}

export async function down(knex: Knex): Promise<void> {
    const tables = [
        'muscle_groups', 'recipe_categories', 'ticket_replies', 'support_tickets',
        'notifications', 'referral_rewards', 'leaderboard_snapshots',
        'user_badges', 'badges', 'follows', 'comment_likes',
        'post_likes', 'post_comments', 'posts',
    ];

    for (const table of tables) {
        await knex.schema.dropTableIfExists(table);
    }

    await knex.raw(`
        DROP TYPE IF EXISTS ticket_priority CASCADE;
        DROP TYPE IF EXISTS ticket_status CASCADE;
        DROP TYPE IF EXISTS notification_type CASCADE;
        DROP TYPE IF EXISTS post_type CASCADE;
        DROP TYPE IF EXISTS post_visibility CASCADE;
    `);
}
