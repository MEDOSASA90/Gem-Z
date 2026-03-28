import fs from 'fs';
import archiver from 'archiver';
import path from 'path';

const outPath = path.join(process.cwd(), 'gemz_frontend_prod_fixed.zip');
console.log('Generating compliant ZIP to solve Hostinger extraction bugs...');

const output = fs.createWriteStream(outPath);
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', function() {
    console.log(`✅ Success! Created gemz_frontend_prod_fixed.zip (${(archive.pointer() / 1024 / 1024).toFixed(2)} MB)`);
    console.log('Please upload THIS file to Hostinger and extract it.');
});

archive.on('error', function(err) {
  throw err;
});

archive.pipe(output);

// Zip the "out" directory but place its contents directly at the root of the zip
archive.directory('frontend/out/', false);

archive.finalize();
