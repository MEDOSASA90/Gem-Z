"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const zod_1 = require("zod");
const crypto_1 = __importDefault(require("crypto"));
const db_1 = require("../../core/database/db");
const ai_service_1 = require("../../services/ai.service");
const auth_service_1 = require("../../services/auth.service");
const token_service_1 = require("../../services/token.service");
const email_service_1 = require("../../services/email.service");
// ─── Validation Schemas ─────────────────────────────────────
const registerSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email format'),
    password: zod_1.z.string().min(8, 'Password must be at least 8 characters'),
    fullName: zod_1.z.string().min(2, 'Full name must be at least 2 characters'),
    role: zod_1.z.enum(['trainee', 'trainer', 'gym_admin', 'store_admin']).default('trainee'),
    phone: zod_1.z.string().optional(),
    countryCode: zod_1.z.string().optional(),
    gender: zod_1.z.string().optional(),
    dob: zod_1.z.string().optional(),
    referralCode: zod_1.z.string().optional(),
    fitnessLevel: zod_1.z.string().optional(),
    idFrontBase64: zod_1.z.string().optional(),
    idBackBase64: zod_1.z.string().optional(),
    avatarBase64: zod_1.z.string().optional(),
    logoBase64: zod_1.z.string().optional(),
    gymData: zod_1.z.object({
        name: zod_1.z.string().optional(),
        locationUrl: zod_1.z.string().optional(),
        femaleHours: zod_1.z.string().optional(),
        amenities: zod_1.z.array(zod_1.z.string()).optional()
    }).optional(),
    storeData: zod_1.z.object({
        name: zod_1.z.string().optional(),
        category: zod_1.z.string().optional(),
        website: zod_1.z.string().optional()
    }).optional(),
    trainerData: zod_1.z.object({
        specialization: zod_1.z.string().optional(),
        experience: zod_1.z.coerce.number().optional(),
        certs: zod_1.z.array(zod_1.z.string()).optional(),
        bio: zod_1.z.string().optional(),
        social: zod_1.z.string().optional(),
        rate: zod_1.z.coerce.number().optional()
    }).optional()
});
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email format'),
    password: zod_1.z.string().min(1, 'Password is required')
});
const forgotPasswordSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email format')
});
const resetPasswordSchema = zod_1.z.object({
    token: zod_1.z.string().min(1, 'Token is required'),
    newPassword: zod_1.z.string().min(8, 'Password must be at least 8 characters')
});
// ─── Helper ──────────────────────────────────────────────────
function generateSecureToken() {
    return crypto_1.default.randomBytes(32).toString('hex');
}
function getClientIp(req) {
    return req.headers['x-forwarded-for']?.split(',')[0]?.trim()
        || req.socket?.remoteAddress
        || 'unknown';
}
// ─── Controller ─────────────────────────────────────────────
class AuthController {
    /**
     * POST /api/v1/auth/register
     *
     * Maps camelCase request → snake_case DB columns.
     * After registration: sends welcome email + verification email.
     */
    static async register(req, res) {
        let client;
        try {
            // ── 1. Validate input ──
            const data = registerSchema.parse(req.body);
            client = await db_1.db.connect();
            // ── 2. Check for duplicate email ──
            if (await (0, auth_service_1.emailExists)(data.email, client)) {
                client.release();
                return res.status(409).json({
                    success: false,
                    message: 'Email already in use'
                });
            }
            // ── 3. Resolve referral code ──
            let referredByUserId = null;
            if (data.referralCode) {
                referredByUserId = await (0, auth_service_1.resolveReferralCode)(data.referralCode, client);
            }
            // ── 4. Hash password (NEVER store raw) ──
            const passwordHash = await (0, auth_service_1.hashPassword)(data.password);
            await client.query('BEGIN');
            // ── 5. Extract ID data via AI (if images provided) ──
            let idParsedData = null;
            if (data.idFrontBase64 && data.idBackBase64) {
                try {
                    idParsedData = await ai_service_1.AIService.extractIdData(data.idFrontBase64, data.idBackBase64);
                }
                catch (aiErr) {
                    console.warn('[Register] AI ID extraction failed, continuing without:', aiErr.message);
                }
            }
            // ── 6. INSERT user ──
            const userRes = await client.query(`INSERT INTO users 
                    (email, password_hash, full_name, role, phone, country_code, 
                     gender, date_of_birth, referred_by_user_id, id_parsed_data, 
                     avatar_url, fitness_level, status)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'active')
                 RETURNING id, email, role, full_name, referral_code, avatar_url`, [
                data.email.toLowerCase().trim(),
                passwordHash,
                data.fullName,
                data.role,
                data.phone || null,
                data.countryCode || '+20',
                data.gender || null,
                data.dob ? new Date(data.dob) : null,
                referredByUserId,
                idParsedData,
                data.avatarBase64 || null,
                data.fitnessLevel || null
            ]);
            const user = userRes.rows[0];
            // ── 7. Insert role-specific profile ──
            if (data.role === 'trainee') {
                await client.query(`INSERT INTO trainee_profiles (user_id, fitness_level, id_front_url, id_back_url) 
                     VALUES ($1, $2, $3, $4)`, [user.id, data.fitnessLevel || null, data.idFrontBase64 || null, data.idBackBase64 || null]);
            }
            else if (data.role === 'trainer') {
                await client.query(`INSERT INTO trainer_profiles 
                        (user_id, bio, specializations, certifications, years_experience, hourly_rate_egp) 
                     VALUES ($1, $2, $3, $4, $5, $6)`, [
                    user.id,
                    data.trainerData?.bio || null,
                    data.trainerData?.specialization ? [data.trainerData.specialization] : [],
                    data.trainerData?.certs || [],
                    data.trainerData?.experience || 0,
                    data.trainerData?.rate || null
                ]);
            }
            else if (data.role === 'gym_admin' && data.gymData) {
                const gymRes = await client.query(`INSERT INTO gyms 
                        (owner_user_id, name, location_url, female_hours, amenities, logo_url) 
                     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`, [
                    user.id,
                    data.gymData.name || 'Unnamed Gym',
                    data.gymData.locationUrl || null,
                    data.gymData.femaleHours || null,
                    data.gymData.amenities || [],
                    data.logoBase64 || null
                ]);
                await client.query(`INSERT INTO gym_branches (gym_id, name, address) VALUES ($1, 'Main Branch', 'HQ')`, [gymRes.rows[0].id]);
            }
            else if (data.role === 'store_admin' && data.storeData) {
                await client.query(`INSERT INTO stores (owner_user_id, name, description, logo_url) 
                     VALUES ($1, $2, $3, $4)`, [
                    user.id,
                    data.storeData.name || 'Unnamed Store',
                    data.storeData.category || null,
                    data.logoBase64 || null
                ]);
            }
            // ── 8. Create financial wallet ──
            await client.query(`INSERT INTO wallets (owner_type, owner_id, currency) 
                 VALUES ('user', $1, 'EGP') ON CONFLICT DO NOTHING`, [user.id]);
            // ── 9. Create email verification token ──
            const verificationToken = generateSecureToken();
            await client.query(`INSERT INTO email_verification_tokens (user_id, token) VALUES ($1, $2)`, [user.id, verificationToken]);
            await client.query('COMMIT');
            client.release();
            client = null;
            // ── 10. Generate tokens ──
            const { accessToken, refreshToken } = (0, token_service_1.generateTokens)(user);
            // ── 11. Set refresh token as httpOnly cookie ──
            res.cookie('refreshToken', refreshToken, (0, token_service_1.getRefreshCookieOptions)());
            // ── 12. Send emails (non-blocking, don't fail registration if email fails) ──
            Promise.allSettled([
                (0, email_service_1.sendWelcomeEmail)({
                    to: user.email,
                    fullName: user.full_name,
                    role: user.role
                }),
                (0, email_service_1.sendVerificationEmail)({
                    to: user.email,
                    fullName: user.full_name,
                    token: verificationToken
                })
            ]).then(results => {
                results.forEach((r, i) => {
                    if (r.status === 'rejected') {
                        console.warn(`[Register] Email ${i + 1} failed:`, r.reason?.message);
                    }
                });
            });
            return res.status(201).json({
                success: true,
                message: 'User registered successfully. Please check your email to verify your account.',
                data: {
                    accessToken,
                    user: (0, auth_service_1.sanitizeUser)(user)
                }
            });
        }
        catch (error) {
            if (client) {
                try {
                    await client.query('ROLLBACK');
                }
                catch (_) { }
                client.release();
            }
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    data: { errors: error.errors.map(e => ({ field: e.path.join('.'), message: e.message })) }
                });
            }
            console.error('[AuthController] Register Error:', error.message);
            return res.status(500).json({
                success: false,
                message: 'Registration failed. Please try again.'
            });
        }
    }
    /**
     * POST /api/v1/auth/login
     *
     * Returns accessToken in body, sets refreshToken in httpOnly cookie.
     */
    static async login(req, res) {
        try {
            const { email, password } = loginSchema.parse(req.body);
            const user = await (0, auth_service_1.findUserByEmail)(email);
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid email or password'
                });
            }
            const statusError = (0, auth_service_1.validateAccountStatus)(user.status);
            if (statusError) {
                return res.status(403).json({ success: false, message: statusError });
            }
            const isValid = await (0, auth_service_1.verifyPassword)(password, user.password_hash);
            if (!isValid) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid email or password'
                });
            }
            const { accessToken, refreshToken } = (0, token_service_1.generateTokens)(user);
            res.cookie('refreshToken', refreshToken, (0, token_service_1.getRefreshCookieOptions)());
            // Update last login (fire-and-forget)
            (0, auth_service_1.updateLastLogin)(user.id).catch(err => console.error('[AuthController] Failed to update last_login_at:', err.message));
            return res.status(200).json({
                success: true,
                message: 'Login successful',
                data: {
                    accessToken,
                    user: (0, auth_service_1.sanitizeUser)(user)
                }
            });
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    data: { errors: error.errors.map(e => ({ field: e.path.join('.'), message: e.message })) }
                });
            }
            console.error('[AuthController] Login Error:', error.message);
            return res.status(500).json({
                success: false,
                message: 'Login failed. Please try again.'
            });
        }
    }
    /**
     * POST /api/v1/auth/refresh
     *
     * Reads refreshToken from httpOnly cookie.
     * Checks blacklist before issuing a new access token.
     */
    static async refresh(req, res) {
        try {
            const refreshTokenValue = req.cookies?.refreshToken;
            if (!refreshTokenValue) {
                return res.status(401).json({
                    success: false,
                    message: 'No refresh token provided'
                });
            }
            // ── Check blacklist ──
            const blacklisted = await (0, token_service_1.isRefreshTokenBlacklisted)(refreshTokenValue);
            if (blacklisted) {
                res.clearCookie('refreshToken', (0, token_service_1.getClearCookieOptions)());
                return res.status(403).json({
                    success: false,
                    message: 'Session has been revoked. Please log in again.'
                });
            }
            // ── Verify refresh token ──
            let decoded;
            try {
                decoded = (0, token_service_1.verifyRefreshToken)(refreshTokenValue);
            }
            catch {
                return res.status(403).json({
                    success: false,
                    message: 'Invalid or expired refresh token. Please log in again.'
                });
            }
            // ── Look up user ──
            const user = await (0, auth_service_1.findUserById)(decoded.userId);
            if (!user) {
                return res.status(401).json({ success: false, message: 'User not found' });
            }
            const statusError = (0, auth_service_1.validateAccountStatus)(user.status);
            if (statusError) {
                return res.status(403).json({ success: false, message: statusError });
            }
            const accessToken = (0, token_service_1.generateAccessToken)(user);
            return res.status(200).json({
                success: true,
                message: 'Token refreshed',
                data: {
                    accessToken,
                    user: (0, auth_service_1.sanitizeUser)(user)
                }
            });
        }
        catch (error) {
            console.error('[AuthController] Refresh Error:', error.message);
            return res.status(500).json({
                success: false,
                message: 'Token refresh failed. Please log in again.'
            });
        }
    }
    /**
     * POST /api/v1/auth/logout
     *
     * Clears the refresh token cookie AND blacklists the token.
     */
    static async logout(req, res) {
        try {
            const refreshTokenValue = req.cookies?.refreshToken;
            const userId = req.user?.userId;
            // Blacklist the token so it cannot be reused
            if (refreshTokenValue && userId) {
                await (0, token_service_1.blacklistRefreshToken)(refreshTokenValue, userId);
            }
            res.clearCookie('refreshToken', (0, token_service_1.getClearCookieOptions)());
            return res.status(200).json({
                success: true,
                message: 'Logged out successfully'
            });
        }
        catch (error) {
            console.error('[AuthController] Logout Error:', error.message);
            return res.status(500).json({ success: false, message: 'Logout failed' });
        }
    }
    /**
     * GET /api/v1/auth/me
     *
     * Returns the current authenticated user's profile.
     */
    static async me(req, res) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({ success: false, message: 'Not authenticated' });
            }
            const user = await (0, auth_service_1.findUserById)(userId);
            if (!user) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }
            return res.status(200).json({
                success: true,
                data: { user: (0, auth_service_1.sanitizeUser)(user) }
            });
        }
        catch (error) {
            console.error('[AuthController] Me Error:', error.message);
            return res.status(500).json({ success: false, message: 'Failed to fetch user profile' });
        }
    }
    /**
     * GET /api/v1/auth/verify-email?token=xxx
     *
     * Verifies the email address using the token sent in the registration email.
     */
    static async verifyEmail(req, res) {
        try {
            const { token } = req.query;
            if (!token) {
                return res.status(400).json({ success: false, message: 'Verification token is required' });
            }
            const result = await db_1.db.query(`SELECT id, user_id, expires_at, used_at 
                 FROM email_verification_tokens 
                 WHERE token = $1 LIMIT 1`, [token]);
            if (result.rowCount === 0) {
                return res.status(404).json({ success: false, message: 'Invalid verification token' });
            }
            const record = result.rows[0];
            if (record.used_at) {
                return res.status(409).json({ success: false, message: 'This verification link has already been used' });
            }
            if (new Date(record.expires_at) < new Date()) {
                return res.status(410).json({ success: false, message: 'Verification link has expired. Please request a new one.' });
            }
            // Mark token as used + update user
            await db_1.db.query('BEGIN');
            await db_1.db.query(`UPDATE email_verification_tokens SET used_at = NOW() WHERE id = $1`, [record.id]);
            await db_1.db.query(`UPDATE users SET email_verified_at = NOW() WHERE id = $1`, [record.user_id]);
            await db_1.db.query('COMMIT');
            return res.status(200).json({
                success: true,
                message: 'Email verified successfully. Welcome to Gem Z!'
            });
        }
        catch (error) {
            await db_1.db.query('ROLLBACK').catch(() => { });
            console.error('[AuthController] VerifyEmail Error:', error.message);
            return res.status(500).json({ success: false, message: 'Email verification failed' });
        }
    }
    /**
     * POST /api/v1/auth/resend-verification
     *
     * Resends the email verification link.
     */
    static async resendVerification(req, res) {
        try {
            const userId = req.user?.userId;
            const user = await (0, auth_service_1.findUserById)(userId);
            if (!user) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }
            if (user.email_verified_at) {
                return res.status(409).json({ success: false, message: 'Email is already verified' });
            }
            // Invalidate old tokens
            await db_1.db.query(`UPDATE email_verification_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL`, [userId]);
            // Create new token
            const newToken = generateSecureToken();
            await db_1.db.query(`INSERT INTO email_verification_tokens (user_id, token) VALUES ($1, $2)`, [userId, newToken]);
            // Send email (non-blocking)
            (0, email_service_1.sendVerificationEmail)({
                to: user.email,
                fullName: user.full_name,
                token: newToken
            }).catch(err => console.warn('[ResendVerify] Email failed:', err.message));
            return res.status(200).json({
                success: true,
                message: 'Verification email sent. Please check your inbox.'
            });
        }
        catch (error) {
            console.error('[AuthController] ResendVerification Error:', error.message);
            return res.status(500).json({ success: false, message: 'Failed to resend verification email' });
        }
    }
    /**
     * POST /api/v1/auth/forgot-password
     *
     * Initiates password reset flow. Sends a reset link to the user's email.
     */
    static async forgotPassword(req, res) {
        try {
            const { email } = forgotPasswordSchema.parse(req.body);
            const user = await (0, auth_service_1.findUserByEmail)(email);
            // Always return success to prevent email enumeration
            if (!user) {
                return res.status(200).json({
                    success: true,
                    message: 'If this email is registered, you will receive a password reset link shortly.'
                });
            }
            // Invalidate old reset tokens
            await db_1.db.query(`UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL`, [user.id]);
            // Create new token
            const resetToken = generateSecureToken();
            const clientIp = getClientIp(req);
            await db_1.db.query(`INSERT INTO password_reset_tokens (user_id, token, ip_address) VALUES ($1, $2, $3)`, [user.id, resetToken, clientIp]);
            // Send email (non-blocking)
            (0, email_service_1.sendPasswordResetEmail)({
                to: user.email,
                fullName: user.full_name,
                token: resetToken
            }).catch(err => console.warn('[ForgotPassword] Email failed:', err.message));
            return res.status(200).json({
                success: true,
                message: 'If this email is registered, you will receive a password reset link shortly.'
            });
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    data: { errors: error.errors.map(e => ({ field: e.path.join('.'), message: e.message })) }
                });
            }
            console.error('[AuthController] ForgotPassword Error:', error.message);
            return res.status(500).json({ success: false, message: 'Failed to process password reset request' });
        }
    }
    /**
     * POST /api/v1/auth/reset-password
     *
     * Verifies the reset token and sets the new password.
     */
    static async resetPassword(req, res) {
        try {
            const { token, newPassword } = resetPasswordSchema.parse(req.body);
            const result = await db_1.db.query(`SELECT id, user_id, expires_at, used_at 
                 FROM password_reset_tokens 
                 WHERE token = $1 LIMIT 1`, [token]);
            if (result.rowCount === 0) {
                return res.status(404).json({ success: false, message: 'Invalid reset token' });
            }
            const record = result.rows[0];
            if (record.used_at) {
                return res.status(409).json({ success: false, message: 'This reset link has already been used' });
            }
            if (new Date(record.expires_at) < new Date()) {
                return res.status(410).json({ success: false, message: 'Reset link has expired. Please request a new one.' });
            }
            const newHash = await (0, auth_service_1.hashPassword)(newPassword);
            await db_1.db.query('BEGIN');
            // Update password
            await db_1.db.query(`UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`, [newHash, record.user_id]);
            // Mark token as used
            await db_1.db.query(`UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1`, [record.id]);
            // Invalidate all other pending reset tokens for this user
            await db_1.db.query(`UPDATE password_reset_tokens SET used_at = NOW() 
                 WHERE user_id = $1 AND used_at IS NULL AND id != $2`, [record.user_id, record.id]);
            await db_1.db.query('COMMIT');
            return res.status(200).json({
                success: true,
                message: 'Password reset successfully. Please log in with your new password.'
            });
        }
        catch (error) {
            await db_1.db.query('ROLLBACK').catch(() => { });
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    data: { errors: error.errors.map(e => ({ field: e.path.join('.'), message: e.message })) }
                });
            }
            console.error('[AuthController] ResetPassword Error:', error.message);
            return res.status(500).json({ success: false, message: 'Failed to reset password' });
        }
    }
}
exports.AuthController = AuthController;
