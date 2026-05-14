import pkg from 'pg';
const { Pool } = pkg;
import fs from 'fs';
import path from 'path';

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required to run migrations.');
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function run() {
    try {
        const sql = fs.readFileSync(path.join(process.cwd(), '..', 'database', 'schema_v3_additions.sql'), 'utf8');
        console.log("Executing SQL...");
        await pool.query(sql);
        console.log("Success!");
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

run();
