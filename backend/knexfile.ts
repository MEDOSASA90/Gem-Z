/**
 * GEM Z — Knex.js Configuration
 *
 * Database migration and seed configuration for all environments.
 * Uses pg driver with connection pooling. All values from environment variables.
 */

import { Knex } from 'knex';
import dotenv from 'dotenv';

dotenv.config();

// Base configuration shared across all environments
const baseConfig: Knex.Config = {
    client: 'pg',
    pool: {
        min: 2,
        max: 20,
        idleTimeoutMillis: 30000,
        acquireTimeoutMillis: 2000,
    },
    migrations: {
        directory: './src/core/database/migrations',
        extension: 'ts',
        tableName: 'knex_migrations',
        stub: './src/core/database/migration.stub',
    },
    seeds: {
        directory: './src/core/database/seeds',
        extension: 'ts',
    },
};

// Parse DATABASE_URL into connection params for Knex
function parseDatabaseUrl(url: string): Knex.PgConnectionConfig {
    try {
        const parsed = new URL(url);
        return {
            host: parsed.hostname,
            port: Number(parsed.port) || 5432,
            database: parsed.pathname.slice(1),
            user: parsed.username,
            password: parsed.password,
            ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
        };
    } catch {
        throw new Error(`Invalid DATABASE_URL: ${url}`);
    }
}

const dbUrl = process.env.DATABASE_URL || '';

const config: Record<string, Knex.Config> = {
    development: {
        ...baseConfig,
        connection: parseDatabaseUrl(dbUrl),
        debug: process.env.KNEX_DEBUG === 'true',
    },

    staging: {
        ...baseConfig,
        connection: parseDatabaseUrl(dbUrl),
        pool: {
            ...baseConfig.pool,
            min: 2,
            max: 15,
        },
    },

    production: {
        ...baseConfig,
        connection: parseDatabaseUrl(dbUrl),
        pool: {
            min: 5,
            max: 30,
            idleTimeoutMillis: 60000,
            acquireTimeoutMillis: 5000,
        },
        migrations: {
            ...baseConfig.migrations,
            // In production, migrations run from compiled JS
            directory: './dist/core/database/migrations',
            extension: 'js',
        },
        seeds: {
            ...baseConfig.seeds,
            directory: './dist/core/database/seeds',
            extension: 'js',
        },
    },

    // Default to development if NODE_ENV is not recognized
    default: {
        ...baseConfig,
        connection: parseDatabaseUrl(dbUrl),
    },
};

export default config;
