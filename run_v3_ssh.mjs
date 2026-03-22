import { NodeSSH } from 'node-ssh';
import fs from 'fs';
import path from 'path';

const ssh = new NodeSSH();

async function run() {
  try {
    await ssh.connect({
      host: '72.61.167.3',
      username: 'root',
      password: 'Mahmoud@01023122530',
      tryKeyboard: true,
    });

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
