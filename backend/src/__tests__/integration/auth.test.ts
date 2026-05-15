/**
 * GEM Z — Auth Integration Tests
 *
 * Tests Auth API endpoints with supertest:
 * POST /api/v1/auth/register - success, duplicate email, invalid email, weak password
 * POST /api/v1/auth/login - success, wrong password, non-existent email, missing fields
 * POST /api/v1/auth/logout - success, without token
 * GET /api/v1/auth/me - success, without token
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import express, { Request, Response } from 'express';
import { z } from 'zod';

// ─── Setup Express App for Testing ────────────────────────────

// Import the auth controller methods directly for isolated testing
import { AuthController } from '../../modules/auth/auth.controller';
import { verifyToken } from '../../core/middlewares/auth.middleware';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ─── Helper: Mock cookie-parser ───────────────────────────────

function cookieParser() {
    return (req: any, res: any, next: any) => {
        req.cookies = {};
        const cookieHeader = req.headers.cookie;
        if (cookieHeader) {
            cookieHeader.split(';').forEach((cookie: string) => {
                const [name, value] = cookie.trim().split('=');
                if (name && value) {
                    req.cookies[name] = decodeURIComponent(value);
                }
            });
        }
        next();
    };
}

// ─── Auth Routes ──────────────────────────────────────────────

// Register
app.post('/api/v1/auth/register', (req, res, next) => {
    AuthController.register(req, res).catch(next);
});

// Login
app.post('/api/v1/auth/login', (req, res, next) => {
    AuthController.login(req, res).catch(next);
});

// Logout
app.post('/api/v1/auth/logout', verifyToken as any, (req, res, next) => {
    AuthController.logout(req, res).catch(next);
});

// Me
app.get('/api/v1/auth/me', verifyToken as any, (req, res, next) => {
    AuthController.me(req, res).catch(next);
});

// Error handler
app.use((err: any, req: any, res: any, next: any) => {
    console.error('Test Error:', err.message);
    res.status(500).json({ success: false, message: err.message || 'Internal server error' });
});

// ─── Mocked Module Imports ────────────────────────────────────

// These will use the jest.mock defined in setup.ts
const mockDb = {
    query: jest.fn(),
    connect: jest.fn(),
};

jest.mock('../../core/database/db', () => ({
    db: mockDb,
}));

jest.mock('../../services/token.service', () => ({
    generateTokens: jest.fn().mockReturnValue({
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
    }),
    generateAccessToken: jest.fn().mockReturnValue('test-access-token'),
    getRefreshCookieOptions: jest.fn().mockReturnValue({ httpOnly: true, sameSite: 'strict' }),
    getClearCookieOptions: jest.fn().mockReturnValue({ httpOnly: true, sameSite: 'strict' }),
    verifyRefreshToken: jest.fn(),
    blacklistRefreshToken: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../services/email.service', () => ({
    sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
    sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
    sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
    verifyEmailConnection: jest.fn().mockResolvedValue(true),
}));

describe('Integration — Auth API', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // ─── POST /api/v1/auth/register ───────────────────────────

    describe('POST /api/v1/auth/register', () => {
        it('registers new user (201)', async () => {
            // Arrange: Mock no existing user
            mockDb.query
                .mockResolvedValueOnce({ rows: [] }) // emailExists check
                .mockResolvedValueOnce({ rows: [] }) // resolveReferralCode
                .mockResolvedValueOnce({ rows: [] }) // trainee_profiles insert
                .mockResolvedValueOnce({
                    rows: [{
                        id: 'new-user-id',
                        email: 'newuser@test.com',
                        role: 'trainee',
                        full_name: 'New User',
                        referral_code: 'REF123',
                        avatar_url: null,
                    }],
                }) // user insert
                .mockResolvedValueOnce({ rows: [] }) // wallet insert
                .mockResolvedValueOnce({ rows: [] }); // email verification token

            const clientMock = {
                query: mockDb.query,
                release: jest.fn(),
            };
            mockDb.connect.mockResolvedValue(clientMock);

            // Act
            const response = await request(app)
                .post('/api/v1/auth/register')
                .send({
                    email: 'newuser@test.com',
                    password: 'SecurePass123!',
                    fullName: 'New User',
                    role: 'trainee',
                });

            // Assert
            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toBeDefined();
            expect(response.body.data.accessToken).toBeDefined();
            expect(response.body.data.user).toBeDefined();
            expect(response.body.data.user.email).toBe('newuser@test.com');
            expect(response.body.data.user.full_name).toBe('New User');
        });

        it('rejects duplicate email (409)', async () => {
            // Arrange: Mock existing user
            mockDb.query.mockResolvedValueOnce({
                rows: [{ id: 'existing-id' }], // emailExists returns true
            });

            const clientMock = {
                query: mockDb.query,
                release: jest.fn(),
            };
            mockDb.connect.mockResolvedValue(clientMock);

            // Act
            const response = await request(app)
                .post('/api/v1/auth/register')
                .send({
                    email: 'existing@test.com',
                    password: 'SecurePass123!',
                    fullName: 'Existing User',
                    role: 'trainee',
                });

            // Assert
            expect(response.status).toBe(409);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Email already in use');
        });

        it('rejects invalid email format (400)', async () => {
            // Act
            const response = await request(app)
                .post('/api/v1/auth/register')
                .send({
                    email: 'not-an-email',
                    password: 'SecurePass123!',
                    fullName: 'Invalid Email User',
                    role: 'trainee',
                });

            // Assert
            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Validation failed');
        });

        it('rejects weak password (400)', async () => {
            // Act
            const response = await request(app)
                .post('/api/v1/auth/register')
                .send({
                    email: 'weakpass@test.com',
                    password: '123', // Too short
                    fullName: 'Weak Password User',
                    role: 'trainee',
                });

            // Assert
            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Validation failed');
            if (response.body.data?.errors) {
                const passwordError = response.body.data.errors.find(
                    (e: any) => e.field === 'password'
                );
                expect(passwordError).toBeDefined();
            }
        });

        it('rejects missing fullName (400)', async () => {
            // Act
            const response = await request(app)
                .post('/api/v1/auth/register')
                .send({
                    email: 'noname@test.com',
                    password: 'SecurePass123!',
                    // fullName missing
                    role: 'trainee',
                });

            // Assert
            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it('rejects missing email (400)', async () => {
            // Act
            const response = await request(app)
                .post('/api/v1/auth/register')
                .send({
                    // email missing
                    password: 'SecurePass123!',
                    fullName: 'No Email User',
                    role: 'trainee',
                });

            // Assert
            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it('rejects missing password (400)', async () => {
            // Act
            const response = await request(app)
                .post('/api/v1/auth/register')
                .send({
                    email: 'nopass@test.com',
                    // password missing
                    fullName: 'No Password User',
                    role: 'trainee',
                });

            // Assert
            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
    });

    // ─── POST /api/v1/auth/login ──────────────────────────────

    describe('POST /api/v1/auth/login', () => {
        it('logs in with valid credentials (200)', async () => {
            // Arrange: Mock user lookup and password verification
            mockDb.query.mockResolvedValueOnce({
                rows: [{
                    id: 'user-123',
                    email: 'valid@test.com',
                    password_hash: '$2b$12$hashed',
                    role: 'trainee',
                    status: 'active',
                    full_name: 'Valid User',
                    phone: null,
                    referral_code: 'REF001',
                    avatar_url: null,
                    email_verified_at: null,
                }],
            });

            // Act
            const response = await request(app)
                .post('/api/v1/auth/login')
                .send({
                    email: 'valid@test.com',
                    password: 'correct_password',
                });

            // Assert
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toBeDefined();
            expect(response.body.data.accessToken).toBeDefined();
            expect(response.body.data.user).toBeDefined();
            expect(response.body.data.user.email).toBe('valid@test.com');
        });

        it('rejects wrong password (401)', async () => {
            // Arrange: Mock user exists but password check fails
            mockDb.query.mockResolvedValueOnce({
                rows: [{
                    id: 'user-123',
                    email: 'valid@test.com',
                    password_hash: '$2b$12$hashed',
                    role: 'trainee',
                    status: 'active',
                    full_name: 'Valid User',
                    phone: null,
                    referral_code: 'REF001',
                    avatar_url: null,
                    email_verified_at: null,
                }],
            });

            // Act
            const response = await request(app)
                .post('/api/v1/auth/login')
                .send({
                    email: 'valid@test.com',
                    password: 'wrong_password',
                });

            // Assert
            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Invalid email or password');
        });

        it('rejects non-existent email (401)', async () => {
            // Arrange: No user found
            mockDb.query.mockResolvedValueOnce({ rows: [] });

            // Act
            const response = await request(app)
                .post('/api/v1/auth/login')
                .send({
                    email: 'nonexistent@test.com',
                    password: 'any_password',
                });

            // Assert
            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Invalid email or password');
        });

        it('rejects missing email field (400)', async () => {
            // Act
            const response = await request(app)
                .post('/api/v1/auth/login')
                .send({
                    password: 'some_password',
                });

            // Assert
            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Validation failed');
        });

        it('rejects missing password field (400)', async () => {
            // Act
            const response = await request(app)
                .post('/api/v1/auth/login')
                .send({
                    email: 'test@test.com',
                });

            // Assert
            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Validation failed');
        });

        it('rejects empty request body (400)', async () => {
            // Act
            const response = await request(app)
                .post('/api/v1/auth/login')
                .send({});

            // Assert
            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it('rejects invalid email format (400)', async () => {
            // Act
            const response = await request(app)
                .post('/api/v1/auth/login')
                .send({
                    email: 'not-an-email',
                    password: 'some_password',
                });

            // Assert
            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Validation failed');
        });

        it('rejects suspended account (403)', async () => {
            // Arrange: User exists but is suspended
            mockDb.query.mockResolvedValueOnce({
                rows: [{
                    id: 'user-suspended',
                    email: 'suspended@test.com',
                    password_hash: '$2b$12$hashed',
                    role: 'trainee',
                    status: 'suspended',
                    full_name: 'Suspended User',
                    phone: null,
                    referral_code: 'REF002',
                    avatar_url: null,
                    email_verified_at: null,
                }],
            });

            // Act
            const response = await request(app)
                .post('/api/v1/auth/login')
                .send({
                    email: 'suspended@test.com',
                    password: 'correct_password',
                });

            // Assert
            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('suspended');
        });

        it('rejects banned account (403)', async () => {
            // Arrange: User exists but is banned
            mockDb.query.mockResolvedValueOnce({
                rows: [{
                    id: 'user-banned',
                    email: 'banned@test.com',
                    password_hash: '$2b$12$hashed',
                    role: 'trainee',
                    status: 'banned',
                    full_name: 'Banned User',
                    phone: null,
                    referral_code: 'REF003',
                    avatar_url: null,
                    email_verified_at: null,
                }],
            });

            // Act
            const response = await request(app)
                .post('/api/v1/auth/login')
                .send({
                    email: 'banned@test.com',
                    password: 'correct_password',
                });

            // Assert
            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('banned');
        });
    });

    // ─── POST /api/v1/auth/logout ─────────────────────────────

    describe('POST /api/v1/auth/logout', () => {
        it('logs out with valid token (200)', async () => {
            // Arrange: Need a valid token
            const jwt = require('jsonwebtoken');
            const token = jwt.sign(
                { userId: 'user-123', role: 'trainee' },
                'test-jwt-secret-minimum-32-characters-long-for-testing',
                { expiresIn: '15m' }
            );

            // Act
            const response = await request(app)
                .post('/api/v1/auth/logout')
                .set('Authorization', `Bearer ${token}`);

            // Assert
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toContain('Logged out');
        });

        it('rejects logout without token (401)', async () => {
            // Act
            const response = await request(app)
                .post('/api/v1/auth/logout');

            // Assert
            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('token');
        });

        it('rejects logout with invalid token format (401)', async () => {
            // Act
            const response = await request(app)
                .post('/api/v1/auth/logout')
                .set('Authorization', 'Basic invalid');

            // Assert
            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });
    });

    // ─── GET /api/v1/auth/me ──────────────────────────────────

    describe('GET /api/v1/auth/me', () => {
        it('returns current user (200)', async () => {
            // Arrange: Mock user lookup
            mockDb.query.mockResolvedValueOnce({
                rows: [{
                    id: 'user-123',
                    email: 'me@test.com',
                    role: 'trainee',
                    status: 'active',
                    full_name: 'Me User',
                    phone: '+201234567890',
                    referral_code: 'REFME',
                    avatar_url: 'http://example.com/avatar.jpg',
                    email_verified_at: null,
                }],
            });

            const jwt = require('jsonwebtoken');
            const token = jwt.sign(
                { userId: 'user-123', role: 'trainee' },
                'test-jwt-secret-minimum-32-characters-long-for-testing',
                { expiresIn: '15m' }
            );

            // Act
            const response = await request(app)
                .get('/api/v1/auth/me')
                .set('Authorization', `Bearer ${token}`);

            // Assert
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toBeDefined();
            expect(response.body.data.user).toBeDefined();
            expect(response.body.data.user.id).toBe('user-123');
            expect(response.body.data.user.email).toBe('me@test.com');
            expect(response.body.data.user.full_name).toBe('Me User');
        });

        it('rejects without token (401)', async () => {
            // Act
            const response = await request(app)
                .get('/api/v1/auth/me');

            // Assert
            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('token');
        });

        it('rejects with expired token (401)', async () => {
            // Arrange: Create an expired token
            const jwt = require('jsonwebtoken');
            const expiredToken = jwt.sign(
                { userId: 'user-123', role: 'trainee' },
                'test-jwt-secret-minimum-32-characters-long-for-testing',
                { expiresIn: '-1s' }
            );

            // Act
            const response = await request(app)
                .get('/api/v1/auth/me')
                .set('Authorization', `Bearer ${expiredToken}`);

            // Assert
            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });

        it('rejects with invalid token (401)', async () => {
            // Act
            const response = await request(app)
                .get('/api/v1/auth/me')
                .set('Authorization', 'Bearer invalid_token_xyz');

            // Assert
            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });

        it('returns 404 when user not found', async () => {
            // Arrange: No user found
            mockDb.query.mockResolvedValueOnce({ rows: [] });

            const jwt = require('jsonwebtoken');
            const token = jwt.sign(
                { userId: 'nonexistent-user', role: 'trainee' },
                'test-jwt-secret-minimum-32-characters-long-for-testing',
                { expiresIn: '15m' }
            );

            // Act
            const response = await request(app)
                .get('/api/v1/auth/me')
                .set('Authorization', `Bearer ${token}`);

            // Assert
            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('User not found');
        });
    });

    // ─── Response Structure Validation ──────────────────────────

    describe('Response structure', () => {
        it('login response matches expected schema', async () => {
            // Arrange
            mockDb.query.mockResolvedValueOnce({
                rows: [{
                    id: 'user-schema',
                    email: 'schema@test.com',
                    password_hash: '$2b$12$hashed',
                    role: 'trainee',
                    status: 'active',
                    full_name: 'Schema User',
                    phone: null,
                    referral_code: 'REF001',
                    avatar_url: null,
                    email_verified_at: null,
                }],
            });

            // Act
            const response = await request(app)
                .post('/api/v1/auth/login')
                .send({
                    email: 'schema@test.com',
                    password: 'correct_password',
                });

            // Assert: Snapshot test for consistent response format
            expect(response.status).toBe(200);
            expect(response.body).toMatchObject({
                success: true,
                message: expect.any(String),
                data: {
                    accessToken: expect.any(String),
                    user: {
                        id: expect.any(String),
                        email: expect.any(String),
                        full_name: expect.any(String),
                        role: expect.any(String),
                        referral_code: expect.any(String),
                    },
                },
            });
        });

        it('error response matches expected schema', async () => {
            // Act
            const response = await request(app)
                .get('/api/v1/auth/me');

            // Assert
            expect(response.body).toMatchObject({
                success: false,
                message: expect.any(String),
            });
            expect(response.body.data).toBeUndefined();
        });
    });
});
