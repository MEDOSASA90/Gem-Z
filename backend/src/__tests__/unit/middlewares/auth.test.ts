/**
 * GEM Z — Auth Middleware Unit Tests
 *
 * Tests:
 * - verifyToken: allows request with valid token, blocks without/invalid/expired token
 * - requireRole: allows matching role, blocks non-matching role
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { verifyToken, AuthRequest } from '../../../core/middlewares/auth.middleware';
import { requireRole } from '../../../core/middlewares/role.middleware';

describe('Middlewares — Auth', () => {
    let mockReq: Partial<AuthRequest>;
    let mockRes: Partial<Response>;
    let mockNext: NextFunction;
    let jsonMock: jest.Mock;
    let statusMock: jest.Mock;

    const JWT_SECRET = 'test-jwt-secret-minimum-32-characters-long-for-testing';

    beforeEach(() => {
        jsonMock = jest.fn().mockReturnThis();
        statusMock = jest.fn().mockReturnThis();
        mockRes = {
            status: statusMock,
            json: jsonMock,
        };
        mockNext = jest.fn();
        mockReq = {
            headers: {},
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    // ─── verifyToken — Success ──────────────────────────────────

    describe('verifyToken', () => {
        it('allows request with valid token', () => {
            // Arrange
            const token = jwt.sign(
                { userId: 'test-user-id', role: 'trainee' },
                JWT_SECRET,
                { expiresIn: '15m' }
            );
            mockReq.headers = { authorization: `Bearer ${token}` };

            // Act
            verifyToken(mockReq as AuthRequest, mockRes as Response, mockNext);

            // Assert
            expect(mockNext).toHaveBeenCalledTimes(1);
            expect(mockNext).toHaveBeenCalledWith();
            expect(mockReq.user).toBeDefined();
            expect(mockReq.user?.userId).toBe('test-user-id');
            expect(mockReq.user?.role).toBe('trainee');
        });

        // ─── verifyToken — Error Paths ──────────────────────────

        it('blocks request without token (401)', () => {
            // Arrange
            mockReq.headers = {};

            // Act
            verifyToken(mockReq as AuthRequest, mockRes as Response, mockNext);

            // Assert
            expect(mockNext).not.toHaveBeenCalled();
            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith({
                success: false,
                message: 'Access denied: No token provided',
            });
        });

        it('blocks request with invalid token format (401)', () => {
            // Arrange
            mockReq.headers = { authorization: 'Basic invalid_format' };

            // Act
            verifyToken(mockReq as AuthRequest, mockRes as Response, mockNext);

            // Assert
            expect(mockNext).not.toHaveBeenCalled();
            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith({
                success: false,
                message: 'Access denied: No token provided',
            });
        });

        it('blocks request with invalid token (401)', () => {
            // Arrange
            mockReq.headers = { authorization: 'Bearer invalid_token_string' };

            // Act
            verifyToken(mockReq as AuthRequest, mockRes as Response, mockNext);

            // Assert
            expect(mockNext).not.toHaveBeenCalled();
            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith({
                success: false,
                message: 'Access denied: Invalid or expired token',
            });
        });

        it('blocks expired token (401)', () => {
            // Arrange: Create an expired token
            const expiredToken = jwt.sign(
                { userId: 'test-user-id', role: 'trainee' },
                JWT_SECRET,
                { expiresIn: '-1s' }
            );
            mockReq.headers = { authorization: `Bearer ${expiredToken}` };

            // Act
            verifyToken(mockReq as AuthRequest, mockRes as Response, mockNext);

            // Assert
            expect(mockNext).not.toHaveBeenCalled();
            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith({
                success: false,
                message: 'Access denied: Invalid or expired token',
            });
        });

        it('blocks token signed with wrong secret (401)', () => {
            // Arrange
            const wrongToken = jwt.sign(
                { userId: 'test-user-id', role: 'trainee' },
                'wrong-secret-key',
                { expiresIn: '15m' }
            );
            mockReq.headers = { authorization: `Bearer ${wrongToken}` };

            // Act
            verifyToken(mockReq as AuthRequest, mockRes as Response, mockNext);

            // Assert
            expect(mockNext).not.toHaveBeenCalled();
            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith({
                success: false,
                message: 'Access denied: Invalid or expired token',
            });
        });

        it('blocks malformed token with only Bearer prefix (401)', () => {
            // Arrange
            mockReq.headers = { authorization: 'Bearer ' };

            // Act
            verifyToken(mockReq as AuthRequest, mockRes as Response, mockNext);

            // Assert
            expect(mockNext).not.toHaveBeenCalled();
            expect(statusMock).toHaveBeenCalledWith(401);
        });
    });

    // ─── requireRole ────────────────────────────────────────────

    describe('requireRole', () => {
        it('allows matching role', () => {
            // Arrange
            mockReq.user = { userId: 'test-user-id', role: 'super_admin' };
            const middleware = requireRole(['super_admin', 'admin']);

            // Act
            middleware(mockReq as AuthRequest, mockRes as Response, mockNext);

            // Assert
            expect(mockNext).toHaveBeenCalledTimes(1);
            expect(mockNext).toHaveBeenCalledWith();
        });

        it('blocks non-matching role (403)', () => {
            // Arrange
            mockReq.user = { userId: 'test-user-id', role: 'trainee' };
            const middleware = requireRole(['super_admin', 'admin']);

            // Act
            middleware(mockReq as AuthRequest, mockRes as Response, mockNext);

            // Assert
            expect(mockNext).not.toHaveBeenCalled();
            expect(statusMock).toHaveBeenCalledWith(403);
            expect(jsonMock).toHaveBeenCalledWith({
                success: false,
                message: 'Forbidden: Requires one of [super_admin, admin] roles',
            });
        });

        it('blocks when user is not authenticated (401)', () => {
            // Arrange
            mockReq.user = undefined;
            const middleware = requireRole(['super_admin']);

            // Act
            middleware(mockReq as AuthRequest, mockRes as Response, mockNext);

            // Assert
            expect(mockNext).not.toHaveBeenCalled();
            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith({
                success: false,
                message: 'Authentication required',
            });
        });

        it('allows trainer role for trainer-only routes', () => {
            // Arrange
            mockReq.user = { userId: 'test-user-id', role: 'trainer' };
            const middleware = requireRole(['trainer']);

            // Act
            middleware(mockReq as AuthRequest, mockRes as Response, mockNext);

            // Assert
            expect(mockNext).toHaveBeenCalledTimes(1);
        });

        it('allows gym_admin role for gym_admin routes', () => {
            // Arrange
            mockReq.user = { userId: 'test-user-id', role: 'gym_admin' };
            const middleware = requireRole(['gym_admin', 'super_admin']);

            // Act
            middleware(mockReq as AuthRequest, mockRes as Response, mockNext);

            // Assert
            expect(mockNext).toHaveBeenCalledTimes(1);
        });

        it('blocks store_admin role for trainer-only routes', () => {
            // Arrange
            mockReq.user = { userId: 'test-user-id', role: 'store_admin' };
            const middleware = requireRole(['trainer']);

            // Act
            middleware(mockReq as AuthRequest, mockRes as Response, mockNext);

            // Assert
            expect(mockNext).not.toHaveBeenCalled();
            expect(statusMock).toHaveBeenCalledWith(403);
        });

        it('allows any role when multiple roles are specified', () => {
            // Arrange
            mockReq.user = { userId: 'test-user-id', role: 'trainee' };
            const middleware = requireRole(['trainee', 'trainer', 'gym_admin', 'store_admin']);

            // Act
            middleware(mockReq as AuthRequest, mockRes as Response, mockNext);

            // Assert
            expect(mockNext).toHaveBeenCalledTimes(1);
        });
    });
});
