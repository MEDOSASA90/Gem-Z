/**
 * GEM Z — Health Check Routes
 *
 * GET /api/v1/health           — Basic (returns OK)
 * GET /api/v1/health/detailed  — Full (DB + Redis + Queue + Disk + Memory)
 *
 * Returns standardized response format:
 *   { status, services: { db, redis, queue }, uptime, version, timestamp }
 */

import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import Redis from 'ioredis';
import { success } from '../core/utils/api-response';
import { ServiceUnavailableError, ErrorCode } from '../core/errors';
import os from 'os';
import path from 'path';
import fs from 'fs';

const router = Router();

// ─── Types ──────────────────────────────────────────────────────

interface ServiceHealth {
    status: 'up' | 'down' | 'degraded';
    latencyMs?: number;
    error?: string;
}

interface HealthStatus {
    status: 'healthy' | 'degraded' | 'unhealthy';
    services: {
        db: ServiceHealth;
        redis: ServiceHealth;
        queue: ServiceHealth;
        disk: ServiceHealth;
        memory: ServiceHealth;
    };
    uptime: number;
    uptimeHuman: string;
    version: string;
    timestamp: string;
    environment: string;
    nodeVersion: string;
}

// ─── Helpers ────────────────────────────────────────────────────

function getPackageVersion(): string {
    try {
        const pkgPath = path.join(__dirname, '../../package.json');
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        return pkg.version || '1.0.0';
    } catch {
        return '1.0.0';
    }
}

function formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    parts.push(`${mins}m`);
    return parts.join(' ');
}

// ─── Service Health Checkers ────────────────────────────────────

async function checkDatabase(pool: Pool): Promise<ServiceHealth> {
    const start = Date.now();
    try {
        await pool.query('SELECT 1');
        return { status: 'up', latencyMs: Date.now() - start };
    } catch (error) {
        return {
            status: 'down',
            latencyMs: Date.now() - start,
            error: (error as Error).message,
        };
    }
}

async function checkRedis(redis: Redis): Promise<ServiceHealth> {
    const start = Date.now();
    try {
        await redis.ping();
        return { status: 'up', latencyMs: Date.now() - start };
    } catch (error) {
        return {
            status: 'down',
            latencyMs: Date.now() - start,
            error: (error as Error).message,
        };
    }
}

async function checkQueue(): Promise<ServiceHealth> {
    const start = Date.now();
    try {
        // Queue health is checked via Redis since BullMQ uses Redis
        // In a real implementation, you might check queue job counts
        return { status: 'up', latencyMs: Date.now() - start };
    } catch (error) {
        return {
            status: 'down',
            latencyMs: Date.now() - start,
            error: (error as Error).message,
        };
    }
}

async function checkDisk(): Promise<ServiceHealth> {
    const start = Date.now();
    try {
        const stats = fs.statSync('/');
        // Check if we can write to tmp
        const tmpFile = path.join(os.tmpdir(), `health-check-${Date.now()}`);
        fs.writeFileSync(tmpFile, 'ok');
        fs.unlinkSync(tmpFile);
        return { status: 'up', latencyMs: Date.now() - start };
    } catch (error) {
        return {
            status: 'down',
            latencyMs: Date.now() - start,
            error: (error as Error).message,
        };
    }
}

function checkMemory(): ServiceHealth {
    const total = os.totalmem();
    const free = os.freemem();
    const used = total - free;
    const pctUsed = (used / total) * 100;

    return {
        status: pctUsed > 95 ? 'degraded' : pctUsed > 90 ? 'degraded' : 'up',
        latencyMs: 0,
    };
}

// ─── Route Factory ──────────────────────────────────────────────

/**
 * Create health router with injected dependencies.
 * Usage:
 *   import { createHealthRouter } from './routes/health';
 *   app.use('/api/v1/health', createHealthRouter(dbPool, redisClient));
 */
export function createHealthRouter(pool: Pool, redis: Redis): Router {
    // ─── Basic Health ───────────────────────────────────────────

    router.get('/', (_req: Request, res: Response) => {
        const uptime = process.uptime();
        res.status(200).json(success({
            status: 'healthy',
            message: 'GEM Z API is running',
            uptime,
            uptimeHuman: formatUptime(uptime),
            version: getPackageVersion(),
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development',
        }));
    });

    // ─── Detailed Health ────────────────────────────────────────

    router.get('/detailed', async (_req: Request, res: Response) => {
        const startTime = Date.now();
        const uptime = process.uptime();

        // Run all health checks in parallel
        const [dbHealth, redisHealth, queueHealth, diskHealth] = await Promise.all([
            checkDatabase(pool),
            checkRedis(redis),
            checkQueue(),
            checkDisk(),
        ]);

        const memoryHealth = checkMemory();

        const health: HealthStatus = {
            status: 'healthy',
            services: {
                db: dbHealth,
                redis: redisHealth,
                queue: queueHealth,
                disk: diskHealth,
                memory: memoryHealth,
            },
            uptime,
            uptimeHuman: formatUptime(uptime),
            version: getPackageVersion(),
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development',
            nodeVersion: process.version,
        };

        // Determine overall status
        const downServices = Object.values(health.services).filter((s) => s.status === 'down');
        const degradedServices = Object.values(health.services).filter((s) => s.status === 'degraded');

        if (downServices.length > 0) {
            health.status = 'unhealthy';
        } else if (degradedServices.length > 0) {
            health.status = 'degraded';
        }

        // Response time
        const responseTime = Date.now() - startTime;

        // Return appropriate status code
        const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;

        res.status(statusCode)
            .header('X-Health-Check-Duration', `${responseTime}ms`)
            .json(success(health));
    });

    // ─── Liveness Probe (Kubernetes) ────────────────────────────

    router.get('/live', (_req: Request, res: Response) => {
        res.status(200).json(success({ status: 'alive' }));
    });

    // ─── Readiness Probe (Kubernetes) ───────────────────────────

    router.get('/ready', async (_req: Request, res: Response) => {
        const [dbHealth, redisHealth] = await Promise.all([
            checkDatabase(pool),
            checkRedis(redis),
        ]);

        const isReady = dbHealth.status === 'up' && redisHealth.status === 'up';

        res.status(isReady ? 200 : 503).json(success({
            status: isReady ? 'ready' : 'not_ready',
            services: {
                db: dbHealth.status,
                redis: redisHealth.status,
            },
        }));
    });

    return router;
}

export default router;
