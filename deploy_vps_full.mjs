import { NodeSSH } from 'node-ssh';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const ssh = new NodeSSH();
const HOST = '72.61.167.3';
const USER = 'root';
const PASS = 'Mahmoud@01023122530'; // Your VPS password

async function run() {
  try {
    console.log('📦 1. Generating latest backend_deploy.zip...');
    execSync('node build_zip.js', { stdio: 'inherit' });

    console.log('\n🔌 2. Connecting to Hostinger VPS via SSH...');
    await ssh.connect({ host: HOST, username: USER, password: PASS, tryKeyboard: true });

    console.log('\n🗄️ 3. Uploading and applying latest Database Schema (v5)...');
    const dbPath = path.join(process.cwd(), 'database', 'schema_v5_ecosystem.sql');
    await ssh.putFile(dbPath, '/tmp/schema_v5_ecosystem.sql');
    const dbRes = await ssh.execCommand('sudo -u postgres psql -d gemz_db -f /tmp/schema_v5_ecosystem.sql', { cwd: '/tmp' });
    if(dbRes.stdout) console.log('   DB Result:', dbRes.stdout.substring(0, 100) + '...');
    if(dbRes.stderr) console.error('   DB Warnings/Errors:', dbRes.stderr.substring(0, 100) + '...');

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
    if(buildRes.stderr && !buildRes.stderr.includes('npm WARN')) console.error('   Restart Errors:\n', buildRes.stderr);

    console.log('\n✅ Deployment to Hostinger VPS completely successful!');
    ssh.dispose();
  } catch (err) {
    console.error('\n❌ Deployment Failed:', err);
    process.exit(1);
  }
}
run();
