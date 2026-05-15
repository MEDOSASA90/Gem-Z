/**
 * GEM Z — Database Transaction Wrapper
 *
 * Provides a type-safe wrapper around PostgreSQL transactions.
 * Auto BEGIN, auto COMMIT on success, auto ROLLBACK on error.
 *
 * Usage:
 *   const result = await withTransaction(pool, async (client) => {
 *       const user = await client.query('INSERT INTO users ... RETURNING *', [...]);
 *       await client.query('INSERT INTO wallets ...', [user.rows[0].id]);
 *       return user.rows[0];
 *   });
 */

import { Pool, PoolClient } from 'pg';
import { logger } from '../logging/logger';
import { AppError, ErrorCode } from '../errors';

const log = logger.child({ module: 'transaction' });

/**
 * Execute a callback within a database transaction.
 *
 * @param pool - PostgreSQL connection pool
 * @param callback - Function receiving a PoolClient to execute queries
 * @returns Whatever the callback returns
 * @throws AppError on transaction failure
 */
export async function withTransaction<T>(
    pool: Pool,
    callback: (client: PoolClient) => Promise<T>,
    options?: { readonly?: boolean; isolationLevel?: 'SERIALIZABLE' | 'REPEATABLE READ' | 'READ COMMITTED' }
): Promise<T> {
    const client = await pool.connect();

    try {
        // Build BEGIN statement with optional isolation level
        const isolation = options?.isolationLevel
            ? `ISOLATION LEVEL ${options.isolationLevel}`
            : '';
        const mode = options?.readonly ? 'READ ONLY' : 'READ WRITE';

        await client.query(`BEGIN ${isolation} ${mode}`.trim());
        log.debug('Transaction started');

        const result = await callback(client);

        await client.query('COMMIT');
        log.debug('Transaction committed');

        return result;
    } catch (error) {
        // Always rollback on any error
        try {
            await client.query('ROLLBACK');
            log.debug('Transaction rolled back');
        } catch (rollbackErr) {
            log.error({ err: (rollbackErr as Error).message }, 'Rollback failed');
        }

        // Re-throw as AppError if not already
        if (error instanceof AppError) {
            throw error;
        }

        const err = error as Error;
        throw new AppError(
            `Transaction failed: ${err.message}`,
            500,
            ErrorCode.DATABASE_ERROR,
            false
        );
    } finally {
        client.release();
    }
}

/**
 * Execute a callback within a SERIALIZABLE transaction.
 * Use for financial operations that require strict consistency.
 */
export async function withSerializableTransaction<T>(
    pool: Pool,
    callback: (client: PoolClient) => Promise<T>
): Promise<T> {
    return withTransaction(pool, callback, {
        isolationLevel: 'SERIALIZABLE',
    });
}

/**
 * Execute a callback within a READ ONLY transaction.
 * Use for read-heavy analytical queries.
 */
export async function withReadOnlyTransaction<T>(
    pool: Pool,
    callback: (client: PoolClient) => Promise<T>
): Promise<T> {
    return withTransaction(pool, callback, {
        readonly: true,
        isolationLevel: 'READ COMMITTED',
    });
}

/**
 * Retry a transaction on serialization failure.
 * PostgreSQL may abort SERIALIZABLE transactions that conflict.
 *
 * @param pool - PostgreSQL connection pool
 * @param callback - Transaction callback
 * @param maxRetries - Maximum retry attempts (default: 3)
 * @param delayMs - Delay between retries in ms (default: 50)
 */
export async function withRetryTransaction<T>(
    pool: Pool,
    callback: (client: PoolClient) => Promise<T>,
    maxRetries: number = 3,
    delayMs: number = 50
): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await withSerializableTransaction(pool, callback);
        } catch (error) {
            lastError = error as Error;
            const errMsg = lastError.message || '';

            // Only retry on serialization/deadlock failures
            const isRetryable =
                errMsg.includes('could not serialize') ||
                errMsg.includes('deadlock detected') ||
                errMsg.includes('40P01') ||
                errMsg.includes('40001');

            if (!isRetryable || attempt === maxRetries) {
                throw lastError;
            }

            log.warn(
                { attempt, maxRetries, delayMs },
                'Transaction conflict, retrying...'
            );

            // Exponential backoff
            await new Promise((r) => setTimeout(r, delayMs * attempt));
        }
    }

    throw lastError || new AppError(
        'Transaction failed after max retries',
        500,
        ErrorCode.DATABASE_ERROR
    );
}
