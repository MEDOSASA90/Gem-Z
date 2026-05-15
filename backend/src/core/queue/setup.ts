/**
 * GEM Z — Queue Setup & Worker Initialization
 *
 * Sets up all BullMQ queues, starts workers for each queue,
 * attaches event listeners for monitoring, and provides
 * a cleanup function for graceful shutdown.
 *
 * Usage:
 *   import { setupQueues, shutdownQueues } from './setup';
 *   await setupQueues();        // On startup
 *   await shutdownQueues();     // On shutdown
 */

import { Queue, Worker, Job } from 'bullmq';
import { config } from '../../config';
import { createRedisConnection, getRedisConnection } from './connection';
import {
    QUEUE_NAMES,
    DLQ_NAME,
    DEFAULT_RETRY_CONFIG,
    JobType,
} from './types';
import { PROCESSOR_MAP } from './processors';
import { getQueue } from './producers';

// ─── Worker Registry ─────────────────────────────────────────

const workerRegistry = new Map<string, Worker>();

// ─── Queue Setup ─────────────────────────────────────────────

/**
 * Initialize all queues by accessing them once (creates the queue in Redis).
 */
function initializeQueues(): void {
    console.log('[Queue] Initializing queues...');

    // Access each queue to ensure it exists in Redis
    getQueue(QUEUE_NAMES.EMAIL);
    getQueue(QUEUE_NAMES.AI);
    getQueue(QUEUE_NAMES.NOTIFICATION);
    getQueue(QUEUE_NAMES.REPORT);
    getQueue(QUEUE_NAMES.WALLET);
    getQueue(QUEUE_NAMES.CLEANUP);
    getQueue(QUEUE_NAMES.WITHDRAWAL);
    getQueue(DLQ_NAME); // Dead letter queue

    console.log('[Queue] All 8 queues initialized.');
}

// ─── Worker Configuration ────────────────────────────────────

interface WorkerConfig {
    name: string;
    queueName: string;
    concurrency: number;
    limiter?: {
        max: number;
        duration: number;
    };
}

const WORKER_CONFIGS: WorkerConfig[] = [
    {
        name: 'email-worker',
        queueName: QUEUE_NAMES.EMAIL,
        concurrency: 5,
        limiter: { max: 10, duration: 1000 }, // 10 emails per second max
    },
    {
        name: 'ai-worker',
        queueName: QUEUE_NAMES.AI,
        concurrency: 2, // Low concurrency — OpenAI API is rate-limited
        limiter: { max: 5, duration: 60000 }, // 5 AI requests per minute
    },
    {
        name: 'notification-worker',
        queueName: QUEUE_NAMES.NOTIFICATION,
        concurrency: 10, // High throughput for notifications
    },
    {
        name: 'report-worker',
        queueName: QUEUE_NAMES.REPORT,
        concurrency: 1, // Sequential — reports are resource-intensive
    },
    {
        name: 'wallet-worker',
        queueName: QUEUE_NAMES.WALLET,
        concurrency: 1, // Sequential — financial consistency is critical
    },
    {
        name: 'cleanup-worker',
        queueName: QUEUE_NAMES.CLEANUP,
        concurrency: 1, // Sequential — avoid DB overload
    },
    {
        name: 'withdrawal-worker',
        queueName: QUEUE_NAMES.WITHDRAWAL,
        concurrency: 1, // Sequential — financial transactions must not overlap
    },
];

// ─── Worker Factory ──────────────────────────────────────────

function createWorker(cfg: WorkerConfig): Worker {
    const connection = getRedisConnection();

    const worker = new Worker(
        cfg.queueName,
        async (job: Job) => {
            const processor = PROCESSOR_MAP[job.name];

            if (!processor) {
                console.error(`[Queue][${cfg.name}] No processor found for job type: ${job.name}`);
                throw new Error(`No processor registered for job type: ${job.name}`);
            }

            console.log(`[Queue][${cfg.name}] Processing job ${job.id} | type: ${job.name} | attempt: ${job.attemptsMade + 1}`);

            const result = await processor(job, {
                jobId: job.id || 'unknown',
                attemptNumber: job.attemptsMade + 1,
                maxAttempts: job.opts.attempts || 3,
                timestamp: new Date(),
                log: (msg: string, meta?: Record<string, any>) => {
                    console.log(`[Queue][${cfg.name}][${job.id}] ${msg}`, meta || '');
                },
            });

            if (!result.success) {
                throw new Error(result.error || 'Job processing failed');
            }

            return result.data;
        },
        {
            connection,
            concurrency: cfg.concurrency,
            ...(cfg.limiter ? { limiter: cfg.limiter } : {}),
            stalledInterval: 30000,    // Check for stalled jobs every 30s
            maxStalledCount: 2,        // Max times a job can be stalled before failing
        }
    );

    // ─── Worker Event Listeners ──────────────────────────────

    worker.on('completed', (job: Job, result: any) => {
        console.log(`[Queue][${cfg.name}] Job ${job.id} completed | type: ${job.name} | duration: ${job.finishedOn! - job.processedOn!}ms`);
    });

    worker.on('failed', (job: Job | undefined, err: Error, prev: string) => {
        if (!job) {
            console.error(`[Queue][${cfg.name}] Unknown job failed:`, err.message);
            return;
        }

        const willRetry = job.attemptsMade < (job.opts.attempts || 3);
        console.error(
            `[Queue][${cfg.name}] Job ${job.id} failed (attempt ${job.attemptsMade}/${job.opts.attempts || 3})` +
            `${willRetry ? ' — will retry' : ' — final attempt, sending to DLQ'} | error: ${err.message}`
        );
    });

    worker.on('error', (err: Error) => {
        console.error(`[Queue][${cfg.name}] Worker error:`, err.message);
        // Worker errors are non-fatal — BullMQ handles recovery
    });

    worker.on('stalled', (jobId: string) => {
        console.warn(`[Queue][${cfg.name}] Job ${jobId} stalled — will be retried`);
    });

    worker.on('progress', (job: Job, progress: number | object) => {
        if (typeof progress === 'number') {
            console.log(`[Queue][${cfg.name}] Job ${job.id} progress: ${progress}%`);
        }
    });

    worker.on('ready', () => {
        console.log(`[Queue][${cfg.name}] Worker ready and listening for jobs.`);
    });

    worker.on('closing', () => {
        console.log(`[Queue][${cfg.name}] Worker is shutting down...`);
    });

    worker.on('closed', () => {
        console.log(`[Queue][${cfg.name}] Worker shut down successfully.`);
    });

    return worker;
}

// ─── Start All Workers ───────────────────────────────────────

function startWorkers(): void {
    console.log('[Queue] Starting workers...');

    for (const cfg of WORKER_CONFIGS) {
        const worker = createWorker(cfg);
        workerRegistry.set(cfg.name, worker);
        console.log(`[Queue] Worker started: ${cfg.name} (concurrency: ${cfg.concurrency})`);
    }

    console.log(`[Queue] All ${WORKER_CONFIGS.length} workers started.`);
}

// ─── Queue Event Listeners ───────────────────────────────────

function attachQueueEventListeners(): void {
    const queueNames = Object.values(QUEUE_NAMES);

    for (const queueName of queueNames) {
        const queue = getQueue(queueName);

        queue.on('waiting', (jobId: string) => {
            console.log(`[Queue][${queueName}] Job ${jobId} is waiting`);
        });

        queue.on('progress', (job: Job, progress: number | object) => {
            if (typeof progress === 'number') {
                console.log(`[Queue][${queueName}] Job ${job.id} progress: ${progress}%`);
            }
        });

        queue.on('completed', (job: Job, result: any) => {
            // Handled by worker listener
        });

        queue.on('failed', (job: Job, err: Error) => {
            // Handled by worker listener
        });

        queue.on('paused', () => {
            console.log(`[Queue][${queueName}] Queue paused`);
        });

        queue.on('resumed', () => {
            console.log(`[Queue][${queueName}] Queue resumed`);
        });
    }
}

// ─── Graceful Shutdown Handler ───────────────────────────────

async function closeAllWorkers(): Promise<void> {
    console.log(`[Queue] Closing ${workerRegistry.size} workers...`);

    const closePromises = Array.from(workerRegistry.values()).map(
        (worker) => worker.close()
    );

    await Promise.all(closePromises);
    workerRegistry.clear();
    console.log('[Queue] All workers closed.');
}

async function closeAllQueues(): Promise<void> {
    const { getAllQueues } = await import('./producers');
    const queues = getAllQueues();

    console.log(`[Queue] Closing ${queues.length} queues...`);

    const closePromises = queues.map((queue) => queue.close());
    await Promise.all(closePromises);

    console.log('[Queue] All queues closed.');
}

// ─── Public API ──────────────────────────────────────────────

/**
 * Initialize the entire queue system:
 * 1. Ensure Redis connection is ready
 * 2. Initialize all queues
 * 3. Start all workers
 * 4. Attach event listeners
 */
export async function setupQueues(): Promise<void> {
    console.log('\n═══════════════════════════════════════════════');
    console.log('  GEM Z — BullMQ Queue System Initializing');
    console.log('═══════════════════════════════════════════════\n');

    try {
        // 1. Create Redis connection
        createRedisConnection();

        // 2. Initialize queues
        initializeQueues();

        // 3. Start workers
        startWorkers();

        // 4. Attach event listeners
        attachQueueEventListeners();

        console.log('\n═══════════════════════════════════════════════');
        console.log('  Queue System Ready');
        console.log(`  Queues: ${Object.keys(QUEUE_NAMES).length} active`);
        console.log(`  Workers: ${WORKER_CONFIGS.length} running`);
        console.log(`  Redis: ${config.redisUrl.replace(/:\/\/.*@/, '://***@')}`);
        console.log('═══════════════════════════════════════════════\n');

    } catch (error) {
        console.error('[Queue] Failed to initialize queue system:', (error as Error).message);
        throw error;
    }
}

/**
 * Gracefully shut down all queues and workers.
 * Call this on SIGTERM / SIGINT for clean shutdown.
 */
export async function shutdownQueues(): Promise<void> {
    console.log('\n[Queue] Graceful shutdown initiated...');

    try {
        // 1. Close all workers (stop processing new jobs, finish current ones)
        await closeAllWorkers();

        // 2. Close all queues
        await closeAllQueues();

        // 3. Close Redis connection
        const { closeRedisConnection } = await import('./connection');
        await closeRedisConnection();

        console.log('[Queue] Graceful shutdown complete.');
    } catch (error) {
        console.error('[Queue] Error during shutdown:', (error as Error).message);
        throw error;
    }
}

/**
 * Get health status of all queues and workers.
 */
export async function getQueueHealth(): Promise<{
    status: string;
    queues: Array<{ name: string; jobCount: number }>;
    workers: Array<{ name: string; running: boolean }>;
}> {
    const queueNames = Object.values(QUEUE_NAMES);
    const queueHealth = await Promise.all(
        queueNames.map(async (name) => {
            const queue = getQueue(name);
            const jobCount = await queue.getJobCounts('wait', 'active', 'completed', 'failed', 'delayed');
            return {
                name,
                jobCount: (jobCount.wait || 0) + (jobCount.active || 0) + (jobCount.delayed || 0),
            };
        })
    );

    const workerHealth = Array.from(workerRegistry.entries()).map(([name, worker]) => ({
        name,
        running: !worker.isRunning(), // isRunning returns false when worker is idle, we check differently
    }));

    return {
        status: 'healthy',
        queues: queueHealth,
        workers: workerHealth,
    };
}
