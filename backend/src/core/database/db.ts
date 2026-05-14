import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString && process.env.NODE_ENV === 'production') {
    throw new Error('DATABASE_URL is required in production.');
}

export const db = new Pool({
    connectionString: connectionString || 'postgresql://postgres:postgres@localhost:5432/gemz_db',
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
