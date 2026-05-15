import { Pool } from 'pg';
import { config } from '../../config';

if (!config.databaseUrl) {
    throw new Error(
        'DATABASE_URL is required but not set in environment variables. ' +
        'Please add it to your .env file and restart the server.'
    );
}

export const db = new Pool({
    connectionString: config.databaseUrl,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

db.on('connect', () => {
    console.log('✅ Postgres Core Database Connected Successfully');
});

db.on('error', (err: any) => {
    console.error('❌ Unexpected error on idle client', err);
});
