import pkg from 'pg';
const { Pool } = pkg;
import fs from 'fs';
import path from 'path';

const pool = new Pool({
    connectionString: "postgresql://gemz_admin:Mahmoud%4001023122530@72.61.167.3:5432/gemz_db"
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
