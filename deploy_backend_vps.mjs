/**
 * GEM Z — Backend VPS Deployment Script
 * 
 * ⚠️  NEVER hardcode credentials. Use environment variables.
 * 
 * Usage:
 *   export VPS_HOST="your.vps.ip"
 *   export VPS_USER="your_username"
 *   export VPS_PASS="your_password_or_key"
 *   export VPS_SSH_KEY="/path/to/private/key"  # Preferred over password
 *   node deploy_backend_vps.mjs
 */

import { NodeSSH } from 'node-ssh';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

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
    console.error('\n📖 Set them before running:\n');
    process.exit(1);
}

const ssh = new NodeSSH();

async function run() {
    try {
        console.log('📦 1. Generating backend ZIP payload (excluding heavy node modules)...');
        execSync('powershell -Command "$s = \'f:\\Gem Z\\backend\'; $t = \'f:\\Gem Z\\temp_gemz_backend\'; Copy-Item -Path $s -Destination $t -Recurse; Remove-Item -Path \\"$t\\node_modules\\" -Recurse -Force -ErrorAction SilentlyContinue; Remove-Item -Path \\"$t\\.git\\" -Recurse -Force -ErrorAction SilentlyContinue; Compress-Archive -Path \\"$t\\*\\" -DestinationPath \\"f:\\Gem Z\\gemz_backend_prod.zip\\" -Force; Remove-Item -Path $t -Recurse -Force"', { stdio: 'inherit' });

        console.log('\n🔌 2. Connecting to VPS via SSH...');
        const connectConfig = SSH_KEY
            ? { host: HOST, username: USER, privateKey: fs.readFileSync(SSH_KEY) }
            : { host: HOST, username: USER, password: PASS, tryKeyboard: true };
        await ssh.connect(connectConfig);

        console.log('\n⚙️ 3. Uploading Backend updates (gemz_backend_prod.zip)...');
        const backendZip = path.join(process.cwd(), 'gemz_backend_prod.zip');
        await ssh.putFile(backendZip, '/opt/gem-z/backend_deploy.zip');

        console.log('\n🚀 4. Extracting, compiling, and Restarting PM2 on VPS...');
        const buildScript = `
      cd /opt/gem-z
      apt-get update -y && apt-get install unzip -y
      mkdir -p tmp_backend
      unzip -o backend_deploy.zip -d tmp_backend
      cp -a tmp_backend/* backend/
      rm -rf tmp_backend backend_deploy.zip
      cd backend
      npm install
      npx tsc
      pm2 restart gemz-api || pm2 start dist/server.js --name "gemz-api"
    `;
        const buildRes = await ssh.execCommand(buildScript);
        console.log('   Restart Output:\n', buildRes.stdout);
        if (buildRes.stderr && !buildRes.stderr.includes('npm WARN') && !buildRes.stderr.includes('warn')) {
            console.error('   Restart Warnings/Errors:\n', buildRes.stderr);
        }

        console.log('\n✅ Backend deployment to VPS completely successful!');
        ssh.dispose();
    } catch (err) {
        console.error('\n❌ Deployment Failed:', err);
        process.exit(1);
    }
}
run();
