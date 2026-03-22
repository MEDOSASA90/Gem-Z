const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function migrate() {
    // Read from .env manually
    const envPath = path.join(__dirname, '.env');
    let dbUrl = process.env.DATABASE_URL;
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const match = envContent.match(/DATABASE_URL="([^"]+)"/);
        if (match) dbUrl = match[1];
    }

    if (!dbUrl) {
        console.error('❌ DATABASE_URL is not set!');
        process.exit(1);
    }

    const client = new Client({
        connectionString: dbUrl,
    });

    try {
        await client.connect();
        console.log('✅ Connected to Supabase!');

        const schemaFiles = [
            '../database/schema.sql',
            '../database/schema_v2_additions.sql',
            '../database/seed_pricing.sql'
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
