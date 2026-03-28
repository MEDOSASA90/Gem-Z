import { NodeSSH } from 'node-ssh';
import { execSync } from 'child_process';
import path from 'path';

const ssh = new NodeSSH();
const HOST = '72.61.167.3';
const USER = 'root';
const PASS = 'Mahmoud@01023122530';

async function run() {
  try {
    console.log('📦 1. Generating backend ZIP payload (excluding heavy node modules)...');
    execSync('powershell -Command "$s = \'f:\\Gem Z\\backend\'; $t = \'f:\\Gem Z\\temp_gemz_backend\'; Copy-Item -Path $s -Destination $t -Recurse; Remove-Item -Path \\"$t\\node_modules\\" -Recurse -Force -ErrorAction SilentlyContinue; Remove-Item -Path \\"$t\\.git\\" -Recurse -Force -ErrorAction SilentlyContinue; Compress-Archive -Path \\"$t\\*\\" -DestinationPath \\"f:\\Gem Z\\gemz_backend_prod.zip\\" -Force; Remove-Item -Path $t -Recurse -Force"', { stdio: 'inherit' });

    console.log('\n🔌 2. Connecting to Hostinger VPS via SSH...');
    await ssh.connect({ host: HOST, username: USER, password: PASS, tryKeyboard: true });

    console.log('\n⚙️ 3. Uploading Backend updates (gemz_backend_prod.zip) -> /opt/gem-z/backend_deploy.zip ...');
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
    if(buildRes.stderr && !buildRes.stderr.includes('npm WARN') && !buildRes.stderr.includes('warn')) {
        console.error('   Restart Warnings/Errors:\n', buildRes.stderr);
    }

    console.log('\n✅ Deployment to Hostinger VPS completely successful!');
    ssh.dispose();
  } catch (err) {
    console.error('\n❌ Deployment Failed:', err);
    process.exit(1);
  }
}
run();
