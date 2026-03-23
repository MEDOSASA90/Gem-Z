import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

async function migrate() {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl || dbUrl.includes('[YOUR-PASSWORD]')) {
        console.error('❌ DATABASE_URL is not set correctly in .env file!');
        process.exit(1);
    }

    const client = new Client({
        connectionString: dbUrl,
    });

    try {
        await client.connect();
        console.log('✅ Connected to Postgres Database on VPS!');

        const schemaFiles = [
            '../../database/schema.sql',
            '../../database/schema_v2_additions.sql',
            '../../database/schema_v4_additions.sql',
            '../../database/seed_pricing.sql'
        ];

        for (const file of schemaFiles) {
            const filePath = path.join(__dirname, file);
            console.log(`[Migrate] Checking ${file}...`);
            try {
                if (fs.existsSync(filePath)) {
                    const sql = fs.readFileSync(filePath, 'utf8');
                    await client.query(sql);
                    console.log(`[Migrate] Successfully executed ${file}`);
                } else {
                    console.log(`[Migrate] Skipping ${file} (not found in current deployment environment)`);
                }
            } catch (error) {
                console.error(`[Migrate] Error executing ${file}:`, error);
            }
        }

        console.log('🎉 All migrations completed successfully!');
    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        await client.end();
    }
}

migrate();
