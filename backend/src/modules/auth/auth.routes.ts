import express from 'express';
import { AuthController } from './auth.controller';
import { verifyToken as authenticate } from '../../core/middlewares/auth.middleware';
import {
    loginLimiter,
    registerLimiter,
    passwordResetLimiter
} from '../../core/middlewares/rate-limit.middleware';

const router = express.Router();

// ─── Public Routes ───────────────────────────────────────────

router.post('/register', registerLimiter, AuthController.register as any);
router.post('/login',    loginLimiter,    AuthController.login as any);
router.post('/refresh',                  AuthController.refresh as any);
router.post('/logout',   authenticate as any, AuthController.logout as any);

// Email Verification
router.get('/verify-email',           AuthController.verifyEmail as any);
router.post('/resend-verification',   authenticate as any, AuthController.resendVerification as any);

// Password Reset
router.post('/forgot-password', passwordResetLimiter, AuthController.forgotPassword as any);
router.post('/reset-password',                        AuthController.resetPassword as any);

// ─── Protected Routes ─────────────────────────────────────────

router.get('/me', authenticate as any, AuthController.me as any);

export default router;
