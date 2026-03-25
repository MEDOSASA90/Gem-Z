import express from 'express';
import { verifyToken as authenticate } from '../../core/middlewares/auth.middleware';
import { IntegrationController } from './integration.controller';

const router = express.Router();

router.post('/wearables/sync', authenticate as any, IntegrationController.syncWearableData as any);
router.post('/notifications/trigger', authenticate as any, IntegrationController.triggerPushNotification as any);

export default router;
