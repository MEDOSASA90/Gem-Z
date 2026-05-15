/**
 * =============================================================================
 * GEM Z — Route Validators
 * =============================================================================
 *
 * Comprehensive express-validator validators for all API routes.
 * Each validator exports a ready-to-use ValidationChain[] array that
 * can be passed directly to the `validate()` middleware.
 *
 * Validates and sanitizes:
 *   - Auth routes (register, login, forgot/reset password)
 *   - Wallet routes (top-up, withdraw, transfer)
 *   - Gym routes (create, subscribe)
 *   - User routes (update profile, change password)
 *   - Common utilities (pagination, UUID params)
 *
 * @module core/validators/route-validators
 */

import { body, param, query, ValidationChain } from 'express-validator';
import {
    isValidEmail,
    isStrongPassword,
    isValidUUID,
    isValidEgyptianPhone,
    validate,
} from '../middlewares/validation.middleware';

// =============================================================================
// ─── Auth Validators ─────────────────────────────────────────────────────────
// =============================================================================

/**
 * Validate user registration request body.
 *
 * Required fields:
 *   - email: valid email format
 *   - password: strong password (8-128 chars, uppercase, lowercase, digit, special)
 *   - full_name: non-empty string, 1-100 characters
 *   - role: one of 'trainee', 'trainer', 'gym_owner', 'admin'
 */
export const validateRegister: ValidationChain[] = [
    body('email')
        .trim()
        .notEmpty()
        .withMessage('Email is required')
        .custom(isValidEmail),

    body('password')
        .notEmpty()
        .withMessage('Password is required')
        .custom(isStrongPassword),

    body('full_name')
        .trim()
        .notEmpty()
        .withMessage('Full name is required')
        .isString()
        .withMessage('Full name must be a string')
        .isLength({ min: 1, max: 100 })
        .withMessage('Full name must be between 1 and 100 characters')
        .matches(/^[\p{L}\s'-]+$/u)
        .withMessage('Full name can only contain letters, spaces, hyphens, and apostrophes')
        .escape(),

    body('role')
        .trim()
        .notEmpty()
        .withMessage('Role is required')
        .isIn(['trainee', 'trainer', 'gym_owner', 'admin'])
        .withMessage("Role must be one of: 'trainee', 'trainer', 'gym_owner', 'admin'"),
];

/**
 * Validate login request body.
 *
 * Required fields:
 *   - email: valid email format
 *   - password: non-empty string
 */
export const validateLogin: ValidationChain[] = [
    body('email')
        .trim()
        .notEmpty()
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Invalid email format')
        .normalizeEmail()
        .toLowerCase(),

    body('password')
        .notEmpty()
        .withMessage('Password is required')
        .isString()
        .withMessage('Password must be a string')
        .isLength({ min: 1, max: 128 })
        .withMessage('Password must be between 1 and 128 characters'),
];

/**
 * Validate forgot password request body.
 *
 * Required fields:
 *   - email: valid email format
 */
export const validateForgotPassword: ValidationChain[] = [
    body('email')
        .trim()
        .notEmpty()
        .withMessage('Email is required')
        .custom(isValidEmail),
];

/**
 * Validate reset password request body.
 *
 * Required fields:
 *   - token: non-empty string (reset token from email)
 *   - new_password: strong password (different from common weak passwords)
 */
export const validateResetPassword: ValidationChain[] = [
    body('token')
        .trim()
        .notEmpty()
        .withMessage('Reset token is required')
        .isString()
        .withMessage('Reset token must be a string')
        .isLength({ min: 10, max: 512 })
        .withMessage('Reset token appears to be invalid'),

    body('new_password')
        .notEmpty()
        .withMessage('New password is required')
        .custom(isStrongPassword)
        .custom((value, { req }) => {
            if (value === req.body?.token) {
                throw new Error('New password cannot be the same as the reset token');
            }
            return true;
        }),
];

// =============================================================================
// ─── Wallet Validators ───────────────────────────────────────────────────────
// =============================================================================

/** Supported payment gateways */
const PAYMENT_GATEWAYS = ['stripe', 'paymob', 'fawry', 'vodafone_cash', 'instapay'] as const;

/** Supported withdrawal methods */
const WITHDRAWAL_METHODS = ['bank_transfer', 'instapay', 'vodafone_cash'] as const;

/**
 * Validate wallet top-up request.
 *
 * Required fields:
 *   - amount: positive number, minimum 10 EGP
 *   - gateway: supported payment gateway
 */
export const validateTopUp: ValidationChain[] = [
    body('amount')
        .notEmpty()
        .withMessage('Amount is required')
        .isFloat({ min: 10 })
        .withMessage('Minimum top-up amount is 10 EGP')
        .isFloat({ max: 100000 })
        .withMessage('Maximum top-up amount is 100,000 EGP')
        .toFloat(),

    body('gateway')
        .trim()
        .notEmpty()
        .withMessage('Payment gateway is required')
        .isIn(PAYMENT_GATEWAYS)
        .withMessage(`Gateway must be one of: ${PAYMENT_GATEWAYS.join(', ')}`),
];

/**
 * Validate wallet withdrawal request.
 *
 * Required fields:
 *   - amount: positive number, minimum 50 EGP
 *   - method: supported withdrawal method
 */
export const validateWithdraw: ValidationChain[] = [
    body('amount')
        .notEmpty()
        .withMessage('Amount is required')
        .isFloat({ min: 50 })
        .withMessage('Minimum withdrawal amount is 50 EGP')
        .isFloat({ max: 50000 })
        .withMessage('Maximum withdrawal amount is 50,000 EGP')
        .toFloat(),

    body('method')
        .trim()
        .notEmpty()
        .withMessage('Withdrawal method is required')
        .isIn(WITHDRAWAL_METHODS)
        .withMessage(`Method must be one of: ${WITHDRAWAL_METHODS.join(', ')}`),

    body('account_details')
        .optional({ checkFalsy: true })
        .isObject()
        .withMessage('Account details must be an object'),
];

/**
 * Validate wallet transfer request.
 *
 * Required fields:
 *   - to_wallet_id: valid UUID
 *   - amount: positive number, minimum 1 EGP
 */
export const validateTransfer: ValidationChain[] = [
    body('to_wallet_id')
        .trim()
        .notEmpty()
        .withMessage('Recipient wallet ID is required')
        .custom(isValidUUID),

    body('amount')
        .notEmpty()
        .withMessage('Amount is required')
        .isFloat({ min: 1 })
        .withMessage('Minimum transfer amount is 1 EGP')
        .isFloat({ max: 100000 })
        .withMessage('Maximum transfer amount is 100,000 EGP')
        .toFloat(),

    body('description')
        .optional({ checkFalsy: true })
        .isString()
        .withMessage('Description must be a string')
        .isLength({ max: 255 })
        .withMessage('Description must not exceed 255 characters')
        .trim()
        .escape(),
];

// =============================================================================
// ─── Gym Validators ──────────────────────────────────────────────────────────
// =============================================================================

/** Supported subscription plan tiers */
const SUBSCRIPTION_PLANS = ['basic', 'standard', 'premium', 'elite'] as const;

/** Supported payment methods for subscriptions */
const SUBSCRIPTION_PAYMENT_METHODS = ['wallet', 'credit_card', 'cash'] as const;

/**
 * Validate gym creation request.
 *
 * Required fields:
 *   - name: non-empty string, 2-100 characters
 *   - address: non-empty string, 10-500 characters
 *   - phone: valid Egyptian phone number
 */
export const validateGymCreate: ValidationChain[] = [
    body('name')
        .trim()
        .notEmpty()
        .withMessage('Gym name is required')
        .isString()
        .withMessage('Gym name must be a string')
        .isLength({ min: 2, max: 100 })
        .withMessage('Gym name must be between 2 and 100 characters')
        .escape(),

    body('address')
        .trim()
        .notEmpty()
        .withMessage('Address is required')
        .isString()
        .withMessage('Address must be a string')
        .isLength({ min: 10, max: 500 })
        .withMessage('Address must be between 10 and 500 characters')
        .escape(),

    body('phone')
        .trim()
        .notEmpty()
        .withMessage('Phone number is required')
        .custom(isValidEgyptianPhone),

    body('email')
        .optional({ checkFalsy: true })
        .trim()
        .custom(isValidEmail),

    body('description')
        .optional({ checkFalsy: true })
        .trim()
        .isString()
        .withMessage('Description must be a string')
        .isLength({ max: 1000 })
        .withMessage('Description must not exceed 1000 characters')
        .escape(),

    body('working_hours')
        .optional({ checkFalsy: true })
        .isObject()
        .withMessage('Working hours must be an object'),
];

/**
 * Validate gym subscription request.
 *
 * Required fields:
 *   - plan_id: valid plan identifier
 *   - payment_method: supported payment method
 */
export const validateSubscription: ValidationChain[] = [
    body('plan_id')
        .trim()
        .notEmpty()
        .withMessage('Plan ID is required')
        .isIn(SUBSCRIPTION_PLANS)
        .withMessage(`Plan must be one of: ${SUBSCRIPTION_PLANS.join(', ')}`),

    body('payment_method')
        .trim()
        .notEmpty()
        .withMessage('Payment method is required')
        .isIn(SUBSCRIPTION_PAYMENT_METHODS)
        .withMessage(`Payment method must be one of: ${SUBSCRIPTION_PAYMENT_METHODS.join(', ')}`),

    body('gym_id')
        .optional({ checkFalsy: true })
        .trim()
        .custom(isValidUUID),

    body('duration_months')
        .optional({ checkFalsy: true })
        .isInt({ min: 1, max: 12 })
        .withMessage('Duration must be between 1 and 12 months')
        .toInt(),
];

// =============================================================================
// ─── User Validators ─────────────────────────────────────────────────────────
// =============================================================================

/**
 * Validate profile update request.
 *
 * Optional fields:
 *   - full_name: non-empty string, 1-100 characters
 *   - phone: valid Egyptian phone number
 */
export const validateUpdateProfile: ValidationChain[] = [
    body('full_name')
        .optional({ checkFalsy: true })
        .trim()
        .notEmpty()
        .withMessage('Full name cannot be empty if provided')
        .isString()
        .withMessage('Full name must be a string')
        .isLength({ min: 1, max: 100 })
        .withMessage('Full name must be between 1 and 100 characters')
        .matches(/^[\p{L}\s'-]+$/u)
        .withMessage('Full name can only contain letters, spaces, hyphens, and apostrophes')
        .escape(),

    body('phone')
        .optional({ checkFalsy: true })
        .trim()
        .custom(isValidEgyptianPhone),

    body('avatar_url')
        .optional({ checkFalsy: true })
        .trim()
        .isURL()
        .withMessage('Avatar URL must be a valid URL')
        .isLength({ max: 500 })
        .withMessage('Avatar URL must not exceed 500 characters'),

    body('bio')
        .optional({ checkFalsy: true })
        .trim()
        .isString()
        .withMessage('Bio must be a string')
        .isLength({ max: 500 })
        .withMessage('Bio must not exceed 500 characters')
        .escape(),
];

/**
 * Validate password change request.
 *
 * Required fields:
 *   - current_password: non-empty string
 *   - new_password: strong password, must differ from current
 */
export const validateChangePassword: ValidationChain[] = [
    body('current_password')
        .notEmpty()
        .withMessage('Current password is required')
        .isString()
        .withMessage('Current password must be a string')
        .isLength({ min: 1, max: 128 })
        .withMessage('Current password must be between 1 and 128 characters'),

    body('new_password')
        .notEmpty()
        .withMessage('New password is required')
        .custom(isStrongPassword)
        .custom((value, { req }) => {
            if (value === req.body?.current_password) {
                throw new Error('New password must be different from the current password');
            }
            return true;
        }),

    body('confirm_password')
        .notEmpty()
        .withMessage('Password confirmation is required')
        .custom((value, { req }) => {
            if (value !== req.body?.new_password) {
                throw new Error('Password confirmation does not match the new password');
            }
            return true;
        }),
];

// =============================================================================
// ─── Common Validators ───────────────────────────────────────────────────────
// =============================================================================

/**
 * Validate pagination query parameters.
 *
 * Optional fields:
 *   - page: positive integer, default 1
 *   - limit: positive integer 1-100, default 20
 *   - sort: optional sort field
 *   - order: 'asc' or 'desc', default 'desc'
 */
export const validatePagination: ValidationChain[] = [
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer')
        .toInt(),

    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100')
        .toInt(),

    query('sort')
        .optional({ checkFalsy: true })
        .trim()
        .isString()
        .withMessage('Sort must be a string')
        .isLength({ max: 50 })
        .withMessage('Sort field must not exceed 50 characters')
        .matches(/^[a-zA-Z_][a-zA-Z0-9_]*$/)
        .withMessage('Sort field must be a valid column name'),

    query('order')
        .optional({ checkFalsy: true })
        .trim()
        .toLowerCase()
        .isIn(['asc', 'desc'])
        .withMessage("Order must be 'asc' or 'desc'"),
];

/**
 * Validate a UUID route parameter.
 *
 * @param paramName - The name of the route parameter (default: 'id')
 */
export function validateUUID(paramName: string = 'id'): ValidationChain[] {
    return [
        param(paramName)
            .trim()
            .notEmpty()
            .withMessage(`${paramName} is required`)
            .custom(isValidUUID),
    ];
}

// =============================================================================
// ─── Additional Validators ───────────────────────────────────────────────────
// =============================================================================

/**
 * Validate search query parameter.
 */
export const validateSearchQuery: ValidationChain[] = [
    query('q')
        .trim()
        .notEmpty()
        .withMessage('Search query is required')
        .isString()
        .withMessage('Search query must be a string')
        .isLength({ min: 1, max: 200 })
        .withMessage('Search query must be between 1 and 200 characters')
        .escape(),
];

/**
 * Validate date range query parameters.
 */
export const validateDateRange: ValidationChain[] = [
    query('from')
        .optional({ checkFalsy: true })
        .isISO8601()
        .withMessage('From date must be a valid ISO 8601 date')
        .toDate(),

    query('to')
        .optional({ checkFalsy: true })
        .isISO8601()
        .withMessage('To date must be a valid ISO 8601 date')
        .toDate()
        .custom((value, { req }) => {
            const from = (req as any).query?.from;
            if (from && new Date(from) > value) {
                throw new Error('To date must be after from date');
            }
            return true;
        }),
];

/**
 * Validate notification preferences update.
 */
export const validateNotificationPreferences: ValidationChain[] = [
    body('push_enabled')
        .optional()
        .isBoolean()
        .withMessage('Push enabled must be a boolean')
        .toBoolean(),

    body('email_enabled')
        .optional()
        .isBoolean()
        .withMessage('Email enabled must be a boolean')
        .toBoolean(),

    body('marketing_emails')
        .optional()
        .isBoolean()
        .withMessage('Marketing emails must be a boolean')
        .toBoolean(),
];

/**
 * Validate transaction filter query parameters.
 */
export const validateTransactionFilters: ValidationChain[] = [
    query('type')
        .optional({ checkFalsy: true })
        .isIn(['top_up', 'withdrawal', 'transfer', 'payment', 'refund'])
        .withMessage('Invalid transaction type'),

    query('status')
        .optional({ checkFalsy: true })
        .isIn(['pending', 'completed', 'failed', 'cancelled'])
        .withMessage('Invalid transaction status'),

    ...validateDateRange,
    ...validatePagination,
];

// =============================================================================
// ─── Middleware Re-exports ───────────────────────────────────────────────────
// =============================================================================

/**
 * Re-export the generic validation middleware for convenience.
 * Usage: router.post('/path', validate(validateRegister), handler);
 */
export { validate as validationMiddleware };

/**
 * Combined validation middleware that validates body + params + query.
 * Useful for routes that need validation on multiple input sources.
 */
export function validateAll(validations: {
    body?: ValidationChain[];
    params?: ValidationChain[];
    query?: ValidationChain[];
}): import('express').RequestHandler[] {
    const chains: ValidationChain[] = [];
    if (validations.body) chains.push(...validations.body);
    if (validations.params) chains.push(...validations.params);
    if (validations.query) chains.push(...validations.query);
    return [validate(chains)];
}
