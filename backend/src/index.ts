import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import http from 'http';
import path from 'path';
import routes from './routes';
import { config } from './config';
import { errorHandler } from './core/middlewares/error.middleware';
import { SocketService } from './core/sockets/socket';
import { generalLimiter } from './core/middlewares/rate-limit.middleware';
import { verifyEmailConnection } from './services/email.service';

// ─── Queue System Imports ────────────────────────────────────────
import {
    setupQueues,
    shutdownQueues,
    setupQueueDashboard,
    setupQueueHealthEndpoint,
} from './core/queue';

// ─── Security Middleware Imports ─────────────────────────────────
import {
    securityHeaders,
} from './core/middlewares/security-headers.middleware';
import { requestId } from './core/middlewares/request-id.middleware';
import { sanitizationMiddleware } from './core/middlewares/sanitization.middleware';
import { timeout } from './core/middlewares/timeout.middleware';

// ─── NEW: Logging & Redis Imports ────────────────────────────────
import { logger } from './core/logging/logger';
import { logError, logUncaught } from './core/logging/error-logger';
import {
    requestLogger,
    healthCheckHandler,
} from './core/logging/middleware';
import { connectRedis, disconnectRedis } from './core/redis/client';

const log = logger.child({ module: 'server' });

// ─── Validate Environment Variables ──────────────────────────────

import { validateEnv } from './config/validation';
validateEnv();

const app = express();
const server = http.createServer(app);
const PORT = config.port;

// Initialize WebSockets
export const socketService = new SocketService(server);

// ════════════════════════════════════════════════════════════════
//  PROCESS-LEVEL ERROR HANDLERS (must be before server start)
// ════════════════════════════════════════════════════════════════

process.on('uncaughtException', (err: Error) => {
    logUncaught(err, 'uncaughtException');
    // Give logger time to flush before triggering shutdown
    setTimeout(() => gracefulShutdown('uncaughtException'), 500);
});

process.on('unhandledRejection', (reason: unknown) => {
    const err = reason instanceof Error ? reason : new Error(String(reason));
    logUncaught(err, 'unhandledRejection');
    // Don't exit — let the app continue, but log it
});

process.on('rejectionHandled', (promise: Promise<any>) => {
    log.warn({ type: 'rejection_handled' }, 'Previously unhandled promise rejection was handled');
});

// Listen for termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ════════════════════════════════════════════════════════════════
//  MIDDLEWARE STACK — Ordered by Security Best Practices
// ════════════════════════════════════════════════════════════════
//
//  1. Request ID          → Trace every request for debugging
//  2. Security Headers    → Helmet + CSP + HSTS hardening
//  3. CORS                → Cross-origin resource sharing rules
//  4. Rate Limiting       → DDoS / brute-force protection
//  5. Body Parser         → Parse JSON + URL-encoded bodies
//  6. Cookie Parser       → Parse and sign cookies
//  7. Request Logging     → Log all incoming requests (NEW: Pino)
//  8. Input Sanitization  → XSS, SQLi, NoSQLi prevention
//  9. Timeout             → Prevent hanging requests
// 10. Static Files        → Serve uploaded files
// 11. API Routes          → Application routes
// 12. Error Handler       → Global error handling (must be LAST)
//
// ════════════════════════════════════════════════════════════════

// ─── 1. REQUEST ID ─────────────────────────────────────────────
app.use(requestId());

// ─── 2. SECURITY HEADERS ───────────────────────────────────────
app.use(securityHeaders());

// ─── 3. CORS ───────────────────────────────────────────────────
app.use(cors({
    origin: config.clientUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Request-ID',
        'Idempotency-Key',
        'X-API-Key',
    ],
    exposedHeaders: [
        'X-Request-ID',
        'X-Request-ID-Replay',
        'Idempotency-Replayed',
        'Retry-After',
    ],
}));

// ─── 4. RATE LIMITING ──────────────────────────────────────────
app.use('/api/', generalLimiter);

// ─── 5. BODY PARSER ────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── 6. COOKIE PARSER ──────────────────────────────────────────
app.use(cookieParser());

// ─── 7. REQUEST LOGGING (NEW) ──────────────────────────────────
// Structured Pino logging for every HTTP request
app.use(requestLogger);

// ─── 8. INPUT SANITIZATION ─────────────────────────────────────
app.use(sanitizationMiddleware());

// ─── 9. REQUEST TIMEOUT ────────────────────────────────────────
app.use(timeout());

// ════════════════════════════════════════════════════════════════
//  APPLICATION ROUTES
// ════════════════════════════════════════════════════════════════

// ─── 10. STATIC FILES ──────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '../../public/uploads')));

// ─── 11. API ROUTES ────────────────────────────────────────────
app.use('/api/v1', routes);

// ─── Queue Dashboard ───────────────────────────────────────────
setupQueueDashboard(app);

// ─── Queue Health Endpoint ─────────────────────────────────────
setupQueueHealthEndpoint(app);

// ─── Root / Health Endpoint ────────────────────────────────────
app.get('/', healthCheckHandler);
app.get('/health', healthCheckHandler);
app.get('/healthz', healthCheckHandler);

// ─── 12. GLOBAL ERROR HANDLER ──────────────────────────────────
// Must be the LAST middleware — catches all errors.
app.use(errorHandler);

// ─── 404 Handler ───────────────────────────────────────────────
app.use((_req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found',
    });
});

// ════════════════════════════════════════════════════════════════
//  GRACEFUL SHUTDOWN
// ════════════════════════════════════════════════════════════════

let isShuttingDown = false;

async function gracefulShutdown(signal: string): Promise<void> {
    if (isShuttingDown) {
        log.info('Shutdown already in progress...');
        return;
    }
    isShuttingDown = true;

    log.info({ signal }, `Received ${signal}. Starting graceful shutdown...`);

    // 1. Stop accepting new connections
    server.close(() => {
        log.info('HTTP server closed — no new connections accepted.');
    });

    try {
        // 2. Disconnect Redis (NEW)
        await disconnectRedis();
        log.info('Redis disconnected gracefully.');
    } catch (err) {
        logError(err as Error, { route: 'shutdown', origin: 'disconnectRedis' });
    }

    try {
        // 3. Shut down queue system (workers + queues + Redis)
        await shutdownQueues();
        log.info('Queue system shut down.');
    } catch (err) {
        logError(err as Error, { route: 'shutdown', origin: 'shutdownQueues' });
    }

    // 4. Allow time for final logs to flush
    setTimeout(() => {
        log.info('Graceful shutdown complete. Exiting.');
        process.exit(0);
    }, 500);
}

// ════════════════════════════════════════════════════════════════
//  SERVER START
// ════════════════════════════════════════════════════════════════

server.listen(PORT, async () => {
    // Connect to Redis (non-blocking — app works without it)
    await connectRedis();

    log.info(
        {
            port: PORT,
            env: config.nodeEnv,
            nodeVersion: process.version,
            platform: process.platform,
        },
        'GEM Z Backend started'
    );

    log.debug(
        { ws: 'initialized' },
        'WebSocket engine initialized successfully'
    );

    log.info(
        { features: ['security-headers', 'rate-limiting', 'input-sanitization', 'request-timeout', 'request-logging'] },
        'Security features active'
    );

    // Initialize BullMQ Queue System
    try {
        await setupQueues();
        log.info(
            { dashboardUrl: `http://localhost:${PORT}/admin/queues` },
            'Queue system initialized'
        );
    } catch (err) {
        const error = err as Error;
        logError(error, { route: 'startup', origin: 'setupQueues' });
        log.warn('Queue system failed to start — background jobs will NOT be processed');
        // Don't crash — queues are optional for basic API functionality
    }

    // Verify email connection on startup (non-blocking)
    verifyEmailConnection().catch(() => {
        log.warn('SMTP not configured — email features will be disabled');
    });
});
