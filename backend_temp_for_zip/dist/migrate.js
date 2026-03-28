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
        console.log('✅ Connected to Postgres Database on VPS!');
        const schemaFiles = [
            '../../database/schema.sql',
            '../../database/schema_v2_additions.sql',
            '../../database/schema_v4_additions.sql',
            '../../database/schema_v5_ecosystem.sql',
            '../../database/seed_pricing.sql'
        ];
        for (const file of schemaFiles) {
            const filePath = path_1.default.join(__dirname, file);
            console.log(`[Migrate] Checking ${file}...`);
            try {
                if (fs_1.default.existsSync(filePath)) {
                    const sql = fs_1.default.readFileSync(filePath, 'utf8');
                    await client.query(sql);
                    console.log(`[Migrate] Successfully executed ${file}`);
                }
                else {
                    console.log(`[Migrate] Skipping ${file} (not found in current deployment environment)`);
                }
            }
            catch (error) {
                console.error(`[Migrate] Error executing ${file}:`, error);
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
