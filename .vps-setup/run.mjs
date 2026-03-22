import { NodeSSH } from 'node-ssh';
const ssh = new NodeSSH();

async function run() {
  try {
    await ssh.connect({
      host: '72.61.167.3',
      username: 'root',
      password: 'Mahmoud@01023122530',
      tryKeyboard: true,
    });

    const command = process.argv[2];
    if (!command) {
      console.log("No command provided");
      process.exit(1);
    }

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
