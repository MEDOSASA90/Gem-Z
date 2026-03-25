import express from 'express';
import { ChatController } from './chat.controller';
import { verifyToken as authenticate } from '../../core/middlewares/auth.middleware';

const router = express.Router();

router.get('/history/:contactId', authenticate as any, ChatController.getHistory as any);
router.get('/contacts', authenticate as any, ChatController.getContacts as any);

export default router;
