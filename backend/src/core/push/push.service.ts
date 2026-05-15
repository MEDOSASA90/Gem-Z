/**
 * GEM Z — Push Notification Service
 *
 * Full Web Push integration using VAPID keys.
 * Features:
 *   - Send to specific users
 *   - Send to topics (all trainers, all gym admins)
 *   - Notification templates
 *   - Delivery status tracking
 *   - Batch send for announcements
 *   - Auto-cleanup of expired subscriptions
 *
 * Requires VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY env vars.
 */

import webpush, { PushSubscription as WebPushSubscription } from 'web-push';
import { config } from '../../config';
import { db } from '../database/db';
import { redisClient } from '../redis/client';
import { createLogger } from '../logging/logger';
import {
    NotFoundError,
    ValidationError,
    ServerError,
    AppError,
} from '../errors';

const log = createLogger('push');

// ─── VAPID Setup ────────────────────────────────────────────────

const vapidPublicKey = config.vapid.publicKey;
const vapidPrivateKey = config.vapid.privateKey;
const vapidSubject = config.vapid.subject || 'mailto:support@gemz.app';
const pushEnabled = Boolean(vapidPublicKey && vapidPrivateKey);

if (pushEnabled) {
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
    log.info('Web Push initialized with VAPID keys');
} else {
    log.warn('VAPID keys not configured. Push notifications are DISABLED.');
}

// ─── Types ──────────────────────────────────────────────────────

export interface PushSubscription {
    endpoint: string;
    expirationTime?: number | null;
    keys: {
        p256dh: string;
        auth: string;
    };
}

export interface PushNotification {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    image?: string;
    url?: string;
    tag?: string;
    requireInteraction?: boolean;
    actions?: Array<{
        action: string;
        title: string;
        icon?: string;
    }>;
    data?: Record<string, unknown>;
    /** TTL in seconds (default: 86400 = 24h) */
    ttl?: number;
    /** Urgency: 'very-low' | 'low' | 'normal' | 'high' */
    urgency?: 'very-low' | 'low' | 'normal' | 'high';
}

export interface NotificationTemplate {
    id: string;
    name: string;
    title: { ar: string; en: string };
    body: { ar: string; en: string };
    icon: string;
    url: string;
    category: string;
}

export interface DeliveryResult {
    userId: string;
    success: boolean;
    messageId?: string;
    error?: string;
    timestamp: Date;
}

export interface DeliveryStatus {
    notificationId: string;
    totalRecipients: number;
    successful: number;
    failed: number;
    pending: number;
    results: DeliveryResult[];
    sentAt: Date;
    completedAt?: Date;
}

// ─── Notification Templates ─────────────────────────────────────

const NOTIFICATION_TEMPLATES: Record<string, NotificationTemplate> = {
    subscription_expiring: {
        id: 'subscription_expiring',
        name: 'Subscription Expiring Soon',
        title: { ar: 'اشتراكك على وشك الانتهاء', en: 'Your subscription is expiring soon' },
        body: { ar: 'اشتراكك ينتهي خلال {days} أيام. قم بالتجديد الآن.', en: 'Your subscription expires in {days} days. Renew now.' },
        icon: '/icons/subscription.png',
        url: '/subscriptions',
        category: 'subscription',
    },
    subscription_renewed: {
        id: 'subscription_renewed',
        name: 'Subscription Renewed',
        title: { ar: 'تم تجديد الاشتراك', en: 'Subscription renewed' },
        body: { ar: 'تم تجديد اشتراكك بنجاح.', en: 'Your subscription has been renewed successfully.' },
        icon: '/icons/success.png',
        url: '/subscriptions',
        category: 'subscription',
    },
    payment_received: {
        id: 'payment_received',
        name: 'Payment Received',
        title: { ar: 'تم استلام الدفع', en: 'Payment received' },
        body: { ar: 'تم استلام دفع بقيمة {amount} EGP.', en: 'Payment of {amount} EGP received.' },
        icon: '/icons/payment.png',
        url: '/wallet',
        category: 'payment',
    },
    invoice_ready: {
        id: 'invoice_ready',
        name: 'Invoice Ready',
        title: { ar: 'فاتورتك جاهزة', en: 'Your invoice is ready' },
        body: { ar: 'فاتورة #{invoiceId} جاهزة للتحميل.', en: 'Invoice #{invoiceId} is ready for download.' },
        icon: '/icons/invoice.png',
        url: '/invoices',
        category: 'invoice',
    },
    trainer_assigned: {
        id: 'trainer_assigned',
        name: 'Trainer Assigned',
        title: { ar: 'تم تعيين مدرب جديد', en: 'New trainer assigned' },
        body: { ar: 'تم تعيين المدرب {trainerName} لك.', en: 'Trainer {trainerName} has been assigned to you.' },
        icon: '/icons/trainer.png',
        url: '/training',
        category: 'training',
    },
    workout_reminder: {
        id: 'workout_reminder',
        name: 'Workout Reminder',
        title: { ar: 'تذكير بالتمرين', en: 'Workout reminder' },
        body: { ar: 'حان وقت تمرينك اليومي!', en: 'Time for your daily workout!' },
        icon: '/icons/workout.png',
        url: '/workouts',
        category: 'reminder',
    },
    achievement_unlocked: {
        id: 'achievement_unlocked',
        name: 'Achievement Unlocked',
        title: { ar: 'إنجاز جديد!', en: 'Achievement unlocked!' },
        body: { ar: 'مبروك! لقد حققت: {achievementName}', en: 'Congratulations! You unlocked: {achievementName}' },
        icon: '/icons/achievement.png',
        url: '/achievements',
        category: 'achievement',
    },
    announcement: {
        id: 'announcement',
        name: 'Announcement',
        title: { ar: 'إعلان', en: 'Announcement' },
        body: { ar: '{message}', en: '{message}' },
        icon: '/icons/announcement.png',
        url: '/',
        category: 'announcement',
    },
};

// ─── Subscription Management ────────────────────────────────────

/**
 * Subscribe a user to push notifications.
 * Stores the subscription in the database for later use.
 *
 * @param userId - User ID
 * @param subscription - PushSubscription object from the browser
 */
export async function subscribeUser(
    userId: string,
    subscription: PushSubscription
): Promise<void> {
    if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
        throw new ValidationError(
            'Invalid push subscription: endpoint, p256dh, and auth are required',
            'INVALID_INPUT'
        );
    }

    try {
        await db.query(
            `
            INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, created_at, updated_at)
            VALUES ($1, $2, $3, $4, NOW(), NOW())
            ON CONFLICT (endpoint)
            DO UPDATE SET
                user_id = $1,
                p256dh = $3,
                auth = $4,
                updated_at = NOW()
            `,
            [
                userId,
                subscription.endpoint,
                subscription.keys.p256dh,
                subscription.keys.auth,
            ]
        );

        log.info({ userId, endpoint: subscription.endpoint.slice(0, 50) }, 'Push subscription saved');
    } catch (error) {
        log.error({ error: (error as Error).message, userId }, 'Failed to save push subscription');
        throw new ServerError('Failed to save push subscription', 'PUSH_SUBSCRIPTION_INVALID');
    }
}

/**
 * Unsubscribe a user from push notifications.
 * Removes all subscriptions for the given user.
 *
 * @param userId - User ID
 */
export async function unsubscribeUser(userId: string): Promise<void> {
    try {
        const result = await db.query(
            'DELETE FROM push_subscriptions WHERE user_id = $1 RETURNING endpoint',
            [userId]
        );

        log.info(
            { userId, removed: result.rowCount },
            `Removed ${result.rowCount} push subscription(s) for user`
        );
    } catch (error) {
        log.error({ error: (error as Error).message, userId }, 'Failed to unsubscribe user');
        throw new ServerError('Failed to remove push subscription');
    }
}

/**
 * Remove a specific subscription by endpoint.
 * Called automatically when a push endpoint returns 410 Gone.
 *
 * @param endpoint - Subscription endpoint URL
 */
export async function removeSubscriptionByEndpoint(endpoint: string): Promise<void> {
    try {
        await db.query('DELETE FROM push_subscriptions WHERE endpoint = $1', [endpoint]);
        log.debug({ endpoint: endpoint.slice(0, 50) }, 'Removed expired push subscription');
    } catch (error) {
        log.warn({ error: (error as Error).message }, 'Failed to remove expired subscription');
    }
}

/**
 * Get all subscriptions for a user.
 *
 * @param userId - User ID
 * @returns Array of PushSubscription objects
 */
export async function getUserSubscriptions(userId: string): Promise<PushSubscription[]> {
    const result = await db.query(
        'SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1',
        [userId]
    );

    return result.rows.map((row) => ({
        endpoint: row.endpoint,
        keys: {
            p256dh: row.p256dh,
            auth: row.auth,
        },
    }));
}

// ─── Core Send Functions ────────────────────────────────────────

/**
 * Send a push notification to a specific user.
 * Automatically handles multiple devices per user.
 *
 * @param userId - Target user ID
 * @param notification - Notification payload
 * @returns Delivery results for each device
 */
export async function sendToUser(
    userId: string,
    notification: PushNotification
): Promise<DeliveryResult[]> {
    if (!pushEnabled) {
        log.warn({ userId }, 'Push notifications disabled — VAPID keys not configured');
        return [{ userId, success: false, error: 'Push not configured', timestamp: new Date() }];
    }

    const subscriptions = await getUserSubscriptions(userId);

    if (subscriptions.length === 0) {
        log.debug({ userId }, 'No push subscriptions found for user');
        return [{ userId, success: false, error: 'No subscriptions', timestamp: new Date() }];
    }

    const payload = JSON.stringify({
        title: notification.title,
        body: notification.body,
        icon: notification.icon || '/gem-z-logo.png',
        badge: notification.badge || '/gem-z-badge.png',
        image: notification.image,
        tag: notification.tag || `gemz-${Date.now()}`,
        requireInteraction: notification.requireInteraction || false,
        actions: notification.actions || [],
        data: {
            url: notification.url || '/',
            ...notification.data,
        },
    });

    const results: DeliveryResult[] = [];

    for (const sub of subscriptions) {
        try {
            const webSub: WebPushSubscription = {
                endpoint: sub.endpoint,
                expirationTime: sub.expirationTime ?? null,
                keys: sub.keys,
            };

            const response = await webpush.sendNotification(webSub, payload, {
                TTL: notification.ttl || 86400,
                urgency: notification.urgency || 'normal',
                topic: notification.tag,
            });

            results.push({
                userId,
                success: true,
                messageId: response.headers['location'] || undefined,
                timestamp: new Date(),
            });

            log.debug({ userId, status: response.statusCode }, 'Push notification sent');
        } catch (error) {
            const err = error as webpush.WebPushError;

            // 410 Gone = subscription expired, remove it
            if (err.statusCode === 410 || err.statusCode === 404) {
                await removeSubscriptionByEndpoint(sub.endpoint);
                log.info({ userId, endpoint: sub.endpoint.slice(0, 50) }, 'Removed expired subscription');
            }

            results.push({
                userId,
                success: false,
                error: err.message || 'Unknown error',
                timestamp: new Date(),
            });

            log.warn(
                { userId, status: err.statusCode, error: err.message },
                'Push delivery failed'
            );
        }
    }

    return results;
}

/**
 * Send a push notification to all users subscribed to a topic.
 * Topics are role-based: 'all_trainers', 'all_gym_admins', 'all_store_admins', etc.
 *
 * @param topic - Topic identifier
 * @param notification - Notification payload
 * @returns Aggregated delivery status
 */
export async function sendToTopic(
    topic: string,
    notification: PushNotification
): Promise<DeliveryStatus> {
    if (!pushEnabled) {
        log.warn({ topic }, 'Push notifications disabled — VAPID keys not configured');
        return {
            notificationId: generateNotificationId(),
            totalRecipients: 0,
            successful: 0,
            failed: 0,
            pending: 0,
            results: [],
            sentAt: new Date(),
        };
    }

    log.info({ topic, title: notification.title }, 'Sending push to topic');

    // Map topic to user role
    const roleMap: Record<string, string> = {
        all_trainers: 'trainer',
        all_gym_admins: 'gym_admin',
        all_store_admins: 'store_admin',
        all_trainees: 'trainee',
        all_admins: 'super_admin',
        all_users: '%', // wildcard for all roles
    };

    const role = roleMap[topic];
    if (!role) {
        log.warn({ topic }, 'Unknown topic, no users matched');
        return {
            notificationId: generateNotificationId(),
            totalRecipients: 0,
            successful: 0,
            failed: 0,
            pending: 0,
            results: [],
            sentAt: new Date(),
        };
    }

    try {
        // Find all users with matching role who have push subscriptions
        const query = role === '%'
            ? `SELECT DISTINCT ps.user_id FROM push_subscriptions ps`
            : `SELECT DISTINCT ps.user_id FROM push_subscriptions ps
               JOIN users u ON ps.user_id = u.id
               WHERE u.role = $1`;

        const params = role === '%' ? [] : [role];
        const result = await db.query(query, params);
        const userIds = result.rows.map((row) => row.user_id as string);

        log.info({ topic, userCount: userIds.length }, `Found ${userIds.length} subscribers for topic`);

        // Send to each user
        const notificationId = generateNotificationId();
        const allResults: DeliveryResult[] = [];

        // Process in batches of 50 to avoid overwhelming the push service
        const BATCH_SIZE = 50;
        for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
            const batch = userIds.slice(i, i + BATCH_SIZE);
            const batchPromises = batch.map((uid) => sendToUser(uid, notification));
            const batchResults = await Promise.allSettled(batchPromises);

            for (const r of batchResults) {
                if (r.status === 'fulfilled') {
                    allResults.push(...r.value);
                } else {
                    log.warn({ error: r.reason }, 'Batch send error');
                }
            }
        }

        const status: DeliveryStatus = {
            notificationId,
            totalRecipients: userIds.length,
            successful: allResults.filter((r) => r.success).length,
            failed: allResults.filter((r) => !r.success).length,
            pending: 0,
            results: allResults,
            sentAt: new Date(),
            completedAt: new Date(),
        };

        // Cache delivery status for tracking
        try {
            await redisClient.setex(
                `push:status:${notificationId}`,
                86400, // 24h TTL
                JSON.stringify(status)
            );
        } catch {
            // Cache failure is non-fatal
        }

        log.info(
            { notificationId, total: status.totalRecipients, successful: status.successful, failed: status.failed },
            'Topic push completed'
        );

        return status;
    } catch (error) {
        log.error({ error: (error as Error).message, topic }, 'Topic push failed');
        throw new ServerError('Failed to send topic push notification');
    }
}

/**
 * Broadcast a notification to ALL subscribed users.
 * Use sparingly — this sends to every user with a push subscription.
 *
 * @param notification - Notification payload
 * @returns Delivery status
 */
export async function broadcast(notification: PushNotification): Promise<DeliveryStatus> {
    return sendToTopic('all_users', notification);
}

// ─── Template System ────────────────────────────────────────────

/**
 * Send a notification using a predefined template.
 *
 * @param userId - Target user ID
 * @param templateId - Template identifier
 * @param variables - Key-value replacements for template placeholders
 * @param lang - Language ('ar' | 'en')
 * @returns Delivery results
 */
export async function sendTemplated(
    userId: string,
    templateId: string,
    variables: Record<string, string> = {},
    lang: 'ar' | 'en' = 'en'
): Promise<DeliveryResult[]> {
    const template = NOTIFICATION_TEMPLATES[templateId];
    if (!template) {
        throw new NotFoundError(`Notification template '${templateId}' not found`);
    }

    // Replace placeholders in title and body
    let title = template.title[lang] || template.title.en;
    let body = template.body[lang] || template.body.en;

    for (const [key, value] of Object.entries(variables)) {
        title = title.replace(new RegExp(`{${key}}`, 'g'), value);
        body = body.replace(new RegExp(`{${key}}`, 'g'), value);
    }

    const notification: PushNotification = {
        title,
        body,
        icon: template.icon,
        url: template.url,
        tag: template.id,
    };

    return sendToUser(userId, notification);
}

/**
 * Send a templated notification to a topic.
 *
 * @param topic - Topic identifier
 * @param templateId - Template identifier
 * @param variables - Key-value replacements
 * @param lang - Language
 * @returns Delivery status
 */
export async function sendTemplatedToTopic(
    topic: string,
    templateId: string,
    variables: Record<string, string> = {},
    lang: 'ar' | 'en' = 'en'
): Promise<DeliveryStatus> {
    const template = NOTIFICATION_TEMPLATES[templateId];
    if (!template) {
        throw new NotFoundError(`Notification template '${templateId}' not found`);
    }

    let title = template.title[lang] || template.title.en;
    let body = template.body[lang] || template.body.en;

    for (const [key, value] of Object.entries(variables)) {
        title = title.replace(new RegExp(`{${key}}`, 'g'), value);
        body = body.replace(new RegExp(`{${key}}`, 'g'), value);
    }

    const notification: PushNotification = {
        title,
        body,
        icon: template.icon,
        url: template.url,
        tag: template.id,
    };

    return sendToTopic(topic, notification);
}

/**
 * List all available notification templates.
 *
 * @returns Array of template definitions
 */
export function listTemplates(): NotificationTemplate[] {
    return Object.values(NOTIFICATION_TEMPLATES);
}

/**
 * Get a single template by ID.
 *
 * @param templateId - Template identifier
 * @returns Template definition
 */
export function getTemplate(templateId: string): NotificationTemplate {
    const template = NOTIFICATION_TEMPLATES[templateId];
    if (!template) {
        throw new NotFoundError(`Notification template '${templateId}' not found`);
    }
    return template;
}

// ─── Delivery Tracking ──────────────────────────────────────────

/**
 * Get the delivery status of a sent notification.
 *
 * @param notificationId - Notification ID from delivery status
 * @returns Cached delivery status or null
 */
export async function getDeliveryStatus(notificationId: string): Promise<DeliveryStatus | null> {
    try {
        const cached = await redisClient.get(`push:status:${notificationId}`);
        if (cached) {
            return JSON.parse(cached) as DeliveryStatus;
        }
        return null;
    } catch {
        return null;
    }
}

// ─── Cleanup ────────────────────────────────────────────────────

/**
 * Clean up expired or invalid subscriptions.
 * Should be run periodically (e.g., daily via cron).
 */
export async function cleanupExpiredSubscriptions(): Promise<number> {
    try {
        // Remove subscriptions older than 90 days without updates
        const result = await db.query(
            `
            DELETE FROM push_subscriptions
            WHERE updated_at < NOW() - INTERVAL '90 days'
            RETURNING endpoint
            `
        );

        log.info({ removed: result.rowCount }, `Cleaned up ${result.rowCount} stale subscriptions`);
        return result.rowCount || 0;
    } catch (error) {
        log.error({ error: (error as Error).message }, 'Subscription cleanup failed');
        return 0;
    }
}

// ─── Utility Functions ──────────────────────────────────────────

function generateNotificationId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Check if push notifications are properly configured.
 */
export function isPushEnabled(): boolean {
    return pushEnabled;
}

/**
 * Get VAPID public key for frontend subscription.
 * The frontend needs this to subscribe to push notifications.
 */
export function getVapidPublicKey(): string {
    return vapidPublicKey;
}

/**
 * Register a custom notification template at runtime.
 */
export function registerTemplate(template: NotificationTemplate): void {
    NOTIFICATION_TEMPLATES[template.id] = template;
    log.info({ templateId: template.id }, 'Registered custom notification template');
}
