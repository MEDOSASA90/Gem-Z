import express from 'express';
import { verifyToken as authenticate } from '../../core/middlewares/auth.middleware';
import { UserController } from './user.controller';

const router = express.Router();
const auth = authenticate as any;

router.put('/profile', auth, UserController.updateProfile as any);
router.put('/change-password', auth, UserController.changePassword as any);
router.post('/kyc', auth, UserController.submitKyc as any);

export default router;
