/**
 * =============================================================================
 * GEM Z — Validation Middleware
 * =============================================================================
 *
 * Generic validation middleware using express-validator with custom
 * validators for GEM Z-specific input types (Egyptian phone, National ID,
 * strong passwords, UUIDs).
 *
 * Exports:
 *   - validateBody      → Validate and sanitize request body
 *   - validateQuery     → Validate and sanitize query parameters
 *   - validateParams    → Validate route parameters
 *   - validate          → Generic validation runner (works with any location)
 *   - Custom validators → isValidUUID, isValidEgyptianPhone, isValidEmail,
 *                         isStrongPassword, isValidNationalId
 *
 * @module middlewares/validation
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';
import {
    validationResult,
    body,
    query,
    param,
    ValidationChain,
    CustomValidator,
    ValidatorOptions,
} from 'express-validator';

// =============================================================================
// ─── Custom Validators ───────────────────────────────────────────────────────
// =============================================================================

/**
 * Validates a UUID (v4) string.
 * Matches standard UUID format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 */
export const isValidUUID: CustomValidator = (value: string) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!value || typeof value !== 'string') {
        throw new Error('UUID is required');
    }
    if (!uuidRegex.test(value)) {
        throw new Error(`Invalid UUID format: "${value}"`);
    }
    return true;
};

/**
 * Validates an Egyptian mobile phone number.
 * Supports formats:
 *   - 010XXXXXXXX, 011XXXXXXXX, 012XXXXXXXX, 015XXXXXXXX
 *   - +2010XXXXXXXX, +2011XXXXXXXX, +2012XXXXXXXX, +2015XXXXXXXX
 *   - 10 digits after the leading 0 (total 11 digits)
 */
export const isValidEgyptianPhone: CustomValidator = (value: string) => {
    if (!value || typeof value !== 'string') {
        throw new Error('Phone number is required');
    }
    // Remove all non-digit characters except leading +
    const normalized = value.trim();
    const egyptPhoneRegex = /^(\+?20|0)?1[0-25]\d{8}$/;

    if (!egyptPhoneRegex.test(normalized)) {
        throw new Error(
            'Invalid Egyptian phone number. Expected format: 01XXXXXXXX or +201XXXXXXXX (11 digits after 0)'
        );
    }
    return true;
};

/**
 * Validates an email address with strict regex.
 * Checks for valid format, proper domain, and reasonable length.
 */
export const isValidEmail: CustomValidator = (value: string) => {
    if (!value || typeof value !== 'string') {
        throw new Error('Email is required');
    }
    const trimmed = value.trim().toLowerCase();

    // RFC 5322 compliant (simplified) email regex
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

    if (trimmed.length > 254) {
        throw new Error('Email address exceeds maximum length of 254 characters');
    }
    if (!emailRegex.test(trimmed)) {
        throw new Error(`Invalid email format: "${trimmed}"`);
    }
    // Check for consecutive dots which are invalid
    if (trimmed.includes('..')) {
        throw new Error('Email contains invalid consecutive dots');
    }
    return true;
};

/**
 * Validates password strength.
 * Requirements:
 *   - Minimum 8 characters
 *   - At least one uppercase letter (A-Z)
 *   - At least one lowercase letter (a-z)
 *   - At least one digit (0-9)
 *   - At least one special character (!@#$%^&* etc.)
 *   - Maximum 128 characters
 */
export const isStrongPassword: CustomValidator = (value: string) => {
    if (!value || typeof value !== 'string') {
        throw new Error('Password is required');
    }
    if (value.length < 8) {
        throw new Error('Password must be at least 8 characters long');
    }
    if (value.length > 128) {
        throw new Error('Password must not exceed 128 characters');
    }
    if (!/[A-Z]/.test(value)) {
        throw new Error('Password must contain at least one uppercase letter (A-Z)');
    }
    if (!/[a-z]/.test(value)) {
        throw new Error('Password must contain at least one lowercase letter (a-z)');
    }
    if (!/[0-9]/.test(value)) {
        throw new Error('Password must contain at least one digit (0-9)');
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value)) {
        throw new Error('Password must contain at least one special character (!@#$%^&* etc.)');
    }
    // Check for common weak passwords
    const commonPasswords = ['password', '12345678', 'qwerty', 'admin', 'letmein', 'welcome'];
    if (commonPasswords.some(common => value.toLowerCase().includes(common))) {
        throw new Error('Password is too common or easily guessable');
    }
    return true;
};

/**
 * Validates Egyptian National ID (Rakam Qawmy).
 * The Egyptian National ID is a 14-digit number with specific encoding:
 *   - Digits 1-1 : Century (2=1900-1999, 3=2000-2099)
 *   - Digits 2-3 : Year (00-99)
 *   - Digits 4-5 : Month (01-12)
 *   - Digits 6-7 : Day (01-31)
 *   - Digits 8-9 : Governorate code
 *   - Digits 10-13 : Sequence number
 *   - Digit 14 : Check digit
 */
export const isValidNationalId: CustomValidator = (value: string) => {
    if (!value || typeof value !== 'string') {
        throw new Error('National ID is required');
    }
    // National ID must be exactly 14 digits
    const nationalIdRegex = /^\d{14}$/;
    if (!nationalIdRegex.test(value)) {
        throw new Error('National ID must be exactly 14 digits');
    }

    // Extract date components
    const centuryDigit = value[0];
    const yearDigits = value.substring(1, 3);
    const monthDigits = value.substring(3, 5);
    const dayDigits = value.substring(5, 7);

    // Validate century digit (2 or 3)
    if (centuryDigit !== '2' && centuryDigit !== '3') {
        throw new Error('Invalid National ID: century digit must be 2 or 3');
    }

    // Validate month (01-12)
    const month = parseInt(monthDigits, 10);
    if (month < 1 || month > 12) {
        throw new Error('Invalid National ID: month must be between 01 and 12');
    }

    // Validate day (01-31, basic check)
    const day = parseInt(dayDigits, 10);
    if (day < 1 || day > 31) {
        throw new Error('Invalid National ID: day must be between 01 and 31');
    }

    // Validate governorate code (digits 8-9)
    const governorateCode = parseInt(value.substring(7, 9), 10);
    const validGovernorateCodes = [
        1, 2, 3, 4, 11, 12, 13, 14, 15, 16, 17, 18, 19,
        21, 22, 23, 24, 25, 26, 27, 28, 29, 31, 32, 33, 34, 35, 88
    ];
    if (!validGovernorateCodes.includes(governorateCode)) {
        throw new Error('Invalid National ID: unknown governorate code');
    }

    return true;
};

// =============================================================================
// ─── Validation Error Formatter ──────────────────────────────────────────────
// =============================================================================

/**
 * Formats validation errors into a clean, client-friendly structure.
 */
interface FormattedError {
    field: string;
    message: string;
    value?: any;
    location: string;
}

function formatValidationErrors(req: Request): FormattedError[] {
    const errors = validationResult(req);
    if (errors.isEmpty()) {
        return [];
    }
    return errors.array().map(err => ({
        field: err.type === 'field' ? err.path : err.type,
        message: err.msg,
        value: err.type === 'field' ? err.value : undefined,
        location: err.location,
    }));
}

// =============================================================================
// ─── Generic Validation Middleware ───────────────────────────────────────────
// =============================================================================

/**
 * Generic validation runner.
 * Executes a chain of express-validator validations and returns
 * a structured error response if any validation fails.
 *
 * @param validations - Array of ValidationChain to execute
 * @returns Express middleware that runs validations
 */
export function validate(validations: ValidationChain[]): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction) => {
        // Execute all validations in sequence
        for (const validation of validations) {
            await validation.run(req);
        }

        const formattedErrors = formatValidationErrors(req);

        if (formattedErrors.length > 0) {
            res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: formattedErrors,
            });
            return;
        }

        next();
    };
}

// =============================================================================
// ─── Body Validation ─────────────────────────────────────────────────────────
// =============================================================================

/**
 * Body validation helper.
 * Creates a middleware that validates the request body against
 * the provided validation chains.
 *
 * @example
 *   router.post('/register', validateBody([
 *     body('email').custom(isValidEmail),
 *     body('password').custom(isStrongPassword),
 *     body('phone').optional().custom(isValidEgyptianPhone),
 *   ]), registerHandler);
 */
export function validateBody(validations: ValidationChain[]): RequestHandler {
    return validate(validations);
}

// =============================================================================
// ─── Query Validation ────────────────────────────────────────────────────────
// =============================================================================

/**
 * Query validation helper.
 * Creates a middleware that validates query parameters against
 * the provided validation chains.
 *
 * @example
 *   router.get('/search', validateQuery([
 *     query('q').trim().notEmpty().withMessage('Search query is required'),
 *     query('page').optional().isInt({ min: 1 }).toInt(),
 *   ]), searchHandler);
 */
export function validateQuery(validations: ValidationChain[]): RequestHandler {
    return validate(validations);
}

// =============================================================================
// ─── Params Validation ───────────────────────────────────────────────────────
// =============================================================================

/**
 * Param validation helper.
 * Creates a middleware that validates route parameters against
 * the provided validation chains.
 *
 * @example
 *   router.get('/users/:id', validateParams([
 *     param('id').custom(isValidUUID),
 *   ]), getUserHandler);
 */
export function validateParams(validations: ValidationChain[]): RequestHandler {
    return validate(validations);
}

// =============================================================================
// ─── Pre-built Validation Chains ─────────────────────────────────────────────
// =============================================================================

/**
 * Common validation chains for reuse across routes.
 */

/** Validate UUID in route params */
export const paramUUID = (field: string = 'id'): ValidationChain =>
    param(field).trim().notEmpty().withMessage(`${field} is required`).custom(isValidUUID);

/** Validate email in body */
export const bodyEmail = (field: string = 'email'): ValidationChain =>
    body(field).trim().notEmpty().withMessage('Email is required').custom(isValidEmail);

/** Validate strong password in body */
export const bodyPassword = (field: string = 'password'): ValidationChain =>
    body(field).notEmpty().withMessage('Password is required').custom(isStrongPassword);

/** Validate Egyptian phone in body */
export const bodyEgyptianPhone = (field: string = 'phone'): ValidationChain =>
    body(field)
        .optional({ checkFalsy: true })
        .trim()
        .custom(isValidEgyptianPhone);

/** Validate National ID in body */
export const bodyNationalId = (field: string = 'nationalId'): ValidationChain =>
    body(field)
        .optional({ checkFalsy: true })
        .trim()
        .custom(isValidNationalId);

/** Pagination: page number */
export const queryPage = (field: string = 'page'): ValidationChain =>
    query(field)
        .optional()
        .isInt({ min: 1 })
        .withMessage(`${field} must be a positive integer`)
        .toInt();

/** Pagination: limit */
export const queryLimit = (field: string = 'limit', max: number = 100): ValidationChain =>
    query(field)
        .optional()
        .isInt({ min: 1, max })
        .withMessage(`${field} must be between 1 and ${max}`)
        .toInt();

/** Generic required string field */
export const requiredString = (field: string, location: 'body' | 'query' | 'param' = 'body', options?: ValidatorOptions): ValidationChain => {
    const chain = location === 'body' ? body(field, options) : location === 'query' ? query(field, options) : param(field, options);
    return chain
        .trim()
        .notEmpty()
        .withMessage(`${field} is required`)
        .isString()
        .withMessage(`${field} must be a string`)
        .isLength({ max: 255 })
        .withMessage(`${field} must not exceed 255 characters`)
        .escape();
};

/** Optional string field with sanitization */
export const optionalString = (field: string, location: 'body' | 'query' | 'param' = 'body', options?: ValidatorOptions): ValidationChain => {
    const chain = location === 'body' ? body(field, options) : location === 'query' ? query(field, options) : param(field, options);
    return chain
        .optional({ checkFalsy: true })
        .trim()
        .isString()
        .withMessage(`${field} must be a string`)
        .isLength({ max: 500 })
        .withMessage(`${field} must not exceed 500 characters`)
        .escape();
};

/** Positive integer field */
export const positiveInt = (field: string, location: 'body' | 'query' | 'param' = 'body'): ValidationChain => {
    const chain = location === 'body' ? body(field) : location === 'query' ? query(field) : param(field);
    return chain
        .notEmpty()
        .withMessage(`${field} is required`)
        .isInt({ min: 1 })
        .withMessage(`${field} must be a positive integer`)
        .toInt();
};

/** Positive decimal/number field */
export const positiveDecimal = (field: string, location: 'body' | 'query' | 'param' = 'body'): ValidationChain => {
    const chain = location === 'body' ? body(field) : location === 'query' ? query(field) : param(field);
    return chain
        .notEmpty()
        .withMessage(`${field} is required`)
        .isFloat({ min: 0 })
        .withMessage(`${field} must be a positive number`)
        .toFloat();
};

// =============================================================================
// ─── Sanitization Helpers ────────────────────────────────────────────────────
// =============================================================================

/**
 * Sanitizes a string by trimming whitespace and escaping HTML entities.
 */
export const sanitizeString = (field: string, location: 'body' | 'query' | 'param' = 'body'): ValidationChain => {
    const chain = location === 'body' ? body(field) : location === 'query' ? query(field) : param(field);
    return chain.trim().escape();
};

/**
 * Normalizes an email field to lowercase.
 */
export const normalizeEmail = (field: string = 'email'): ValidationChain =>
    body(field).trim().isEmail().normalizeEmail().toLowerCase();
