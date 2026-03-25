import { Response } from 'express';
import { AuthRequest } from '../../core/middlewares/auth.middleware';

export class IntegrationController {
    static async syncWearableData(req: AuthRequest, res: Response) {
        try {
            const userId = req.user?.userId;
            const { provider, steps, heartRate, activeCalories } = req.body;
            
            if (!provider || !steps) {
                return res.status(400).json({ success: false, message: 'Missing wearable data source or metrics.' });
            }

            // Mock logic to update user profile with synced data
            return res.status(200).json({
                success: true,
                message: `Successfully synced data from ${provider}`,
                data: { userId, provider, steps, heartRate, activeCalories, lastSynced: new Date().toISOString() }
            });
        } catch (error) {
            console.error('[IntegrationController] syncWearableData:', error);
            res.status(500).json({ success: false, message: 'Server Error during sync' });
        }
    }

    static async triggerPushNotification(req: AuthRequest, res: Response) {
        try {
            const userId = req.user?.userId;
            const { title, body, type } = req.body;

            if (!title || !body) {
                return res.status(400).json({ success: false, message: 'Missing notification payload.' });
            }

            // Mock logic for sending push notifications (e.g. Firebase Cloud Messaging)
            return res.status(200).json({
                success: true,
                message: 'Push notification triggered',
                data: { userId, title, body, type, deliveredAt: new Date().toISOString() }
            });
        } catch (error) {
            console.error('[IntegrationController] triggerPushNotification:', error);
            res.status(500).json({ success: false, message: 'Server Error triggering push notification' });
        }
    }
}
