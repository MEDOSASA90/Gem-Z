"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PushNotificationService = void 0;
const web_push_1 = __importDefault(require("web-push"));
const db_1 = require("../core/database/db");
const publicVapidKey = process.env.VAPID_PUBLIC_KEY;
const privateVapidKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:support@gem-z.com';
const pushEnabled = Boolean(publicVapidKey && privateVapidKey);
if (pushEnabled) {
    web_push_1.default.setVapidDetails(vapidSubject, publicVapidKey, privateVapidKey);
}
else {
    console.warn('[Push] VAPID keys are not configured. Push delivery is disabled.');
}
class PushNotificationService {
    /**
     * Subscribe a user's device to Web Push notifications.
     * The frontend service worker passes the subscription object here.
     */
    static async saveSubscription(userId, subscription) {
        const client = await db_1.db.connect();
        try {
            // Mocking the DB insertion for device push tokens
            /*
            await client.query(`
                INSERT INTO push_subscriptions (user_id, subscription_json)
                VALUES ($1, $2)
                ON CONFLICT (user_id) DO UPDATE SET subscription_json = $2
            `, [userId, JSON.stringify(subscription)]);
            */
            console.log(`[Push] Saved subscription for user: ${userId}`);
            return true;
        }
        catch (error) {
            console.error('[Push] Error saving subscription:', error);
            throw new Error('Database Error');
        }
        finally {
            client.release();
        }
    }
    /**
     * Send a standard push notification payload to a specific user.
     */
    static async notifyUser(userId, payload) {
        const client = await db_1.db.connect();
        try {
            // 1. Fetch user's subscription from DB
            // const res = await client.query('SELECT subscription_json FROM push_subscriptions WHERE user_id = $1', [userId]);
            // if (res.rows.length === 0) return;
            // const sub = res.rows[0].subscription_json;
            // 2. Format payload for service worker
            const pushPayload = JSON.stringify({
                title: payload.title,
                body: payload.body,
                icon: payload.icon || '/gem-z-logo.png',
                data: {
                    url: payload.url || '/'
                }
            });
            // 3. Dispatch Web Push
            if (!pushEnabled) {
                console.warn(`[Push] Skipped notification for ${userId}: VAPID keys are missing.`);
                return;
            }
            try {
                // In production: await webpush.sendNotification(sub, pushPayload);
                console.log(`[Push] Sent to ${userId} -> Title: "${payload.title}"`);
            }
            catch (err) {
                console.error(`[Push] Delivery failed for ${userId}:`, err);
            }
        }
        finally {
            client.release();
        }
    }
    /**
     * Send bulk notification to a topic/squad
     */
    static async notifySquad(squadId, payload) {
        console.log(`[Push] Batch sending to Squad (${squadId}) -> Title: "${payload.title}"`);
        // In reality, SELECT user_id FROM squad_members WHERE squad_id = squadId ... then loop notifyUser()
    }
}
exports.PushNotificationService = PushNotificationService;
