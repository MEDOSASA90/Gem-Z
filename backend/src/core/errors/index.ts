/**
 * GEM Z — Standardized Error Classes
 *
 * Hierarchical error system for consistent API error handling.
 * All errors extend AppError, which captures HTTP status code, error code,
 * and operational vs. programming classification.
 *
 * Usage:
 *   throw new NotFoundError('User not found', ErrorCode.NOT_FOUND_USER);
 *   throw new WalletError('Insufficient funds', ErrorCode.WALLET_INSUFFICIENT_FUNDS);
 */

export enum ErrorCode {
    // Validation
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    INVALID_INPUT = 'INVALID_INPUT',
    MISSING_FIELD = 'MISSING_FIELD',

    // Authentication
    AUTH_INVALID_TOKEN = 'AUTH_INVALID_TOKEN',
    AUTH_EXPIRED_TOKEN = 'AUTH_EXPIRED_TOKEN',
    AUTH_WRONG_PASSWORD = 'AUTH_WRONG_PASSWORD',
    AUTH_EMAIL_EXISTS = 'AUTH_EMAIL_EXISTS',
    AUTH_UNAUTHORIZED = 'AUTH_UNAUTHORIZED',

    // Authorization
    FORBIDDEN_INSUFFICIENT_ROLE = 'FORBIDDEN_INSUFFICIENT_ROLE',
    FORBIDDEN_RESOURCE_ACCESS = 'FORBIDDEN_RESOURCE_ACCESS',

    // Not Found
    NOT_FOUND_USER = 'NOT_FOUND_USER',
    NOT_FOUND_WALLET = 'NOT_FOUND_WALLET',
    NOT_FOUND_GYM = 'NOT_FOUND_GYM',
    NOT_FOUND_BRANCH = 'NOT_FOUND_BRANCH',
    NOT_FOUND_PLAN = 'NOT_FOUND_PLAN',
    NOT_FOUND_TRANSACTION = 'NOT_FOUND_TRANSACTION',
    NOT_FOUND_PRODUCT = 'NOT_FOUND_PRODUCT',
    NOT_FOUND_ORDER = 'NOT_FOUND_ORDER',
    NOT_FOUND_ROUTE = 'NOT_FOUND_ROUTE',
    NOT_FOUND_RESOURCE = 'NOT_FOUND_RESOURCE',

    // Conflict
    CONFLICT_EMAIL_EXISTS = 'CONFLICT_EMAIL_EXISTS',
    CONFLICT_PHONE_EXISTS = 'CONFLICT_PHONE_EXISTS',
    CONFLICT_DUPLICATE_RESOURCE = 'CONFLICT_DUPLICATE_RESOURCE',

    // Rate Limiting
    RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',

    // Wallet
    WALLET_INSUFFICIENT_FUNDS = 'WALLET_INSUFFICIENT_FUNDS',
    WALLET_FROZEN = 'WALLET_FROZEN',
    WALLET_DAILY_LIMIT = 'WALLET_DAILY_LIMIT',
    WALLET_CONCURRENCY_CONFLICT = 'WALLET_CONCURRENCY_CONFLICT',
    WALLET_NOT_FOUND = 'WALLET_NOT_FOUND',
    WALLET_INVALID_AMOUNT = 'WALLET_INVALID_AMOUNT',

    // Idempotency
    IDEMPOTENCY_REPLAYED = 'IDEMPOTENCY_REPLAYED',

    // Server
    SERVER_ERROR = 'SERVER_ERROR',
    SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
    DATABASE_ERROR = 'DATABASE_ERROR',
    REDIS_ERROR = 'REDIS_ERROR',
    QUEUE_ERROR = 'QUEUE_ERROR',
}

// ─────────────────────────────────────────────────────────────────

export class AppError extends Error {
    statusCode: number;
    code: string;
    isOperational: boolean;
    requestId?: string;

    constructor(
        message: string,
        statusCode: number = 500,
        code: string = ErrorCode.SERVER_ERROR,
        isOperational: boolean = true
    ) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = isOperational;
        this.name = this.constructor.name;

        // Maintains proper stack trace for where error was thrown
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}

// ─── 4xx Client Errors ──────────────────────────────────────────

export class ValidationError extends AppError {
    fields?: Record<string, string>;

    constructor(
        message: string = 'Validation failed',
        code: string = ErrorCode.VALIDATION_ERROR,
        fields?: Record<string, string>
    ) {
        super(message, 400, code, true);
        this.fields = fields;
    }
}

export class AuthError extends AppError {
    constructor(
        message: string = 'Authentication failed',
        code: string = ErrorCode.AUTH_INVALID_TOKEN
    ) {
        super(message, 401, code, true);
    }
}

export class ForbiddenError extends AppError {
    constructor(
        message: string = 'Access denied',
        code: string = ErrorCode.FORBIDDEN_INSUFFICIENT_ROLE
    ) {
        super(message, 403, code, true);
    }
}

export class NotFoundError extends AppError {
    constructor(
        message: string = 'Resource not found',
        code: string = ErrorCode.NOT_FOUND_RESOURCE
    ) {
        super(message, 404, code, true);
    }
}

export class ConflictError extends AppError {
    constructor(
        message: string = 'Resource conflict',
        code: string = ErrorCode.CONFLICT_DUPLICATE_RESOURCE
    ) {
        super(message, 409, code, true);
    }
}

export class RateLimitError extends AppError {
    retryAfter?: number;

    constructor(
        message: string = 'Rate limit exceeded',
        code: string = ErrorCode.RATE_LIMIT_EXCEEDED,
        retryAfter?: number
    ) {
        super(message, 429, code, true);
        this.retryAfter = retryAfter;
    }
}

// ─── Domain-Specific Errors ─────────────────────────────────────

export class WalletError extends AppError {
    walletId?: string;

    constructor(
        message: string = 'Wallet operation failed',
        code: string = ErrorCode.WALLET_INVALID_AMOUNT,
        walletId?: string
    ) {
        super(message, 400, code, true);
        this.walletId = walletId;
    }
}

export class IdempotencyError extends AppError {
    originalResponse?: unknown;

    constructor(
        message: string = 'Request already processed',
        code: string = ErrorCode.IDEMPOTENCY_REPLAYED,
        originalResponse?: unknown
    ) {
        super(message, 409, code, true);
        this.originalResponse = originalResponse;
    }
}

// ─── 5xx Server Errors ──────────────────────────────────────────

export class ServerError extends AppError {
    constructor(
        message: string = 'Internal server error',
        code: string = ErrorCode.SERVER_ERROR
    ) {
        super(message, 500, code, false);
    }
}

export class ServiceUnavailableError extends AppError {
    constructor(
        message: string = 'Service temporarily unavailable',
        code: string = ErrorCode.SERVICE_UNAVAILABLE
    ) {
        super(message, 503, code, true);
    }
}

// ─── Error Response Builder ─────────────────────────────────────

export interface ErrorResponse {
    success: false;
    message: string;
    code: string;
    statusCode: number;
    requestId?: string;
    fields?: Record<string, string>;
    retryAfter?: number;
    stack?: string;
}

export function buildErrorResponse(error: AppError, requestId?: string): ErrorResponse {
    const response: ErrorResponse = {
        success: false,
        message: error.message,
        code: error.code,
        statusCode: error.statusCode,
    };

    if (requestId) {
        response.requestId = requestId;
    }

    if (error instanceof ValidationError && error.fields) {
        response.fields = error.fields;
    }

    if (error instanceof RateLimitError && error.retryAfter) {
        response.retryAfter = error.retryAfter;
    }

    // Include stack trace only in development
    if (process.env.NODE_ENV === 'development' && !error.isOperational) {
        response.stack = error.stack;
    }

    return response;
}

// ─── Error Type Guard ───────────────────────────────────────────

export function isAppError(error: unknown): error is AppError {
    return error instanceof AppError;
}

export function isOperationalError(error: unknown): boolean {
    return error instanceof AppError && error.isOperational;
}
