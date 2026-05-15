/**
 * =============================================================================
 * GEM Z — Security Headers Middleware
 * =============================================================================
 *
 * Comprehensive HTTP security headers powered by Helmet with custom CSP,
 * HSTS, Permissions Policy, and additional hardening headers.
 *
 * Headers Applied:
 *   - Content-Security-Policy        → Prevents XSS, clickjacking, data injection
 *   - Strict-Transport-Security      → Forces HTTPS (HSTS, 1 year, includeSubDomains, preload)
 *   - X-Content-Type-Options         → Prevents MIME-type sniffing
 *   - X-Frame-Options                → Prevents clickjacking
 *   - Referrer-Policy                → Controls referrer leakage
 *   - Permissions-Policy             → Restricts browser feature access
 *   - X-DNS-Prefetch-Control         → Prevents DNS prefetching
 *   - Cross-Origin-Embedder-Policy   → Disabled for image compatibility
 *   - Cross-Origin-Resource-Policy   → Cross-origin resource sharing
 *   - X-Permitted-Cross-Domain-Policies → Blocks Flash/Acrobat cross-domain
 *   - X-Download-Options             → Prevents IE from executing downloaded files
 *   - X-XSS-Protection               → Legacy XSS filter (disabled in favor of CSP)
 *
 * @module middlewares/security-headers
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';
import helmet from 'helmet';

/**
 * Allowed API origins for connect-src directive.
 * Falls back to self + wildcard https for development.
 */
const API_ORIGIN = process.env.API_URL || 'https://api.gemz.app';

/**
 * Content-Security-Policy directives for GEM Z.
 * Balances security with the app's need for inline styles,
 * data URIs for images, and external API communication.
 */
const cspDirectives = {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'"],
    styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    imgSrc: ["'self'", "data:", "https:", "blob:"],
    connectSrc: ["'self'", API_ORIGIN, "https://api.gemz.app", "wss:", "https:"],
    fontSrc: ["'self'", "https://fonts.gstatic.com"],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'"],
    frameSrc: ["'none'"],
    childSrc: ["'none'"],
    workerSrc: ["'self'"],
    manifestSrc: ["'self'"],
    upgradeInsecureRequests: [] as string[],
};

/**
 * Permissions-Policy directive for GEM Z.
 * Restricts access to sensitive browser features.
 * Camera and microphone are disabled.
 * Geolocation is limited to self-origin only.
 */
const PERMISSIONS_POLICY =
    'camera=(), microphone=(), geolocation=(self), magnetometer=(), gyroscope=(), ' +
    'payment=(self), usb=(), vr=(), accelerometer=(), ambient-light-sensor=(), ' +
    'autoplay=(self), encrypted-media=(self), fullscreen=(self), picture-in-picture=()';

/**
 * Factory function: returns a configured Helmet middleware with
 * CSP, HSTS, and all other security headers.
 */
export function createSecurityHeadersMiddleware(): RequestHandler {
    return helmet({
        // ─── Content Security Policy ─────────────────────
        contentSecurityPolicy: {
            directives: cspDirectives,
        },

        // ─── HSTS (HTTP Strict Transport Security) ───────
        // Enforces HTTPS for 1 year, includes all subdomains,
        // and requests inclusion in browser preload lists.
        hsts: {
            maxAge: 31536000,           // 1 year in seconds
            includeSubDomains: true,
            preload: true,
        },

        // ─── Referrer Policy ─────────────────────────────
        // Only send origin when cross-origin, full URL when same-origin.
        referrerPolicy: {
            policy: 'strict-origin-when-cross-origin',
        },

        // ─── Cross-Origin Policies ───────────────────────
        // COEP disabled to allow embedding images from external sources.
        // CORP set to cross-origin for image serving compatibility.
        crossOriginEmbedderPolicy: false,
        crossOriginResourcePolicy: { policy: 'cross-origin' },

        // ─── DNS Prefetch Control ────────────────────────
        // Prevents browsers from prefetching DNS (privacy + security).
        dnsPrefetchControl: { allow: false },

        // ─── X-Permitted-Cross-Domain-Policies ───────────
        // Prevents Adobe Flash / Acrobat from reading responses.
        permittedCrossDomainPolicies: { permittedPolicies: 'none' },

        // ─── X-Download-Options ──────────────────────────
        // Prevents IE from opening downloads in the browser context.
        ieNoOpen: true,

        // ─── X-XSS-Protection ────────────────────────────
        // Legacy header; disabled because CSP is the modern defense.
        xssFilter: false,

        // ─── X-Content-Type-Options ──────────────────────
        // Prevent MIME type sniffing (always set by Helmet by default).
        contentTypeOptions: true,
    });
}

/**
 * Custom middleware that injects additional security headers
 * NOT covered by Helmet's default configuration:
 *   - Permissions-Policy (feature policy)
 *   - X-Response-Time (for performance monitoring)
 *   - Cache-Control for API routes (prevent caching of sensitive data)
 */
export function customSecurityHeaders(
    _req: Request,
    res: Response,
    next: NextFunction
): void {
    // Permissions-Policy: restrict browser features
    res.setHeader('Permissions-Policy', PERMISSIONS_POLICY);

    // X-Content-Type-Options: prevent MIME sniffing (belt + suspenders)
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // X-Frame-Options: DENY clickjacking (belt + suspenders with CSP frame-ancestors)
    res.setHeader('X-Frame-Options', 'DENY');

    // Cache-Control: prevent caching of API responses with sensitive data
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // Remove X-Powered-By (Helmet does this, but belt + suspenders)
    res.removeHeader('X-Powered-By');
    res.removeHeader('Server');

    next();
}

/**
 * Content-Type validation middleware.
 * Ensures incoming requests have valid Content-Type headers.
 * Blocks requests with mismatched content types to prevent
 * content-type confusion attacks.
 */
export function validateContentType(
    req: Request,
    res: Response,
    next: NextFunction
): void {
    // Skip for GET, HEAD, OPTIONS, DELETE (no body expected)
    if (['GET', 'HEAD', 'OPTIONS', 'DELETE'].includes(req.method)) {
        next();
        return;
    }

    const contentType = req.headers['content-type'] || '';
    const validTypes = [
        'application/json',
        'application/x-www-form-urlencoded',
        'multipart/form-data',
        'text/plain',
        'application/xml',
    ];

    // Check for boundary in multipart content-type
    const isValid = validTypes.some(type => {
        if (type === 'multipart/form-data') {
            return contentType.startsWith(type);
        }
        return contentType.startsWith(type);
    });

    if (!isValid && req.method !== 'GET') {
        res.status(415).json({
            success: false,
            message: `Unsupported Content-Type: "${contentType}". Expected one of: ${validTypes.join(', ')}`,
        });
        return;
    }

    next();
}

/**
 * Combined security headers middleware.
 * Applies Helmet + custom headers in a single mount.
 *
 * Usage:
 *   app.use(securityHeaders());
 */
export function securityHeaders(): RequestHandler[] {
    return [
        createSecurityHeadersMiddleware(),
        customSecurityHeaders,
        validateContentType,
    ];
}

export default securityHeaders;
