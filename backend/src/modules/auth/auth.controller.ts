import { Request, Response } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { db } from '../../core/database/db';
import { AIService } from '../../services/ai.service';
import {
    hashPassword, verifyPassword, findUserByEmail, findUserById,
    emailExists, resolveReferralCode, updateLastLogin,
    validateAccountStatus, sanitizeUser
} from '../../services/auth.service';
import {
    generateTokens, generateAccessToken, verifyRefreshToken,
    getRefreshCookieOptions, getClearCookieOptions,
    blacklistRefreshToken, isRefreshTokenBlacklisted
} from '../../services/token.service';
import {
    sendWelcomeEmail, sendVerificationEmail, sendPasswordResetEmail
} from '../../services/email.service';

// ─── Validation Schemas ─────────────────────────────────────

const registerSchema = z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    fullName: z.string().min(2, 'Full name must be at least 2 characters'),
    role: z.enum(['trainee', 'trainer', 'gym_admin', 'store_admin']).default('trainee'),
    phone: z.string().optional(),
    countryCode: z.string().optional(),
    gender: z.string().optional(),
    dob: z.string().optional(),
    referralCode: z.string().optional(),
    fitnessLevel: z.string().optional(),
    idFrontBase64: z.string().optional(),
    idBackBase64: z.string().optional(),
    avatarBase64: z.string().optional(),
    logoBase64: z.string().optional(),
    gymData: z.object({
        name: z.string().optional(),
        locationUrl: z.string().optional(),
        femaleHours: z.string().optional(),
        amenities: z.array(z.string()).optional()
    }).optional(),
    storeData: z.object({
        name: z.string().optional(),
        category: z.string().optional(),
        website: z.string().optional()
    }).optional(),
    trainerData: z.object({
        specialization: z.string().optional(),
        experience: z.coerce.number().optional(),
        certs: z.array(z.string()).optional(),
        bio: z.string().optional(),
        social: z.string().optional(),
        rate: z.coerce.number().optional()
    }).optional()
});

const loginSchema = z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required')
});

const forgotPasswordSchema = z.object({
    email: z.string().email('Invalid email format')
});

const resetPasswordSchema = z.object({
    token: z.string().min(1, 'Token is required'),
    newPassword: z.string().min(8, 'Password must be at least 8 characters')
});

// ─── Helper ──────────────────────────────────────────────────

function generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex');
}

function getClientIp(req: Request): string {
    return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
        || req.socket?.remoteAddress
        || 'unknown';
}

// ─── Controller ─────────────────────────────────────────────

export class AuthController {

    /**
     * POST /api/v1/auth/register
     *
     * Maps camelCase request → snake_case DB columns.
     * After registration: sends welcome email + verification email.
     */
    static async register(req: Request, res: Response) {
        let client;
        try {
            // ── 1. Validate input ──
            const data = registerSchema.parse(req.body);

            client = await db.connect();

            // ── 2. Check for duplicate email ──
            if (await emailExists(data.email, client)) {
                client.release();
                return res.status(409).json({
                    success: false,
                    message: 'Email already in use'
                });
            }

            // ── 3. Resolve referral code ──
            let referredByUserId: string | null = null;
            if (data.referralCode) {
                referredByUserId = await resolveReferralCode(data.referralCode, client);
            }

            // ── 4. Hash password (NEVER store raw) ──
            const passwordHash = await hashPassword(data.password);

            await client.query('BEGIN');

            // ── 5. Extract ID data via AI (if images provided) ──
            let idParsedData = null;
            if (data.idFrontBase64 && data.idBackBase64) {
                try {
                    idParsedData = await AIService.extractIdData(data.idFrontBase64, data.idBackBase64);
                } catch (aiErr) {
                    console.warn('[Register] AI ID extraction failed, continuing without:', (aiErr as Error).message);
                }
            }

            // ── 6. INSERT user ──
            const userRes = await client.query(
                `INSERT INTO users 
                    (email, password_hash, full_name, role, phone, country_code, 
                     gender, date_of_birth, referred_by_user_id, id_parsed_data, 
                     avatar_url, fitness_level, status)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'active')
                 RETURNING id, email, role, full_name, referral_code, avatar_url`,
                [
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
                ]
            );
            const user = userRes.rows[0];

            // ── 7. Insert role-specific profile ──
            if (data.role === 'trainee') {
                await client.query(
                    `INSERT INTO trainee_profiles (user_id, fitness_level, id_front_url, id_back_url) 
                     VALUES ($1, $2, $3, $4)`,
                    [user.id, data.fitnessLevel || null, data.idFrontBase64 || null, data.idBackBase64 || null]
                );
            } else if (data.role === 'trainer') {
                await client.query(
                    `INSERT INTO trainer_profiles 
                        (user_id, bio, specializations, certifications, years_experience, hourly_rate_egp) 
                     VALUES ($1, $2, $3, $4, $5, $6)`,
                    [
                        user.id,
                        data.trainerData?.bio || null,
                        data.trainerData?.specialization ? [data.trainerData.specialization] : [],
                        data.trainerData?.certs || [],
                        data.trainerData?.experience || 0,
                        data.trainerData?.rate || null
                    ]
                );
            } else if (data.role === 'gym_admin' && data.gymData) {
                const gymRes = await client.query(
                    `INSERT INTO gyms 
                        (owner_user_id, name, location_url, female_hours, amenities, logo_url) 
                     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
                    [
                        user.id,
                        data.gymData.name || 'Unnamed Gym',
                        data.gymData.locationUrl || null,
                        data.gymData.femaleHours || null,
                        data.gymData.amenities || [],
                        data.logoBase64 || null
                    ]
                );
                await client.query(
                    `INSERT INTO gym_branches (gym_id, name, address) VALUES ($1, 'Main Branch', 'HQ')`,
                    [gymRes.rows[0].id]
                );
            } else if (data.role === 'store_admin' && data.storeData) {
                await client.query(
                    `INSERT INTO stores (owner_user_id, name, description, logo_url) 
                     VALUES ($1, $2, $3, $4)`,
                    [
                        user.id,
                        data.storeData.name || 'Unnamed Store',
                        data.storeData.category || null,
                        data.logoBase64 || null
                    ]
                );
            }

            // ── 8. Create financial wallet ──
            await client.query(
                `INSERT INTO wallets (owner_type, owner_id, currency) 
                 VALUES ('user', $1, 'EGP') ON CONFLICT DO NOTHING`,
                [user.id]
            );

            // ── 9. Create email verification token ──
            const verificationToken = generateSecureToken();
            await client.query(
                `INSERT INTO email_verification_tokens (user_id, token) VALUES ($1, $2)`,
                [user.id, verificationToken]
            );

            await client.query('COMMIT');
            client.release();
            client = null;

            // ── 10. Generate tokens ──
            const { accessToken, refreshToken } = generateTokens(user);

            // ── 11. Set refresh token as httpOnly cookie ──
            res.cookie('refreshToken', refreshToken, getRefreshCookieOptions());

            // ── 12. Send emails (non-blocking, don't fail registration if email fails) ──
            Promise.allSettled([
                sendWelcomeEmail({
                    to: user.email,
                    fullName: user.full_name,
                    role: user.role
                }),
                sendVerificationEmail({
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
                    user: sanitizeUser(user)
                }
            });

        } catch (error) {
            if (client) {
                try { await client.query('ROLLBACK'); } catch (_) {}
                client.release();
            }

            if (error instanceof z.ZodError) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    data: { errors: error.errors.map(e => ({ field: e.path.join('.'), message: e.message })) }
                });
            }

            console.error('[AuthController] Register Error:', (error as Error).message);
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
    static async login(req: Request, res: Response) {
        try {
            const { email, password } = loginSchema.parse(req.body);

            const user = await findUserByEmail(email);
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid email or password'
                });
            }

            const statusError = validateAccountStatus(user.status);
            if (statusError) {
                return res.status(403).json({ success: false, message: statusError });
            }

            const isValid = await verifyPassword(password, user.password_hash);
            if (!isValid) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid email or password'
                });
            }

            const { accessToken, refreshToken } = generateTokens(user);
            res.cookie('refreshToken', refreshToken, getRefreshCookieOptions());

            // Update last login (fire-and-forget)
            updateLastLogin(user.id).catch(err =>
                console.error('[AuthController] Failed to update last_login_at:', err.message)
            );

            return res.status(200).json({
                success: true,
                message: 'Login successful',
                data: {
                    accessToken,
                    user: sanitizeUser(user)
                }
            });

        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    data: { errors: error.errors.map(e => ({ field: e.path.join('.'), message: e.message })) }
                });
            }

            console.error('[AuthController] Login Error:', (error as Error).message);
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
    static async refresh(req: Request, res: Response) {
        try {
            const refreshTokenValue = req.cookies?.refreshToken;
            if (!refreshTokenValue) {
                return res.status(401).json({
                    success: false,
                    message: 'No refresh token provided'
                });
            }

            // ── Check blacklist ──
            const blacklisted = await isRefreshTokenBlacklisted(refreshTokenValue);
            if (blacklisted) {
                res.clearCookie('refreshToken', getClearCookieOptions());
                return res.status(403).json({
                    success: false,
                    message: 'Session has been revoked. Please log in again.'
                });
            }

            // ── Verify refresh token ──
            let decoded;
            try {
                decoded = verifyRefreshToken(refreshTokenValue);
            } catch {
                return res.status(403).json({
                    success: false,
                    message: 'Invalid or expired refresh token. Please log in again.'
                });
            }

            // ── Look up user ──
            const user = await findUserById(decoded.userId);
            if (!user) {
                return res.status(401).json({ success: false, message: 'User not found' });
            }

            const statusError = validateAccountStatus(user.status);
            if (statusError) {
                return res.status(403).json({ success: false, message: statusError });
            }

            const accessToken = generateAccessToken(user);

            return res.status(200).json({
                success: true,
                message: 'Token refreshed',
                data: {
                    accessToken,
                    user: sanitizeUser(user)
                }
            });

        } catch (error) {
            console.error('[AuthController] Refresh Error:', (error as Error).message);
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
    static async logout(req: any, res: Response) {
        try {
            const refreshTokenValue = req.cookies?.refreshToken;
            const userId = req.user?.userId;

            // Blacklist the token so it cannot be reused
            if (refreshTokenValue && userId) {
                await blacklistRefreshToken(refreshTokenValue, userId);
            }

            res.clearCookie('refreshToken', getClearCookieOptions());

            return res.status(200).json({
                success: true,
                message: 'Logged out successfully'
            });
        } catch (error) {
            console.error('[AuthController] Logout Error:', (error as Error).message);
            return res.status(500).json({ success: false, message: 'Logout failed' });
        }
    }

    /**
     * GET /api/v1/auth/me
     *
     * Returns the current authenticated user's profile.
     */
    static async me(req: any, res: Response) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return res.status(401).json({ success: false, message: 'Not authenticated' });
            }

            const user = await findUserById(userId);
            if (!user) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }

            return res.status(200).json({
                success: true,
                data: { user: sanitizeUser(user) }
            });
        } catch (error) {
            console.error('[AuthController] Me Error:', (error as Error).message);
            return res.status(500).json({ success: false, message: 'Failed to fetch user profile' });
        }
    }

    /**
     * GET /api/v1/auth/verify-email?token=xxx
     *
     * Verifies the email address using the token sent in the registration email.
     */
    static async verifyEmail(req: Request, res: Response) {
        try {
            const { token } = req.query as { token: string };
            if (!token) {
                return res.status(400).json({ success: false, message: 'Verification token is required' });
            }

            const result = await db.query(
                `SELECT id, user_id, expires_at, used_at 
                 FROM email_verification_tokens 
                 WHERE token = $1 LIMIT 1`,
                [token]
            );

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
            await db.query('BEGIN');
            await db.query(
                `UPDATE email_verification_tokens SET used_at = NOW() WHERE id = $1`,
                [record.id]
            );
            await db.query(
                `UPDATE users SET email_verified_at = NOW() WHERE id = $1`,
                [record.user_id]
            );
            await db.query('COMMIT');

            return res.status(200).json({
                success: true,
                message: 'Email verified successfully. Welcome to Gem Z!'
            });

        } catch (error) {
            await db.query('ROLLBACK').catch(() => {});
            console.error('[AuthController] VerifyEmail Error:', (error as Error).message);
            return res.status(500).json({ success: false, message: 'Email verification failed' });
        }
    }

    /**
     * POST /api/v1/auth/resend-verification
     *
     * Resends the email verification link.
     */
    static async resendVerification(req: any, res: Response) {
        try {
            const userId = req.user?.userId;
            const user = await findUserById(userId);
            if (!user) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }

            if (user.email_verified_at) {
                return res.status(409).json({ success: false, message: 'Email is already verified' });
            }

            // Invalidate old tokens
            await db.query(
                `UPDATE email_verification_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL`,
                [userId]
            );

            // Create new token
            const newToken = generateSecureToken();
            await db.query(
                `INSERT INTO email_verification_tokens (user_id, token) VALUES ($1, $2)`,
                [userId, newToken]
            );

            // Send email (non-blocking)
            sendVerificationEmail({
                to: user.email,
                fullName: user.full_name,
                token: newToken
            }).catch(err => console.warn('[ResendVerify] Email failed:', err.message));

            return res.status(200).json({
                success: true,
                message: 'Verification email sent. Please check your inbox.'
            });

        } catch (error) {
            console.error('[AuthController] ResendVerification Error:', (error as Error).message);
            return res.status(500).json({ success: false, message: 'Failed to resend verification email' });
        }
    }

    /**
     * POST /api/v1/auth/forgot-password
     *
     * Initiates password reset flow. Sends a reset link to the user's email.
     */
    static async forgotPassword(req: Request, res: Response) {
        try {
            const { email } = forgotPasswordSchema.parse(req.body);

            const user = await findUserByEmail(email);

            // Always return success to prevent email enumeration
            if (!user) {
                return res.status(200).json({
                    success: true,
                    message: 'If this email is registered, you will receive a password reset link shortly.'
                });
            }

            // Invalidate old reset tokens
            await db.query(
                `UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL`,
                [user.id]
            );

            // Create new token
            const resetToken = generateSecureToken();
            const clientIp = getClientIp(req);

            await db.query(
                `INSERT INTO password_reset_tokens (user_id, token, ip_address) VALUES ($1, $2, $3)`,
                [user.id, resetToken, clientIp]
            );

            // Send email (non-blocking)
            sendPasswordResetEmail({
                to: user.email,
                fullName: user.full_name,
                token: resetToken
            }).catch(err => console.warn('[ForgotPassword] Email failed:', err.message));

            return res.status(200).json({
                success: true,
                message: 'If this email is registered, you will receive a password reset link shortly.'
            });

        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    data: { errors: error.errors.map(e => ({ field: e.path.join('.'), message: e.message })) }
                });
            }
            console.error('[AuthController] ForgotPassword Error:', (error as Error).message);
            return res.status(500).json({ success: false, message: 'Failed to process password reset request' });
        }
    }

    /**
     * POST /api/v1/auth/reset-password
     *
     * Verifies the reset token and sets the new password.
     */
    static async resetPassword(req: Request, res: Response) {
        try {
            const { token, newPassword } = resetPasswordSchema.parse(req.body);

            const result = await db.query(
                `SELECT id, user_id, expires_at, used_at 
                 FROM password_reset_tokens 
                 WHERE token = $1 LIMIT 1`,
                [token]
            );

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

            const newHash = await hashPassword(newPassword);

            await db.query('BEGIN');
            // Update password
            await db.query(
                `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
                [newHash, record.user_id]
            );
            // Mark token as used
            await db.query(
                `UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1`,
                [record.id]
            );
            // Invalidate all other pending reset tokens for this user
            await db.query(
                `UPDATE password_reset_tokens SET used_at = NOW() 
                 WHERE user_id = $1 AND used_at IS NULL AND id != $2`,
                [record.user_id, record.id]
            );
            await db.query('COMMIT');

            return res.status(200).json({
                success: true,
                message: 'Password reset successfully. Please log in with your new password.'
            });

        } catch (error) {
            await db.query('ROLLBACK').catch(() => {});
            if (error instanceof z.ZodError) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    data: { errors: error.errors.map(e => ({ field: e.path.join('.'), message: e.message })) }
                });
            }
            console.error('[AuthController] ResetPassword Error:', (error as Error).message);
            return res.status(500).json({ success: false, message: 'Failed to reset password' });
        }
    }
}
