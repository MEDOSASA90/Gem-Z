"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const pg_1 = require("pg");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
require("dotenv/config");
async function migrate() {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl || dbUrl.includes('[YOUR-PASSWORD]')) {
        console.error('❌ DATABASE_URL is not set correctly in .env file!');
        process.exit(1);
    }
    const client = new pg_1.Client({
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
            const sqlPath = path_1.default.join(__dirname, file);
            if (fs_1.default.existsSync(sqlPath)) {
                console.log(`⏳ Executing ${file}...`);
                const sql = fs_1.default.readFileSync(sqlPath, 'utf8');
                await client.query(sql);
                console.log(`✅ Finished ${file}`);
            }
            else {
                console.warn(`⚠️ File not found: ${sqlPath}`);
            }
        }
        console.log('🎉 All migrations completed successfully!');
    }
    catch (error) {
        console.error('❌ Migration failed:', error);
    }
    finally {
        await client.end();
    }
}
migrate();
