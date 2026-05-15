/**
 * GEM Z — Bull Board Queue Dashboard
 *
 * Provides a web UI for monitoring all BullMQ queues.
 * Mounted at /admin/queues and protected by admin authentication.
 *
 * Features:
 * - Real-time queue metrics (waiting, active, completed, failed, delayed)
 * - Job inspection (view job data, logs, stack traces)
 * - Job management (retry, promote, clean)
 * - Dead letter queue monitoring
 *
 * Setup:
 *   import { setupQueueDashboard } from './dashboard';
 *   setupQueueDashboard(app); // Pass your Express app
 */

import { Express, Request, Response, NextFunction } from 'express';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { QUEUE_NAMES, DLQ_NAME } from './types';
import { getQueue } from './producers';

// ─── Admin Auth Middleware ───────────────────────────────────

/**
 * Middleware to protect the queue dashboard.
 * Only users with 'super_admin' or 'admin' roles can access.
 *
 * Expects:
 * - JWT token in cookie or Authorization header (set by auth.middleware)
 * - req.user.role to be populated by authenticate middleware
 */
export function requireAdminAuth(req: Request, res: Response, next: NextFunction): void {
    // Allow bypass in development mode
    if (process.env.NODE_ENV === 'development' && process.env.ALLOW_DASHBOARD_WITHOUT_AUTH === 'true') {
        return next();
    }

    // Check if user is authenticated
    const authReq = req as any;
    if (!authReq.user) {
        res.status(401).json({
            success: false,
            message: 'Authentication required. Please log in to access the queue dashboard.',
        });
        return;
    }

    // Check if user has admin role
    const allowedRoles = ['super_admin', 'admin'];
    if (!allowedRoles.includes(authReq.user.role)) {
        res.status(403).json({
            success: false,
            message: `Forbidden: Requires one of [${allowedRoles.join(', ')}] roles`,
        });
        return;
    }

    next();
}

// ─── Dashboard Setup ─────────────────────────────────────────

/**
 * Set up the Bull Board dashboard on the Express app.
 *
 * @param app — The Express application instance
 * @param mountPath — URL path to mount the dashboard (default: /admin/queues)
 */
export function setupQueueDashboard(
    app: Express,
    mountPath: string = '/admin/queues'
): void {
    try {
        // 1. Create the Express adapter for Bull Board
        const serverAdapter = new ExpressAdapter();
        serverAdapter.setBasePath(mountPath);

        // 2. Create adapters for all queues
        const queueAdapters = [
            new BullMQAdapter(getQueue(QUEUE_NAMES.EMAIL)),
            new BullMQAdapter(getQueue(QUEUE_NAMES.AI)),
            new BullMQAdapter(getQueue(QUEUE_NAMES.NOTIFICATION)),
            new BullMQAdapter(getQueue(QUEUE_NAMES.REPORT)),
            new BullMQAdapter(getQueue(QUEUE_NAMES.WALLET)),
            new BullMQAdapter(getQueue(QUEUE_NAMES.CLEANUP)),
            new BullMQAdapter(getQueue(QUEUE_NAMES.WITHDRAWAL)),
            new BullMQAdapter(getQueue(DLQ_NAME)),
        ];

        // 3. Create the Bull Board instance
        const { addQueue, removeQueue, setQueues, replaceQueues } = createBullBoard({
            queues: queueAdapters,
            serverAdapter,
            options: {
                uiConfig: {
                    boardTitle: 'GEM Z Queue Dashboard',
                    boardLogo: {
                        path: 'https://gemz.app/logo.png',
                        width: '40px',
                    },
                    miscLinks: [
                        {
                            text: 'GEM Z API',
                            url: '/api/v1',
                        },
                    ],
                },
            },
        });

        // 4. Mount the dashboard router with admin auth
        app.use(mountPath, requireAdminAuth, serverAdapter.getRouter());

        console.log(`[Queue] Bull Board dashboard mounted at ${mountPath}`);
        console.log(`[Queue] Dashboard queues: ${Object.keys(QUEUE_NAMES).join(', ')} + DLQ`);

    } catch (error) {
        console.error('[Queue] Failed to set up Bull Board dashboard:', (error as Error).message);
        console.error('[Queue] Dashboard will not be available. Check @bull-board dependencies.');
    }
}

// ─── Queue Health Endpoint ───────────────────────────────────

/**
 * Add a public health endpoint for queue monitoring.
 * This can be used by monitoring tools (e.g., UptimeRobot, Datadog).
 *
 * @param app — The Express application instance
 */
export function setupQueueHealthEndpoint(app: Express): void {
    app.get('/health/queues', async (_req: Request, res: Response) => {
        try {
            const { getQueueHealth } = await import('./setup');
            const health = await getQueueHealth();
            res.status(200).json({
                success: true,
                ...health,
            });
        } catch (error) {
            res.status(503).json({
                success: false,
                status: 'unhealthy',
                error: (error as Error).message,
            });
        }
    });

    console.log('[Queue] Queue health endpoint available at /health/queues');
}
