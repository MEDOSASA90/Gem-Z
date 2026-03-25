import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

export const db = new Pool({
    connectionString: process.env.DATABASE_URL || "postgresql://gemz_admin:Mahmoud%4001023122530@72.61.167.3:5432/gemz_db",
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

