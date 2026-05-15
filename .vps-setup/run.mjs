/**
 * GEM Z — VPS SSH Command Runner
 * 
 * ⚠️  NEVER hardcode credentials. Use environment variables.
 * 
 * Usage:
 *   export VPS_HOST="your.vps.ip"
 *   export VPS_USER="your_username"
 *   export VPS_PASS="your_password_or_key"
 *   export VPS_SSH_KEY="/path/to/private/key"  # Preferred over password
 *   node .vps-setup/run.mjs "your-command-here"
 */

import { NodeSSH } from 'node-ssh';
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
    console.error('\n❌ [SSH] Missing required environment variables:\n');
    missing.forEach(v => console.error(`   - ${v}`));
    console.error('\n📖 Set them before running:\n');
    process.exit(1);
}

const ssh = new NodeSSH();

async function run() {
    try {
        const command = process.argv[2];
        if (!command) {
            console.log("Usage: node .vps-setup/run.mjs \"your-command-here\"");
            process.exit(1);
        }

        console.log(`🔌 Connecting to ${HOST}...`);
        const connectConfig = SSH_KEY
            ? { host: HOST, username: USER, privateKey: fs.readFileSync(SSH_KEY) }
            : { host: HOST, username: USER, password: PASS, tryKeyboard: true };
        await ssh.connect(connectConfig);

        const result = await ssh.execCommand(command, { cwd: '/root' });
        if (result.stdout) console.log('STDOUT:\n' + result.stdout);
        if (result.stderr) console.error('STDERR:\n' + result.stderr);
        ssh.dispose();
    } catch (err) {
        console.error('SSH Connection Failed:', err);
        process.exit(1);
    }
}
run();
