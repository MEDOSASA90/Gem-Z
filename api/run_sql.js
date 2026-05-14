"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pg_1 = require("pg");
require("dotenv/config");
async function run() {
    const client = new pg_1.Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS id_parsed_data JSONB;`);
    console.log('DB Schema Updated');
    await client.end();
}
run();
