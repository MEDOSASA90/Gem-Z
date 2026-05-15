/**
 * GEM Z — SSH SQL Runner
 * 
 * ⚠️  NEVER hardcode credentials. Use environment variables.
 * 
 * Usage:
 *   export VPS_HOST="your.vps.ip"
 *   export VPS_USER="your_username"
 *   export VPS_PASS="your_password_or_key"
 *   export VPS_SSH_KEY="/path/to/private/key"  # Preferred over password
 *   node run_v3_ssh.mjs
 */

import { NodeSSH } from 'node-ssh';
import fs from 'fs';
import path from 'path';

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
    console.error('\n❌ [SSH] Missing required environment variables:\n');
    missing.forEach(v => console.error(`   - ${v}`));
    console.error('\n📖 Set them before running:\n');
    process.exit(1);
}

const ssh = new NodeSSH();

async function run() {
    try {
        console.log('🔌 Connecting to VPS via SSH...');
        const connectConfig = SSH_KEY
            ? { host: HOST, username: USER, privateKey: fs.readFileSync(SSH_KEY) }
            : { host: HOST, username: USER, password: PASS, tryKeyboard: true };
        await ssh.connect(connectConfig);

        const sqlContent = fs.readFileSync(path.join(process.cwd(), 'database', 'schema_v3_additions.sql'), 'utf8');

        // Write to a file on VPS
        await ssh.execCommand(`cat << 'EOF' > /root/schema_v3.sql\n${sqlContent}\nEOF`);

        // Execute via psql
        const result = await ssh.execCommand('sudo -u postgres psql -d gemz_db -f /root/schema_v3.sql', { cwd: '/root' });
        if (result.stdout) console.log('STDOUT:\n' + result.stdout);
        if (result.stderr) console.error('STDERR:\n' + result.stderr);

        ssh.dispose();
    } catch (err) {
        console.error('SSH Connection Failed:', err);
        process.exit(1);
    }
}
run();
