/**
 * =============================================================================
 * GEM Z — Input Sanitization Middleware
 * =============================================================================
 *
 * Comprehensive input sanitization to prevent:
 *   - XSS (Cross-Site Scripting)           via HTML stripping
 *   - SQL Injection                        via escape sanitization
 *   - NoSQL Injection                      via key sanitization
 *   - Command Injection                    via shell meta-char filtering
 *   - Prototype Pollution                  via __proto__ / constructor filtering
 *
 * Operations:
 *   - Trims all string inputs
 *   - Normalizes email to lowercase
 *   - Strips HTML tags from text inputs
 *   - Sanitizes SQL special characters
 *   - Blocks NoSQL injection operators ($gt, $ne, etc.)
 *   - Removes prototype pollution keys
 *   - Limits request body size (10MB — configured in index.ts)
 *   - Prevents XSS in API responses
 *
 * @module middlewares/sanitization
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';

// =============================================================================
// ─── Constants ───────────────────────────────────────────────────────────────
// =============================================================================

/** Maximum allowed string length after sanitization */
const MAX_STRING_LENGTH = 5000;

/** Maximum allowed depth for nested objects */
const MAX_DEPTH = 5;

/** Maximum allowed keys in a single object */
const MAX_KEYS = 100;

/** NoSQL injection operators to block */
const NOSQL_OPERATORS = new Set([
    '$eq', '$ne', '$gt', '$gte', '$lt', '$lte', '$in', '$nin',
    '$regex', '$exists', '$where', '$expr', '$jsonSchema',
    '$mod', '$options', '$text', '$search', '$language',
    '$caseSensitive', '$diacriticSensitive',
    // Aggregation operators
    '$accumulator', '$addFields', '$bucket', '$bucketAuto',
    '$collStats', '$count', '$currentOp', '$facet', '$geoNear',
    '$graphLookup', '$group', '$indexStats', '$limit', '$listLocalSessions',
    '$listSessions', '$lookup', '$match', '$merge', '$out', '$planCacheStats',
    '$project', '$redact', '$replaceRoot', '$replaceWith', '$sample',
    '$set', '$skip', '$sort', '$sortByCount', '$unionWith', '$unset',
    '$unwind',
]);

/** Prototype pollution keys to remove */
const PROTOTYPE_POLLUTION_KEYS = new Set([
    '__proto__',
    'constructor',
    'prototype',
    '__defineGetter__',
    '__defineSetter__',
    '__lookupGetter__',
    '__lookupSetter__',
]);

/** HTML tag regex for stripping */
const HTML_TAG_REGEX = /<[^>]*>/g;

/** SQL special characters that need escaping */
const SQL_SPECIAL_CHARS: Record<string, string> = {
    "'": "''",
    '\\': '\\\\',
    '\x00': '',
    '\x1a': '',
};

// =============================================================================
// ─── Sanitization Functions ──────────────────────────────────────────────────
// =============================================================================

/**
 * Strips all HTML tags from a string.
 * Prevents XSS via HTML injection in text fields.
 */
function stripHtml(value: string): string {
    return value.replace(HTML_TAG_REGEX, '').trim();
}

/**
 * Escapes SQL special characters to prevent SQL injection.
 * Uses PostgreSQL-compatible escaping.
 */
function escapeSql(value: string): string {
    let escaped = value;
    for (const [char, replacement] of Object.entries(SQL_SPECIAL_CHARS)) {
        escaped = escaped.split(char).join(replacement);
    }
    // Also neutralize comment syntax
    escaped = escaped.replace(/--/g, '');
    return escaped;
}

/**
 * Checks if a string contains potential shell metacharacters.
 * Used to detect command injection attempts.
 */
function containsShellMeta(value: string): boolean {
    // Allow common safe characters, flag dangerous shell metacharacters
    const shellMetaRegex = /[;|&`$(){}[\]!><\\*]/;
    return shellMetaRegex.test(value);
}

/**
 * Recursively sanitizes a value based on its type.
 *
 * @param value      - The value to sanitize
 * @param depth      - Current recursion depth (to prevent deep nesting attacks)
 * @param keyCount   - Running count of keys processed
 * @returns          - Sanitized value
 * @throws           - If depth or key limits are exceeded
 */
function sanitizeValue(
    value: unknown,
    depth: number = 0,
    keyCount: { value: number } = { value: 0 }
): unknown {
    // ─── Depth limit ─────────────────────────────────────
    if (depth > MAX_DEPTH) {
        throw new Error(`Input exceeds maximum nesting depth of ${MAX_DEPTH}`);
    }

    // ─── null / undefined ────────────────────────────────
    if (value === null || value === undefined) {
        return value;
    }

    // ─── String ──────────────────────────────────────────
    if (typeof value === 'string') {
        keyCount.value++;
        if (keyCount.value > MAX_KEYS) {
            throw new Error(`Input exceeds maximum key count of ${MAX_KEYS}`);
        }

        let sanitized = value;

        // 1. Trim whitespace
        sanitized = sanitized.trim();

        // 2. Limit length
        if (sanitized.length > MAX_STRING_LENGTH) {
            sanitized = sanitized.substring(0, MAX_STRING_LENGTH);
        }

        // 3. Strip HTML tags (XSS prevention)
        sanitized = stripHtml(sanitized);

        // 4. Escape SQL special characters (SQL injection prevention)
        sanitized = escapeSql(sanitized);

        // 5. Check for shell metacharacters (command injection)
        if (containsShellMeta(sanitized)) {
            // Remove shell metacharacters entirely
            sanitized = sanitized.replace(/[;|&`$(){}[\]!><\\*]/g, '');
        }

        return sanitized;
    }

    // ─── Number ──────────────────────────────────────────
    if (typeof value === 'number') {
        keyCount.value++;
        // Reject NaN and Infinity
        if (Number.isNaN(value) || !Number.isFinite(value)) {
            return 0;
        }
        return value;
    }

    // ─── Boolean ─────────────────────────────────────────
    if (typeof value === 'boolean') {
        return value;
    }

    // ─── Array ───────────────────────────────────────────
    if (Array.isArray(value)) {
        keyCount.value++;
        if (keyCount.value > MAX_KEYS) {
            throw new Error(`Input exceeds maximum key count of ${MAX_KEYS}`);
        }
        return value
            .slice(0, 100) // Max 100 array items
            .map(item => sanitizeValue(item, depth + 1, keyCount));
    }

    // ─── Object ──────────────────────────────────────────
    if (typeof value === 'object') {
        keyCount.value++;
        if (keyCount.value > MAX_KEYS) {
            throw new Error(`Input exceeds maximum key count of ${MAX_KEYS}`);
        }

        const sanitized: Record<string, unknown> = {};
        const entries = Object.entries(value);

        for (const [key, val] of entries) {
            // 1. Skip prototype pollution keys
            if (PROTOTYPE_POLLUTION_KEYS.has(key)) {
                continue;
            }

            // 2. Block NoSQL injection operators at root level
            if (key.startsWith('$') && NOSQL_OPERATORS.has(key)) {
                continue; // Silently strip the dangerous operator
            }

            // 3. Sanitize the key itself (keys can also be attack vectors)
            const sanitizedKey = typeof key === 'string'
                ? key.trim().replace(HTML_TAG_REGEX, '').replace(/--/g, '')
                : key;

            // 4. Recursively sanitize the value
            sanitized[sanitizedKey] = sanitizeValue(val, depth + 1, keyCount);
        }

        return sanitized;
    }

    // ─── Unknown type ────────────────────────────────────
    // For functions, symbols, etc. — convert to undefined
    return undefined;
}

/**
 * Normalizes email fields to lowercase with standard formatting.
 */
function normalizeEmails(body: Record<string, unknown>): void {
    const emailFields = ['email', 'e_mail', 'mail', 'user_email', 'contact_email'];

    for (const field of emailFields) {
        if (field in body && typeof body[field] === 'string') {
            body[field] = (body[field] as string).trim().toLowerCase();
        }
    }
}

// =============================================================================
// ─── Middleware ──────────────────────────────────────────────────────────────
// =============================================================================

/**
 * Main input sanitization middleware.
 *
 * Sanitizes:
 *   - req.body     → All body fields
 *   - req.query    → All query parameters
 *   - req.params   → All route parameters
 *
 * Operations:
 *   1. Trims all strings
 *   2. Strips HTML tags
 *   3. Escapes SQL special characters
 *   4. Removes NoSQL operators
 *   5. Removes prototype pollution keys
 *   6. Normalizes emails to lowercase
 *   7. Enforces max string length and object depth
 */
export function sanitizeInput(req: Request, res: Response, next: NextFunction): void {
    try {
        // Sanitize body
        if (req.body && typeof req.body === 'object') {
            req.body = sanitizeValue(req.body) as Record<string, unknown>;
            if (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) {
                normalizeEmails(req.body as Record<string, unknown>);
            }
        }

        // Sanitize query parameters
        if (req.query && typeof req.query === 'object') {
            req.query = sanitizeValue(req.query) as Record<string, unknown>;
        }

        // Sanitize route parameters
        if (req.params && typeof req.params === 'object') {
            req.params = sanitizeValue(req.params) as Record<string, string>;
        }

        next();
    } catch (error: any) {
        res.status(400).json({
            success: false,
            message: 'Input sanitization failed',
            error: error.message,
        });
    }
}

// =============================================================================
// ─── XSS Prevention for API Responses ────────────────────────────────────────
// =============================================================================

/**
 * Middleware that sanitizes JSON responses to prevent XSS.
 * Wraps res.json() to automatically escape any HTML in response bodies.
 *
 * This is defense-in-depth: inputs should already be sanitized,
 * but this catches anything that slips through.
 */
export function sanitizeResponse(_req: Request, res: Response, next: NextFunction): void {
    const originalJson = res.json.bind(res);

    res.json = function (body: unknown): Response {
        // Only process objects and arrays
        if (body && (typeof body === 'object')) {
            const sanitized = sanitizeApiResponse(body);
            return originalJson(sanitized);
        }

        return originalJson(body);
    };

    next();
}

/**
 * Recursively sanitizes API response data by escaping HTML in strings.
 * Prevents stored XSS from being reflected back to clients.
 */
function sanitizeApiResponse(data: unknown): unknown {
    if (data === null || data === undefined) {
        return data;
    }

    if (typeof data === 'string') {
        // Escape HTML entities to prevent XSS in JSON responses
        return data
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;');
    }

    if (typeof data === 'number' || typeof data === 'boolean') {
        return data;
    }

    if (Array.isArray(data)) {
        return data.map(item => sanitizeApiResponse(item));
    }

    if (typeof data === 'object') {
        const sanitized: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(data)) {
            sanitized[key] = sanitizeApiResponse(value);
        }
        return sanitized;
    }

    return data;
}

// =============================================================================
// ─── Combined Export ─────────────────────────────────────────────────────────
// =============================================================================

/**
 * Combined sanitization middleware stack.
 * Applies both input sanitization and response sanitization.
 *
 * Usage:
 *   app.use(sanitizationMiddleware());
 */
export function sanitizationMiddleware(): RequestHandler[] {
    return [
        sanitizeInput,
        sanitizeResponse,
    ];
}

export default sanitizationMiddleware;
