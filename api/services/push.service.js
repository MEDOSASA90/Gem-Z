"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PushNotificationService = void 0;
const web_push_1 = __importDefault(require("web-push"));
const db_1 = require("../core/database/db");
// VAPID keys should be generated using `webpush.generateVAPIDKeys()` and stored in ENV
// We use placeholder keys here or check ENV variables.
const publicVapidKey = process.env.VAPID_PUBLIC_KEY || 'BM_Mock_Public_Key_Gem_Z_Alpha_Numeric_String';
const privateVapidKey = process.env.VAPID_PRIVATE_KEY || 'Mock_Private_Key_Keep_Secure';
web_push_1.default.setVapidDetails('mailto:support@gem-z.com', publicVapidKey, privateVapidKey);
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
            // Mock subscription for simulation logs
            const mockSub = { endpoint: 'https://fcm.googleapis.com/fcm/send/mock', keys: { p256dh: '', auth: '' } };
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
