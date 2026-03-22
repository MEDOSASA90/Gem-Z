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
        console.log('✅ Connected to Supabase!');

        const schemaFiles = [
            '../../database/schema.sql',
            '../../database/schema_v2_additions.sql',
            '../../database/seed_pricing.sql'
        ];

        for (const file of schemaFiles) {
            const sqlPath = path.join(__dirname, file);
            if (fs.existsSync(sqlPath)) {
                console.log(`⏳ Executing ${file}...`);
                const sql = fs.readFileSync(sqlPath, 'utf8');
                await client.query(sql);
                console.log(`✅ Finished ${file}`);
            } else {
                console.warn(`⚠️ File not found: ${sqlPath}`);
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
