const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function copyFolderSync(from, to, excludes) {
    if (!fs.existsSync(to)) fs.mkdirSync(to, { recursive: true });
    fs.readdirSync(from).forEach(element => {
        if (excludes.includes(element) || element.startsWith('.git')) return;
        const fromPath = path.join(from, element);
        const toPath = path.join(to, element);
        if (fs.lstatSync(fromPath).isFile()) {
            fs.copyFileSync(fromPath, toPath);
        } else {
            copyFolderSync(fromPath, toPath, excludes);
        }
    });
}

// Clean old files
if(fs.existsSync('f:/Gem Z/tmp_deploy')) fs.rmSync('f:/Gem Z/tmp_deploy', { recursive: true, force: true });
if(fs.existsSync('f:/Gem Z/backend_deploy.zip')) fs.rmSync('f:/Gem Z/backend_deploy.zip');
if(fs.existsSync('f:/Gem Z/frontend_deploy.zip')) fs.rmSync('f:/Gem Z/frontend_deploy.zip');

console.log('Preparing Backend...');
copyFolderSync('f:/Gem Z/backend', 'f:/Gem Z/tmp_deploy/backend', ['node_modules', 'dist']);

console.log('Preparing Frontend...');
copyFolderSync('f:/Gem Z/frontend', 'f:/Gem Z/tmp_deploy/frontend', ['node_modules', '.next']);

console.log('Zipping...');
try {
    execSync('tar -a -c -f "f:/Gem Z/backend_deploy.zip" -C "f:/Gem Z/tmp_deploy/backend" .', {stdio: 'inherit'});
    execSync('tar -a -c -f "f:/Gem Z/frontend_deploy.zip" -C "f:/Gem Z/tmp_deploy/frontend" .', {stdio: 'inherit'});
    
    console.log('Cleaning up tmp_deploy...');
    fs.rmSync('f:/Gem Z/tmp_deploy', { recursive: true, force: true });
    console.log('✅ Done! ZIP files created securely in F:/Gem Z/');
} catch (e) {
    console.error('Error during zipping:', e);
}
