import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import http from 'http';
import path from 'path';
import routes from './routes';
import { config } from './config';

// ─── NEW: Standardized Error Handling ────────────────────────────
import {
    AppError,
    ValidationError,
    AuthError,
    NotFoundError,
    ConflictError,
    RateLimitError,
    WalletError,
    buildErrorResponse,
    isAppError,
    ErrorCode,
} from './core/errors';

// ─── NEW: API Response Wrapper ───────────────────────────────────
import { success } from './core/utils/api-response';

// ─── NEW: Graceful Shutdown ──────────────────────────────────────
import { setupGracefulShutdown, isHealthy } from './core/utils/graceful-shutdown';

// ─── NEW: Health Routes ──────────────────────────────────────────
import { createHealthRouter } from './routes/health';

// ─── Database & Redis ────────────────────────────────────────────
import { db } from './core/database/db';
import { redisClient, connectRedis } from './core/redis/client';

// ─── Socket.IO ───────────────────────────────────────────────────
import { SocketService } from './core/sockets/socket';

// ─── Middleware ──────────────────────────────────────────────────
import { generalLimiter } from './core/middlewares/rate-limit.middleware';
import { verifyEmailConnection } from './services/email.service';

// ─── Queue System Imports ────────────────────────────────────────
import {
    setupQueues,
    setupQueueDashboard,
    setupQueueHealthEndpoint,
} from './core/queue';

// ─── Security Middleware Imports ─────────────────────────────────
import {
    securityHeaders,
} from './core/middlewares/security-headers.middleware';
import { i18nMiddleware } from './core/i18n';
import { requestId } from './core/middlewares/request-id.middleware';
import { sanitizationMiddleware } from './core/middlewares/sanitization.middleware';
import { timeout } from './core/middlewares/timeout.middleware';

// ─── Logging ─────────────────────────────────────────────────────
import { logger } from './core/logging/logger';
import { logError, logUncaught } from './core/logging/error-logger';
import {
    requestLogger,
} from './core/logging/middleware';

// ─── Validate Environment ────────────────────────────────────────
import { validateEnv } from './config/validation';
validateEnv();

// ─── Swagger/OpenAPI Documentation ───────────────────────────────
import { setupSwagger } from './docs/swagger';

const log = logger.child({ module: 'server' });

// ════════════════════════════════════════════════════════════════
//  EXPRESS APP SETUP
// ════════════════════════════════════════════════════════════════

const app = express();
const server = http.createServer(app);
const PORT = config.port;

// Initialize WebSockets
export const socketService = new SocketService(server);

// ════════════════════════════════════════════════════════════════
//  PROCESS-LEVEL ERROR HANDLERS
// ════════════════════════════════════════════════════════════════

process.on('uncaughtException', (err: Error) => {
    logUncaught(err, 'uncaughtException');
    setTimeout(() => process.kill(process.pid, 'SIGTERM'), 500);
});

process.on('unhandledRejection', (reason: unknown) => {
    const err = reason instanceof Error ? reason : new Error(String(reason));
    logUncaught(err, 'unhandledRejection');
});

process.on('rejectionHandled', (_promise: Promise<any>) => {
    log.warn({ type: 'rejection_handled' }, 'Previously unhandled promise rejection was handled');
});

// ════════════════════════════════════════════════════════════════
//  MIDDLEWARE STACK
// ════════════════════════════════════════════════════════════════

// 1. Request ID
app.use(requestId());

// 2. Security Headers
app.use(securityHeaders());

// 3. CORS
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

// 4. Rate Limiting
app.use('/api/', generalLimiter);

// 5. Body Parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 6. Cookie Parser
app.use(cookieParser());

// 7. Request Logging
app.use(requestLogger);

// 8. Input Sanitization
app.use(sanitizationMiddleware());

// 9. Request Timeout
app.use(timeout());

// 10. i18n (Language Detection)
app.use(i18nMiddleware);

// ════════════════════════════════════════════════════════════════
//  APPLICATION ROUTES
// ════════════════════════════════════════════════════════════════

// 11. Static Files
app.use('/uploads', express.static(path.join(__dirname, '../../public/uploads')));

// 12. NEW: Health Check Routes (before API routes)
app.use('/api/v1/health', createHealthRouter(db, redisClient));

// ─── 13. API Routes ────────────────────────────────────────────
app.use('/api/v1', routes);

// ─── 14. Swagger API Docs ──────────────────────────────────────
// Interactive API documentation at /api-docs
// Raw OpenAPI spec at /api-docs.json
setupSwagger(app);

// ─── Queue Dashboard ───────────────────────────────────────────
setupQueueDashboard(app);

// ─── Queue Health Endpoint ─────────────────────────────────────
setupQueueHealthEndpoint(app);

// ─── Legacy Health Endpoints (redirect to new ones) ────────────
app.get('/', (_req, res) => {
    res.redirect('/api/v1/health');
});
app.get('/health', (_req, res) => {
    res.redirect('/api/v1/health');
});
app.get('/healthz', (_req, res) => {
    res.redirect('/api/v1/health');
});

// ════════════════════════════════════════════════════════════════
//  NEW: GLOBAL ERROR HANDLER (replaces old error.middleware)
// ════════════════════════════════════════════════════════════════

app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const requestId = req.headers['x-request-id'] as string | undefined;

    // Log the error
    logError(err, {
        route: req.path,
        method: req.method,
        requestId,
        origin: err.stack?.split('\n')[1]?.trim(),
    });

    // Handle known operational errors (AppError hierarchy)
    if (isAppError(err)) {
        const response = buildErrorResponse(err, requestId);
        return res.status(err.statusCode).json(response);
    }

    // Handle unknown/programming errors
    const isDev = process.env.NODE_ENV === 'development';
    const statusCode = (err as any).statusCode || 500;
    const response = buildErrorResponse(
        new AppError(
            isDev ? err.message : 'Internal Server Error',
            statusCode,
            ErrorCode.SERVER_ERROR,
            false
        ),
        requestId
    );

    // Include stack in development
    if (isDev) {
        response.stack = err.stack;
    }

    res.status(statusCode).json(response);
});

// ─── 404 Handler ───────────────────────────────────────────────
app.use((_req, res) => {
    const notFound = new NotFoundError('Route not found', ErrorCode.NOT_FOUND_RESOURCE);
    res.status(404).json(buildErrorResponse(notFound));
});

// ════════════════════════════════════════════════════════════════
//  NEW: GRACEFUL SHUTDOWN
// ════════════════════════════════════════════════════════════════

setupGracefulShutdown(server, [], {
    timeoutMs: 30000,
});

// ════════════════════════════════════════════════════════════════
//  SERVER START
// ════════════════════════════════════════════════════════════════

server.listen(PORT, async () => {
    // Connect to Redis
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
        { features: ['security-headers', 'rate-limiting', 'input-sanitization', 'request-timeout', 'request-logging', 'standardized-errors', 'graceful-shutdown', 'i18n', 'pdf-invoices', 'multi-currency', 'push-notifications', 'tax-engine', 'recurring-subscriptions'] },
        'Security & architecture features active'
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
    }

    // Verify email connection on startup (non-blocking)
    verifyEmailConnection().catch(() => {
        log.warn('SMTP not con