/**
 * GEM Z — Full VPS Deployment Script
 * 
 * ⚠️  NEVER hardcode credentials. Use environment variables.
 * 
 * Usage:
 *   export VPS_HOST="your.vps.ip"
 *   export VPS_USER="your_username"
 *   export VPS_PASS="your_password_or_key"
 *   export VPS_SSH_KEY="/path/to/private/key"  # Preferred over password
 *   node deploy_vps_full.mjs
 */

import { NodeSSH } from 'node-ssh';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// ─── Load Config from Environment ─────────────────────────

const HOST = process.env.VPS_HOST;
const USER = process.env.VPS_USER;
const PASS = process.env.VPS_PASS;
const SSH_KEY = process.env.VPS_SSH_KEY;

// Validate required env vars
const missing = [];
if (!HOST) missing.push('VPS_HOST');
if (!USER) missing.push('VPS_USER');
if (!PASS && !SSH_KEY) missing.push('VPS_PASS (or VPS_SSH_KEY)');

if (missing.length > 0) {
    console.error('\n❌ [Deploy] Missing required environment variables:\n');
    missing.forEach(v => console.error(`   - ${v}`));
    console.error('\n📖 Set them before running:');
    console.error('   export VPS_HOST="your.vps.ip"');
    console.error('   export VPS_USER="your_username"');
    console.error('   export VPS_PASS="your_password"   # or use VPS_SSH_KEY');
    console.error('   export VPS_SSH_KEY="/path/to/key" # preferred\n');
    process.exit(1);
}

const ssh = new NodeSSH();

async function run() {
    try {
        console.log('📦 1. Generating latest backend_deploy.zip...');
        execSync('node build_zip.js', { stdio: 'inherit' });

        console.log('\n🔌 2. Connecting to VPS via SSH...');
        const connectConfig = SSH_KEY
            ? { host: HOST, username: USER, privateKey: fs.readFileSync(SSH_KEY) }
            : { host: HOST, username: USER, password: PASS, tryKeyboard: true };
        await ssh.connect(connectConfig);

        console.log('\n🗄️ 3. Uploading and applying latest Database Schema (v5)...');
        const dbPath = path.join(process.cwd(), 'database', 'schema_v5_ecosystem.sql');
        await ssh.putFile(dbPath, '/tmp/schema_v5_ecosystem.sql');
        const dbRes = await ssh.execCommand('sudo -u postgres psql -d gemz_db -f /tmp/schema_v5_ecosystem.sql', { cwd: '/tmp' });
        if (dbRes.stdout) console.log('   DB Result:', dbRes.stdout.substring(0, 100) + '...');
        if (dbRes.stderr) console.error('   DB Warnings/Errors:', dbRes.stderr.substring(0, 100) + '...');

        console.log('\n⚙️ 4. Uploading Backend updates...');
        const backendZip = path.join(process.cwd(), 'backend_deploy.zip');
        await ssh.putFile(backendZip, '/opt/gem-z/backend_deploy.zip');

        console.log('\n🚀 5. Extracting and Restarting API on VPS...');
        const buildScript = `
      cd /opt/gem-z
      apt-get update -y && apt-get install unzip -y
      mkdir -p tmp_backend
      unzip -o backend_deploy.zip -d tmp_backend
      cp -a tmp_backend/* backend/
      rm -rf tmp_backend backend_deploy.zip
      cd backend
      npm install
      npm run build
      pm2 restart gemz-api
    `;
        const buildRes = await ssh.execCommand(buildScript);
        console.log('   Restart Output:\n', buildRes.stdout);
        if (buildRes.stderr && !buildRes.stderr.includes('npm WARN')) console.error('   Restart Errors:\n', buildRes.stderr);

        console.log('\n✅ Deployment to VPS completely successful!');
        ssh.dispose();
    } catch (err) {
        console.error('\n❌ Deployment Failed:', err);
        process.exit(1);
    }
}
run();
