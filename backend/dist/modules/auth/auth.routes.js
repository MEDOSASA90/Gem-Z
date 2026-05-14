"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_controller_1 = require("./auth.controller");
const auth_middleware_1 = require("../../core/middlewares/auth.middleware");
const rate_limit_middleware_1 = require("../../core/middlewares/rate-limit.middleware");
const router = express_1.default.Router();
// ─── Public Routes ───────────────────────────────────────────
router.post('/register', rate_limit_middleware_1.registerLimiter, auth_controller_1.AuthController.register);
router.post('/login', rate_limit_middleware_1.loginLimiter, auth_controller_1.AuthController.login);
router.post('/refresh', auth_controller_1.AuthController.refresh);
router.post('/logout', auth_middleware_1.verifyToken, auth_controller_1.AuthController.logout);
// Email Verification
router.get('/verify-email', auth_controller_1.AuthController.verifyEmail);
router.post('/resend-verification', auth_middleware_1.verifyToken, auth_controller_1.AuthController.resendVerification);
// Password Reset
router.post('/forgot-password', rate_limit_middleware_1.passwordResetLimiter, auth_controller_1.AuthController.forgotPassword);
router.post('/reset-password', auth_controller_1.AuthController.resetPassword);
// ─── Protected Routes ─────────────────────────────────────────
router.get('/me', auth_middleware_1.verifyToken, auth_controller_1.AuthController.me);
exports.default = router;
