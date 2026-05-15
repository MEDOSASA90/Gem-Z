/**
 * GEM Z — Push Notification Controller
 *
 * REST API endpoints for push notification management:
 *   POST /api/v1/push/subscribe    — Subscribe device to push
 *   POST /api/v1/push/unsubscribe  — Unsubscribe device
 *   POST /api/v1/push/send         — Admin: send to user/topic
 *   POST /api/v1/push/broadcast    — Admin: broadcast to all
 *   GET  /api/v1/push/templates    — List notification templates
 *   GET  /api/v1/push/status/:id   — Get delivery status
 *   GET  /api/v1/push/vapid-key    — Get VAPID public key
 */

import { Request, Response } from 'express';
import { createLogger } from '../logging/logger';
import { success, apiError } from '../utils/api-response';
import { AuthRequest } from '../middlewares/auth.middleware';
import {
    subscribeUser,
    unsubscribeUser,
    sendToUser,
    sendToTopic,
    broadcast,
    listTemplates,
    getDeliveryStatus,
    isPushEnabled,
    getVapidPublicKey,
    PushNotification,
} from './push.service';

const log = createLogger('push-controller');

// ─── Subscribe ──────────────────────────────────────────────────

/**
 * POST /api/v1/push/subscribe
 * Subscribe a user's device to push notifications.
 */
async function subscribe(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { subscription } = req.body;

    if (!subscription || !subscription.endpoint) {
        res.status(400).json(
            apiError('Push subscription object with endpoint is required', 'VALIDATION_ERROR', 400)
        );
        return;
    }

    try {
        await subscribeUser(userId, subscription);
        log.info({ userId }, 'User subscribed to push notifications');
        res.json(success(null, 'Push notifications enabled'));
    } catch (error) {
        log.error({ error: (error as Error).message, userId }, 'Push subscription failed');
        res.status(500).json(apiError('Failed to subscribe to push notifications', 'SERVER_ERROR', 500));
    }
}

// ─── Unsubscribe ────────────────────────────────────────────────

/**
 * POST /api/v1/push/unsubscribe
 * Unsubscribe a user from push notifications.
 */
async function unsubscribe(req: AuthRequest, res: Response): Promise<void> {
    const userId = req.user!.userId;

    try {
        await unsubscribeUser(userId);
        log.info({ userId }, 'User unsubscribed from push notifications');
        res.json(success(null, 'Push notifications disabled'));
    } catch (error) {
        log.error({ error: (error as Error).message, userId }, 'Push unsubscription failed');
        res.status(500).json(apiError('Failed to unsubscribe', 'SERVER_ERROR', 500));
    }
}

// ─── Send (Admin) ───────────────────────────────────────────────

/**
 * POST /api/v1/push/send
 * Send a push notification to a specific user or topic.
 * Admin only.
 */
async function send(req: AuthRequest, res: Response): Promise<void> {
    const { targetType, target, notification } = req.body;

    // Validate request body
    if (!targetType || !['user', 'topic'].includes(targetType)) {
        res.status(400).json(
            apiError("targetType must be 'user' or 'topic'", 'VALIDATION_ERROR', 400)
        );
        return;
    }

    if (!target) {
        res.status(400).json(apiError('Target is required', 'VALIDATION_ERROR', 400));
        return;
    }

    if (!notification || !notification.title || !notification.body) {
        res.status(400).json(
            apiError('Notification object with title and body is required', 'VALIDATION_ERROR', 400)
        );
        return;
    }

    try {
        const pushNotification: PushNotification = {
            title: notification.title,
            body: notification.body,
            icon: notification.icon,
            badge: notification.badge,
            image: notification.image,
            url: notification.url,
            tag: notification.tag,
            requireInteraction: notification.requireInteraction,
            actions: notification.actions,
            data: notification.data,
            ttl: notification.ttl,
            urgency: notification.urgency,
        };

        if (targetType === 'user') {
            const results = await sendToUser(target, pushNotification);
            const successful = results.filter((r) => r.success).length;
            const failed = results.filter((r) => !r.success).length;

            log.info(
                { target, successful, failed },
                `Push sent to user: ${successful} successful, ${failed} failed`
            );

            res.json(success({ results, successful, failed }, 'Push notification sent'));
        } else {
            const status = await sendToTopic(target, pushNotification);
            log.info(
                { target, total: status.totalRecipients, successful: status.successful },
                `Push sent to topic: ${status.successful}/${status.totalRecipients} delivered`
            );
            res.json(success(status, 'Topic push notification sent'));
        }
    } catch (error) {
        log.error({ error: (error as Error).message }, 'Push send failed');
        res.status(500).json(apiError('Failed to send push notification', 'SERVER_ERROR', 500));
    }
}

// ─── Broadcast (Admin) ──────────────────────────────────────────

/**
 * POST /api/v1/push/broadcast
 * Broadcast a notification to ALL subscribed users.
 * Admin only.
 */
async function broadcastNotification(req: AuthRequest, res: Response): Promise<void> {
    const { notification } = req.body;

    if (!notification || !notification.title || !notification.body) {
        res.status(400).json(
            apiError('Notification object with title and body is required', 'VALIDATION_ERROR', 400)
        );
        return;
    }

    try {
        const pushNotification: PushNotification = {
            title: notification.title,
            body: notification.body,
            icon: notification.icon,
            badge: notification.badge,
            image: notification.image,
            url: notification.url,
            tag: notification.tag,
            requireInteraction: notification.requireInteraction,
            actions: notification.actions,
            data: notification.data,
            ttl: notification.ttl,
            urgency: notification.urgency,
        };

        const status = await broadcast(pushNotification);
        log.info(
            { total: status.totalRecipients, successful: status.successful, failed: status.failed },
            `Broadcast completed: ${status.successful}/${status.totalRecipients} delivered`
        );

        res.json(success(status, 'Broadcast notification sent'));
    } catch (error) {
        log.error({ error: (error as Error).message }, 'Broadcast failed');
        res.status(500).json(apiError('Failed to broadcast notification', 'SERVER_ERROR', 500));
    }
}

// ─── List Templates ─────────────────────────────────────────────

/**
 * GET /api/v1/push/templates
 * List all available notification templates.
 */
function listAllTemplates(_req: Request, res: Response): void {
    const templates = listTemplates();
    res.json(success(templates, `${templates.length} templates found`));
}

// ─── Get Delivery Status ────────────────────────────────────────

/**
 * GET /api/v1/push/status/:id
 * Get the delivery status of a sent notification.
 */
async function getStatus(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    try {
        const status = await getDeliveryStatus(id);
        if (!status) {
            res.status(404).json(apiError('Notification status not found', 'NOT_FOUND_RESOURCE', 404));
            return;
        }
        res.json(success(status));
    } catch (error) {
        log.error({ error: (error as Error).message }, 'Failed to get delivery status');
        res.status(500).json(apiError('Failed to get delivery status', 'SERVER_ERROR', 500));
    }
}

// ─── Get VAPID Public Key ───────────────────────────────────────

/**
 * GET /api/v1/push/vapid-key
 * Get the VAPID public key for frontend push subscription.
 * No auth required — the frontend needs this before subscribing.
 */
function getVapidKey(_req: Request, res: Response): void {
    if (!isPushEnabled()) {
        res.status(503).json(apiError('Push notifications are not configured', 'SERVICE_UNAVAILABLE', 503));
        return;
    }

    res.json(success({ publicKey: getVapidPublicKey() }));
}

// ─── Controller Export ──────────────────────────────────────────

export const PushController = {
    subscribe,
    unsubscribe,
    send,
    broadcastNotification,
    listAllTemplates,
    getStatus,
    getVapidKey,
};
